export type LlmProviderId = "ollama" | "openai";
export type ImageProviderId = "comfyui" | "seedance";
export type VideoProviderId = "comfyui" | "seedance" | "mock";

export type LlmTaskId =
  | "decompose"
  | "suggest_chain"
  | "reference_analyze"
  | "txt2img_prompt"
  | "health_check";

export type LlmTaskProfile = {
  id: LlmTaskId;
  label: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  presetMode: "direct" | "template";
  responseFormat: "json" | "text";
  think: boolean;
  enabled?: boolean;
  options: {
    temperature?: number;
    top_k?: number;
    top_p?: number;
    min_p?: number;
    num_predict?: number;
    seed?: number;
  };
};

export type LlmPresetPublic = {
  id: string;
  label: string;
  provider: LlmProviderId;
  model: string;
  available: boolean;
  latencyMs?: number;
  error?: string;
};

export type TaskStatus = "queued" | "running" | "completed" | "failed";

export type GenerateTask = {
  id: string;
  kind: "image" | "video";
  provider: ImageProviderId | VideoProviderId;
  status: TaskStatus;
  progress?: number;
  resultUrl?: string;
  error?: string;
  nodeId?: string;
  targetField?:
    | "videoUrl"
    | "firstFrameRef"
    | "lastFrameRef"
    | "referenceImage"
    | "loopVideoUrl";
  targetEntityId?: string;
  createdAt: string;
  updatedAt: string;
  meta?: Record<string, unknown>;
};

export type ProviderConfig = {
  llm: {
    provider: LlmProviderId;
    baseUrl: string;
    model: string;
    apiKey: string;
    think?: boolean;
    taskProfiles?: Partial<Record<LlmTaskId, LlmTaskProfile>>;
  };
  image: {
    provider: ImageProviderId;
    baseUrl: string;
    apiKey: string;
    comfyWorkflowTxt2Img: string;
    comfyWorkflowImg2Img: string;
    /** 文生图 Z-Image workflow 参数（FluxResolution + 宽高 Int） */
    comfyZimageAspectRatio: string;
    comfyZimageWidth: number;
    comfyZimageHeight: number;
    /** 角色设定专用 ComfyUI（可与场景图像分离，如远程机器） */
    comfyCharacterBaseUrl: string;
    comfyWorkflowCharacter: string;
  };
  video: {
    provider: VideoProviderId;
    baseUrl: string;
    apiKey: string;
    comfyWorkflowTxt2Video: string;
    comfyWorkflowImg2Video: string;
  };
  enableMockGeneration: boolean;
};

export type PublicProviderConfig = {
  llm: Omit<ProviderConfig["llm"], "apiKey" | "taskProfiles"> & {
    hasApiKey: boolean;
    presetId?: string | null;
    presets?: LlmPresetPublic[];
    taskProfiles?: LlmTaskProfile[];
  };
  image: Omit<ProviderConfig["image"], "apiKey"> & { hasApiKey: boolean };
  video: Omit<ProviderConfig["video"], "apiKey"> & { hasApiKey: boolean };
  enableMockGeneration: boolean;
};

export type ProviderConfigPatch = {
  llm?: Partial<ProviderConfig["llm"]>;
  image?: Partial<ProviderConfig["image"]>;
  video?: Partial<ProviderConfig["video"]>;
  enableMockGeneration?: boolean;
  llmPresetId?: string;
  llmTaskProfiles?: Partial<Record<LlmTaskId, LlmTaskProfile>>;
};

export type ImageGenerateInput = {
  prompt: string;
  negativePrompt?: string;
  referenceImageUrl?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  style?: string;
  seed?: number;
};

export type VideoGenerateInput = {
  prompt: string;
  style?: string;
  duration?: number;
  aspectRatio?: string;
  firstFrameRef?: string;
  lastFrameRef?: string;
  referenceImageUrls?: string[];
};

export type TaskResult = {
  status: TaskStatus;
  progress?: number;
  resultUrl?: string;
  error?: string;
};

export type GenerationHistoryEntry = {
  id: string;
  kind: "image" | "video";
  provider: string;
  prompt: string;
  url: string;
  createdAt: string;
};
