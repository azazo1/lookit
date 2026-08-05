import { existsSync } from "node:fs";
import { imageSize, loadRgba, parseRegion } from "./image-utils.ts";

type Size = { width: number; height: number };

type Options = {
  images: string[];
  width?: number;
  height?: number;
  threshold: number;
  region?: string;
};

const MAX_DEFAULT_SIDE = 64;
const ACTIVE = "#";
const EMPTY = ".";

function fail(message: string): never {
  console.error(`ascii: ${message}`);
  process.exit(1);
}

function integerValue(value: string | undefined, name: string, min: number, max?: number): number {
  if (value === undefined) {
    fail(`缺少 ${name} 的参数值`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || (max !== undefined && parsed > max)) {
    fail(max === undefined ? `${name} 需要大于等于 ${min} 的整数` : `${name} 需要 ${min}-${max} 的整数`);
  }
  return parsed;
}

function parseArgv(argv: string[]): Options {
  const positional: string[] = [];
  const options: Options = { images: [], threshold: 80 };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--width" || arg === "--height" || arg === "--threshold" || arg === "--region") {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${arg} 的参数值`);
      }
      if (arg === "--width") {
        options.width = integerValue(value, "--width", 1);
      } else if (arg === "--height") {
        options.height = integerValue(value, "--height", 1);
      } else if (arg === "--threshold") {
        options.threshold = integerValue(value, "--threshold", 0, 255);
      } else {
        options.region = value;
      }
    } else if (arg.startsWith("--width=")) {
      options.width = integerValue(arg.slice("--width=".length), "--width", 1);
    } else if (arg.startsWith("--height=")) {
      options.height = integerValue(arg.slice("--height=".length), "--height", 1);
    } else if (arg.startsWith("--threshold=")) {
      options.threshold = integerValue(arg.slice("--threshold=".length), "--threshold", 0, 255);
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/ascii.ts <图片> [<对比图片>] " +
          "[--width N] [--height N] [--threshold 0-255] [--region X1,Y1,X2,Y2]",
      );
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length < 1 || positional.length > 2) {
    fail("需要 1 或 2 个图片路径");
  }
  options.images = positional;
  return options;
}

function targetSize(source: Size, width?: number, height?: number): Size {
  if (width !== undefined && height !== undefined) {
    return { width, height };
  }
  if (width !== undefined) {
    return { width, height: Math.max(1, Math.round((source.height * width) / source.width)) };
  }
  if (height !== undefined) {
    return { width: Math.max(1, Math.round((source.width * height) / source.height)), height };
  }
  if (source.width <= MAX_DEFAULT_SIDE && source.height <= MAX_DEFAULT_SIDE) {
    return source;
  }
  const scale = Math.min(MAX_DEFAULT_SIDE / source.width, MAX_DEFAULT_SIDE / source.height);
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  };
}

function gridOf(image: { data: Uint8Array; width: number; height: number }, threshold: number): string[] {
  const rows: string[] = [];
  for (let y = 0; y < image.height; y++) {
    let row = "";
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      row += image.data[offset + 3] > 0 && image.data[offset] > threshold ? ACTIVE : EMPTY;
    }
    rows.push(row);
  }
  return rows;
}

async function loadGrid(path: string, region: string | undefined, size: Size, threshold: number): Promise<string[]> {
  const fullSize = await imageSize(path);
  const box = region ? parseRegion(region, fullSize.width, fullSize.height) : undefined;
  const image = await loadRgba(path, { region: box, size });
  return gridOf(image, threshold);
}

function printCompare(first: string[], second: string[]): void {
  const digits = String(Math.max(first.length, 2)).length;
  for (let y = 0; y < first.length; y++) {
    const left = first[y] ?? "";
    const right = second[y] ?? "";
    let diff = "";
    for (let x = 0; x < Math.max(left.length, right.length); x++) {
      diff += left[x] !== right[x] ? "X" : " ";
    }
    console.log(`${String(y).padStart(digits, "0")} O:${left} N:${right} D:${diff}`);
  }
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  for (const path of options.images) {
    if (!existsSync(path)) {
      fail(`图片不存在: ${path}`);
    }
  }
  const firstSize = await imageSize(options.images[0]);
  const firstBox = options.region ? parseRegion(options.region, firstSize.width, firstSize.height) : undefined;
  const source: Size = firstBox
    ? { width: firstBox.x2 - firstBox.x1, height: firstBox.y2 - firstBox.y1 }
    : firstSize;
  const target = targetSize(source, options.width, options.height);
  if (options.width === undefined && options.height === undefined &&
      (source.width > MAX_DEFAULT_SIDE || source.height > MAX_DEFAULT_SIDE)) {
    console.error(`提示: 图片已缩放到 ${target.width}x${target.height}, 用 --width/--height 指定网格大小`);
  }
  const grids: string[][] = [];
  for (const path of options.images) {
    grids.push(await loadGrid(path, options.region, target, options.threshold));
  }
  if (grids.length === 1) {
    for (const row of grids[0]) {
      console.log(row);
    }
  } else {
    printCompare(grids[0], grids[1]);
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
