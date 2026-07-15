import { ollamaChatJson, testOllamaConnection } from "./ollama";
import { openaiChatJson, testOpenAiConnection } from "./openaiCompatible";
import { runLlmTask, runLlmTaskJson, getMergedTaskProfiles, isTxt2ImgPromptEnabled } from "./resolveTask";
import type { ProviderConfig } from "../types";
import type { LlmTaskId } from "./taskProfiles";

export async function llmChatJson(
  config: ProviderConfig,
  input: { system: string; user: string; model?: string; taskId?: LlmTaskId },
): Promise<string> {
  if (input.taskId) {
    const result = await runLlmTask(input.taskId, { custom: input.user, image: input.system });
    return result.content;
  }
  const llmInput = { ...input, think: config.llm.think ?? false };
  if (config.llm.provider === "openai") {
    return openaiChatJson(config.llm, llmInput);
  }
  return ollamaChatJson(config.llm, { ...llmInput, format: "json" });
}

export async function testLlmConnection(config: ProviderConfig): Promise<string> {
  try {
    const result = await runLlmTask("health_check");
    return `LLM 对话正常: ${result.content.slice(0, 80)}`;
  } catch {
    if (config.llm.provider === "openai") {
      return testOpenAiConnection(config.llm);
    }
    return testOllamaConnection(config.llm);
  }
}

export * from "./presets";
export {
  runLlmTask,
  runLlmTaskJson,
  getMergedTaskProfiles,
  isTxt2ImgPromptEnabled,
  isTxt2ImgPromptEnabledResolved,
} from "./resolveTask";
export { expandUserPrompt } from "./presetPrompt";
export { resolveOllamaContent } from "./parseResponse";
export {
  loadDefaultLlmTaskProfiles,
  mergeTaskProfiles,
  LLM_TASK_IDS,
} from "./taskProfiles";
