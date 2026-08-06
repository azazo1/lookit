import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(scriptDir, "human-app.html"), "utf8");
const escaped = html.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${");
const moduleSource = `export const htmlApp = \`${escaped}\`;\n`;
writeFileSync(join(scriptDir, "human-app-html.ts"), moduleSource, "utf8");
console.log("已生成 scripts/standalone/human/human-app-html.ts");
