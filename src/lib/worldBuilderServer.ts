import { readFile } from "fs/promises";
import path from "path";
import type { CreationReference, DecomposeResult } from "@/types/worldBuilder";
import { runLlmTask, runLlmTaskJson } from "@/lib/providers/llm/resolveTask";
import { analyzeImageWithComfy } from "@/lib/providers/image/comfyui";

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:14b";
export const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188";
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "public/uploads";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function ensureUploadDir(scope = "session") {
  const { mkdir } = await import("fs/promises");
  const dir = path.join(process.cwd(), UPLOAD_DIR, scope);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveUploadedFile(
  file: File,
  scope = "session",
): Promise<{ id: string; url: string; name: string; mimeType: string }> {
  const { mkdir, writeFile } = await import("fs/promises");
  const { v4: uuidv4 } = await import("uuid");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`文件过大，最大支持 ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB`);
  }
  const dir = await ensureUploadDir(scope);
  const id = uuidv4();
  const ext = path.extname(file.name) || "";
  const filename = `${id}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  const url = `/uploads/${scope}/${filename}`;
  return { id, url, name: file.name, mimeType: file.type || "application/octet-stream" };
}

export function referenceKindFromMime(mimeType: string, filename: string): CreationReference["kind"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  const lower = filename.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower)) return "image";
  if (/\.(mp4|webm|mov|avi|mkv)$/i.test(lower)) return "video";
  return "text";
}

export async function readUploadAsBase64(url: string): Promise<string | null> {
  if (!url.startsWith("/uploads/")) return null;
  try {
    const filePath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
    const buffer = await readFile(filePath);
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

export async function collectReferenceImagesBase64(
  references: Array<Pick<CreationReference, "kind" | "url">>,
): Promise<string[]> {
  const images: string[] = [];
  for (const ref of references) {
    if (ref.kind !== "image" || !ref.url) continue;
    const base64 = await readUploadAsBase64(ref.url);
    if (base64) images.push(base64);
  }
  return images;
}

export function buildDecomposeUserPrompt(input: {
  prompt: string;
  visualStyle?: string;
  references: Array<Pick<CreationReference, "kind" | "name" | "textContent" | "analysisSummary">>;
}) {
  const refBlocks = input.references.map((ref, index) => {
    if (ref.kind === "text" && ref.textContent) {
      return `参考${index + 1}（文本「${ref.name}」）：\n${ref.textContent}`;
    }
    if (ref.analysisSummary) {
      return `参考${index + 1}（${ref.kind}「${ref.name}」）：\n${ref.analysisSummary}`;
    }
    return `参考${index + 1}（${ref.kind}「${ref.name}」）：已上传，请结合创意推断。`;
  });

  return [
    `创意描述：\n${input.prompt || "（无）"}`,
    input.visualStyle ? `视觉风格偏好：${input.visualStyle}` : "",
    refBlocks.length > 0 ? `参考素材：\n${refBlocks.join("\n\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function callLlmDecompose(
  userPrompt: string,
  options?: { images?: string[] },
): Promise<DecomposeResult> {
  const { data } = await runLlmTaskJson<DecomposeResult>("decompose", {
    custom: userPrompt,
    images: options?.images,
  });
  return normalizeDecomposeResult(data, userPrompt);
}

/** @deprecated 使用 callLlmDecompose */
export async function callOllamaDecompose(userPrompt: string): Promise<DecomposeResult> {
  return callLlmDecompose(userPrompt);
}

export function normalizeDecomposeResult(
  parsed: Partial<DecomposeResult>,
  fallbackPrompt: string,
): DecomposeResult {
  const worldview = parsed.worldview ?? ({} as DecomposeResult["worldview"]);
  return {
    worldview: {
      worldTitle: worldview.worldTitle || "未命名世界",
      genre: worldview.genre || "",
      tags: worldview.tags || "",
      tone: worldview.tone || "",
      visualStyle: worldview.visualStyle || "",
      worldDescription: worldview.worldDescription || fallbackPrompt.slice(0, 500),
    },
    characters: (parsed.characters ?? []).map((c) => ({
      name: c.name || "未命名角色",
      role: c.role || "角色",
      description: c.description || "",
      age: c.age,
    })),
    locations: (parsed.locations ?? []).map((l) => ({
      name: l.name || "未命名地点",
      type: l.type === "Establishing" || l.type === "Master" || l.type === "Temporary" ? l.type : "Temporary",
      description: l.description || "",
    })),
    script: parsed.script || fallbackPrompt,
  };
}

export async function analyzeReferenceWithLlm(input: {
  url: string;
  name: string;
}): Promise<string | null> {
  const base64 = await readUploadAsBase64(input.url);
  if (!base64) return null;
  const result = await runLlmTask("reference_analyze", {
    custom: input.name,
    images: [base64],
  });
  return result.content;
}

export async function analyzeWithComfyUI(input: {
  kind: "image" | "video";
  url: string;
  name: string;
}): Promise<string> {
  if (input.kind === "image") {
    try {
      const llmSummary = await analyzeReferenceWithLlm({ url: input.url, name: input.name });
      if (llmSummary) {
        return `图片参考「${input.name}」：${llmSummary}`;
      }
    } catch {
      // fallback to ComfyUI caption
    }
    return analyzeImageWithComfy({ url: input.url, name: input.name });
  }

  try {
    const health = await fetch(`${COMFYUI_BASE_URL}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!health.ok) {
      return `视频参考「${input.name}」：ComfyUI 暂不可用，将结合文本创意推断视觉风格。`;
    }
  } catch {
    return `视频参考「${input.name}」：无法连接 ComfyUI，将结合文本创意推断视觉风格。`;
  }

  return `视频参考「${input.name}」（${input.url}）：已通过 ComfyUI 连通，可结合关键帧 workflow 分析视觉风格。`;
}

export async function expandTxt2ImgPrompt(prompt: string): Promise<string> {
  const result = await runLlmTask("txt2img_prompt", { custom: prompt });
  return result.content.trim() || prompt;
}

export function fallbackDecompose(input: {
  prompt: string;
  visualStyle?: string;
  references: CreationReference[];
}): DecomposeResult {
  const refSummary = input.references
    .map((ref) => ref.textContent || ref.analysisSummary || ref.name)
    .filter(Boolean)
    .join("；");

  return normalizeDecomposeResult(
    {
      worldview: {
        worldTitle: "未命名世界",
        genre: "",
        tags: "",
        tone: "",
        visualStyle: input.visualStyle ?? "",
        worldDescription: input.prompt,
      },
      characters: [{ name: "主角", role: "主角", description: "待完善" }],
      locations: [{ name: "主场景", type: "Master", description: refSummary || input.prompt.slice(0, 120) }],
      script: input.prompt,
    },
    input.prompt,
  );
}
