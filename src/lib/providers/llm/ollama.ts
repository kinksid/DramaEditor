import type { ProviderConfig } from "../types";
import type { LlmTaskProfile } from "./taskProfiles";
import { requestJson } from "./fetchRetry";
import { resolveOllamaContent } from "./parseResponse";

export type OllamaChatInput = {
  system: string;
  user: string;
  images?: string[];
  think?: boolean;
  format?: "json" | null;
  options?: LlmTaskProfile["options"];
  model?: string;
};

export type OllamaChatResult = {
  content: string;
  thinking?: string;
  raw: string;
};

export async function ollamaChat(
  config: ProviderConfig["llm"],
  input: OllamaChatInput,
): Promise<OllamaChatResult> {
  const userMessage: Record<string, unknown> = {
    role: "user",
    content: input.user,
  };
  if (input.images?.length) {
    userMessage.images = input.images;
  }

  const body: Record<string, unknown> = {
    model: input.model ?? config.model,
    stream: false,
    messages: [
      { role: "system", content: input.system },
      userMessage,
    ],
  };

  if (input.format === "json") {
    body.format = "json";
  }

  if (input.think !== undefined) {
    body.think = input.think;
  } else if (config.think === false) {
    body.think = false;
  }

  if (input.options && Object.keys(input.options).length > 0) {
    body.options = input.options;
  }

  const baseUrl = config.baseUrl.replace(/\/v1$/, "").replace(/\/$/, "");

  try {
    await requestJson(`${baseUrl}/api/tags`, {
      label: `Ollama warmup (${baseUrl})`,
      retries: 1,
      delayMs: 400,
      timeoutMs: 10000,
    });
  } catch {
    // 预热失败不阻断
  }

  const { status, data } = await requestJson<{
    message?: { content?: string; thinking?: string };
  }>(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    label: `Ollama chat (${config.model})`,
    retries: 4,
    delayMs: 1500,
    timeoutMs: 180000,
  });

  if (status < 200 || status >= 300) {
    throw new Error(`Ollama 请求失败 (${status})`);
  }

  const resolved = resolveOllamaContent(data.message ?? {});
  if (!resolved.content) throw new Error("Ollama 返回空内容");
  return resolved;
}

/** @deprecated 使用 ollamaChat */
export async function ollamaChatJson(
  config: ProviderConfig["llm"],
  input: { system: string; user: string; model?: string; think?: boolean; format?: "json" | null; options?: LlmTaskProfile["options"]; images?: string[] },
): Promise<string> {
  const result = await ollamaChat(config, {
    system: input.system,
    user: input.user,
    model: input.model,
    think: input.think,
    format: input.format ?? "json",
    options: input.options,
    images: input.images,
  });
  return result.content;
}

export async function testOllamaConnection(config: ProviderConfig["llm"]): Promise<string> {
  const baseUrl = config.baseUrl.replace(/\/v1$/, "").replace(/\/$/, "");
  const { status } = await requestJson(`${baseUrl}/api/tags`, {
    label: `Ollama probe (${baseUrl})`,
    retries: 3,
    delayMs: 600,
    timeoutMs: 15000,
  });
  if (status < 200 || status >= 300) throw new Error(`Ollama 不可用 (${status})`);
  return "Ollama 连接正常";
}
