import type { CreationReference, DecomposePreviewMode, DecomposeResult } from "@/types/worldBuilder";

type UploadResponse =
  | {
      id: string;
      kind: "image" | "video";
      name: string;
      url: string;
      mimeType: string;
    }
  | {
      id: string;
      kind: "text";
      name: string;
      textContent: string;
    };

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `请求失败 (${response.status})`);
  }
  return data;
}

export async function uploadReference(
  file: File,
  scope = "session",
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("scope", scope);
  const response = await fetch("/api/world-builder/upload", {
    method: "POST",
    body: formData,
  });
  return parseJson<UploadResponse>(response);
}

export async function uploadTextReference(
  textContent: string,
  name = "文本参考.txt",
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("textContent", textContent);
  formData.append("name", name);
  const response = await fetch("/api/world-builder/upload", {
    method: "POST",
    body: formData,
  });
  return parseJson<UploadResponse>(response);
}

export async function analyzeMedia(input: {
  kind: "image" | "video";
  url: string;
  name: string;
}): Promise<string> {
  const response = await fetch("/api/world-builder/comfy/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ analysisSummary: string }>(response);
  return data.analysisSummary;
}

export async function decomposeStory(input: {
  prompt: string;
  visualStyle?: string;
  references: CreationReference[];
  useFallback?: boolean;
}): Promise<{ result: DecomposeResult; source: string; warning?: string }> {
  const response = await fetch("/api/world-builder/decompose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson<{ result: DecomposeResult; source: string; warning?: string }>(response);
}

export function filterDecomposePreview(
  result: DecomposeResult,
  mode: DecomposePreviewMode,
): Partial<DecomposeResult> {
  if (mode === "worldview") return { worldview: result.worldview };
  if (mode === "characters") {
    return { characters: result.characters, locations: result.locations };
  }
  if (mode === "script") return { script: result.script };
  return result;
}
