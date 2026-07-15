import path from "path";
import { randomUUID } from "crypto";
import { getProviderConfig } from "../config";
import {
  isZimageTxt2ImgWorkflow,
  loadZimageTxt2ImgConfig,
  patchZimageTxt2ImgWorkflow,
} from "../comfy/zimageTxt2Img";
import {
  assertComfyApiWorkflow,
  extractSaveImageUrls,
  getCharacterTurnaroundConfig,
  patchCharacterTurnaroundWorkflow,
} from "../comfy/characterTurnaround";
import {
  comfyHealthCheck,
  comfyHealthCheckDetailed,
  injectImageFilename,
  injectPrompt,
  loadWorkflowTemplate,
  pollComfyHistory,
  pollComfyHistoryEntry,
  submitComfyPrompt,
  uploadImageToComfy,
} from "../comfy/client";
import { createTask, updateTask } from "../tasks/taskStore";
import type { GenerateTask, ImageGenerateInput, ProviderConfig } from "../types";

export async function submitComfyImageTask(
  input: ImageGenerateInput,
  meta?: {
    nodeId?: string;
    targetField?: string;
    targetEntityId?: string;
    entityType?: "character" | "location";
  },
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

  runComfyImage(task.id, config, input, meta).catch((error) => {
    updateTask(task.id, {
      status: "failed",
      error: error instanceof Error ? error.message : "ComfyUI 图像生成失败",
    });
  });

  return { taskId: task.id };
}

function isCharacterReferenceTask(meta?: {
  targetField?: string;
  entityType?: "character" | "location";
}) {
  return meta?.targetField === "referenceImage" && meta?.entityType === "character";
}

function resolveComfyImageEndpoint(
  config: ProviderConfig,
  input: ImageGenerateInput,
  meta?: { targetField?: string; entityType?: "character" | "location" },
) {
  if (isCharacterReferenceTask(meta)) {
    const baseUrl = process.env.COMFYUI_CHARACTER_BASE_URL ?? config.image.comfyCharacterBaseUrl;
    const workflowPath =
      process.env.COMFYUI_WORKFLOW_CHARACTER ?? config.image.comfyWorkflowCharacter;
    if (!baseUrl?.trim()) {
      throw new Error("未配置角色设定 ComfyUI Base URL");
    }
    if (!workflowPath?.trim()) {
      throw new Error("未配置角色设定 workflow 路径");
    }
    return { baseUrl, workflowPath, mode: "character" as const };
  }

  const baseUrl = process.env.COMFYUI_BASE_URL ?? config.image.baseUrl;
  const workflowPath = input.referenceImageUrl
    ? config.image.comfyWorkflowImg2Img
    : config.image.comfyWorkflowTxt2Img;

  if (!input.referenceImageUrl && isZimageTxt2ImgWorkflow(workflowPath)) {
    return { baseUrl, workflowPath, mode: "zimage" as const };
  }

  return { baseUrl, workflowPath, mode: "general" as const };
}

async function uploadControlImageIfNeeded(baseUrl: string, referenceImageUrl?: string) {
  if (!referenceImageUrl?.startsWith("/uploads/")) return undefined;
  const localPath = path.join(process.cwd(), "public", referenceImageUrl.replace(/^\//, ""));
  return uploadImageToComfy(baseUrl, localPath, path.basename(localPath));
}

async function runCharacterTurnaround(
  taskId: string,
  baseUrl: string,
  workflowPath: string,
  input: ImageGenerateInput,
) {
  const turnaroundConfig = getCharacterTurnaroundConfig();
  const template = await loadWorkflowTemplate(workflowPath);
  assertComfyApiWorkflow(template, workflowPath);

  const controlImageFilename = await uploadControlImageIfNeeded(baseUrl, input.referenceImageUrl);
  const seed = input.seed ?? Math.floor(Math.random() * 2 ** 32);

  const workflow = patchCharacterTurnaroundWorkflow(template, {
    prompt: input.prompt,
    controlImageFilename,
    seed,
  });

  updateTask(taskId, { progress: 5, meta: { prompt: input.prompt, seed, mode: "character_turnaround" } });

  const clientId = `dramaeditor_${randomUUID().slice(0, 8)}`;
  const promptId = await submitComfyPrompt(baseUrl, workflow, clientId);

  updateTask(taskId, { progress: 10, meta: { promptId, clientId } });

  const historyEntry = await pollComfyHistoryEntry(baseUrl, promptId, {
    timeoutMs: turnaroundConfig.historyTimeoutMs,
    pollIntervalMs: turnaroundConfig.pollIntervalMs,
    outputNodeId: turnaroundConfig.nodes.saveImage,
    onTick: (elapsedMs) => {
      const progress = Math.min(95, 10 + Math.floor((elapsedMs / turnaroundConfig.historyTimeoutMs) * 85));
      updateTask(taskId, { progress });
    },
  });

  const imageUrls = extractSaveImageUrls(baseUrl, historyEntry, turnaroundConfig.nodes.saveImage);
  if (imageUrls.length === 0) {
    throw new Error("角色设定工作流未在 SaveImage 节点返回图像");
  }

  updateTask(taskId, {
    status: "completed",
    resultUrl: imageUrls[0],
    progress: 100,
    meta: {
      prompt: input.prompt,
      seed,
      promptId,
      imageUrls,
      mode: "character_turnaround",
    },
  });
}

async function runZimageTxt2Img(
  taskId: string,
  baseUrl: string,
  workflowPath: string,
  config: ProviderConfig,
  input: ImageGenerateInput,
) {
  const zimageConfig = await loadZimageTxt2ImgConfig();
  const template = await loadWorkflowTemplate(workflowPath);
  assertComfyApiWorkflow(template, workflowPath);

  const aspectRatio = input.aspectRatio ?? config.image.comfyZimageAspectRatio;
  const width = input.width ?? config.image.comfyZimageWidth;
  const height = input.height ?? config.image.comfyZimageHeight;

  const workflow = patchZimageTxt2ImgWorkflow(
    template,
    { prompt: input.prompt, aspectRatio, width, height },
    zimageConfig,
  );

  updateTask(taskId, {
    progress: 5,
    meta: { prompt: input.prompt, aspectRatio, width, height, mode: "zimage_txt2img" },
  });

  const clientId = `dramaeditor_${randomUUID().slice(0, 8)}`;
  const promptId = await submitComfyPrompt(baseUrl, workflow, clientId);

  updateTask(taskId, { progress: 10, meta: { promptId, clientId } });

  const historyEntry = await pollComfyHistoryEntry(baseUrl, promptId, {
    timeoutMs: zimageConfig.timeouts.historyMs,
    pollIntervalMs: zimageConfig.timeouts.pollIntervalMs,
    outputNodeId: zimageConfig.nodes.saveImage,
    onTick: (elapsedMs) => {
      const progress = Math.min(
        95,
        10 + Math.floor((elapsedMs / zimageConfig.timeouts.historyMs) * 85),
      );
      updateTask(taskId, { progress });
    },
  });

  const imageUrls = extractSaveImageUrls(baseUrl, historyEntry, zimageConfig.nodes.saveImage);
  if (imageUrls.length === 0) {
    throw new Error("Z-Image 文生图工作流未在 SaveImage 节点返回图像");
  }

  updateTask(taskId, {
    status: "completed",
    resultUrl: imageUrls[0],
    progress: 100,
    meta: {
      prompt: input.prompt,
      aspectRatio,
      width,
      height,
      promptId,
      imageUrls,
      mode: "zimage_txt2img",
    },
  });
}

async function runComfyImage(
  taskId: string,
  config: ProviderConfig,
  input: ImageGenerateInput,
  meta?: { targetField?: string; entityType?: "character" | "location" },
) {
  const { baseUrl, workflowPath, mode } = resolveComfyImageEndpoint(config, input, meta);
  const health = await comfyHealthCheckDetailed(
    baseUrl,
    mode === "character" ? 15_000 : 12_000,
  );
  if (!health.ok) {
    throw new Error(
      health.error ??
        (isCharacterReferenceTask(meta) ? "角色设定 ComfyUI 不可用" : "ComfyUI 不可用"),
    );
  }

  if (mode === "character") {
    await runCharacterTurnaround(taskId, baseUrl, workflowPath, input);
    return;
  }

  if (mode === "zimage") {
    await runZimageTxt2Img(taskId, baseUrl, workflowPath, config, input);
    return;
  }

  let template = await loadWorkflowTemplate(workflowPath);
  if (input.referenceImageUrl?.startsWith("/uploads/")) {
    const uploadedName = await uploadControlImageIfNeeded(baseUrl, input.referenceImageUrl);
    if (uploadedName) {
      template = injectImageFilename(template, uploadedName);
    }
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
  const health = await comfyHealthCheckDetailed(baseUrl);
  if (!health.ok) throw new Error(health.error ?? "ComfyUI 不可用");
  return `ComfyUI 图像服务连接正常（${health.baseUrl}）`;
}

export async function testComfyCharacterConnection(config: ProviderConfig): Promise<string> {
  const baseUrl = process.env.COMFYUI_CHARACTER_BASE_URL ?? config.image.comfyCharacterBaseUrl;
  if (!baseUrl?.trim()) throw new Error("未配置角色设定 ComfyUI Base URL");

  const health = await comfyHealthCheckDetailed(baseUrl, 15_000);
  if (!health.ok) {
    throw new Error(health.error ?? `角色设定 ComfyUI 不可用（${health.baseUrl}）`);
  }

  const workflowPath =
    process.env.COMFYUI_WORKFLOW_CHARACTER ?? config.image.comfyWorkflowCharacter;
  try {
    const template = await loadWorkflowTemplate(workflowPath);
    assertComfyApiWorkflow(template, workflowPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : "工作流无效";
    throw new Error(`${message}（路径: ${workflowPath}）`);
  }

  return `角色设定 ComfyUI 连接正常（${health.baseUrl} · workflow: ${workflowPath}）`;
}
