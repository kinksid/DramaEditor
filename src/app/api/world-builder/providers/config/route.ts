import { NextResponse } from "next/server";
import {
  getProviderConfig,
  setRuntimeProviderConfig,
  toPublicProviderConfig,
} from "@/lib/providers/config";
import {
  applyLlmPreset,
  bootstrapLlmPresets,
  getPublicLlmPresets,
} from "@/lib/providers/llm/presets";
import type { ProviderConfigPatch } from "@/lib/providers/types";

export async function GET() {
  if (getPublicLlmPresets().length === 0) {
    await bootstrapLlmPresets();
  }
  const config = getProviderConfig();
  return NextResponse.json(await toPublicProviderConfig(config));
}

export async function PUT(request: Request) {
  try {
    const patch = (await request.json()) as ProviderConfigPatch;

    if (patch.llmPresetId) {
      await applyLlmPreset(patch.llmPresetId);
    }

    const { llmPresetId: _llmPresetId, llmTaskProfiles, ...rest } = patch;
    const configPatch: ProviderConfigPatch = { ...rest };
    if (llmTaskProfiles) {
      configPatch.llmTaskProfiles = llmTaskProfiles;
    }

    if (
      configPatch.llm ||
      configPatch.image ||
      configPatch.video ||
      configPatch.enableMockGeneration !== undefined ||
      configPatch.llmTaskProfiles
    ) {
      setRuntimeProviderConfig(configPatch);
    }

    const config = getProviderConfig();
    return NextResponse.json(await toPublicProviderConfig(config));
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存配置失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
