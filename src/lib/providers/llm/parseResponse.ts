export type OllamaMessagePayload = {
  content?: string;
  thinking?: string;
};

export function resolveOllamaContent(message: OllamaMessagePayload): {
  content: string;
  thinking?: string;
  raw: string;
} {
  const thinking = message.thinking?.trim() || undefined;
  const content = message.content?.trim() || thinking || "";
  const raw = thinking && message.content?.trim()
    ? `${thinking}\n${message.content.trim()}`
    : content;
  return { content, thinking, raw };
}
