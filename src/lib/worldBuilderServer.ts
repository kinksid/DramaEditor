import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type { CreationReference, DecomposeResult } from "@/types/worldBuilder";

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:14b";
export const COMFYUI_BASE_URL = process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188";
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "public/uploads";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function ensureUploadDir(scope = "session") {
  const dir = path.join(process.cwd(), UPLOAD_DIR, scope);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveUploadedFile(
  file: File,
  scope = "session",
): Promise<{ id: string; url: string; name: string; mimeType: string }> {
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

const DECOMPOSE_SYSTEM_PROMPT = `你是互动短剧世界构建助手。根据用户提供的创意描述和参考素材，输出严格的 JSON，用于填充世界设定、角色地点和剧本文本。

输出 JSON schema:
{
  "worldview": {
    "worldTitle": "string",
    "genre": "string，逗号分隔",
    "tags": "string，逗号分隔",
    "tone": "string",
    "visualStyle": "string",
    "worldDescription": "string，200-500字"
  },
  "characters": [
    { "name": "string", "role": "string", "description": "string", "age": number可选 }
  ],
  "locations": [
    { "name": "string", "type": "Establishing|Master|Temporary", "description": "string" }
  ],
  "script": "string，完整剧本文本，含场次"
}

只输出 JSON，不要 markdown 代码块。`;

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

export async function callOllamaDecompose(userPrompt: string): Promise<DecomposeResult> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: DECOMPOSE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama 请求失败 (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  const raw = data.message?.content?.trim();
  if (!raw) throw new Error("Ollama 返回空内容");

  let parsed: DecomposeResult;
  try {
    parsed = JSON.parse(raw) as DecomposeResult;
  } catch {
    throw new Error("Ollama 返回的 JSON 无法解析");
  }

  return normalizeDecomposeResult(parsed, userPrompt);
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

export async function analyzeWithComfyUI(input: {
  kind: "image" | "video";
  url: string;
  name: string;
}): Promise<string> {
  try {
    const health = await fetch(`${COMFYUI_BASE_URL}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!health.ok) {
      return `${input.kind === "video" ? "视频" : "图片"}参考「${input.name}」：ComfyUI 暂不可用，将结合文本创意推断视觉风格。`;
    }
  } catch {
    return `${input.kind === "video" ? "视频" : "图片"}参考「${input.name}」：无法连接 ComfyUI，将结合文本创意推断视觉风格。`;
  }

  return `${input.kind === "video" ? "视频" : "图片"}参考「${input.name}」（${input.url}）：赛博/古风/写实等视觉元素待 ComfyUI workflow 深度分析；当前使用文件名与路径作为风格线索。`;
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
