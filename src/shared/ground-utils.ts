import { imageSize, parseRegion } from "./image-utils.ts";
import { cropToDataUrl, describeImage, imagePathToDataUrl } from "./vision-client.ts";

export type Match = {
  label: string;
  bbox: [number, number, number, number];
};

export class GroundError extends Error {}

export function buildPrompt(target: string): string {
  return (
    `定位图片中所有符合以下目标的对象或区域:\n${target}\n\n` +
    '只返回一个 JSON 数组. 每项包含 "box_2d" 为 0-1000 网格上的 [y0, x0, y1, x1], ' +
    '"label" 为简短描述. 使用原图中的紧凑框. 没有匹配时返回 [].'
  );
}

function jsonText(text: string): string {
  const cleaned = String(text ?? "").trim();
  const fenced = [...cleaned.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)];
  return (fenced.length ? fenced[fenced.length - 1][1] : cleaned).trim();
}

function fallbackItems(text: string): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  const objectPattern = /\{[^{}]*['"](?:box_2d|bbox_2d|box2d|bbox|box)['"]\s*:\s*\[[^\]]+\][^{}]*\}/g;
  const boxPattern = /['"](?:box_2d|bbox_2d|box2d|bbox|box)['"]\s*:\s*\[([^\]]+)\]/g;
  const labelPattern = /['"](?:label|caption|description)['"]\s*:\s*['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(objectPattern)) {
    const block = match[0];
    const boxMatch = boxPattern.exec(block);
    boxPattern.lastIndex = 0;
    if (!boxMatch) {
      continue;
    }
    const numbers = boxMatch[1].match(/-?\d+(?:\.\d+)?/g);
    if (!numbers || numbers.length < 4) {
      continue;
    }
    const item: Record<string, unknown> = {
      box_2d: numbers.slice(0, 4).map(Number),
    };
    const labelMatch = labelPattern.exec(block);
    labelPattern.lastIndex = 0;
    if (labelMatch) {
      item.label = labelMatch[1].trim();
    }
    items.push(item);
  }
  return items;
}

function items(text: string): unknown[] {
  const cleaned = jsonText(text);
  try {
    const payload = JSON.parse(cleaned) as unknown;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (payload && typeof payload === "object") {
      for (const key of ["boxes", "bounding_boxes", "bboxes", "objects", "items", "results"]) {
        const value = (payload as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
          return value;
        }
      }
    }
  } catch {
    const fallback = fallbackItems(cleaned);
    if (fallback.length) {
      return fallback;
    }
    throw new GroundError("视觉 API 没有返回可解析的边界框 JSON");
  }
  throw new GroundError("视觉 API 返回了不兼容的边界框 JSON 结构");
}

function normalizeBox(item: Record<string, unknown>, width: number, height: number): Match["bbox"] | null {
  let raw = item.box_2d;
  if (!Array.isArray(raw)) {
    for (const key of ["bbox_2d", "box2d", "bbox", "box"]) {
      if (Array.isArray(item[key])) {
        raw = item[key];
        break;
      }
    }
  }
  if (!Array.isArray(raw) || raw.length !== 4) {
    return null;
  }
  const values = raw.map(Number);
  if (values.some((value) => !Number.isFinite(value))) {
    return null;
  }
  let [y0, x0, y1, x1] = values;
  if (x0 > x1) {
    [x0, x1] = [x1, x0];
  }
  if (y0 > y1) {
    [y0, y1] = [y1, y0];
  }
  const box: Match["bbox"] = [
    Math.max(0, Math.min(width, Math.round((x0 / 1000) * width))),
    Math.max(0, Math.min(height, Math.round((y0 / 1000) * height))),
    Math.max(0, Math.min(width, Math.round((x1 / 1000) * width))),
    Math.max(0, Math.min(height, Math.round((y1 / 1000) * height))),
  ];
  return box[2] > box[0] && box[3] > box[1] ? box : null;
}

export function parseMatches(text: string, width: number, height: number, target: string): Match[] {
  const matches: Match[] = [];
  for (const raw of items(text)) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const item = raw as Record<string, unknown>;
    const box = normalizeBox(item, width, height);
    if (!box) {
      continue;
    }
    const label = String(item.label ?? item.caption ?? item.description ?? target).trim();
    matches.push({ label: label || target, bbox: box });
  }
  return matches;
}

export async function locate(
  path: string,
  target: string,
  region?: string,
): Promise<{ matches: Match[]; width: number; height: number }> {
  const { width, height } = await imageSize(path);
  if (region) {
    const box = parseRegion(region, width, height);
    const url = await cropToDataUrl(path, region);
    const cropWidth = box.x2 - box.x1;
    const cropHeight = box.y2 - box.y1;
    const response = await describeImage(url, buildPrompt(target), 8192);
    const matches = parseMatches(response, cropWidth, cropHeight, target);
    return {
      matches: matches.map((match) => ({
        label: match.label,
        bbox: [
          match.bbox[0] + box.x1,
          match.bbox[1] + box.y1,
          match.bbox[2] + box.x1,
          match.bbox[3] + box.y1,
        ],
      })),
      width,
      height,
    };
  }
  const url = await imagePathToDataUrl(path);
  const response = await describeImage(url, buildPrompt(target), 8192);
  return { matches: parseMatches(response, width, height, target), width, height };
}

export function position(box: Match["bbox"], width: number, height: number): string {
  const x = (box[0] + box[2]) / 2;
  const y = (box[1] + box[3]) / 2;
  const horizontal = x < width / 3 ? "左" : x > (width * 2) / 3 ? "右" : "中";
  const vertical = y < height / 3 ? "上" : y > (height * 2) / 3 ? "下" : "中";
  if (horizontal === "中" && vertical === "中") {
    return "中";
  }
  return `${horizontal}${vertical}`;
}

export function formatMatches(matches: Match[], width: number, height: number): string[] {
  if (matches.length === 1) {
    const [x1, y1, x2, y2] = matches[0].bbox;
    return [`x1: ${x1}, y1: ${y1}, x2: ${x2}, y2: ${y2}`];
  }
  return matches.map((match, index) => {
    const [x1, y1, x2, y2] = match.bbox;
    return `${index + 1}. ${position(match.bbox, width, height)} ${match.label} x1: ${x1}, y1: ${y1}, x2: ${x2}, y2: ${y2}`;
  });
}
