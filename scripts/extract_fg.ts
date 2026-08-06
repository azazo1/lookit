import { existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import sharp from "sharp";
import { imageSize, parseHex, parseRegion } from "./image-utils.ts";

type Options = {
  images: string[];
  region?: string;
  output?: string;
  discRadius?: number;
  boxes?: string;
  mode: "color" | "dark";
  sat: number;
  dark: number;
  excludeColor?: string;
  excludeTol: number;
  pad: number;
  keepWhites: boolean;
};

type Box = { x1: number; y1: number; x2: number; y2: number };
type RgbaImage = { data: Uint8Array; width: number; height: number };

function fail(message: string): never {
  console.error(`extract_fg: ${message}`);
  process.exit(1);
}

function integerValue(value: string | undefined, name: string, min: number): number {
  if (value === undefined) {
    fail(`缺少 ${name} 的参数值`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    fail(`${name} 需要大于等于 ${min} 的整数`);
  }
  return parsed;
}

function numberValue(value: string | undefined, name: string): number {
  if (value === undefined) {
    fail(`缺少 ${name} 的参数值`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    fail(`${name} 需要正数`);
  }
  return parsed;
}

function nonNegativeNumberValue(value: string | undefined, name: string): number {
  if (value === undefined) {
    fail(`缺少 ${name} 的参数值`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    fail(`${name} 需要非负数`);
  }
  return parsed;
}

function parseArgv(argv: string[]): Options {
  const positional: string[] = [];
  const options: Options = {
    images: [],
    mode: "color",
    sat: 12,
    dark: 215,
    excludeTol: 24,
    pad: 3,
    keepWhites: true,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (
      arg === "--region" || arg === "--output" || arg === "-o" ||
      arg === "--disc-radius" || arg === "--boxes" || arg === "--mode" ||
      arg === "--sat" || arg === "--dark" || arg === "--exclude-color" ||
      arg === "--exclude-tol" || arg === "--pad"
    ) {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${arg} 的参数值`);
      }
      if (arg === "--region") {
        options.region = value;
      } else if (arg === "--output" || arg === "-o") {
        options.output = value;
      } else if (arg === "--disc-radius") {
        options.discRadius = numberValue(value, "--disc-radius");
      } else if (arg === "--boxes") {
        options.boxes = value;
      } else if (arg === "--mode") {
        if (value !== "color" && value !== "dark") {
          fail("--mode 只支持 color 或 dark");
        }
        options.mode = value;
      } else if (arg === "--sat") {
        options.sat = integerValue(value, "--sat", 0);
      } else if (arg === "--dark") {
        options.dark = integerValue(value, "--dark", 0);
      } else if (arg === "--exclude-color") {
        options.excludeColor = value;
      } else if (arg === "--exclude-tol") {
        options.excludeTol = nonNegativeNumberValue(value, "--exclude-tol");
      } else {
        options.pad = integerValue(value, "--pad", 0);
      }
    } else if (arg === "--no-keep-whites") {
      options.keepWhites = false;
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg.startsWith("--disc-radius=")) {
      options.discRadius = numberValue(arg.slice("--disc-radius=".length), "--disc-radius");
    } else if (arg.startsWith("--boxes=")) {
      options.boxes = arg.slice("--boxes=".length);
    } else if (arg.startsWith("--mode=")) {
      const value = arg.slice("--mode=".length);
      if (value !== "color" && value !== "dark") {
        fail("--mode 只支持 color 或 dark");
      }
      options.mode = value;
    } else if (arg.startsWith("--sat=")) {
      options.sat = integerValue(arg.slice("--sat=".length), "--sat", 0);
    } else if (arg.startsWith("--dark=")) {
      options.dark = integerValue(arg.slice("--dark=".length), "--dark", 0);
    } else if (arg.startsWith("--exclude-color=")) {
      options.excludeColor = arg.slice("--exclude-color=".length);
    } else if (arg.startsWith("--exclude-tol=")) {
      options.excludeTol = nonNegativeNumberValue(arg.slice("--exclude-tol=".length), "--exclude-tol");
    } else if (arg.startsWith("--pad=")) {
      options.pad = integerValue(arg.slice("--pad=".length), "--pad", 0);
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/extract_fg.ts <图片> [<图片> ...] " +
          "[--region X1,Y1,X2,Y2] [-o 输出.png] [--mode color|dark] " +
          "[--sat N] [--dark N] [--exclude-color #RRGGBB] [--exclude-tol N] " +
          "[--pad N] [--disc-radius N] [--boxes X1,Y1,X2,Y2] [--no-keep-whites]",
      );
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length < 1) {
    fail("需要至少一个图片路径");
  }
  options.images = positional;
  return options;
}

function parseBox(text: string): Box {
  const parts = text.split(",").map(Number);
  if (parts.length !== 4 || parts.some((value) => !Number.isInteger(value))) {
    fail("--boxes 需要四个整数: X1,Y1,X2,Y2");
  }
  return { x1: parts[0], y1: parts[1], x2: parts[2], y2: parts[3] };
}

function connectedComponents(ink: Set<number>, width: number, height: number): number[][] {
  const seen = new Uint8Array(width * height);
  const comps: number[][] = [];
  for (const start of ink) {
    if (seen[start]) {
      continue;
    }
    const stack = [start];
    const comp: number[] = [];
    seen[start] = 1;
    while (stack.length) {
      const index = stack.pop() as number;
      comp.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            continue;
          }
          const neighbor = ny * width + nx;
          if (seen[neighbor] || !ink.has(neighbor)) {
            continue;
          }
          seen[neighbor] = 1;
          stack.push(neighbor);
        }
      }
    }
    comps.push(comp);
  }
  comps.sort((a, b) => b.length - a.length);
  return comps;
}

function compBox(comp: number[], width: number): Box {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const index of comp) {
    const x = index % width;
    const y = Math.floor(index / width);
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
  }
  return { x1, y1, x2, y2 };
}

function boxesOverlap(a: Box, b: Box): boolean {
  return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
}

function componentSaturation(comp: number[], image: RgbaImage): number {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const index of comp) {
    const offset = index * 4;
    r += image.data[offset];
    g += image.data[offset + 1];
    b += image.data[offset + 2];
  }
  const avgR = r / comp.length;
  const avgG = g / comp.length;
  const avgB = b / comp.length;
  return Math.max(avgR, avgG, avgB) - Math.min(avgR, avgG, avgB);
}

function autoDisc(image: RgbaImage, radius: number, center: { x: number; y: number }): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const distance = Math.hypot(x - center.x, y - center.y);
      if (distance <= radius * 0.75 || distance >= radius * 0.95) {
        continue;
      }
      const offset = (y * image.width + x) * 4;
      r += image.data[offset];
      g += image.data[offset + 1];
      b += image.data[offset + 2];
      count++;
    }
  }
  if (!count) {
    fail("自动模式圆环为空, --disc-radius 可能太小");
  }
  return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
}

async function writeOutput(
  path: string,
  image: RgbaImage,
  best: number[],
  origin: { x: number; y: number },
  outBox: Box,
  keepWhites: boolean,
): Promise<void> {
  const outWidth = outBox.x2 - outBox.x1;
  const outHeight = outBox.y2 - outBox.y1;
  const output = new Uint8Array(outWidth * outHeight * 4);
  for (const index of best) {
    const x = index % image.width;
    const y = Math.floor(index / image.width);
    const outX = origin.x + x - outBox.x1;
    const outY = origin.y + y - outBox.y1;
    const sourceOffset = index * 4;
    const targetOffset = (outY * outWidth + outX) * 4;
    output[targetOffset] = image.data[sourceOffset];
    output[targetOffset + 1] = image.data[sourceOffset + 1];
    output[targetOffset + 2] = image.data[sourceOffset + 2];
    output[targetOffset + 3] = 255;
  }
  if (keepWhites) {
    const near = new Set<number>();
    for (let y = 0; y < outHeight; y++) {
      for (let x = 0; x < outWidth; x++) {
        const offset = (y * outWidth + x) * 4;
        const alpha = output[offset + 3];
        if (!alpha) {
          continue;
        }
        const mx = Math.max(output[offset], output[offset + 1], output[offset + 2]);
        const mn = Math.min(output[offset], output[offset + 1], output[offset + 2]);
        if (mx >= 240 && mx - mn <= 25) {
          near.add(y * outWidth + x);
        }
      }
    }
    const background = new Set<number>();
    const stack = [...near].filter((index) => {
      const x = index % outWidth;
      const y = Math.floor(index / outWidth);
      return x === 0 || y === 0 || x === outWidth - 1 || y === outHeight - 1;
    });
    while (stack.length) {
      const index = stack.pop() as number;
      if (background.has(index)) {
        continue;
      }
      background.add(index);
      const x = index % outWidth;
      const y = Math.floor(index / outWidth);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= outWidth || ny >= outHeight) {
            continue;
          }
          const neighbor = ny * outWidth + nx;
          if (near.has(neighbor) && !background.has(neighbor)) {
            stack.push(neighbor);
          }
        }
      }
    }
    for (const index of background) {
      const offset = index * 4;
      output[offset] = 255;
      output[offset + 1] = 255;
      output[offset + 2] = 255;
      output[offset + 3] = 0;
    }
    for (const index of near) {
      if (!background.has(index)) {
        const offset = index * 4;
        output[offset] = 255;
        output[offset + 1] = 255;
        output[offset + 2] = 255;
        output[offset + 3] = 255;
      }
    }
  }
  await sharp(Buffer.from(output), { raw: { width: outWidth, height: outHeight, channels: 4 } })
    .png()
    .toFile(path);
}

async function processOne(imagePath: string, options: Options): Promise<void> {
  if (!existsSync(imagePath)) {
    fail(`图片不存在: ${imagePath}`);
  }
  const full = await imageSize(imagePath);
  const autoMode = options.region === undefined;
  let origin = { x: 0, y: 0 };
  let image: RgbaImage;
  let autoExclude: [number, number, number] | undefined;
  let autoBox: Box | undefined;
  let excludeTol = options.excludeTol;
  if (autoMode) {
    const raw = await sharp(imagePath, { failOn: "none" }).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    image = { data: new Uint8Array(raw.data), width: raw.info.width, height: raw.info.height };
    const center = options.boxes
      ? (() => {
          const box = parseBox(options.boxes);
          autoBox = box;
          return { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 };
        })()
      : { x: image.width / 2, y: image.height / 2 };
    const radius = options.discRadius ??
      (autoBox ? Math.max(autoBox.x2 - autoBox.x1, autoBox.y2 - autoBox.y1) * 0.8 : Math.min(image.width, image.height) / 2 * 0.6);
    autoExclude = autoDisc(image, radius, center);
    excludeTol = 35;
    console.log(
      `auto: center=(${Math.round(center.x)},${Math.round(center.y)}) ` +
        `disc radius=${Math.round(radius)} exclude-color=#${autoExclude.map((v) => v.toString(16).padStart(2, "0")).join("")}`,
    );
  } else {
    const box = parseRegion(options.region, full.width, full.height);
    origin = { x: box.x1, y: box.y1 };
    const raw = await sharp(imagePath, { failOn: "none" })
      .ensureAlpha()
      .extract({ left: box.x1, top: box.y1, width: box.x2 - box.x1, height: box.y2 - box.y1 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    image = { data: new Uint8Array(raw.data), width: raw.info.width, height: raw.info.height };
  }
  const exclude = autoExclude ?? (options.excludeColor ? parseHex(options.excludeColor) : undefined);
  const ink = new Set<number>();
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      const r = image.data[offset];
      const g = image.data[offset + 1];
      const b = image.data[offset + 2];
      const alpha = image.data[offset + 3];
      if (!alpha) {
        continue;
      }
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      if (options.mode === "color" && mx - mn <= options.sat) {
        continue;
      }
      if (options.mode === "dark" && mx >= options.dark) {
        continue;
      }
      if (exclude) {
        const distance = Math.hypot(r - exclude[0], g - exclude[1], b - exclude[2]);
        if (distance <= excludeTol) {
          continue;
        }
      }
      ink.add(y * image.width + x);
    }
  }
  if (!ink.size) {
    fail(`图片 ${imagePath} 没有找到前景像素, 可调整 --sat/--dark/--exclude-color`);
  }
  const comps = connectedComponents(ink, image.width, image.height);
  const minSize = Math.max(comps[0].length * 0.02, 8);
  const mainBox = compBox(comps[0], image.width);
  const kept = comps.filter(
    (comp) => comp.length >= minSize || boxesOverlap(compBox(comp, image.width), mainBox),
  );
  let best: number[];
  let pad = options.pad;
  if (autoMode) {
    const colored = kept
      .map((comp) => ({ comp, sat: componentSaturation(comp, image) }))
      .filter((item) => item.sat > 25);
    if (colored.length) {
      colored.sort((a, b) => b.comp.length - a.comp.length);
      const chosen = colored.slice(0, 3).sort((a, b) => b.sat - a.sat)[0].comp;
      best = chosen;
    } else {
      best = kept[0];
    }
    if (autoBox) {
      const scored = kept
        .map((comp) => {
          const overlap = comp.filter((index) => {
            const x = index % image.width;
            const y = Math.floor(index / image.width);
            return x >= autoBox.x1 && x < autoBox.x2 && y >= autoBox.y1 && y < autoBox.y2;
          }).length;
          return { overlap, comp };
        })
        .sort((a, b) => b.overlap - a.overlap || b.comp.length - a.comp.length);
      best = scored[0].comp;
    }
    pad = 0;
  } else {
    best = kept.flat();
  }
  const box = compBoxFromPixels(best, image.width);
  const outBox = {
    x1: Math.max(0, origin.x + box.x1 - pad),
    y1: Math.max(0, origin.y + box.y1 - pad),
    x2: Math.min(full.width, origin.x + box.x2 + 1 + pad),
    y2: Math.min(full.height, origin.y + box.y2 + 1 + pad),
  };
  if (outBox.x2 <= outBox.x1 || outBox.y2 <= outBox.y1) {
    fail(`图片 ${imagePath} 提取出的前景为空`);
  }
  const output = options.output ??
    join(dirname(imagePath), `${basename(imagePath, extname(imagePath))}${autoMode ? ".clean" : ".fg"}.png`);
  await writeOutput(output, image, best, origin, outBox, options.keepWhites);
  const maxShare = (comps[0].length / ink.size) * 100;
  console.log(`bbox (原图像素): x1: ${outBox.x1}, y1: ${outBox.y1}, x2: ${outBox.x2}, y2: ${outBox.y2}`);
  console.log(
    `前景像素: ${best.length}  保留分量: ${kept.length}/${comps.length}  ` +
      `最大分量占比: ${maxShare.toFixed(0)}%`,
  );
  console.log(`wrote ${output} (${outBox.x2 - outBox.x1}x${outBox.y2 - outBox.y1})`);
}

function compBoxFromPixels(pixels: number[], width: number): Box {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const index of pixels) {
    const x = index % width;
    const y = Math.floor(index / width);
    x1 = Math.min(x1, x);
    y1 = Math.min(y1, y);
    x2 = Math.max(x2, x);
    y2 = Math.max(y2, y);
  }
  return { x1, y1, x2, y2 };
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  for (const image of options.images) {
    await processOne(image, options);
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
