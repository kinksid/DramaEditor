import { ollamaChatJson, testOllamaConnection } from "./ollama";
import { openaiChatJson, testOpenAiConnection } from "./openaiCompatible";
import type { ProviderConfig } from "../types";

export async function llmChatJson(
  config: ProviderConfig,
  input: { system: string; user: string; model?: string },
): Promise<string> {
  const llmInput = { ...input, think: config.llm.think ?? false };
  if (config.llm.provider === "openai") {
    return openaiChatJson(config.llm, llmInput);
  }
  return ollamaChatJson(config.llm, llmInput);
}

export async function testLlmConnection(config: ProviderConfig): Promise<string> {
  if (config.llm.provider === "openai") {
    return testOpenAiConnection(config.llm);
  }
  return testOllamaConnection(config.llm);
}

export * from "./presets";
