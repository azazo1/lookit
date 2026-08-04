import { existsSync } from "node:fs";
import { convertBuffer } from "@visioncortex/vtracer";
import sharp from "sharp";
import { imageSize, parseRegion } from "./image-utils.ts";

type Options = {
  image: string;
  region?: string;
  scale?: number;
  polygon: boolean;
  color: boolean;
  output?: string;
};

const WHITE_FILLS = new Set(["#ffffff", "#fff", "white"]);
const TARGET_MIN_SIDE = 256;

function fail(message: string): never {
  console.error(`trace: ${message}`);
  process.exit(1);
}

function integerValue(value: string | undefined, name: string): number {
  if (value === undefined) {
    fail(`缺少 ${name} 的参数值`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    fail(`${name} 需要正整数`);
  }
  return parsed;
}

function parseArgv(argv: string[]): Options {
  const positional: string[] = [];
  const options: Options = { image: "", polygon: false, color: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--region") {
      const value = argv[++index];
      if (value === undefined) {
        fail("缺少 --region 的参数值");
      }
      options.region = value;
    } else if (arg === "--scale") {
      options.scale = integerValue(argv[++index], "--scale");
    } else if (arg === "--polygon") {
      options.polygon = true;
    } else if (arg === "--color") {
      options.color = true;
    } else if (arg === "--output" || arg === "-o") {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${arg} 的参数值`);
      }
      options.output = value;
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--scale=")) {
      options.scale = integerValue(arg.slice("--scale=".length), "--scale");
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/trace.ts <图片> [--region X1,Y1,X2,Y2] [--scale N] [--polygon] [--color] [-o 输出.svg]",
      );
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) {
    fail("需要图片路径");
  }
  options.image = positional[0];
  return options;
}

async function preparePng(
  path: string,
  region: string | undefined,
  scale: number | undefined,
): Promise<{ buffer: Buffer; scale: number }> {
  const { width, height } = await imageSize(path);
  let cropWidth = width;
  let cropHeight = height;
  let pipeline = sharp(path, { failOn: "none" });
  if (region) {
    const box = parseRegion(region, width, height);
    cropWidth = box.x2 - box.x1;
    cropHeight = box.y2 - box.y1;
    pipeline = pipeline.extract({
      left: box.x1,
      top: box.y1,
      width: cropWidth,
      height: cropHeight,
    });
  }
  const shortest = Math.max(Math.min(cropWidth, cropHeight), 1);
  const effectiveScale = scale ?? Math.max(region ? 2 : 1, Math.ceil(TARGET_MIN_SIDE / shortest));
  if (effectiveScale !== 1) {
    pipeline = pipeline.resize(cropWidth * effectiveScale, cropHeight * effectiveScale, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
  }
  return { buffer: await pipeline.png().toBuffer(), scale: effectiveScale };
}

function stripBackground(svg: string): string {
  const match = svg.match(/<path [^>]*\/>/);
  if (!match) {
    return svg;
  }
  const fill = match[0].match(/fill="([^"]+)"/i);
  if (fill && WHITE_FILLS.has(fill[1].trim().toLowerCase())) {
    return svg.replace(match[0], "", 1);
  }
  return svg;
}

function truncateDecimals(svg: string): string {
  return svg.replace(/-?\d+\.\d{3,}/g, (match) => Number(match).toFixed(2));
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  if (!existsSync(options.image)) {
    fail(`图片不存在: ${options.image}`);
  }
  const { buffer, scale } = await preparePng(options.image, options.region, options.scale);
  const svg = truncateDecimals(
    stripBackground(
      convertBuffer(buffer, {
        mode: options.polygon ? "polygon" : "spline",
        filterSpeckle: 8,
        cornerThreshold: 40,
        clustering: options.color ? "color-cluster" : "bw",
      }),
    ),
  );
  const paths = (svg.match(/<path/g) ?? []).length;
  if (!paths) {
    console.error(
      "trace: 0 条路径, 二值化后没有内容. 尝试增大 --scale, 用 --region 更贴近图形, 或对浅色背景深色图形先反色. " +
        "--color 是最后手段, 抗锯齿图片会按每个灰度级别拆成路径.",
    );
  }
  if (options.output) {
    await Bun.write(options.output, svg);
    console.log(`已写入 ${options.output} (${svg.length} 字节, ${paths} 条路径, ${scale} 倍缩放)`);
  } else {
    console.log(svg);
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
