import { NextResponse } from "next/server";
import {
  bootstrapLlmPresets,
  getActiveLlmPresetId,
  getPublicLlmPresets,
} from "@/lib/providers/llm/presets";

export async function GET() {
  try {
    let presets = getPublicLlmPresets();
    let activePresetId = getActiveLlmPresetId();
    if (presets.length === 0) {
      const result = await bootstrapLlmPresets();
      presets = result.presets;
      activePresetId = result.activePresetId;
    }
    return NextResponse.json({ presets, activePresetId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "加载 LLM 预设失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
