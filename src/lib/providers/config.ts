import type { ProviderConfig, ProviderConfigPatch, PublicProviderConfig } from "./types";
import { getActiveLlmPresetId, getPublicLlmPresets } from "./llm/presets";
import {
  loadDefaultLlmTaskProfiles,
  mergeTaskProfiles,
  recordToProfileList,
} from "./llm/taskProfiles";

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

let defaultTaskProfilesPromise: ReturnType<typeof loadDefaultLlmTaskProfiles> | null = null;

async function getDefaultTaskProfilesRecord() {
  if (!defaultTaskProfilesPromise) {
    defaultTaskProfilesPromise = loadDefaultLlmTaskProfiles();
  }
  const defaults = await defaultTaskProfilesPromise;
  return mergeTaskProfiles(defaults);
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
      comfyWorkflowTxt2Img: process.env.COMFYUI_WORKFLOW_TXT2IMG ?? "workflows/文生图Zimage.json",
      comfyWorkflowImg2Img: process.env.COMFYUI_WORKFLOW_IMG2IMG ?? "workflows/img2img.json",
      comfyZimageAspectRatio: process.env.COMFYUI_ZIMAGE_ASPECT_RATIO ?? "9:16 (Slim Vertical)",
      comfyZimageWidth: Number(process.env.COMFYUI_ZIMAGE_WIDTH ?? "1080"),
      comfyZimageHeight: Number(process.env.COMFYUI_ZIMAGE_HEIGHT ?? "1920"),
      comfyCharacterBaseUrl:
        process.env.COMFYUI_CHARACTER_BASE_URL ?? process.env.COMFYUI_BASE_URL ?? "http://127.0.0.1:8188",
      comfyWorkflowCharacter:
        process.env.COMFYUI_WORKFLOW_CHARACTER ?? "workflows/角色设定三视图加特写_自动补提示词.json",
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
  const llmTaskProfiles = patch.llm?.taskProfiles
    ? { ...base.llm.taskProfiles, ...patch.llm.taskProfiles }
    : base.llm.taskProfiles;

  return {
    llm: {
      ...base.llm,
      ...patch.llm,
      taskProfiles: llmTaskProfiles,
    },
    image: { ...base.image, ...patch.image },
    video: { ...base.video, ...patch.video },
    enableMockGeneration: patch.enableMockGeneration ?? base.enableMockGeneration,
  };
}

export function getProviderConfig(): ProviderConfig {
  const defaults = getDefaultProviderConfig();
  const runtimeOverride = getRuntimeOverride();
  const merged: ProviderConfig = runtimeOverride
    ? {
        ...defaults,
        ...runtimeOverride,
        llm: { ...defaults.llm, ...runtimeOverride.llm },
        image: { ...defaults.image, ...runtimeOverride.image },
        video: { ...defaults.video, ...runtimeOverride.video },
      }
    : defaults;

  if (merged.llm.provider === "openai") {
    merged.llm.baseUrl = merged.llm.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    merged.llm.model = merged.llm.model || process.env.OPENAI_MODEL || "gpt-4o-mini";
    merged.llm.apiKey = merged.llm.apiKey || process.env.OPENAI_API_KEY || "";
  }

  if (merged.image.provider === "comfyui") {
    merged.image.baseUrl = process.env.COMFYUI_BASE_URL ?? merged.image.baseUrl;
    merged.image.comfyCharacterBaseUrl =
      process.env.COMFYUI_CHARACTER_BASE_URL ?? merged.image.comfyCharacterBaseUrl;
    merged.image.comfyWorkflowCharacter =
      process.env.COMFYUI_WORKFLOW_CHARACTER ?? merged.image.comfyWorkflowCharacter;
  }

  if (merged.video.provider === "comfyui") {
    merged.video.baseUrl = process.env.COMFYUI_BASE_URL ?? merged.video.baseUrl;
  }

  return merged;
}

export async function getProviderConfigWithTasks(): Promise<ProviderConfig> {
  const config = getProviderConfig();
  const defaultRecord = await getDefaultTaskProfilesRecord();
  const merged = mergeTaskProfiles(
    recordToProfileList(defaultRecord),
    config.llm.taskProfiles,
  );
  return {
    ...config,
    llm: {
      ...config.llm,
      taskProfiles: merged,
    },
  };
}

export function setRuntimeProviderConfig(patch: ProviderConfigPatch) {
  const current = getProviderConfig();
  const taskProfilePatch = patch.llmTaskProfiles
    ? { taskProfiles: { ...current.llm.taskProfiles, ...patch.llmTaskProfiles } }
    : undefined;

  const next = mergeConfig(current, {
    llm: patch.llm
      ? { ...current.llm, ...patch.llm, ...taskProfilePatch }
      : taskProfilePatch
        ? { ...current.llm, ...taskProfilePatch }
        : undefined,
    image: patch.image ? { ...current.image, ...patch.image } : undefined,
    video: patch.video ? { ...current.video, ...patch.video } : undefined,
    enableMockGeneration: patch.enableMockGeneration,
  });
  setRuntimeOverride(next);
}

export async function toPublicProviderConfig(
  config?: ProviderConfig,
): Promise<PublicProviderConfig> {
  const resolved = config ?? getProviderConfig();
  const defaultRecord = await getDefaultTaskProfilesRecord();
  const mergedTasks = mergeTaskProfiles(
    recordToProfileList(defaultRecord),
    resolved.llm.taskProfiles,
  );

  return {
    llm: {
      provider: resolved.llm.provider,
      baseUrl: resolved.llm.baseUrl,
      model: resolved.llm.model,
      think: resolved.llm.think,
      hasApiKey: Boolean(resolved.llm.apiKey),
      presetId: getActiveLlmPresetId(),
      presets: getPublicLlmPresets(),
      taskProfiles: recordToProfileList(mergedTasks),
    },
    image: {
      provider: resolved.image.provider,
      baseUrl: resolved.image.baseUrl,
      comfyWorkflowTxt2Img: resolved.image.comfyWorkflowTxt2Img,
      comfyWorkflowImg2Img: resolved.image.comfyWorkflowImg2Img,
      comfyZimageAspectRatio: resolved.image.comfyZimageAspectRatio,
      comfyZimageWidth: resolved.image.comfyZimageWidth,
      comfyZimageHeight: resolved.image.comfyZimageHeight,
      comfyCharacterBaseUrl: resolved.image.comfyCharacterBaseUrl,
      comfyWorkflowCharacter: resolved.image.comfyWorkflowCharacter,
      hasApiKey: Boolean(resolved.image.apiKey),
    },
    video: {
      provider: resolved.video.provider,
      baseUrl: resolved.video.baseUrl,
      comfyWorkflowTxt2Video: resolved.video.comfyWorkflowTxt2Video,
      comfyWorkflowImg2Video: resolved.video.comfyWorkflowImg2Video,
      hasApiKey: Boolean(resolved.video.apiKey),
    },
    enableMockGeneration: resolved.enableMockGeneration,
  };
}
