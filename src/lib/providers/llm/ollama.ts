import type { ProviderConfig } from "../types";
import { requestJson } from "./fetchRetry";

export async function ollamaChatJson(
  config: ProviderConfig["llm"],
  input: { system: string; user: string; model?: string; think?: boolean },
): Promise<string> {
  const body: Record<string, unknown> = {
    model: input.model ?? config.model,
    stream: false,
    format: "json",
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
  };

  if (input.think === false || config.think === false) {
    body.think = false;
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
    // 预热失败不阻断，后续 chat 仍会重试。
  }

  const { status, data } = await requestJson<{ message?: { content?: string } }>(
    `${baseUrl}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      label: `Ollama chat (${config.model})`,
      retries: 4,
      delayMs: 1500,
      timeoutMs: 180000,
    },
  );

  if (status < 200 || status >= 300) {
    throw new Error(`Ollama 请求失败 (${status})`);
  }

  const raw = data.message?.content?.trim();
  if (!raw) throw new Error("Ollama 返回空内容");
  return raw;
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
