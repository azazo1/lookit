import { existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Options = {
  source: string;
  output?: string;
  width: number;
  height: number;
  scale: number;
  waitMs: number;
};

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "google-chrome",
  "google-chrome-stable",
  "chromium",
  "chromium-browser",
  "microsoft-edge",
  "brave-browser",
];

function fail(message: string): never {
  console.error(`html_shot: ${message}`);
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

function commandInPath(name: string): boolean {
  try {
    execFileSync(name, ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findChrome(): string | undefined {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate.startsWith("/") && existsSync(candidate)) {
      return candidate;
    }
    if (!candidate.includes("/") && commandInPath(candidate)) {
      return candidate;
    }
  }
  for (const envName of ["PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"]) {
    const base = process.env[envName];
    if (!base) {
      continue;
    }
    for (const sub of ["Google/Chrome/Application/chrome.exe", "Microsoft/Edge/Application/msedge.exe"]) {
      const path = join(base, sub);
      if (existsSync(path)) {
        return path;
      }
    }
  }
  return undefined;
}

function defaultOutput(source: string): string {
  if (/^(https?|file|data):/.test(source)) {
    try {
      const stem = basename(new URL(source).pathname, extname(new URL(source).pathname));
      return `${stem || "page"}.png`;
    } catch {
      return "page.png";
    }
  }
  return `${basename(source, extname(source))}.png`;
}

function parseArgv(argv: string[]): Options {
  const positional: string[] = [];
  const options: Options = { source: "", width: 1280, height: 800, scale: 1, waitMs: 0 };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (
      arg === "--output" || arg === "-o" || arg === "--width" ||
      arg === "--height" || arg === "--scale" || arg === "--wait-ms"
    ) {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${arg} 的参数值`);
      }
      if (arg === "--output" || arg === "-o") {
        options.output = value;
      } else if (arg === "--width") {
        options.width = integerValue(value, "--width", 1);
      } else if (arg === "--height") {
        options.height = integerValue(value, "--height", 1);
      } else if (arg === "--scale") {
        options.scale = integerValue(value, "--scale", 1);
      } else {
        options.waitMs = integerValue(value, "--wait-ms", 0);
      }
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg.startsWith("--width=")) {
      options.width = integerValue(arg.slice("--width=".length), "--width", 1);
    } else if (arg.startsWith("--height=")) {
      options.height = integerValue(arg.slice("--height=".length), "--height", 1);
    } else if (arg.startsWith("--scale=")) {
      options.scale = integerValue(arg.slice("--scale=".length), "--scale", 1);
    } else if (arg.startsWith("--wait-ms=")) {
      options.waitMs = integerValue(arg.slice("--wait-ms=".length), "--wait-ms", 0);
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: bun run scripts/html_shot.ts <HTML 文件或 URL> " +
          "[--width N] [--height N] [--scale N] [--wait-ms N] [-o 输出.png]",
      );
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) {
    fail("需要提供一个 HTML 文件或 URL");
  }
  options.source = positional[0];
  return options;
}

async function main(): Promise<void> {
  const options = parseArgv(process.argv.slice(2));
  const chrome = findChrome();
  if (!chrome) {
    fail("没有找到 Chrome/Chromium/Edge, 请先安装一个浏览器");
  }
  let source = options.source;
  if (!/^(https?|file|data):/.test(source)) {
    const path = resolve(source);
    if (!existsSync(path)) {
      fail(`文件不存在: ${path}`);
    }
    source = pathToFileURL(path).href;
  }
  const output = resolve(options.output ?? defaultOutput(source));
  const args = [
    chrome,
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--window-size=${options.width},${options.height}`,
    `--screenshot=${output}`,
  ];
  if (options.scale !== 1) {
    args.push(`--force-device-scale-factor=${options.scale}`);
  }
  if (options.waitMs > 0) {
    args.push(`--virtual-time-budget=${options.waitMs}`);
  }
  args.push(source);
  const result = spawnSync(args[0], args.slice(1), { encoding: "utf8" });
  if (result.status !== 0 || !existsSync(output)) {
    const message =
      result.stderr?.trim() ||
      result.stdout?.trim() ||
      (result.error instanceof Error ? `Chrome 启动失败: ${result.error.message}` : `Chrome 退出码 ${result.status ?? "未知"}`);
    fail(`截图失败: ${message}`);
  }
  console.log(`wrote ${output} (${options.width * options.scale}x${options.height * options.scale})`);
}

void main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
