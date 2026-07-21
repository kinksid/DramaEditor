import { readFile } from "fs/promises";
import path from "path";

export type ComfyImageOutput = {
  filename: string;
  subfolder?: string;
  type?: string;
};

export type ComfyHistoryEntry = {
  outputs?: Record<string, { images?: ComfyImageOutput[] }>;
  status?: {
    status_str?: string;
    messages?: unknown[];
  };
};

export function buildComfyViewUrl(baseUrl: string, image: ComfyImageOutput): string {
  const query = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder ?? "",
    type: image.type ?? "output",
  });
  return `${baseUrl.replace(/\/$/, "")}/view?${query.toString()}`;
}

export type ComfyHealthResult = {
  ok: boolean;
  baseUrl: string;
  statusCode?: number;
  error?: string;
};

function normalizeComfyBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

function describeFetchError(baseUrl: string, error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause as { code?: string } | undefined;
    const code = cause?.code ?? (error as NodeJS.ErrnoException).code;
    if (code === "ECONNREFUSED") {
      return `无法连接 ${baseUrl}（连接被拒绝）。请确认 ComfyUI 已启动、已开启 --listen，且 IP/端口正确。`;
    }
    if (code === "ENOTFOUND") {
      return `无法解析主机 ${baseUrl}，请检查 Base URL 是否填写正确。`;
    }
    if (code === "ETIMEDOUT" || error.name === "TimeoutError" || /timed out/i.test(error.message)) {
      return `连接 ${baseUrl} 超时。请确认局域网可达、防火墙已放行 TCP 8188，且 Comfy Desktop 允许外部访问。`;
    }
    if (/fetch failed/i.test(error.message)) {
      return `无法访问 ${baseUrl}。请确认 ComfyUI 在线且本机能 ping 通该地址。`;
    }
    return `${baseUrl}：${error.message}`;
  }
  return `无法连接 ${baseUrl}`;
}

export async function comfyHealthCheckDetailed(
  baseUrl: string,
  timeoutMs = 12_000,
): Promise<ComfyHealthResult> {
  const normalized = normalizeComfyBaseUrl(baseUrl);
  if (!normalized) {
    return { ok: false, baseUrl: baseUrl.trim(), error: "Base URL 为空" };
  }

  const endpoints = ["/system_stats", "/queue"];
  let lastError: string | undefined;
  let lastStatus: number | undefined;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${normalized}${endpoint}`, {
        signal: AbortSignal.timeout(timeoutMs),
      });
      lastStatus = response.status;
      if (response.ok) {
        return { ok: true, baseUrl: normalized, statusCode: response.status };
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = describeFetchError(normalized, error);
    }
  }

  return {
    ok: false,
    baseUrl: normalized,
    statusCode: lastStatus,
    error: lastError ?? `无法访问 ${normalized}`,
  };
}

export async function comfyHealthCheck(baseUrl: string, timeoutMs = 12_000): Promise<boolean> {
  const result = await comfyHealthCheckDetailed(baseUrl, timeoutMs);
  return result.ok;
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

export async function submitComfyPrompt(
  baseUrl: string,
  workflow: Record<string, unknown>,
  clientId?: string,
) {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: workflow,
      ...(clientId ? { client_id: clientId } : {}),
    }),
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
  const entry = await pollComfyHistoryEntry(baseUrl, promptId, { timeoutMs });
  const images = entry.outputs
    ? Object.values(entry.outputs).flatMap((output) => output.images ?? [])
    : [];
  if (images.length === 0) {
    throw new Error("ComfyUI 未返回图像输出");
  }
  return buildComfyViewUrl(baseUrl, images[0]);
}

export async function pollComfyHistoryEntry(
  baseUrl: string,
  promptId: string,
  options?: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    outputNodeId?: string;
    onTick?: (elapsedMs: number) => void;
  },
): Promise<ComfyHistoryEntry> {
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const pollIntervalMs = options?.pollIntervalMs ?? 1500;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    options?.onTick?.(Date.now() - started);

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/history/${promptId}`);
    if (!response.ok) {
      await sleep(pollIntervalMs);
      continue;
    }

    const history = (await response.json()) as Record<string, ComfyHistoryEntry>;
    const entry = history[promptId];
    if (!entry) {
      await sleep(pollIntervalMs);
      continue;
    }

    if (entry.status?.status_str === "error") {
      const detail = JSON.stringify(entry.status.messages ?? []).slice(0, 500);
      throw new Error(`ComfyUI 执行失败: ${detail}`);
    }

    const outputs = entry.outputs ?? {};
    const targetImages = options?.outputNodeId
      ? (outputs[options.outputNodeId]?.images ?? [])
      : Object.values(outputs).flatMap((output) => output.images ?? []);

    if (targetImages.length > 0) {
      return entry;
    }

    await sleep(pollIntervalMs);
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
