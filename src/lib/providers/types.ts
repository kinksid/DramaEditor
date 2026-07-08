export type LlmProviderId = "ollama" | "openai";
export type ImageProviderId = "comfyui" | "seedance";
export type VideoProviderId = "comfyui" | "seedance" | "mock";

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
  targetField?: "videoUrl" | "firstFrameRef" | "referenceImage" | "loopVideoUrl";
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
  };
  image: {
    provider: ImageProviderId;
    baseUrl: string;
    apiKey: string;
    comfyWorkflowTxt2Img: string;
    comfyWorkflowImg2Img: string;
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
  llm: Omit<ProviderConfig["llm"], "apiKey"> & {
    hasApiKey: boolean;
    presetId?: string | null;
    presets?: LlmPresetPublic[];
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
};

export type ImageGenerateInput = {
  prompt: string;
  negativePrompt?: string;
  referenceImageUrl?: string;
  width?: number;
  height?: number;
  style?: string;
};

export type VideoGenerateInput = {
  prompt: string;
  style?: string;
  duration?: number;
  aspectRatio?: string;
  firstFrameRef?: string;
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
