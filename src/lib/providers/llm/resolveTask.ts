import { getProviderConfig } from "../config";
import type { ProviderConfig } from "../types";
import { openaiChatJson } from "./openaiCompatible";
import { ollamaChat, type OllamaChatResult } from "./ollama";
import { expandUserPrompt, type PresetPromptVars } from "./presetPrompt";
import { parseLlmJson } from "./parseJson";
import {
  loadDefaultLlmTaskProfiles,
  mergeTaskProfiles,
  type LlmTaskId,
  type LlmTaskProfile,
} from "./taskProfiles";

export type RunLlmTaskVars = PresetPromptVars & {
  images?: string[];
};

export type RunLlmTaskResult = OllamaChatResult & {
  parsed?: unknown;
};

async function getTaskProfile(taskId: LlmTaskId): Promise<LlmTaskProfile> {
  const config = getProviderConfig();
  const defaults = await loadDefaultLlmTaskProfiles();
  const merged = mergeTaskProfiles(defaults, config.llm.taskProfiles);
  const profile = merged[taskId];
  if (!profile) throw new Error(`未知 LLM 任务: ${taskId}`);
  return profile;
}

export async function runLlmTask(
  taskId: LlmTaskId,
  vars: RunLlmTaskVars = {},
): Promise<RunLlmTaskResult> {
  const config = getProviderConfig();
  const profile = await getTaskProfile(taskId);
  const user = expandUserPrompt(profile, vars);

  const chatInput = {
    system: profile.systemPrompt,
    user,
    images: vars.images,
    think: profile.think,
    format: profile.responseFormat === "json" ? ("json" as const) : null,
    options: profile.options,
  };

  let result: OllamaChatResult;
  if (config.llm.provider === "openai") {
    const raw = await openaiChatJson(config.llm, {
      system: chatInput.system,
      user: chatInput.user,
      think: chatInput.think,
    });
    result = { content: raw, raw };
  } else {
    result = await ollamaChat(config.llm, chatInput);
  }

  if (profile.responseFormat === "json") {
    const parsed = parseLlmJson(result.content);
    return { ...result, parsed };
  }
  return result;
}

export async function runLlmTaskJson<T>(
  taskId: LlmTaskId,
  vars: RunLlmTaskVars = {},
): Promise<{ result: RunLlmTaskResult; data: T }> {
  const result = await runLlmTask(taskId, vars);
  if (result.parsed === undefined) {
    throw new Error("LLM 任务未返回 JSON");
  }
  return { result, data: result.parsed as T };
}

export async function getMergedTaskProfiles(): Promise<LlmTaskProfile[]> {
  const config = getProviderConfig();
  const defaults = await loadDefaultLlmTaskProfiles();
  const merged = mergeTaskProfiles(defaults, config.llm.taskProfiles);
  return Object.values(merged);
}

export function isTxt2ImgPromptEnabled(config: ProviderConfig): boolean {
  const profile = config.llm.taskProfiles?.txt2img_prompt;
  return profile?.enabled === true;
}

export async function isTxt2ImgPromptEnabledResolved(): Promise<boolean> {
  const profile = await getTaskProfile("txt2img_prompt");
  return profile.enabled === true;
}
