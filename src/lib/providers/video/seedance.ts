import { getProviderConfig } from "../config";
import { createTask, updateTask } from "../tasks/taskStore";
import type { ProviderConfig, VideoGenerateInput } from "../types";

export async function submitSeedanceVideoTask(
  input: VideoGenerateInput,
  meta?: { nodeId?: string },
) {
  const config = getProviderConfig();
  const task = createTask({
    kind: "video",
    provider: "seedance",
    status: "queued",
    nodeId: meta?.nodeId,
    targetField: "videoUrl",
    meta: { prompt: input.prompt, style: input.style },
  });

  runSeedanceVideo(task.id, config, input).catch((error) => {
    updateTask(task.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "Seedance 视频生成失败",
    });
  });

  return { taskId: task.id };
}

async function runSeedanceVideo(taskId: string, config: ProviderConfig, input: VideoGenerateInput) {
  if (config.video.provider === "mock") {
    updateTask(taskId, {
      status: "completed",
      resultUrl: `mock://video/${metaNodeId(taskId, input)}`,
      progress: 100,
    });
    return;
  }

  if (!config.video.apiKey && config.enableMockGeneration) {
    updateTask(taskId, {
      status: "completed",
      resultUrl: `mock://video/${metaNodeId(taskId, input)}`,
      progress: 100,
    });
    return;
  }

  if (!config.video.apiKey) {
    throw new Error("Seedance API Key 未配置");
  }

  updateTask(taskId, { status: "running", progress: 5 });
  const baseUrl = config.video.baseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/generate/video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.video.apiKey}`,
    },
    body: JSON.stringify({
      prompt: input.prompt,
      style: input.style,
      duration: input.duration ?? 5,
      aspectRatio: input.aspectRatio ?? "9:16",
      firstFrameRef: input.firstFrameRef,
      lastFrameRef: input.lastFrameRef,
      referenceImages: input.referenceImageUrls,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Seedance 视频 API 失败 (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    taskId?: string;
    videoUrl?: string;
    status?: string;
  };

  if (data.videoUrl) {
    updateTask(taskId, { status: "completed", resultUrl: data.videoUrl, progress: 100 });
    return;
  }

  if (!data.taskId) throw new Error("Seedance 未返回 taskId");

  await pollSeedanceVideoTask(taskId, config, data.taskId);
}

async function pollSeedanceVideoTask(taskId: string, config: ProviderConfig, remoteTaskId: string) {
  const baseUrl = config.video.baseUrl.replace(/\/$/, "");
  for (let i = 0; i < 90; i += 1) {
    const response = await fetch(`${baseUrl}/generate/task/${remoteTaskId}`, {
      headers: { Authorization: `Bearer ${config.video.apiKey}` },
    });
    if (!response.ok) {
      await sleep(2000);
      continue;
    }
    const data = (await response.json()) as {
      status?: string;
      videoUrl?: string;
      error?: string;
    };
    if (data.status === "completed" && data.videoUrl) {
      updateTask(taskId, { status: "completed", resultUrl: data.videoUrl, progress: 100 });
      return;
    }
    if (data.status === "failed") {
      throw new Error(data.error ?? "Seedance 视频任务失败");
    }
    updateTask(taskId, { status: "running", progress: Math.min(95, i * 2) });
    await sleep(2000);
  }
  throw new Error("Seedance 视频任务超时");
}

function metaNodeId(taskId: string, input: VideoGenerateInput) {
  return input.prompt.slice(0, 12).replace(/\W/g, "") || taskId.slice(0, 8);
}

export async function testSeedanceVideoConnection(config: ProviderConfig): Promise<string> {
  if (!config.video.apiKey && config.video.provider !== "mock") {
    throw new Error("Seedance API Key 未配置");
  }
  return "Seedance 视频 API 配置已保存";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
