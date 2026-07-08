import { readFile } from "fs/promises";
import path from "path";

export async function comfyHealthCheck(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/system_stats`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function loadWorkflowTemplate(relativePath: string): Promise<Record<string, unknown>> {
  const filePath = path.join(process.cwd(), relativePath);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

export function injectPrompt(workflow: Record<string, unknown>, prompt: string, negativePrompt = "") {
  const next = structuredClone(workflow);
  Object.values(next).forEach((node) => {
    if (!node || typeof node !== "object") return;
    const inputs = (node as { inputs?: Record<string, unknown> }).inputs;
    if (!inputs) return;
    if (typeof inputs.text === "string" && inputs.text.includes("{{PROMPT}}")) {
      inputs.text = String(inputs.text).replace("{{PROMPT}}", prompt);
    }
    if (typeof inputs.text === "string" && inputs.text === "{{PROMPT}}") {
      inputs.text = prompt;
    }
    if (typeof inputs.prompt === "string" && inputs.prompt === "{{PROMPT}}") {
      inputs.prompt = prompt;
    }
    if (typeof inputs.negative === "string" && inputs.negative === "{{NEGATIVE}}") {
      inputs.negative = negativePrompt;
    }
  });
  return next;
}

export function injectImageFilename(workflow: Record<string, unknown>, filename: string) {
  const next = structuredClone(workflow);
  Object.values(next).forEach((node) => {
    if (!node || typeof node !== "object") return;
    const inputs = (node as { inputs?: Record<string, unknown> }).inputs;
    if (!inputs) return;
    if (inputs.image === "{{IMAGE}}") {
      inputs.image = filename;
    }
  });
  return next;
}

export async function submitComfyPrompt(baseUrl: string, workflow: Record<string, unknown>) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI prompt 失败 (${response.status}): ${text.slice(0, 200)}`);
  }
  const data = (await response.json()) as { prompt_id?: string };
  if (!data.prompt_id) throw new Error("ComfyUI 未返回 prompt_id");
  return data.prompt_id;
}

export async function pollComfyHistory(baseUrl: string, promptId: string, timeoutMs = 120000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/history/${promptId}`);
    if (!response.ok) {
      await sleep(1500);
      continue;
    }
    const history = (await response.json()) as Record<
      string,
      { outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }> }
    >;
    const entry = history[promptId];
    const images = entry?.outputs
      ? Object.values(entry.outputs).flatMap((output) => output.images ?? [])
      : [];
    if (images.length > 0) {
      const image = images[0];
      const query = new URLSearchParams({
        filename: image.filename,
        subfolder: image.subfolder ?? "",
        type: image.type ?? "output",
      });
      return `${baseUrl.replace(/\/$/, "")}/view?${query.toString()}`;
    }
    await sleep(1500);
  }
  throw new Error("ComfyUI 生成超时");
}

export async function uploadImageToComfy(baseUrl: string, filePath: string, filename: string) {
  const buffer = await readFile(filePath);
  const form = new FormData();
  form.append("image", new Blob([buffer]), filename);
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/upload/image`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(`ComfyUI 上传图片失败 (${response.status})`);
  }
  const data = (await response.json()) as { name?: string };
  return data.name ?? filename;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
