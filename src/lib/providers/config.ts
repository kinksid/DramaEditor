import type { ProviderConfig, ProviderConfigPatch, PublicProviderConfig } from "./types";
import { getActiveLlmPresetId, getPublicLlmPresets } from "./llm/presets";

type ProviderConfigGlobal = typeof globalThis & {
  __dramaEditorProviderConfig?: ProviderConfig | null;
};

const configGlobal = globalThis as ProviderConfigGlobal;

function getRuntimeOverride(): ProviderConfig | null {
  return configGlobal.__dramaEditorProviderConfig ?? null;
}

function setRuntimeOverride(config: ProviderConfig | null) {
  configGlobal.__dramaEditorProviderConfig = config;
}

export function getDefaultProviderConfig(): ProviderConfig {
  return {
    llm: {
      provider: (process.env.LLM_PROVIDER as ProviderConfig["llm"]["provider"]) || "ollama",
      baseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
      model: process.env.OLLAMA_MODEL ?? "qwen2.5:14b",
      apiKey: process.env.OPENAI_API_KEY ?? "",
      think: false,
    },
    image: {
      provider: (process.env.IMAGE_PROVIDER as ProviderConfig["image"]["provider"]) || "comfyui",
      baseUrl: process.env.SEEDANCE_BASE_URL ?? process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188",
      apiKey: process.env.SEEDANCE_API_KEY ?? "",
      comfyWorkflowTxt2Img: process.env.COMFYUI_WORKFLOW_TXT2IMG ?? "workflows/txt2img.json",
      comfyWorkflowImg2Img: process.env.COMFYUI_WORKFLOW_IMG2IMG ?? "workflows/img2img.json",
    },
    video: {
      provider: (process.env.VIDEO_PROVIDER as ProviderConfig["video"]["provider"]) || "seedance",
      baseUrl: process.env.SEEDANCE_BASE_URL ?? "https://api.dramaplay.dev/v1",
      apiKey: process.env.SEEDANCE_API_KEY ?? "",
      comfyWorkflowTxt2Video: process.env.COMFYUI_WORKFLOW_TXT2VIDEO ?? "workflows/txt2video.json",
      comfyWorkflowImg2Video: process.env.COMFYUI_WORKFLOW_IMG2VIDEO ?? "workflows/img2video.json",
    },
    enableMockGeneration: process.env.ENABLE_MOCK_GENERATION !== "false",
  };
}

function mergeConfig(base: ProviderConfig, patch: Partial<ProviderConfig>): ProviderConfig {
  return {
    llm: { ...base.llm, ...patch.llm },
    image: { ...base.image, ...patch.image },
    video: { ...base.video, ...patch.video },
    enableMockGeneration: patch.enableMockGeneration ?? base.enableMockGeneration,
  };
}

export function getProviderConfig(): ProviderConfig {
  const defaults = getDefaultProviderConfig();
  const runtimeOverride = getRuntimeOverride();
  const merged = runtimeOverride ?? defaults;

  if (merged.llm.provider === "openai") {
    merged.llm.baseUrl = merged.llm.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    merged.llm.model = merged.llm.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
    merged.llm.apiKey = merged.llm.apiKey || process.env.OPENAI_API_KEY || "";
  }

  if (merged.image.provider === "comfyui") {
    merged.image.baseUrl = process.env.COMFYUI_BASE_URL ?? merged.image.baseUrl;
  }

  if (merged.video.provider === "comfyui") {
    merged.video.baseUrl = process.env.COMFYUI_BASE_URL ?? merged.video.baseUrl;
  }

  return merged;
}

export function setRuntimeProviderConfig(patch: ProviderConfigPatch) {
  const current = getProviderConfig();
  const next = mergeConfig(current, {
    llm: patch.llm ? { ...current.llm, ...patch.llm } : undefined,
    image: patch.image ? { ...current.image, ...patch.image } : undefined,
    video: patch.video ? { ...current.video, ...patch.video } : undefined,
    enableMockGeneration: patch.enableMockGeneration,
  });
  setRuntimeOverride(next);
}

export function toPublicProviderConfig(config: ProviderConfig): PublicProviderConfig {
  return {
    llm: {
      provider: config.llm.provider,
      baseUrl: config.llm.baseUrl,
      model: config.llm.model,
      think: config.llm.think,
      hasApiKey: Boolean(config.llm.apiKey),
      presetId: getActiveLlmPresetId(),
      presets: getPublicLlmPresets(),
    },
    image: {
      provider: config.image.provider,
      baseUrl: config.image.baseUrl,
      comfyWorkflowTxt2Img: config.image.comfyWorkflowTxt2Img,
      comfyWorkflowImg2Img: config.image.comfyWorkflowImg2Img,
      hasApiKey: Boolean(config.image.apiKey),
    },
    video: {
      provider: config.video.provider,
      baseUrl: config.video.baseUrl,
      comfyWorkflowTxt2Video: config.video.comfyWorkflowTxt2Video,
      comfyWorkflowImg2Video: config.video.comfyWorkflowImg2Video,
      hasApiKey: Boolean(config.video.apiKey),
    },
    enableMockGeneration: config.enableMockGeneration,
  };
}
