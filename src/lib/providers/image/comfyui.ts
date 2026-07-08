import path from "path";
import { getProviderConfig } from "../config";
import { createTask, updateTask } from "../tasks/taskStore";
import type { GenerateTask, ImageGenerateInput, ProviderConfig } from "../types";
import {
  comfyHealthCheck,
  injectImageFilename,
  injectPrompt,
  loadWorkflowTemplate,
  pollComfyHistory,
  submitComfyPrompt,
  uploadImageToComfy,
} from "../comfy/client";

export async function submitComfyImageTask(
  input: ImageGenerateInput,
  meta?: { nodeId?: string; targetField?: string; targetEntityId?: string },
) {
  const config = getProviderConfig();
  const task = createTask({
    kind: "image",
    provider: "comfyui",
    status: "running",
    nodeId: meta?.nodeId,
    targetField: meta?.targetField as GenerateTask["targetField"],
    targetEntityId: meta?.targetEntityId,
    meta: { prompt: input.prompt },
  });

  runComfyImage(task.id, config, input).catch((error) => {
    updateTask(task.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "ComfyUI 图像生成失败",
    });
  });

  return { taskId: task.id };
}

async function runComfyImage(taskId: string, config: ProviderConfig, input: ImageGenerateInput) {
  const baseUrl = process.env.COMFYUI_BASE_URL ?? config.image.baseUrl;
  const healthy = await comfyHealthCheck(baseUrl);
  if (!healthy) throw new Error("ComfyUI 不可用");

  const workflowPath = input.referenceImageUrl
    ? config.image.comfyWorkflowImg2Img
    : config.image.comfyWorkflowTxt2Img;
  let template = await loadWorkflowTemplate(workflowPath);
  if (input.referenceImageUrl?.startsWith("/uploads/")) {
    const localPath = path.join(process.cwd(), "public", input.referenceImageUrl.replace(/^\//, ""));
    const uploadedName = await uploadImageToComfy(
      baseUrl,
      localPath,
      path.basename(localPath),
    );
    template = injectImageFilename(template, uploadedName);
  }
  const workflow = injectPrompt(template, input.prompt, input.negativePrompt ?? "");
  const promptId = await submitComfyPrompt(baseUrl, workflow);
  const resultUrl = await pollComfyHistory(baseUrl, promptId);
  updateTask(taskId, { status: "completed", resultUrl, progress: 100 });
}

export async function analyzeImageWithComfy(input: {
  url: string;
  name: string;
}): Promise<string> {
  const config = getProviderConfig();
  const baseUrl = process.env.COMFYUI_BASE_URL ?? config.image.baseUrl;
  const healthy = await comfyHealthCheck(baseUrl);
  if (!healthy) {
    return `图片参考「${input.name}」：ComfyUI 暂不可用，将结合文本创意推断视觉风格。`;
  }

  if (input.url.startsWith("/uploads/")) {
    try {
      const localPath = path.join(process.cwd(), "public", input.url.replace(/^\//, ""));
      const uploadedName = await uploadImageToComfy(baseUrl, localPath, path.basename(localPath));
      const captionWorkflow = process.env.COMFYUI_WORKFLOW_CAPTION ?? "workflows/caption.json";
      const template = await loadWorkflowTemplate(captionWorkflow);
      const workflow = injectImageFilename(template, uploadedName);
      const promptId = await submitComfyPrompt(baseUrl, workflow);
      await pollComfyHistory(baseUrl, promptId, 30000);
      return `图片参考「${input.name}」已上传 ComfyUI 并完成参考分析 workflow（${uploadedName}），可推断写实/插画/赛博等视觉风格线索。`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "分析失败";
      return `图片参考「${input.name}」：ComfyUI 已连通，参考分析未完成（${message}），将结合文件名推断风格。`;
    }
  }

  return `图片参考「${input.name}」已通过 ComfyUI 连通；请上传本地参考图以启用 workflow 分析。`;
}

export async function testComfyImageConnection(config: ProviderConfig): Promise<string> {
  const baseUrl = process.env.COMFYUI_BASE_URL ?? config.image.baseUrl;
  const healthy = await comfyHealthCheck(baseUrl);
  if (!healthy) throw new Error("ComfyUI 不可用");
  return "ComfyUI 图像服务连接正常";
}
