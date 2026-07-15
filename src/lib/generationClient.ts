import type { ImageGenerateInput, VideoGenerateInput } from "@/lib/providers/types";

export type PendingGenerationTask = {
  taskId: string;
  kind: "image" | "video";
  nodeId?: string;
  targetField?: "videoUrl" | "firstFrameRef" | "referenceImage" | "loopVideoUrl";
  targetEntityId?: string;
  entityType?: "character" | "location";
  prompt: string;
  provider?: string;
};

export type TaskPollResponse = {
  status: "queued" | "running" | "completed" | "failed";
  progress?: number;
  resultUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  error?: string;
  nodeId?: string;
  targetField?: PendingGenerationTask["targetField"];
  targetEntityId?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `请求失败 (${response.status})`);
  }
  return data;
}

export async function submitVideoGenerationApi(
  input: VideoGenerateInput & { nodeId?: string },
): Promise<{ taskId: string }> {
  const response = await fetch("/api/world-builder/generate/video", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function submitImageGenerationApi(
  input: ImageGenerateInput & {
    nodeId?: string;
    targetField?: PendingGenerationTask["targetField"];
    targetEntityId?: string;
    entityType?: "character" | "location";
  },
): Promise<{ taskId: string }> {
  const response = await fetch("/api/world-builder/generate/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function pollGenerationTaskApi(taskId: string): Promise<TaskPollResponse> {
  const response = await fetch(`/api/world-builder/generate/task/${taskId}`);
  return parseJson(response);
}

export async function suggestNodeChainApi(input: {
  script: string;
  episodeTitle?: string;
}): Promise<{
  nodes: Array<{ kind: string; title: string; promptOrInstruction?: string }>;
  summary: string;
}> {
  const response = await fetch("/api/world-builder/agent/suggest-chain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseJson(response);
}

export async function syncProviderConfigApi(
  patch: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch("/api/world-builder/providers/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return parseJson(response);
}
