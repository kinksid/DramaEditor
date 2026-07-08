import { getProviderConfig } from "../config";
import { createTask, updateTask } from "../tasks/taskStore";
import type { ImageGenerateInput, ProviderConfig } from "../types";

export async function submitSeedanceImageTask(
  input: ImageGenerateInput,
  meta?: { nodeId?: string; targetField?: string; targetEntityId?: string },
) {
  const config = getProviderConfig();
  const task = createTask({
    kind: "image",
    provider: "seedance",
    status: "running",
    nodeId: meta?.nodeId,
    targetField: meta?.targetField as "referenceImage" | "firstFrameRef" | undefined,
    targetEntityId: meta?.targetEntityId,
    meta: { prompt: input.prompt },
  });

  runSeedanceImage(task.id, config, input).catch((error) => {
    updateTask(task.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Seedance 图像生成失败",
    });
  });

  return { taskId: task.id };
}

async function runSeedanceImage(taskId: string, config: ProviderConfig, input: ImageGenerateInput) {
  if (!config.image.apiKey && config.enableMockGeneration) {
    updateTask(taskId, {
      status: "completed",
      resultUrl: `mock://image/${input.prompt.slice(0, 12).replace(/\W/g, "") || taskId.slice(0, 8)}`,
      progress: 100,
    });
    return;
  }

  if (!config.image.apiKey) {
    throw new Error("Seedance API Key 未配置");
  }

  const baseUrl = config.image.baseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/generate/image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.image.apiKey}`,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      referenceImage: input.referenceImageUrl,
      width: input.width ?? 768,
      height: input.height ?? 1344,
      style: input.style,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Seedance 图像 API 失败 (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    taskId?: string;
    imageUrl?: string;
    status?: string;
  };

  if (data.imageUrl) {
    updateTask(taskId, { status: "completed", resultUrl: data.imageUrl, progress: 100 });
    return;
  }

  if (!data.taskId) {
    throw new Error("Seedance 未返回 taskId 或 imageUrl");
  }

  await pollSeedanceImageTask(taskId, config, data.taskId);
}

async function pollSeedanceImageTask(taskId: string, config: ProviderConfig, remoteTaskId: string) {
  const baseUrl = config.image.baseUrl.replace(/\/$/, "");
  for (let i = 0; i < 60; i += 1) {
    const response = await fetch(`${baseUrl}/generate/task/${remoteTaskId}`, {
      headers: { Authorization: `Bearer ${config.image.apiKey}` },
    });
    if (!response.ok) {
      await sleep(2000);
      continue;
    }
    const data = (await response.json()) as {
      status?: string;
      imageUrl?: string;
      videoUrl?: string;
      error?: string;
    };
    if (data.status === "completed" && (data.imageUrl || data.videoUrl)) {
      updateTask(taskId, {
        status: "completed",
        resultUrl: data.imageUrl ?? data.videoUrl,
        progress: 100,
      });
      return;
    }
    if (data.status === "failed") {
      throw new Error(data.error ?? "Seedance 图像任务失败");
    }
    updateTask(taskId, { status: "running", progress: Math.min(95, i * 3) });
    await sleep(2000);
  }
  throw new Error("Seedance 图像任务超时");
}

export async function testSeedanceImageConnection(config: ProviderConfig): Promise<string> {
  if (!config.image.apiKey) throw new Error("Seedance API Key 未配置");
  const baseUrl = config.image.baseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/generate/image`, {
    method: "OPTIONS",
    headers: { Authorization: `Bearer ${config.image.apiKey}` },
  }).catch(() => null);
  if (response && (response.ok || response.status === 405)) {
    return "Seedance 图像 API 可达";
  }
  return "Seedance 图像 API 配置已保存（端点待联调）";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
