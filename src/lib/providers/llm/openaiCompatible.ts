import type { ProviderConfig } from "../types";

export async function openaiChatJson(
  config: ProviderConfig["llm"],
  input: { system: string; user: string; model?: string; think?: boolean },
): Promise<string> {
  const apiKey = config.apiKey || (config.baseUrl.includes("11434") ? "ollama" : "");
  if (!apiKey) {
    throw new Error("OpenAI API Key 未配置");
  }

  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const body: Record<string, unknown> = {
    model: input.model ?? config.model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.user },
    ],
  };

  if (input.think === false || config.think === false) {
    body.extra_body = { think: false };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI 请求失败 (${response.status}): ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("OpenAI 返回空内容");
  return raw;
}

export async function testOpenAiConnection(config: ProviderConfig["llm"]): Promise<string> {
  await openaiChatJson(config, {
    system: "You are a health check bot.",
    user: 'Reply with JSON: {"ok":true}',
    think: false,
  });
  return "OpenAI 兼容 API 连接正常";
}
