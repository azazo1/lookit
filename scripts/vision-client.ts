import sharp from "sharp";
import { imageSize, parseRegion } from "./image-utils.ts";

export class VisionError extends Error {}

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new VisionError(`缺少配置 ${name}, 请先填写环境变量`);
  }
  return value;
}

export function validateVisionConfig(): void {
  for (const name of ["LOOKIT_API_KEY", "LOOKIT_BASE_URL", "LOOKIT_MODEL"]) {
    required(name);
  }
}

export async function imagePathToDataUrl(path: string): Promise<string> {
  const extension = path.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) {
    throw new VisionError("只支持 PNG / JPEG / GIF / WebP 图片");
  }
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new VisionError(`图片不存在: ${path}`);
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
}

export async function cropToDataUrl(path: string, region: string): Promise<string> {
  const { width, height } = await imageSize(path);
  const box = parseRegion(region, width, height);
  const buffer = await sharp(path, { failOn: "none" })
    .extract({
      left: box.x1,
      top: box.y1,
      width: box.x2 - box.x1,
      height: box.y2 - box.y1,
    })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

function messageText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("\n")
      .trim();
  }
  return "";
}

export async function describeImage(
  urls: string | string[],
  prompt?: string,
  maxTokens?: number,
  applyLang = true,
): Promise<string> {
  validateVisionConfig();
  const imageUrls = Array.isArray(urls) ? urls : [urls];
  if (!imageUrls.length) {
    throw new VisionError("没有提供图片");
  }
  for (const url of imageUrls) {
    if (!url.startsWith("data:") && !url.startsWith("http://") && !url.startsWith("https://")) {
      throw new VisionError("图片必须是 data URL 或 http(s) URL");
    }
  }

  const baseUrl = required("LOOKIT_BASE_URL").replace(/\/+$/, "");
  const apiKey = required("LOOKIT_API_KEY");
  const model = required("LOOKIT_MODEL");
  let text = prompt ?? "请详细描述这张图片的内容.";
  const language = process.env.LOOKIT_LANG?.trim().toLowerCase();
  if (applyLang) {
    if (language === "zh") {
      text = `请使用简体中文回答.\n\n${text}`;
    } else if (language === "en") {
      text = `Please respond in English.\n\n${text}`;
    }
  }

  const payload: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text },
          ...imageUrls.map((url) => ({ type: "image_url", image_url: { url } })),
        ],
      },
    ],
  };
  if (maxTokens !== undefined) {
    payload.max_tokens = maxTokens;
  }

  const retries = 2;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180_000),
      });
      if (!response.ok) {
        const body = (await response.text()).replaceAll(apiKey, "<已隐藏>");
        if ((response.status === 429 || response.status >= 500) && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(2 ** attempt, 4) * 1000));
          continue;
        }
        throw new VisionError(`视觉 API HTTP ${response.status}: ${body}`);
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: unknown } }>;
      };
      const answer = messageText(data?.choices?.[0]?.message?.content);
      if (!answer) {
        throw new VisionError("视觉 API 返回了空描述");
      }
      return answer;
    } catch (error) {
      if (error instanceof VisionError) {
        throw error;
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(2 ** attempt, 4) * 1000));
        continue;
      }
      throw new VisionError(`视觉 API 网络错误: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new VisionError("视觉 API 请求失败");
}
