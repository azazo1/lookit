import { existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import sharp from "sharp";
import { imageSize, parseRegion } from "./image-utils.ts";

type Options = {
  image: string;
  region?: string;
  output?: string;
  scale: number;
};

function fail(message: string): never {
  console.error(`crop: ${message}`);
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
  const options: Options = { image: "", scale: 1 };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--region" || arg === "--output" || arg === "-o" || arg === "--scale") {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${arg} 的参数值`);
      }
      if (arg === "--region") {
        options.region = value;
      } else if (arg === "--output" || arg === "-o") {
        options.output = value;
      } else {
        options.scale = integerValue(value, "--scale");
      }
    } else if (arg.startsWith("--region=")) {
      options.region = arg.slice("--region=".length);
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg.startsWith("--scale=")) {
      options.scale = integerValue(arg.slice("--scale=".length), "--scale");
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/crop.ts <图片> --region X1,Y1,X2,Y2 [-o 输出.png] [--scale N]",
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

function defaultOutput(image: string, scale: number): string {
  const suffix = scale > 1 ? `.crop@${scale}x` : ".crop";
  return join(dirname(image), `${basename(image, extname(image))}${suffix}.png`);
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  if (!existsSync(options.image)) {
    fail(`图片不存在: ${options.image}`);
  }
  if (!options.region) {
    fail("需要 --region X1,Y1,X2,Y2");
  }
  const { width, height } = await imageSize(options.image);
  const box = parseRegion(options.region, width, height);
  const parts = options.region.split(",").map(Number);
  const requested = [parts[0], parts[1], parts[2], parts[3]];
  const actual = [box.x1, box.y1, box.x2, box.y2];
  if (requested.some((value, index) => value !== actual[index])) {
    console.error(`crop: 区域 ${options.region} 已收敛为 ${actual.join(",")}`);
  }
  const output = options.output ?? defaultOutput(options.image, options.scale);
  let pipeline = sharp(options.image, { failOn: "none" }).extract({
    left: box.x1,
    top: box.y1,
    width: box.x2 - box.x1,
    height: box.y2 - box.y1,
  });
  if (options.scale > 1) {
    pipeline = pipeline.resize((box.x2 - box.x1) * options.scale, (box.y2 - box.y1) * options.scale, {
      fit: "fill",
      kernel: sharp.kernel.lanczos3,
    });
  }
  await pipeline.png().toFile(output);
  console.log(`wrote ${output} (${(box.x2 - box.x1) * options.scale}x${(box.y2 - box.y1) * options.scale})`);
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
