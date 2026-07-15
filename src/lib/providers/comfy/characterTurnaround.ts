import type { ComfyHistoryEntry } from "./client";

/** 默认节点映射，与 workflows/character-turnaround.config.json 一致 */
export const CHARACTER_TURNAROUND_NODES = {
  promptText: "28",
  controlImage: "12",
  ksamplerSeed: "2",
  llamaCharacterSeed: "26",
  llamaPromptSeed: "33",
  saveImage: "4",
} as const;

export type CharacterTurnaroundInput = {
  prompt: string;
  controlImageFilename?: string;
  seed?: number;
};

export type CharacterTurnaroundConfig = {
  nodes: typeof CHARACTER_TURNAROUND_NODES;
  historyTimeoutMs: number;
  pollIntervalMs: number;
};

export const DEFAULT_CHARACTER_HISTORY_TIMEOUT_MS = 1_800_000;
export const DEFAULT_CHARACTER_POLL_INTERVAL_MS = 3_000;

export function isComfyApiWorkflow(workflow: Record<string, unknown>): boolean {
  return Object.values(workflow).some(
    (node) =>
      node &&
      typeof node === "object" &&
      "class_type" in (node as Record<string, unknown>),
  );
}

export function isComfyUiWorkflow(workflow: Record<string, unknown>): boolean {
  return Array.isArray(workflow.nodes);
}

export function assertComfyApiWorkflow(workflow: Record<string, unknown>, workflowPath: string) {
  if (isComfyApiWorkflow(workflow)) return;
  if (isComfyUiWorkflow(workflow)) {
    throw new Error(
      `工作流「${workflowPath}」为 ComfyUI UI 格式，/prompt 无法使用。请在 ComfyUI 中 Save (API Format) 导出后替换该文件。`,
    );
  }
  throw new Error(`工作流「${workflowPath}」格式无效，需要 ComfyUI API 格式 JSON。`);
}

function getNodeInputs(workflow: Record<string, unknown>, nodeId: string) {
  const node = workflow[nodeId];
  if (!node || typeof node !== "object") {
    throw new Error(`工作流缺少节点 ${nodeId}`);
  }
  const inputs = (node as { inputs?: Record<string, unknown> }).inputs;
  if (!inputs) {
    throw new Error(`节点 ${nodeId} 缺少 inputs`);
  }
  return inputs;
}

export function patchCharacterTurnaroundWorkflow(
  workflow: Record<string, unknown>,
  input: CharacterTurnaroundInput,
  nodes: typeof CHARACTER_TURNAROUND_NODES = CHARACTER_TURNAROUND_NODES,
): Record<string, unknown> {
  const next = structuredClone(workflow);

  getNodeInputs(next, nodes.promptText).text = input.prompt;

  if (input.controlImageFilename) {
    getNodeInputs(next, nodes.controlImage).image = input.controlImageFilename;
  }

  if (input.seed != null) {
    getNodeInputs(next, nodes.ksamplerSeed).seed = input.seed;
    getNodeInputs(next, nodes.llamaCharacterSeed).seed = input.seed;
    getNodeInputs(next, nodes.llamaPromptSeed).seed = input.seed + 1;
  }

  return next;
}

export function extractSaveImageUrls(
  baseUrl: string,
  historyEntry: ComfyHistoryEntry,
  saveImageNodeId: string = CHARACTER_TURNAROUND_NODES.saveImage,
): string[] {
  const nodeOut = historyEntry.outputs?.[saveImageNodeId];
  const images = nodeOut?.images ?? [];
  const normalizedBase = baseUrl.replace(/\/$/, "");

  return images.map((image) => {
    const query = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder ?? "",
      type: image.type ?? "output",
    });
    return `${normalizedBase}/view?${query.toString()}`;
  });
}

export function getCharacterTurnaroundConfig(): CharacterTurnaroundConfig {
  return {
    nodes: CHARACTER_TURNAROUND_NODES,
    historyTimeoutMs: DEFAULT_CHARACTER_HISTORY_TIMEOUT_MS,
    pollIntervalMs: DEFAULT_CHARACTER_POLL_INTERVAL_MS,
  };
}
