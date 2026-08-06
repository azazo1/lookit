import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlApp as generatedHtmlApp } from "./human-app-html.ts";
import { readImageSize } from "./human-image.ts";

const DEFAULT_TASK = "请查看图片, 用区域框选和文字注解补充模型无法确认的信息.";
const DEFAULT_LABELS = ["重要", "问题", "文字", "按钮", "区域"];

type Point = { x: number; y: number };
type Box = { x1: number; y1: number; x2: number; y2: number };
type AnnotationShape = "rect" | "polygon" | "point";

type RegionAnnotation = {
  id: string;
  shape: AnnotationShape;
  label: string;
  note: string;
  points: Point[];
  box: Box;
  color: string;
};

type ImageAnnotation = {
  path: string;
  width: number;
  height: number;
  notes: string[];
  regions: RegionAnnotation[];
};

type Submission = {
  task: string;
  images: ImageAnnotation[];
  conclusion: string;
  submittedAt: string;
};

type ImageMeta = {
  id: string;
  path: string;
  name: string;
  width: number;
  height: number;
  source: "path" | "upload";
};

type Options = {
  images: string[];
  host: string;
  port: number;
  open: boolean;
  task: string;
  labels: string[];
  output?: string;
  json: boolean;
  text: boolean;
  timeoutSeconds: number;
  serve: boolean;
};

type RunOptions = {
  defaultServe?: boolean;
};

type Outcome =
  | { type: "submit"; data: Submission }
  | { type: "cancel" }
  | { type: "timeout" };

function fail(message: string): never {
  console.error(`human: ${message}`);
  process.exit(1);
}

function integerValue(value: string | undefined, name: string, min: number, max?: number): number {
  if (value === undefined) {
    fail(`缺少 ${name} 的参数值`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || (max !== undefined && parsed > max)) {
    fail(max === undefined ? `${name} 需要大于等于 ${min} 的整数` : `${name} 需要 ${min}-${max} 的整数`);
  }
  return parsed;
}

function parseArgv(argv: string[], defaultServe: boolean): Options {
  const options: Options = {
    images: [],
    host: "127.0.0.1",
    port: 0,
    open: true,
    task: DEFAULT_TASK,
    labels: DEFAULT_LABELS,
    json: false,
    text: false,
    timeoutSeconds: defaultServe ? 0 : 600,
    serve: defaultServe,
  };
  let serveSeen = false;
  let onceSeen = false;
  let timeoutExplicit = false;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const readValue = (name: string): string | undefined => {
      const value = argv[++index];
      if (value === undefined) {
        fail(`缺少 ${name} 的参数值`);
      }
      return value;
    };

    if (arg === "--host") {
      options.host = readValue("--host");
    } else if (arg === "--port") {
      options.port = integerValue(readValue("--port"), "--port", 0, 65535);
    } else if (arg === "--timeout") {
      timeoutExplicit = true;
      options.timeoutSeconds = integerValue(readValue("--timeout"), "--timeout", 0);
    } else if (arg === "--task") {
      options.task = readValue("--task");
    } else if (arg === "--labels") {
      const labels = readValue("--labels")
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean);
      if (!labels.length) {
        fail("--labels 至少需要一个标签");
      }
      options.labels = labels;
    } else if (arg === "--output" || arg === "-o") {
      options.output = readValue(arg);
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--text") {
      options.text = true;
    } else if (arg === "--no-open") {
      options.open = false;
    } else if (arg === "--serve") {
      serveSeen = true;
      options.serve = true;
    } else if (arg === "--once") {
      onceSeen = true;
      options.serve = false;
    } else if (arg.startsWith("--host=")) {
      options.host = arg.slice("--host=".length);
    } else if (arg.startsWith("--port=")) {
      options.port = integerValue(arg.slice("--port=".length), "--port", 0, 65535);
    } else if (arg.startsWith("--timeout=")) {
      timeoutExplicit = true;
      options.timeoutSeconds = integerValue(arg.slice("--timeout=".length), "--timeout", 0);
    } else if (arg.startsWith("--task=")) {
      options.task = arg.slice("--task=".length);
    } else if (arg.startsWith("--labels=")) {
      const labels = arg
        .slice("--labels=".length)
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean);
      if (!labels.length) {
        fail("--labels 至少需要一个标签");
      }
      options.labels = labels;
    } else if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
    } else if (arg === "--help" || arg === "-h") {
      console.error(
        "用法: human [<图片> ...] [--serve | --once] " +
          "[--host 127.0.0.1] [--port 0] [--task 问题] [--labels 标签1,标签2] " +
          "[--output 注解.json] [--json | --text] [--timeout 秒数] [--no-open]",
      );
      console.error("不带图片时使用 --serve 打开空页面, 可粘贴图片或输入本机路径");
      process.exit(0);
    } else if (arg.startsWith("-") && arg !== "-") {
      fail(`未知选项: ${arg}`);
    } else {
      options.images.push(arg);
    }
  }

  if (serveSeen && onceSeen) {
    fail("--serve 和 --once 不能同时使用");
  }
  if (!options.images.length && !options.serve) {
    fail("空页面需要 --serve 模式, 请传入图片或加 --serve");
  }
  if (!options.serve && !timeoutExplicit) {
    options.timeoutSeconds = 600;
  }
  if (options.json && options.text) {
    fail("--json 和 --text 不能同时使用");
  }
  if (options.serve && options.timeoutSeconds !== 0) {
    console.error("human: --serve 模式默认不限时, 已忽略 --timeout");
    options.timeoutSeconds = 0;
  }
  return options;
}

async function loadImageMetas(paths: string[]): Promise<ImageMeta[]> {
  const metas: ImageMeta[] = [];
  for (const path of paths) {
    if (!existsSync(path)) {
      fail(`图片不存在: ${path}`);
    }
    const size = readImageSize(path);
    metas.push({
      id: randomUUID(),
      path,
      name: basename(path),
      width: size.width,
      height: size.height,
      source: "path",
    });
  }
  return metas;
}

function contentType(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function openBrowser(url: string): void {
  let command: string;
  let args: string[];
  if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else if (process.platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    args = [url];
  }
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizePoints(value: unknown): Point[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const points: Point[] = [];
  for (const item of value) {
    const point = asRecord(item);
    const x = Number(point.x);
    const y = Number(point.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
    }
  }
  return points;
}

function clampPoints(points: Point[], width: number, height: number): Point[] {
  return points.map((point) => ({
    x: Math.max(0, Math.min(width, Math.round(point.x))),
    y: Math.max(0, Math.min(height, Math.round(point.y))),
  }));
}

function boxForPoints(points: Point[]): Box {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    x1: Math.min(...xs),
    y1: Math.min(...ys),
    x2: Math.max(...xs),
    y2: Math.max(...ys),
  };
}

function normalizeRegion(value: unknown, width: number, height: number): RegionAnnotation | null {
  const raw = asRecord(value);
  const shapeValue = stringValue(raw.shape);
  const shape: AnnotationShape =
    shapeValue === "rect" || shapeValue === "polygon" || shapeValue === "point" ? shapeValue : "rect";
  const points = clampPoints(normalizePoints(raw.points), width, height);
  if (
    (shape === "rect" && points.length < 2) ||
    (shape === "polygon" && points.length < 3) ||
    (shape === "point" && points.length < 1)
  ) {
    return null;
  }
  const color = stringValue(raw.color);
  return {
    id: stringValue(raw.id) || `region-${randomUUID()}`,
    shape,
    label: stringValue(raw.label).trim(),
    note: stringValue(raw.note).trim(),
    points,
    box: boxForPoints(points),
    color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#d45d3a",
  };
}

function normalizeSubmission(value: unknown, metas: ImageMeta[], task: string): Submission {
  const raw = asRecord(value);
  const rawImages = Array.isArray(raw.images) ? raw.images : [];
  const images: ImageAnnotation[] = metas.map((meta, index) => {
    const rawImage = asRecord(rawImages[index]);
    const rawNotes = Array.isArray(rawImage.notes) ? rawImage.notes : [];
    const notes = rawNotes
      .map((note) => stringValue(note).trim())
      .filter((note) => note.length > 0);
    const rawRegions = Array.isArray(rawImage.regions) ? rawImage.regions : [];
    const regions = rawRegions
      .map((region) => normalizeRegion(region, meta.width, meta.height))
      .filter((region): region is RegionAnnotation => region !== null);
    return {
      path: meta.path,
      width: meta.width,
      height: meta.height,
      notes,
      regions,
    };
  });
  return {
    task,
    images,
    conclusion: stringValue(raw.conclusion).trim(),
    submittedAt: new Date().toISOString(),
  };
}

function writeSubmission(path: string, submission: Submission): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(submission, null, 2)}\n`, "utf8");
}

function formatText(submission: Submission): string {
  const lines = [`任务: ${submission.task}`, `结论: ${submission.conclusion || "(未填写)"}`];
  for (const [imageIndex, image] of submission.images.entries()) {
    lines.push(`${imageIndex + 1}. ${image.path} (${image.width}x${image.height})`);
    for (const [regionIndex, region] of image.regions.entries()) {
      const box = `${region.box.x1},${region.box.y1},${region.box.x2},${region.box.y2}`;
      const note = region.note ? ` - ${region.note}` : "";
      lines.push(`  区域 ${regionIndex + 1} [${region.shape}] ${region.label} ${box}${note}`);
    }
    for (const note of image.notes) {
      lines.push(`  备注: ${note}`);
    }
  }
  return lines.join("\n");
}

function printSubmission(submission: Submission, options: Options): void {
  if (options.text) {
    console.log(formatText(submission));
  } else {
    console.log(JSON.stringify(submission, null, 2));
  }
}

function displayHost(host: string): string {
  if (host === "0.0.0.0" || host === "::") {
    return "127.0.0.1";
  }
  return host.includes(":") ? `[${host}]` : host;
}

function safeUploadName(name: string): string {
  const clean = basename(name).replace(/[^0-9A-Za-z._-]+/g, "_");
  return clean || `upload-${Date.now()}`;
}

function cleanupUpload(meta: ImageMeta | undefined): void {
  if (!meta || meta.source !== "upload") {
    return;
  }
  try {
    unlinkSync(meta.path);
  } catch {
    // The temp file may already be gone.
  }
}

export async function runHuman(argv: string[], runOptions: RunOptions = {}): Promise<void> {
  const options = parseArgv(argv, runOptions.defaultServe ?? false);
  let metas = await loadImageMetas(options.images);
  let htmlSource = generatedHtmlApp;
  try {
    const htmlPath = join(dirname(fileURLToPath(import.meta.url)), "human-app.html");
    htmlSource = readFileSync(htmlPath, "utf8");
  } catch {
    // The compiled CLI carries the generated HTML copy.
  }
  const uploadRoot = mkdtempSync(join(tmpdir(), "lookit-human-"));
  process.once("exit", () => {
    try {
      rmSync(uploadRoot, { recursive: true, force: true });
    } catch {
      // Best effort cleanup for uploaded files.
    }
  });

  const token = randomUUID();
  let resolveOutcome: (outcome: Outcome) => void = () => {};
  const outcomePromise = new Promise<Outcome>((resolve) => {
    resolveOutcome = resolve;
  });

  let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  let deadline: number | undefined;
  let timeoutSeconds = options.timeoutSeconds;
  let submissionCounter = 0;

  const clearTimeoutTimer = (): void => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = undefined;
    }
  };

  const scheduleTimeout = (seconds: number): void => {
    timeoutSeconds = Math.max(0, Math.floor(seconds));
    clearTimeoutTimer();
    if (timeoutSeconds === 0) {
      deadline = undefined;
      return;
    }
    deadline = Date.now() + timeoutSeconds * 1000;
    timeoutTimer = setTimeout(() => resolveOutcome({ type: "timeout" }), timeoutSeconds * 1000);
  };

  if (!options.serve) {
    scheduleTimeout(options.timeoutSeconds);
  }

  const server = Bun.serve({
    hostname: options.host,
    port: options.port,
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/") {
        if (!url.searchParams.has("token")) {
          return new Response(null, {
            status: 302,
            headers: { Location: `/?token=${encodeURIComponent(token)}` },
          });
        }
        return new Response(htmlSource, {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      const authorized =
        url.searchParams.get("token") === token || request.headers.get("x-lookit-token") === token;
      if (!authorized) {
        return new Response("Unauthorized", { status: 401 });
      }

      if (url.pathname === "/api/meta") {
        return Response.json({
          task: options.task,
          labels: options.labels,
          images: metas,
          timeoutSeconds,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          serveMode: options.serve,
        });
      }

      if (url.pathname.startsWith("/api/image/")) {
        const imageId = decodeURIComponent(url.pathname.slice("/api/image/".length));
        const index = metas.findIndex((item) => item.id === imageId);
        const meta = metas[index];
        if (!meta) {
          return new Response("Not Found", { status: 404 });
        }
        if (request.method === "DELETE") {
          cleanupUpload(meta);
          metas.splice(index, 1);
          return Response.json({ ok: true, images: metas });
        }
        return new Response(Bun.file(meta.path), {
          headers: {
            "Content-Type": contentType(meta.path),
            "Cache-Control": "no-store",
          },
        });
      }

      if (url.pathname === "/api/open-path" && request.method === "POST") {
        try {
          const body = asRecord(await request.json());
          const requestedPath = stringValue(body.path).trim();
          if (!requestedPath) {
            return Response.json({ ok: false, error: "请输入图片路径" }, { status: 400 });
          }
          const target = resolve(requestedPath);
          if (!existsSync(target)) {
            return Response.json({ ok: false, error: `图片不存在: ${target}` }, { status: 400 });
          }
          const size = readImageSize(target);
          const meta: ImageMeta = {
            id: randomUUID(),
            path: target,
            name: basename(target),
            width: size.width,
            height: size.height,
            source: "path",
          };
          metas.push(meta);
          return Response.json({ ok: true, meta, images: metas });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : String(error) },
            { status: 400 },
          );
        }
      }

      if (url.pathname === "/api/upload" && request.method === "POST") {
        try {
          const form = await request.formData();
          const file = form.get("file");
          if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
            return Response.json({ ok: false, error: "缺少图片文件" }, { status: 400 });
          }
          const uploaded = file as File;
          const displayName = uploaded.name || "粘贴图片";
          const target = join(uploadRoot, `${randomUUID()}-${safeUploadName(displayName)}`);
          writeFileSync(target, Buffer.from(await uploaded.arrayBuffer()));
          const size = readImageSize(target);
          const meta: ImageMeta = {
            id: randomUUID(),
            path: target,
            name: displayName,
            width: size.width,
            height: size.height,
            source: "upload",
          };
          metas.push(meta);
          return Response.json({ ok: true, meta, images: metas });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : String(error) },
            { status: 400 },
          );
        }
      }

      if (url.pathname === "/api/submit" && request.method === "POST") {
        try {
          const body: unknown = await request.json();
          const submission = normalizeSubmission(body, metas, options.task);
          submissionCounter += 1;
          if (options.output) {
            writeSubmission(options.output, submission);
          }
          if (options.serve) {
            console.log(`提交 #${submissionCounter} 已接收`);
            printSubmission(submission, options);
            return Response.json({
              ok: true,
              submission,
              counter: submissionCounter,
              serveMode: true,
            });
          }
          setTimeout(() => resolveOutcome({ type: "submit", data: submission }), 0);
          return Response.json({
            ok: true,
            submission,
            counter: submissionCounter,
            serveMode: false,
          });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : String(error) },
            { status: 400 },
          );
        }
      }

      if (url.pathname === "/api/extend" && request.method === "POST") {
        if (options.serve) {
          return Response.json({ ok: true, timeoutSeconds: 0, deadline: null });
        }
        try {
          const body: unknown = await request.json();
          const requested = Number(asRecord(body).seconds);
          const extra = Number.isFinite(requested)
            ? Math.max(30, Math.min(3600, Math.floor(requested)))
            : 300;
          const remaining = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0;
          scheduleTimeout(remaining + extra);
          console.log(`用户点击延长超时, 增加 ${extra} 秒, 剩余 ${timeoutSeconds} 秒`);
          return Response.json({
            ok: true,
            timeoutSeconds,
            deadline: new Date(deadline as number).toISOString(),
          });
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : String(error) },
            { status: 400 },
          );
        }
      }

      if (url.pathname === "/api/cancel" && request.method === "POST") {
        if (options.serve) {
          for (const meta of metas) {
            cleanupUpload(meta);
          }
          metas = [];
          return Response.json({ ok: true, reset: true });
        }
        setTimeout(() => resolveOutcome({ type: "cancel" }), 0);
        return Response.json({ ok: true });
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  console.log(`服务监听: http://${options.host}:${server.port}`);
  const pageUrl = `http://${displayHost(options.host)}:${server.port}/?token=${encodeURIComponent(token)}`;
  console.log(`审查页面: ${pageUrl}`);
  if (options.open) {
    openBrowser(pageUrl);
    console.log("已尝试打开浏览器");
  }
  if (options.serve) {
    console.log("持续服务已启动, 提交后保持运行, 默认不限时");
    console.log("按 Ctrl+C 停止服务");
    await new Promise<void>(() => {});
    return;
  }

  console.log(`等待人工审查, 超时 ${timeoutSeconds} 秒`);
  const outcome = await outcomePromise;
  clearTimeoutTimer();
  await new Promise((resolve) => setTimeout(resolve, 100));
  server.stop(true);

  if (outcome.type === "cancel") {
    fail("用户已取消审查");
  }
  if (outcome.type === "timeout") {
    fail(`等待人工审查超时 (${timeoutSeconds} 秒), 未获得注解`);
  }
  printSubmission(outcome.data, options);
}

if (import.meta.main) {
  void runHuman(process.argv.slice(2)).catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
  });
}
