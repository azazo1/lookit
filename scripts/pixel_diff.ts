import sharp from "sharp";
import { cropRgb, imageSize, loadRgb, parseRegion, type Box } from "./image-utils.ts";

type Options = {
  original: string;
  rebuilt: string;
  grid: number;
  top: number;
  region?: string;
  output?: string;
};

function fail(message: string): never {
  console.error(`pixel_diff: ${message}`);
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
  const options: Options = { original: "", rebuilt: "", grid: 6, top: 5 };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--grid" || arg === "--top") {
      const name = arg.slice(2);
      const value = argv[++index];
      if (name === "grid") {
        options.grid = integerValue(value, "--grid");
      } else {
        options.top = integerValue(value, "--top");
      }
    } else if (arg === "--region") {
      const value = argv[++index];
      if (value === undefined) {
        fail("缺少 --region 的参数值");
      }
      options.region = value;
    } else if (arg === "--output" || arg === "-o") {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${arg} 的参数值`);
      }
      options.output = value;
    } else if (arg.startsWith("--grid=")) {
      options.grid = integerValue(arg.slice("--grid=".length), "--grid");
    } else if (arg.startsWith("--top=")) {
      options.top = integerValue(arg.slice("--top=".length), "--top");
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/pixel_diff.ts <原图> <重建图> " +
          "[--grid N] [--top N] [--region X1,Y1,X2,Y2] [-o 热力图.png]",
      );
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 2) {
    fail("需要提供原图和重建图两个路径");
  }
  options.original = positional[0];
  options.rebuilt = positional[1];
  return options;
}

function grayAt(data: Uint8Array, offset: number): number {
  return 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
}

function difference(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length);
  for (let index = 0; index < a.length; index++) {
    out[index] = Math.abs(a[index] - b[index]);
  }
  return out;
}

function cellScores(diff: Uint8Array, width: number, height: number, grid: number): Array<{ score: number; box: Box }> {
  const scores: Array<{ score: number; box: Box }> = [];
  for (let row = 0; row < grid; row++) {
    for (let column = 0; column < grid; column++) {
      const box = {
        x1: Math.round((column * width) / grid),
        y1: Math.round((row * height) / grid),
        x2: Math.round(((column + 1) * width) / grid),
        y2: Math.round(((row + 1) * height) / grid),
      };
      if (box.x2 <= box.x1 || box.y2 <= box.y1) {
        continue;
      }
      let sum = 0;
      let count = 0;
      for (let y = box.y1; y < box.y2; y++) {
        for (let x = box.x1; x < box.x2; x++) {
          sum += grayAt(diff, (y * width + x) * 3);
          count++;
        }
      }
      if (count) {
        scores.push({ score: (sum / count / 255) * 100, box });
      }
    }
  }
  return scores.sort((a, b) => b.score - a.score);
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  const original = await loadRgb(options.original);
  const rawSize = await imageSize(options.rebuilt);
  const rebuilt = await loadRgb(options.rebuilt, {
    size: { width: original.width, height: original.height },
  });
  if (rawSize.width !== original.width || rawSize.height !== original.height) {
    console.log(`提示: 重建图原尺寸为 ${rawSize.width}x${rawSize.height}, 已缩放到 ${original.width}x${original.height}`);
  }
  const regionBox = options.region ? parseRegion(options.region, original.width, original.height) : undefined;
  const offset: Box = regionBox ?? { x1: 0, y1: 0, x2: original.width, y2: original.height };
  const originalRegion = regionBox ? cropRgb(original, regionBox) : original;
  const rebuiltRegion = regionBox ? cropRgb(rebuilt, regionBox) : rebuilt;
  const diff = difference(originalRegion.data, rebuiltRegion.data);
  let graySum = 0;
  for (let index = 0; index < diff.length; index += 3) {
    graySum += grayAt(diff, index);
  }
  const overall = (graySum / originalRegion.width / originalRegion.height / 255) * 100;
  const scope = options.region ? ` (区域 ${options.region})` : "";
  console.log(`整体差异${scope}: ${overall.toFixed(2)}%`);
  if (options.output) {
    await sharp(Buffer.from(diff), {
      raw: { width: originalRegion.width, height: originalRegion.height, channels: 3 },
    }).toFile(options.output);
    console.log(`热力图: ${options.output}`);
  }
  for (const [index, cell] of cellScores(diff, originalRegion.width, originalRegion.height, options.grid)
    .slice(0, options.top)
    .entries()) {
    console.log(
      `${index + 1}. ${cell.score.toFixed(2)}% x1: ${cell.box.x1 + offset.x1}, y1: ${cell.box.y1 + offset.y1}, ` +
        `x2: ${cell.box.x2 + offset.x1}, y2: ${cell.box.y2 + offset.y1}`,
    );
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
