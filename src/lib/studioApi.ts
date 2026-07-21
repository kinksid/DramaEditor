export type GeneratedCharacter = {
  name: string;
  role: string;
  description: string;
  age?: number;
};

export type GeneratedLocation = {
  name: string;
  type?: string;
  description: string;
};

export type GenerateWorldInput = {
  prompt: string;
  visualStyle?: string;
  genre?: string;
  references?: string[];
  apiBaseUrl?: string;
  apiKey?: string;
};

export type GenerateWorldResult = {
  ok: boolean;
  error?: string;
  code?: string;
  data?: {
    worldTitle?: string;
    worldDescription?: string;
    genre?: string;
    tags?: string;
    tone?: string;
    visualStyle?: string;
    script?: string;
    characters?: GeneratedCharacter[];
    locations?: GeneratedLocation[];
  };
  raw?: unknown;
};

export async function generateWorld(input: GenerateWorldInput): Promise<GenerateWorldResult> {
  const response = await fetch("/api/studio/generate-world", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await response.json()) as {
    ok?: boolean;
    error?: string;
    code?: string;
    data?: Record<string, unknown>;
  };

  if (!response.ok || !json.ok) {
    return {
      ok: false,
      error: json.error ?? `HTTP ${response.status}`,
      code: json.code,
      raw: json,
    };
  }

  const payload = (json.data ?? {}) as Record<string, unknown>;
  const nested = (payload.world ?? payload.result ?? payload) as Record<string, unknown>;

  return {
    ok: true,
    data: {
      worldTitle: String(nested.worldTitle ?? nested.title ?? ""),
      worldDescription: String(nested.worldDescription ?? nested.description ?? input.prompt),
      genre: String(nested.genre ?? input.genre ?? ""),
      tags: Array.isArray(nested.tags) ? nested.tags.join(", ") : String(nested.tags ?? ""),
      tone: String(nested.tone ?? ""),
      visualStyle: String(nested.visualStyle ?? input.visualStyle ?? ""),
      script: String(nested.script ?? nested.outline ?? ""),
      characters: Array.isArray(nested.characters)
        ? (nested.characters as GeneratedCharacter[])
        : undefined,
      locations: Array.isArray(nested.locations)
        ? (nested.locations as GeneratedLocation[])
        : undefined,
    },
    raw: json,
  };
}
