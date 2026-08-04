import sharp from "sharp";
import { imageSize, loadRgb, type Box } from "./image-utils.ts";

type Options = {
  original: string;
  rebuilt: string;
  grid: number;
  top: number;
  output?: string;
};

function fail(message: string): never {
  console.error(`pixel_diff: ${message}`);
  process.exit(1);
}

function integerValue(value: string | undefined, name: string): number {
  if (value === undefined) {
    fail(`missing value for ${name}`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    fail(`${name} expects a positive integer`);
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
    } else if (arg === "--output" || arg === "-o") {
      const value = argv[++index];
      if (value === undefined) {
        fail(`missing value for ${arg}`);
      }
      options.output = value;
    } else if (arg.startsWith("--grid=")) {
      options.grid = integerValue(arg.slice("--grid=".length), "--grid");
    } else if (arg.startsWith("--top=")) {
      options.top = integerValue(arg.slice("--top=".length), "--top");
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error("usage: bun run scripts/pixel_diff.ts <original> <rebuilt> [--grid N] [--top N] [-o heatmap.png]");
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 2) {
    fail("expected original and rebuilt image paths");
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
    console.log(`note: rebuilt was ${rawSize.width}x${rawSize.height}, scaled to ${original.width}x${original.height}`);
  }
  const diff = difference(original.data, rebuilt.data);
  let graySum = 0;
  for (let index = 0; index < diff.length; index += 3) {
    graySum += grayAt(diff, index);
  }
  const overall = (graySum / original.width / original.height / 255) * 100;
  console.log(`overall difference: ${overall.toFixed(2)}%`);
  if (options.output) {
    await sharp(Buffer.from(diff), {
      raw: { width: original.width, height: original.height, channels: 3 },
    }).toFile(options.output);
    console.log(`heatmap: ${options.output}`);
  }
  for (const [index, cell] of cellScores(diff, original.width, original.height, options.grid)
    .slice(0, options.top)
    .entries()) {
    console.log(
      `${index + 1}. ${cell.score.toFixed(2)}% x1: ${cell.box.x1}, y1: ${cell.box.y1}, x2: ${cell.box.x2}, y2: ${cell.box.y2}`,
    );
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
