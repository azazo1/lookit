import { cropToDataUrl, describeImage, imagePathToDataUrl, VisionError } from "./vision-client.ts";

type Options = {
  images: string[];
  query?: string;
  ocr?: string;
  region?: string;
};

function fail(message: string): never {
  console.error(`glance: ${message}`);
  process.exit(1);
}

function parseArgv(argv: string[]): Options {
  const options: Options = { images: [] };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "-q" || arg === "--query") {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${arg} 的参数值`);
      }
      options.query = value;
    } else if (arg === "--region") {
      const value = argv[++index];
      if (value === undefined) {
        fail("缺少 --region 的参数值");
      }
      options.region = value;
    } else if (arg === "--ocr") {
      const next = argv[index + 1];
      if (next !== undefined && !next.startsWith("-")) {
        options.ocr = next;
        index++;
      } else {
        options.ocr = "";
      }
    } else if (arg.startsWith("--query=")) {
      options.query = arg.slice("--query=".length);
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--ocr=")) {
      options.ocr = arg.slice("--ocr=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/glance.ts <图片>... [-q 问题 | --ocr [额外要求]] [--region X1,Y1,X2,Y2]",
      );
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      options.images.push(arg);
    }
  }
  if (!options.images.length) {
    fail("至少需要一个图片路径");
  }
  if (options.query !== undefined && options.ocr !== undefined) {
    fail("-q/--query 和 --ocr 不能同时使用");
  }
  return options;
}

function buildPrompt(query: string | undefined, ocr: string | undefined, count: number): string | undefined {
  if (ocr !== undefined) {
    const extra = ocr ? `\n额外要求: ${ocr}` : "";
    const scope = count > 1 ? "这些图片" : "这张图片";
    const labels = count > 1 ? " 分别用 Image 1, Image 2 等标注每张图片的文字." : "";
    return (
      `逐字转写${scope}中的全部可见文字 (标题, 正文, 标签, 水印等), ` +
      "按行输出, 不要省略任何字符, 不要改写, 总结或翻译, 不要添加前言或额外内容." +
      labels +
      extra
    );
  }
  if (query) {
    return query;
  }
  if (count > 1) {
    return "分别详细描述每张图片 (标注 Image 1, Image 2 等), 然后指出它们之间的显著差异.";
  }
  return undefined;
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  const region = options.region;
  const urls = region
    ? await Promise.all(options.images.map((path) => cropToDataUrl(path, region)))
    : await Promise.all(options.images.map((path) => imagePathToDataUrl(path)));
  const answer = await describeImage(
    urls,
    buildPrompt(options.query, options.ocr, urls.length),
    undefined,
    options.ocr === undefined,
  );
  console.log(answer);
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
