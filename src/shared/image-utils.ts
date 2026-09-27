import sharp from "sharp";

export type Rgb = readonly [number, number, number];
export type Box = { x1: number; y1: number; x2: number; y2: number };
export type RgbImage = { data: Uint8Array; width: number; height: number };
export type RgbaImage = RgbImage;

export async function imageSize(path: string): Promise<{ width: number; height: number }> {
  const metadata = await sharp(path, { failOn: "none" }).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`图片缺少尺寸信息: ${path}`);
  }
  return { width: metadata.width, height: metadata.height };
}

export async function loadRgb(
  path: string,
  options: { region?: Box; size?: { width: number; height: number } } = {},
): Promise<RgbImage> {
  let pipeline = sharp(path, { failOn: "none" }).ensureAlpha();
  if (options.region) {
    pipeline = pipeline.extract({
      left: options.region.x1,
      top: options.region.y1,
      width: options.region.x2 - options.region.x1,
      height: options.region.y2 - options.region.y1,
    });
  }
  if (options.size) {
    pipeline = pipeline.resize(options.size.width, options.size.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
  }
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const pixels = new Uint8Array(info.width * info.height * 3);
  for (let index = 0; index < info.width * info.height; index++) {
    const alpha = data[index * 4 + 3] / 255;
    const background = 255 * (1 - alpha);
    pixels[index * 3] = Math.round(data[index * 4] * alpha + background);
    pixels[index * 3 + 1] = Math.round(data[index * 4 + 1] * alpha + background);
    pixels[index * 3 + 2] = Math.round(data[index * 4 + 2] * alpha + background);
  }
  return { data: pixels, width: info.width, height: info.height };
}

export async function loadRgba(
  path: string,
  options: { region?: Box; size?: { width: number; height: number } } = {},
): Promise<RgbaImage> {
  let pipeline = sharp(path, { failOn: "none" }).ensureAlpha();
  if (options.region) {
    pipeline = pipeline.extract({
      left: options.region.x1,
      top: options.region.y1,
      width: options.region.x2 - options.region.x1,
      height: options.region.y2 - options.region.y1,
    });
  }
  if (options.size) {
    pipeline = pipeline.resize(options.size.width, options.size.height, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
  }
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export function cropRgb(image: RgbImage, box: Box): RgbImage {
  const width = box.x2 - box.x1;
  const height = box.y2 - box.y1;
  const data = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    const sourceStart = ((box.y1 + y) * image.width + box.x1) * 3;
    const sourceEnd = ((box.y1 + y) * image.width + box.x2) * 3;
    data.set(image.data.subarray(sourceStart, sourceEnd), y * width * 3);
  }
  return { data, width, height };
}

export function parseRegion(region: string, width: number, height: number): Box {
  const parts = region.split(",");
  if (parts.length !== 4 || parts.some((part) => !/^-?\d+$/.test(part))) {
    throw new Error("--region 需要四个整数: X1,Y1,X2,Y2 (像素)");
  }
  const [x1, y1, x2, y2] = parts.map(Number);
  const box = {
    x1: Math.max(0, Math.min(x1, x2)),
    y1: Math.max(0, Math.min(y1, y2)),
    x2: Math.min(width, Math.max(x1, x2)),
    y2: Math.min(height, Math.max(y1, y2)),
  };
  if (box.x2 <= box.x1 || box.y2 <= box.y1) {
    throw new Error(`--region ${region} 裁剪后为空, 图片为 ${width}x${height}`);
  }
  return box;
}

export function parseHex(text: string): Rgb {
  const value = text.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`无效颜色 ${text}: 需要 #RRGGBB`);
  }
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

export function hexOf(rgb: Rgb): string {
  return `#${rgb.map((value) => value.toString(16).toUpperCase().padStart(2, "0")).join("")}`;
}

export function chebyshev(a: Rgb, b: Rgb): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

export function bar(share: number, maxShare: number, width = 20): string {
  if (!maxShare) {
    return "";
  }
  return "#".repeat(Math.round((share / maxShare) * width));
}
