import { formatMatches, locate } from "./ground-utils.ts";

type Options = {
  image: string;
  target: string;
  region?: string;
};

function fail(message: string): never {
  console.error(`ground: ${message}`);
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
      console.error("用法: bun run scripts/ground.ts <图片> <目标描述> [--region X1,Y1,X2,Y2]");
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 2) {
    fail("需要图片路径和目标描述两个参数");
  }
  return { image: positional[0], target: positional[1], region };
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  const { matches, width, height } = await locate(options.image, options.target, options.region);
  for (const line of formatMatches(matches, width, height)) {
    console.log(line);
  }
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
