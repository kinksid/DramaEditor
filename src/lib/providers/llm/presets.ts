import { readFile } from "fs/promises";
import path from "path";
import { setRuntimeProviderConfig } from "../config";
import type { LlmPresetPublic, LlmProviderId } from "../types";
import { fetchWithRetry } from "./fetchRetry";

export type LlmPresetDefinition = {
  id: string;
  label: string;
  provider: LlmProviderId;
  baseUrl: string;
  model: string;
  apiKey?: string;
  think?: boolean;
  requiresApiKey?: boolean;
};

export type LlmPresetStatus = LlmPresetPublic & {
  baseUrl: string;
  apiKey?: string;
  think?: boolean;
};

type PresetGlobal = typeof globalThis & {
  __dramaLlmPresetStatus?: LlmPresetStatus[];
  __dramaActiveLlmPresetId?: string | null;
  __dramaLlmBootstrapDone?: boolean;
};

const presetGlobal = globalThis as PresetGlobal;

const PROBE_TIMEOUT_MS = 15000;
const PROBE_RETRIES = 3;

export async function loadLlmPresets(): Promise<LlmPresetDefinition[]> {
  const relativePath = process.env.LLM_PRESETS_PATH ?? "config/llm-presets.json";
  const filePath = path.join(process.cwd(), relativePath);
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as LlmPresetDefinition[];
}

function resolveApiKey(preset: LlmPresetDefinition): string {
  if (preset.requiresApiKey) {
    return process.env.OPENAI_API_KEY ?? "";
  }
  return preset.apiKey ?? "";
}

export async function probeLlmPreset(preset: LlmPresetDefinition): Promise<LlmPresetStatus> {
  const started = Date.now();
  const apiKey = resolveApiKey(preset);

  if (preset.requiresApiKey && !apiKey) {
    return {
      id: preset.id,
      label: preset.label,
      provider: preset.provider,
      model: preset.model,
      baseUrl: preset.baseUrl,
      apiKey,
      think: preset.think,
      available: false,
      error: "未配置 OPENAI_API_KEY",
    };
  }

  try {
    const baseUrl = preset.baseUrl.replace(/\/$/, "");
    const probeUrl =
      preset.provider === "ollama"
        ? `${baseUrl.replace(/\/v1$/, "")}/api/tags`
        : `${baseUrl}/models`;

    const headers: Record<string, string> = {};
    if (preset.provider === "openai" && apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetchWithRetry(
      probeUrl,
      {
        headers,
      },
      {
        label: `LLM 预设探测 ${preset.id}`,
        retries: PROBE_RETRIES,
        delayMs: 700,
        timeoutMs: PROBE_TIMEOUT_MS,
      },
    );

    if (!response.ok) {
      throw new Error(`探测失败 (${response.status})`);
    }

    return {
      id: preset.id,
      label: preset.label,
      provider: preset.provider,
      model: preset.model,
      baseUrl: preset.baseUrl,
      apiKey,
      think: preset.think,
      available: true,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    return {
      id: preset.id,
      label: preset.label,
      provider: preset.provider,
      model: preset.model,
      baseUrl: preset.baseUrl,
      apiKey,
      think: preset.think,
      available: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "连接失败",
    };
  }
}

export function getLlmPresetStatuses(): LlmPresetStatus[] {
  return presetGlobal.__dramaLlmPresetStatus ?? [];
}

export function getActiveLlmPresetId(): string | null {
  return presetGlobal.__dramaActiveLlmPresetId ?? null;
}

export function getPublicLlmPresets(): LlmPresetPublic[] {
  return getLlmPresetStatuses().map(({ baseUrl: _baseUrl, apiKey: _apiKey, think: _think, ...rest }) => rest);
}

async function resolvePresetById(presetId: string): Promise<LlmPresetStatus> {
  const definitions = await loadLlmPresets();
  const definition = definitions.find((item) => item.id === presetId);
  if (!definition) {
    throw new Error(`未知 LLM 预设: ${presetId}`);
  }

  const probed = getLlmPresetStatuses().find((item) => item.id === presetId);
  return {
    id: definition.id,
    label: definition.label,
    provider: definition.provider,
    model: definition.model,
    baseUrl: definition.baseUrl,
    apiKey: resolveApiKey(definition),
    think: definition.think,
    available: probed?.available ?? false,
    latencyMs: probed?.latencyMs,
    error: probed?.error,
  };
}

function applyPresetRuntime(preset: LlmPresetStatus): LlmPresetStatus {
  setRuntimeProviderConfig({
    llm: {
      provider: preset.provider,
      baseUrl: preset.baseUrl,
      model: preset.model,
      apiKey: preset.apiKey ?? "",
      think: preset.think ?? false,
    },
  });
  presetGlobal.__dramaActiveLlmPresetId = preset.id;
  return preset;
}

export async function applyLlmPreset(presetId: string): Promise<LlmPresetStatus> {
  const preset = await resolvePresetById(presetId);
  return applyPresetRuntime(preset);
}

export async function ensureActiveLlmPreset(preferredId?: string | null): Promise<string | null> {
  if (getLlmPresetStatuses().length === 0) {
    await bootstrapLlmPresets();
  }

  const candidate =
    preferredId ||
    getActiveLlmPresetId() ||
    process.env.LLM_PRESET_ID ||
    null;

  if (candidate) {
    try {
      const preset = await resolvePresetById(candidate);
      applyPresetRuntime(preset);
      return preset.id;
    } catch (error) {
      console.warn(
        `[LLM] 无法应用预设 ${candidate}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  if (getActiveLlmPresetId()) {
    return getActiveLlmPresetId();
  }

  return null;
}

export async function bootstrapLlmPresets(options?: { force?: boolean }) {
  if (presetGlobal.__dramaLlmBootstrapDone && !options?.force) {
    return {
      presets: getPublicLlmPresets(),
      activePresetId: getActiveLlmPresetId(),
    };
  }

  const definitions = await loadLlmPresets();
  const statuses: LlmPresetStatus[] = [];
  for (const preset of definitions) {
    statuses.push(await probeLlmPreset(preset));
  }
  presetGlobal.__dramaLlmPresetStatus = statuses;

  const preferredId = process.env.LLM_PRESET_ID;
  const preferred = preferredId ? statuses.find((item) => item.id === preferredId) : undefined;
  const fallback = statuses.find((item) => item.available);
  const active = preferred ?? fallback ?? statuses[0];

  if (active) {
    await applyLlmPreset(active.id);
    if (active.available) {
      console.log(`[LLM] 已接入预设: ${active.label} (${active.model})`);
    } else {
      console.warn(
        `[LLM] 已应用预设 ${active.label}，但探测未通过: ${active.error ?? "连接失败"}。拆解时将自动重试连接。`,
      );
    }
  } else {
    presetGlobal.__dramaActiveLlmPresetId = null;
    console.warn("[LLM] 无可用预设，拆解将降级为 fallback");
  }

  const availableCount = statuses.filter((item) => item.available).length;
  console.log(`[LLM] 预设探测完成: ${availableCount}/${statuses.length} 可用`);

  presetGlobal.__dramaLlmBootstrapDone = true;

  return {
    presets: getPublicLlmPresets(),
    activePresetId: getActiveLlmPresetId(),
  };
}
