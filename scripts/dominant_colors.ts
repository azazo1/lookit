import { existsSync } from "node:fs";
import {
  bar,
  chebyshev,
  hexOf,
  imageSize,
  loadRgb,
  parseHex,
  parseRegion,
  type Box,
  type Rgb,
} from "./image-utils.ts";

type Options = {
  image: string;
  region?: string;
  candidates?: string;
  top: number;
  quantize: number;
  maxPixels: number;
  mergeTol: number;
  tol: number;
};

type Cluster = { rgb: Rgb; count: number };
type PickRow = {
  text: string;
  rgb: Rgb;
  meanDistance: number;
  hard: number;
  weighted: number;
  share: number;
};

function fail(message: string): never {
  console.error(`dominant_colors: ${message}`);
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
  const options: Options = { image: "", top: 5, quantize: 16, maxPixels: 96, mergeTol: 8, tol: 16 };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (["--region", "--candidates", "--top", "--quantize", "--max-pixels", "--merge-tol", "--tol"].includes(arg)) {
      const name = arg.slice(2);
      const value = argv[++index];
      switch (name) {
        case "region":
          options.region = value;
          break;
        case "candidates":
          options.candidates = value;
          break;
        case "top":
          options.top = integerValue(value, "--top");
          break;
        case "quantize":
          options.quantize = integerValue(value, "--quantize");
          break;
        case "max-pixels":
          options.maxPixels = integerValue(value, "--max-pixels");
          break;
        case "merge-tol":
          options.mergeTol = integerValue(value, "--merge-tol");
          break;
        case "tol":
          options.tol = integerValue(value, "--tol");
          break;
      }
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--candidates=")) {
      options.candidates = arg.slice("--candidates=".length);
    } else if (arg.startsWith("--top=")) {
      options.top = integerValue(arg.slice("--top=".length), "--top");
    } else if (arg.startsWith("--quantize=")) {
      options.quantize = integerValue(arg.slice("--quantize=".length), "--quantize");
    } else if (arg.startsWith("--max-pixels=")) {
      options.maxPixels = integerValue(arg.slice("--max-pixels=".length), "--max-pixels");
    } else if (arg.startsWith("--merge-tol=")) {
      options.mergeTol = integerValue(arg.slice("--merge-tol=".length), "--merge-tol");
    } else if (arg.startsWith("--tol=")) {
      options.tol = integerValue(arg.slice("--tol=".length), "--tol");
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/dominant_colors.ts <图片> [--region X1,Y1,X2,Y2] [--candidates #RRGGBB,...] [--top N] [--quantize N] [--max-pixels N] [--merge-tol N] [--tol N]",
      );
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) {
    fail("需要提供一个图片路径");
  }
  options.image = positional[0];
  return options;
}

function quantize(pixels: Rgb[], maxColors: number): Cluster[] {
  if (!pixels.length) {
    return [];
  }
  const exact = new Map<string, Cluster>();
  for (const pixel of pixels) {
    const key = pixel.join(",");
    const existing = exact.get(key);
    if (existing) {
      existing.count++;
    } else {
      exact.set(key, { rgb: pixel, count: 1 });
    }
  }
  if (exact.size <= maxColors) {
    return [...exact.values()].sort((a, b) => b.count - a.count);
  }

  // 中位切分量化, 用于合并相近颜色.
  let boxes: Rgb[][] = [pixels];
  while (boxes.length < maxColors) {
    let splitIndex = -1;
    let splitChannel = 0;
    let bestRange = -1;
    for (let index = 0; index < boxes.length; index++) {
      const box = boxes[index];
      if (box.length < 2) {
        continue;
      }
      const min: [number, number, number] = [255, 255, 255];
      const max: [number, number, number] = [0, 0, 0];
      for (const pixel of box) {
        for (let channel = 0; channel < 3; channel++) {
          min[channel] = Math.min(min[channel], pixel[channel]);
          max[channel] = Math.max(max[channel], pixel[channel]);
        }
      }
      const channel = max[1] - min[1] >= max[0] - min[0] && max[1] - min[1] >= max[2] - min[2]
        ? 1
        : max[0] - min[0] >= max[2] - min[2]
          ? 0
          : 2;
      const range = max[channel] - min[channel];
      if (range > bestRange) {
        bestRange = range;
        splitIndex = index;
        splitChannel = channel;
      }
    }
    if (splitIndex === -1) {
      break;
    }
    const box = boxes[splitIndex];
    const sorted = [...box].sort((a, b) => a[splitChannel] - b[splitChannel]);
    const middle = Math.floor(sorted.length / 2);
    if (middle === 0 || middle === sorted.length) {
      break;
    }
    boxes.splice(splitIndex, 1, sorted.slice(0, middle), sorted.slice(middle));
  }
  return boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const pixel of box) {
      r += pixel[0];
      g += pixel[1];
      b += pixel[2];
    }
    return {
      rgb: [Math.round(r / box.length), Math.round(g / box.length), Math.round(b / box.length)] as Rgb,
      count: box.length,
    };
  });
}

function mergeClusters(clusters: Cluster[], tolerance: number): Cluster[] {
  const merged: Cluster[] = [];
  for (const cluster of [...clusters].sort((a, b) => b.count - a.count)) {
    const existing = merged.find((candidate) => chebyshev(cluster.rgb, candidate.rgb) <= tolerance);
    if (existing) {
      const total = existing.count + cluster.count;
      existing.rgb = [
        Math.round((existing.rgb[0] * existing.count + cluster.rgb[0] * cluster.count) / total),
        Math.round((existing.rgb[1] * existing.count + cluster.rgb[1] * cluster.count) / total),
        Math.round((existing.rgb[2] * existing.count + cluster.rgb[2] * cluster.count) / total),
      ] as Rgb;
      existing.count = total;
    } else {
      merged.push({ ...cluster });
    }
  }
  return merged.sort((a, b) => b.count - a.count);
}

async function extract(
  path: string,
  box: Box,
  top: number,
  quantizeK: number,
  maxPixels: number,
  mergeTol: number,
): Promise<{ clusters: Cluster[]; sampled: number }> {
  const cropWidth = box.x2 - box.x1;
  const cropHeight = box.y2 - box.y1;
  const scale = Math.min(1, maxPixels / Math.max(cropWidth, cropHeight));
  const size =
    scale < 1
      ? { width: Math.max(1, Math.round(cropWidth * scale)), height: Math.max(1, Math.round(cropHeight * scale)) }
      : undefined;
  const image = await loadRgb(path, { region: box, size });
  const pixels: Rgb[] = [];
  for (let index = 0; index < image.width * image.height; index++) {
    pixels.push([
      image.data[index * 3],
      image.data[index * 3 + 1],
      image.data[index * 3 + 2],
    ]);
  }
  return {
    clusters: mergeClusters(quantize(pixels, quantizeK), mergeTol),
    sampled: pixels.length,
  };
}

async function pick(
  path: string,
  box: Box,
  candidates: string[],
  tol: number,
): Promise<{ rows: PickRow[]; winner: PickRow; closest: PickRow }> {
  const parsed = candidates.map((text) => ({ text, rgb: parseHex(text) }));
  const image = await loadRgb(path, { region: box });
  const total = image.width * image.height;
  const histograms = parsed.map(() => new Uint32Array(256));
  for (let index = 0; index < total; index++) {
    const r = image.data[index * 3];
    const g = image.data[index * 3 + 1];
    const b = image.data[index * 3 + 2];
    for (let candidateIndex = 0; candidateIndex < parsed.length; candidateIndex++) {
      const rgb = parsed[candidateIndex].rgb;
      const distance = Math.max(Math.abs(r - rgb[0]), Math.abs(g - rgb[1]), Math.abs(b - rgb[2]));
      histograms[candidateIndex][distance]++;
    }
  }
  const rows: PickRow[] = parsed.map((candidate, candidateIndex) => {
    const histogram = histograms[candidateIndex];
    let meanDistance = 0;
    let hard = 0;
    let weighted = 0;
    for (let distance = 0; distance < histogram.length; distance++) {
      const count = histogram[distance];
      meanDistance += distance * count;
      if (distance <= tol) {
        hard += count;
      }
      weighted += Math.max(0, tol - distance) * count;
    }
    return {
      text: candidate.text,
      rgb: candidate.rgb,
      meanDistance: meanDistance / total,
      hard,
      weighted,
      share: (hard / total) * 100,
    };
  });
  const winner = rows.reduce((best, row) =>
    row.weighted > best.weighted || (row.weighted === best.weighted && row.hard > best.hard) ? row : best,
  );
  const closest = rows.reduce((best, row) => (row.meanDistance < best.meanDistance ? row : best));
  return { rows, winner, closest };
}

function formatExtract(clusters: Cluster[], top: number, box: Box, mergeTol: number): string[] {
  const total = clusters.reduce((sum, cluster) => sum + cluster.count, 0);
  if (!total) {
    return ["(区域没有像素)"];
  }
  const width = box.x2 - box.x1;
  const height = box.y2 - box.y1;
  const maxShare = Math.max(...clusters.map((cluster) => (cluster.count / total) * 100));
  const lines = [
    `区域 ${box.x1},${box.y1},${box.x2},${box.y2} - ${width}x${height} 像素`,
    `前 ${top} 个聚类, 共 ${clusters.length} 个 (距离 <= ${mergeTol} 时合并):`,
  ];
  for (const cluster of clusters.slice(0, top)) {
    const share = (cluster.count / total) * 100;
    lines.push(`${hexOf(cluster.rgb)}  ${share.toFixed(1).padStart(5)}%  ${bar(share, maxShare)}`);
  }
  return lines;
}

function formatPick(rows: PickRow[], winner: PickRow, closest: PickRow, box: Box, tol: number): string[] {
  const width = box.x2 - box.x1;
  const height = box.y2 - box.y1;
  const total = width * height;
  const maxShare = Math.max(...rows.map((row) => row.share)) || 1;
  const maxWeighted = Math.max(...rows.map((row) => row.weighted));
  const lines = [
    `区域 ${box.x1},${box.y1},${box.x2},${box.y2} - ${width}x${height} 像素 (采样 ${total} 像素)`,
    "候选色    占比    平均距离  权重  条",
  ];
  for (const row of rows) {
    const mark = row === winner ? "*" : " ";
    const weightedPercent = maxWeighted ? (row.weighted / maxWeighted) * 100 : 0;
    lines.push(
      `${mark}${row.text.padEnd(9)} ${row.share.toFixed(1).padStart(5)}%  ` +
        `${row.meanDistance.toFixed(1).padStart(4)}  ` +
        `${weightedPercent.toFixed(0).padStart(4)}%  ` +
        bar(row.share, maxShare),
    );
  }
  if (!winner.hard) {
    lines.push(
      `提示: 没有候选色与区域的距离 <= ${tol}; ` +
        `平均距离最近的是 ${closest.text}`,
    );
  } else {
    lines.push(
      `胜出: ${winner.text} (表中标记为 *) - 权重表示软匹配接近度, ` +
        `所以胜者不必占比最高; ` +
        `区域内 ${winner.share.toFixed(1)}% 像素与它的距离 <= ${tol}`,
    );
  }
  return lines;
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  if (!existsSync(options.image)) {
    fail(`图片不存在: ${options.image}`);
  }
  const { width, height } = await imageSize(options.image);
  const box = options.region ? parseRegion(options.region, width, height) : { x1: 0, y1: 0, x2: width, y2: height };
  if (options.candidates !== undefined) {
    const candidates = options.candidates
      .split(",")
      .map((candidate) => candidate.trim())
      .filter(Boolean);
    if (!candidates.length) {
      fail("--candidates 至少需要一个 #RRGGBB");
    }
    const { rows, winner, closest } = await pick(options.image, box, candidates, options.tol);
    console.log(formatPick(rows, winner, closest, box, options.tol).join("\n"));
  } else {
    const { clusters } = await extract(
      options.image,
      box,
      options.top,
      options.quantize,
      options.maxPixels,
      options.mergeTol,
    );
    console.log(formatExtract(clusters, options.top, box, options.mergeTol).join("\n"));
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
