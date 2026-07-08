import { getProviderConfig } from "../config";
import { createTask, updateTask } from "../tasks/taskStore";
import type { ProviderConfig, VideoGenerateInput } from "../types";
import {
  comfyHealthCheck,
  injectPrompt,
  loadWorkflowTemplate,
  pollComfyHistory,
  submitComfyPrompt,
} from "../comfy/client";

export async function submitComfyVideoTask(
  input: VideoGenerateInput,
  meta?: { nodeId?: string },
) {
  const config = getProviderConfig();
  const task = createTask({
    kind: "video",
    provider: "comfyui",
    status: "running",
    nodeId: meta?.nodeId,
    targetField: "videoUrl",
    meta: { prompt: input.prompt },
  });

  runComfyVideo(task.id, config, input).catch((error) => {
    updateTask(task.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "ComfyUI 视频生成失败",
    });
  });

  return { taskId: task.id };
}

async function runComfyVideo(taskId: string, config: ProviderConfig, input: VideoGenerateInput) {
  const baseUrl = process.env.COMFYUI_BASE_URL ?? config.video.baseUrl;
  const healthy = await comfyHealthCheck(baseUrl);
  if (!healthy) throw new Error("ComfyUI 不可用");

  const workflowPath = input.firstFrameRef
    ? config.video.comfyWorkflowImg2Video
    : config.video.comfyWorkflowTxt2Video;
  const template = await loadWorkflowTemplate(workflowPath);
  const workflow = injectPrompt(template, input.prompt);
  const promptId = await submitComfyPrompt(baseUrl, workflow);
  const resultUrl = await pollComfyHistory(baseUrl, promptId);
  updateTask(taskId, {
    status: "completed",
    resultUrl,
    progress: 100,
  });
}

export async function testComfyVideoConnection(config: ProviderConfig): Promise<string> {
  const baseUrl = process.env.COMFYUI_BASE_URL ?? config.video.baseUrl;
  const healthy = await comfyHealthCheck(baseUrl);
  if (!healthy) throw new Error("ComfyUI 不可用");
  return "ComfyUI 视频 workflow 连接正常";
}
