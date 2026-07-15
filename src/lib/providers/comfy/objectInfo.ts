function parseComboSpec(spec: unknown): string[] {
  if (!Array.isArray(spec) || spec.length === 0) return [];
  const first = spec[0];
  if (Array.isArray(first)) {
    return first.filter((item): item is string => typeof item === "string");
  }
  if (typeof first === "string") {
    return spec.filter((item): item is string => typeof item === "string");
  }
  return [];
}

function extractInputSpec(
  nodeInfo: { input?: { required?: Record<string, unknown>; optional?: Record<string, unknown> } },
  inputKey: string,
): unknown {
  const required = nodeInfo.input?.required?.[inputKey];
  if (required !== undefined) return required;
  return nodeInfo.input?.optional?.[inputKey];
}

export async function fetchComfyComboOptions(
  baseUrl: string,
  nodeClassType: string,
  inputKey: string,
): Promise<string[]> {
  const normalized = baseUrl.trim().replace(/\/$/, "");
  if (!normalized) return [];

  try {
    const response = await fetch(
      `${normalized}/object_info/${encodeURIComponent(nodeClassType)}`,
      { signal: AbortSignal.timeout(12_000) },
    );
    if (!response.ok) return [];

    const data = (await response.json()) as Record<
      string,
      { input?: { required?: Record<string, unknown>; optional?: Record<string, unknown> } }
    >;
    const nodeInfo = data[nodeClassType];
    if (!nodeInfo) return [];

    return parseComboSpec(extractInputSpec(nodeInfo, inputKey));
  } catch {
    return [];
  }
}
