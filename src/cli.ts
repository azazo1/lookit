#!/usr/bin/env bun

import { run as ascii } from "./commands/ascii.ts";
import { run as crop } from "./commands/crop.ts";
import { run as detect } from "./commands/detect.ts";
import { run as dominantColors } from "./commands/dominant-colors.ts";
import { run as extractFg } from "./commands/extract-fg.ts";
import { run as glance } from "./commands/glance.ts";
import { run as ground } from "./commands/ground.ts";
import { run as htmlShot } from "./commands/html-shot.ts";
import { run as human } from "./commands/human.ts";
import { run as modelSvg } from "./commands/model-svg.ts";
import { run as pixelDiff } from "./commands/pixel-diff.ts";
import { run as trace } from "./commands/trace.ts";

const COMMANDS: Record<string, (argv: string[]) => Promise<void>> = {
  glance,
  ground,
  detect,
  trace,
  crop,
  "extract-fg": extractFg,
  "html-shot": htmlShot,
  "model-svg": modelSvg,
  "dominant-colors": dominantColors,
  "pixel-diff": pixelDiff,
  ascii,
  human,
};

const HELP = `用法: lookit <子命令> [参数...]

子命令:
  glance              图片描述/提问/OCR
  ground              定位目标并输出像素框
  detect              盘点图片或区域中的元素
  trace               本地把图片转为 SVG 几何
  crop                把像素盒裁成文件
  extract-fg          提取图标前景
  html-shot           HTML 截图
  model-svg           让视觉模型直接生成 SVG
  dominant-colors     提取区域主色或匹配候选色值
  pixel-diff          比较两张图片的像素差异
  ascii               图片转 ASCII 像素网格
  human               人工注解图片

查看子命令帮助: lookit <子命令> --help
`;

export async function run(argv: string[]): Promise<void> {
  const command = argv[0];
  if (command === undefined || command === "--help" || command === "-h") {
    console.error(HELP.trimEnd());
    process.exit(command === undefined ? 1 : 0);
  }
  const handler = COMMANDS[command];
  if (!handler) {
    console.error(`lookit: 未知子命令 ${command}`);
    console.error(HELP.trimEnd());
    process.exit(1);
  }
  await handler(argv.slice(1));
}

if (import.meta.main) {
  void run(process.argv.slice(2)).catch((error) => {
    console.error(`lookit: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
