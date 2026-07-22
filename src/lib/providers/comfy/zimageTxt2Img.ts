import { readFile } from "fs/promises";
import path from "path";
import { assertComfyApiWorkflow } from "./characterTurnaround";
import { fetchComfyComboOptions } from "./objectInfo";
import { loadWorkflowTemplate } from "./client";

export type ZimageTxt2ImgConfig = {
  label: string;
  workflowFile: string;
  nodes: {
    promptText: string;
    fluxResolution: string;
    widthInt: string;
    heightInt: string;
    saveImage: string;
  };
  fluxResolutionClassType: string;
  defaults: {
    aspectRatio: string;
    width: number;
    height: number;
  };
  aspectRatioFallback: string[];
  timeouts: {
    historyMs: number;
    pollIntervalMs: number;
  };
};

export type ZimageTxt2ImgPatchInput = {
  prompt: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
};

export type ZimageTxt2ImgOptions = {
  aspectRatios: string[];
  defaults: ZimageTxt2ImgConfig["defaults"];
  workflowAspectRatio?: string;
  source: "comfyui" | "workflow" | "fallback";
};

let cachedConfig: ZimageTxt2ImgConfig | null = null;

export function isZimageTxt2ImgWorkflow(workflowPath: string): boolean {
  const normalized = workflowPath.replace(/\\/g, "/");
  return (
    normalized.includes("文生图Zimage") ||
    normalized.endsWith("workflows/文生图Zimage.json")
  );
}

export async function loadZimageTxt2ImgConfig(): Promise<ZimageTxt2ImgConfig> {
  if (cachedConfig) return cachedConfig;
  const filePath = path.join(process.cwd(), "workflows/zimage-txt2img.config.json");
  const raw = await readFile(filePath, "utf8");
  cachedConfig = JSON.parse(raw) as ZimageTxt2ImgConfig;
  return cachedConfig;
}

function getNodeInputs(workflow: Record<string, unknown>, nodeId: string) {
  const node = workflow[nodeId];
  if (!node || typeof node !== "object") {
    throw new Error(`Z-Image 工作流缺少节点 ${nodeId}`);
  }
  const inputs = (node as { inputs?: Record<string, unknown> }).inputs;
  if (!inputs) {
    throw new Error(`Z-Image 节点 ${nodeId} 缺少 inputs`);
  }
  return inputs;
}

export function patchZimageTxt2ImgWorkflow(
  workflow: Record<string, unknown>,
  input: ZimageTxt2ImgPatchInput,
  config: ZimageTxt2ImgConfig,
): Record<string, unknown> {
  const next = structuredClone(workflow);
  const { nodes, defaults } = config;

  getNodeInputs(next, nodes.promptText).text = input.prompt;
  getNodeInputs(next, nodes.fluxResolution).aspect_ratio =
    input.aspectRatio ?? defaults.aspectRatio;
  getNodeInputs(next, nodes.widthInt).Number = input.width ?? defaults.width;
  getNodeInputs(next, nodes.heightInt).Number = input.height ?? defaults.height;

  return next;
}

export async function readWorkflowAspectRatio(
  workflowPath: string,
  config: ZimageTxt2ImgConfig,
): Promise<string | undefined> {
  try {
    const workflow = await loadWorkflowTemplate(workflowPath);
    const value = getNodeInputs(workflow, config.nodes.fluxResolution).aspect_ratio;
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function resolveZimageTxt2ImgOptions(baseUrl?: string): Promise<ZimageTxt2ImgOptions> {
  const config = await loadZimageTxt2ImgConfig();
  const workflowAspectRatio = await readWorkflowAspectRatio(config.workflowFile, config);

  if (baseUrl?.trim()) {
    const remoteOptions = await fetchComfyComboOptions(
      baseUrl,
      config.fluxResolutionClassType,
      "aspect_ratio",
    );
    if (remoteOptions.length > 0) {
      return {
        aspectRatios: remoteOptions,
        defaults: config.defaults,
        workflowAspectRatio,
        source: "comfyui",
      };
    }
  }

  const merged = new Set<string>(config.aspectRatioFallback);
  if (workflowAspectRatio) merged.add(workflowAspectRatio);

  return {
    aspectRatios: [...merged],
    defaults: {
      ...config.defaults,
      aspectRatio: workflowAspectRatio ?? config.defaults.aspectRatio,
    },
    workflowAspectRatio,
    source: workflowAspectRatio ? "workflow" : "fallback",
  };
}

export async function validateZimageTxt2ImgWorkflow(workflowPath: string): Promise<void> {
  const config = await loadZimageTxt2ImgConfig();
  const resolvedPath = workflowPath || config.workflowFile;
  const template = await loadWorkflowTemplate(resolvedPath);
  assertComfyApiWorkflow(template, resolvedPath);

  for (const nodeId of Object.values(config.nodes)) {
    if (!template[nodeId]) {
      throw new Error(`Z-Image 工作流缺少节点 ${nodeId}（路径: ${resolvedPath}）`);
    }
  }
}
