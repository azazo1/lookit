import { closeSync, openSync, readSync } from "node:fs";

export function readImageSize(path: string): { width: number; height: number } {
  const fd = openSync(path, "r");
  let header: Buffer;
  try {
    const buffer = Buffer.alloc(64 * 1024);
    const bytes = readSync(fd, buffer, 0, buffer.length, 0);
    header = buffer.subarray(0, bytes);
  } finally {
    closeSync(fd);
  }
  return parseImageSize(header, path);
}

function parseImageSize(header: Buffer, path: string): { width: number; height: number } {
  if (isPng(header)) {
    requireBytes(header, 24, path);
    return {
      width: header.readUInt32BE(16),
      height: header.readUInt32BE(20),
    };
  }
  if (isGif(header)) {
    requireBytes(header, 10, path);
    return {
      width: header.readUInt16LE(6),
      height: header.readUInt16LE(8),
    };
  }
  if (isWebp(header)) {
    return parseWebp(header, path);
  }
  const jpegSize = parseJpeg(header, path);
  if (jpegSize) {
    return jpegSize;
  }
  throw new Error(`不支持或无法识别的图片格式: ${path}`);
}

function isPng(header: Buffer): boolean {
  return (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  );
}

function isGif(header: Buffer): boolean {
  return (
    header.length >= 6 &&
    (header.toString("ascii", 0, 6) === "GIF87a" || header.toString("ascii", 0, 6) === "GIF89a")
  );
}

function isWebp(header: Buffer): boolean {
  return (
    header.length >= 12 &&
    header.toString("ascii", 0, 4) === "RIFF" &&
    header.toString("ascii", 8, 12) === "WEBP"
  );
}

function parseJpeg(header: Buffer, path: string): { width: number; height: number } | null {
  if (header.length < 4 || header[0] !== 0xff || header[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  while (offset + 9 <= header.length) {
    if (header[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = header[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    if (offset + 2 > header.length) {
      break;
    }
    const length = header.readUInt16BE(offset);
    if (length < 2 || offset + length > header.length) {
      break;
    }
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const width = header.readUInt16BE(offset + 5);
      const height = header.readUInt16BE(offset + 3);
      if (width > 0 && height > 0) {
        return { width, height };
      }
      throw new Error(`JPEG 缺少有效尺寸信息: ${path}`);
    }
    offset += length;
  }
  throw new Error(`JPEG 中没有找到尺寸信息: ${path}`);
}

function parseWebp(header: Buffer, path: string): { width: number; height: number } {
  requireBytes(header, 20, path);
  const format = header.toString("ascii", 12, 16);
  if (format === "VP8X") {
    requireBytes(header, 30, path);
    return {
      width: header.readUIntLE(24, 3) + 1,
      height: header.readUIntLE(27, 3) + 1,
    };
  }
  if (format === "VP8L") {
    requireBytes(header, 24, path);
    const bits = header.readUInt32LE(20);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  if (format === "VP8 ") {
    requireBytes(header, 30, path);
    return {
      width: header.readUInt16LE(26) & 0x3fff,
      height: header.readUInt16LE(28) & 0x3fff,
    };
  }
  throw new Error(`不支持的 WebP 子格式: ${path}`);
}

function requireBytes(header: Buffer, count: number, path: string): void {
  if (header.length < count) {
    throw new Error(`图片头部不完整: ${path}`);
  }
}
