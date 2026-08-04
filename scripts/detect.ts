import { locate, position, type Match } from "./ground-utils.ts";

type Options = {
  image: string;
  category?: string;
  region?: string;
};

const DEFAULT_CATEGORY = "UI 元素 (按钮, 链接, 输入框, 图标, 标签, 标题, 图片, 徽章)";

function fail(message: string): never {
  console.error(`detect: ${message}`);
  process.exit(1);
}

function parseArgv(argv: string[]): Options {
  const positional: string[] = [];
  let region: string | undefined;
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--region") {
      const value = argv[++index];
      if (value === undefined) {
        fail("缺少 --region 的参数值");
      }
      region = value;
    } else if (arg.startsWith("--region=")) {
      region = arg.slice("--region=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error("用法: bun run scripts/detect.ts <图片> [类别] [--region X1,Y1,X2,Y2]");
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (!positional.length) {
    fail("需要图片路径");
  }
  return {
    image: positional[0],
    category: positional[1],
    region,
  };
}

function buildTarget(category: string | undefined): string {
  return `每一个独立的${category ?? DEFAULT_CATEGORY}, 每个 label 包含准确的可见文字`;
}

function formatInventory(matches: Match[], width: number, height: number): string[] {
  if (!matches.length) {
    return ["没有检测到元素"];
  }
  return matches.map((match, index) => {
    const [x1, y1, x2, y2] = match.bbox;
    return `${index + 1}. ${position(match.bbox, width, height)} ${match.label} x1: ${x1}, y1: ${y1}, x2: ${x2}, y2: ${y2}`;
  });
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  const { matches, width, height } = await locate(options.image, buildTarget(options.category), options.region);
  for (const line of formatInventory(matches, width, height)) {
    console.log(line);
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
