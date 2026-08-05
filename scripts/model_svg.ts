import { existsSync } from "node:fs";
import { cropToDataUrl, describeImage, imagePathToDataUrl } from "./vision-client.ts";
import { imageSize, parseRegion } from "./image-utils.ts";

type Options = {
  image: string;
  region?: string;
  instruction?: string;
  output?: string;
};

const MAX_TOKENS = 12000;

function fail(message: string): never {
  console.error(`model-svg: ${message}`);
  process.exit(1);
}

function parseArgv(argv: string[]): Options {
  const positional: string[] = [];
  const options: Options = { image: "" };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--region" || arg === "--instruction" || arg === "--output" || arg === "-o") {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${arg} 的参数值`);
      }
      if (arg === "--region") {
        options.region = value;
      } else if (arg === "--instruction") {
        options.instruction = value;
      } else {
        options.output = value;
      }
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--instruction=")) {
      options.instruction = arg.slice("--instruction=".length);
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/model_svg.ts <图片> [--region X1,Y1,X2,Y2] " +
          "[--instruction 额外要求] [-o 输出.svg]",
      );
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) {
    fail("需要一个图片路径");
  }
  options.image = positional[0];
  return options;
}

function buildPrompt(width: number, height: number, instruction: string | undefined): string {
  const extra = instruction ? `\n用户补充要求: ${instruction}` : "";
  return (
    "请把这张图片重建为一个可编辑且可缩放的 SVG 图形.\n" +
    `源图区域尺寸为 ${width}x${height} 像素.\n` +
    "只输出一个完整的 SVG 文档, 从 <svg 开始到 </svg> 结束. 不要输出 Markdown 代码围栏, 解释文字或其他内容.\n" +
    "使用 xmlns 和 viewBox, 保持原图的构图, 颜色, 透明度和相对位置.\n" +
    "优先使用干净的 path, circle, rect, line 和 polygon 等基础图形. 对小图标恢复设计意图和中线, 不要把像素台阶, 抗锯齿边缘或单个采样像素固化成碎片路径, 矩形补丁或复杂 mask.\n" +
    "不要使用 script, foreignObject 或外部图片和外部资源." +
    extra
  );
}

function extractSvg(raw: string): string {
  const start = raw.search(/<svg(?:\s|>)/i);
  const end = raw.toLowerCase().lastIndexOf("</svg>");
  if (start < 0 || end < 0 || end < start) {
    fail("模型没有返回完整的 <svg> 文档, 请重试或缩短额外要求");
  }
  const svg = raw.slice(start, end + "</svg>".length).trim();
  validateSvg(svg);
  return `${svg.replace(/\r\n?/g, "\n")}\n`;
}

function validateSvg(svg: string): void {
  const opening = svg.match(/^<svg\b([^>]*)>/i);
  if (!opening) {
    fail("SVG 根元素无效");
  }
  const hasViewBox = /\bviewBox\s*=\s*["'][^"']+["']/i.test(opening[1]);
  const hasDimensions =
    /\bwidth\s*=\s*["'][^"']+["']/i.test(opening[1]) &&
    /\bheight\s*=\s*["'][^"']+["']/i.test(opening[1]);
  if (!hasViewBox && !hasDimensions) {
    fail("SVG 必须包含 viewBox 或同时包含 width 和 height");
  }
  if (/<\/?(?:script|foreignObject)\b|\bon[a-z]+\s*=|(?:href|xlink:href)\s*=\s*["'](?:https?:|file:|\/\/)/i.test(svg)) {
    fail("SVG 包含不允许的脚本或外部资源");
  }

  const tokenPattern = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<\/?[A-Za-z_][\w:.-]*(?:\s[^<>]*?)?\/?\s*>/g;
  const stack: string[] = [];
  let rootSeen = false;
  let cursor = 0;
  for (const match of svg.matchAll(tokenPattern)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (svg.slice(cursor, start).includes("<")) {
      fail("SVG 包含无法解析的标签");
    }
    cursor = start + token.length;
    if (token.startsWith("<!--") || token.startsWith("<![CDATA[") || token.startsWith("<?")) {
      continue;
    }
    if (token.startsWith("<!")) {
      fail("SVG 包含不支持的 XML 声明");
    }
    const closing = /^<\//.test(token);
    const nameMatch = token.match(/^<\/?([A-Za-z_][\w:.-]*)/);
    if (!nameMatch) {
      fail("SVG 包含无法解析的标签");
    }
    const name = nameMatch[1];
    if (closing) {
      if (stack.pop() !== name) {
        fail(`SVG 标签未配对: ${name}`);
      }
      continue;
    }
    if (!rootSeen && name !== "svg") {
      fail("SVG 根元素必须是 svg");
    }
    if (rootSeen && stack.length === 0) {
      fail("SVG 包含多个根元素");
    }
    rootSeen = true;
    if (!/\/\s*>$/.test(token)) {
      stack.push(name);
    }
  }
  if (svg.slice(cursor).includes("<") || !rootSeen || stack.length) {
    fail("SVG 标签结构不完整");
  }
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  if (!existsSync(options.image)) {
    fail(`图片不存在: ${options.image}`);
  }
  const fullSize = await imageSize(options.image);
  const box = options.region ? parseRegion(options.region, fullSize.width, fullSize.height) : undefined;
  const width = box ? box.x2 - box.x1 : fullSize.width;
  const height = box ? box.y2 - box.y1 : fullSize.height;
  const imageUrl = box
    ? await cropToDataUrl(options.image, options.region as string)
    : await imagePathToDataUrl(options.image);

  console.error(`model-svg: 正在请求视觉模型 (${width}x${height})...`);
  const raw = await describeImage(imageUrl, buildPrompt(width, height, options.instruction), MAX_TOKENS, false);
  console.error("model-svg: 正在提取并校验 SVG...");
  const svg = extractSvg(raw);
  if (options.output) {
    await Bun.write(options.output, svg);
    console.error(`model-svg: 已写入 ${options.output} (${svg.length} 字节)`);
  } else {
    process.stdout.write(svg);
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
