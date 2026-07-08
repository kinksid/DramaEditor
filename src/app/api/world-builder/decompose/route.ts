import { NextResponse } from "next/server";
import {
  buildDecomposeUserPrompt,
  callLlmDecompose,
  fallbackDecompose,
} from "@/lib/worldBuilderServer";
import { getProviderConfig } from "@/lib/providers/config";
import { ensureActiveLlmPreset } from "@/lib/providers/llm/presets";
import type { CreationReference } from "@/types/worldBuilder";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      visualStyle?: string;
      references?: CreationReference[];
      useFallback?: boolean;
      llmPresetId?: string;
    };

    const prompt = body.prompt ?? "";
    const visualStyle = body.visualStyle;
    const references = body.references ?? [];

    if (!prompt.trim() && references.length === 0) {
      return NextResponse.json({ error: "请提供创意描述或参考素材" }, { status: 400 });
    }

    const userPrompt = buildDecomposeUserPrompt({ prompt, visualStyle, references });

    if (body.useFallback) {
      return NextResponse.json({
        result: fallbackDecompose({ prompt, visualStyle, references }),
        source: "fallback",
      });
    }

    try {
      await ensureActiveLlmPreset(body.llmPresetId ?? null);
      const result = await callLlmDecompose(userPrompt);
      const provider = getProviderConfig().llm.provider;
      return NextResponse.json({ result, source: provider });
    } catch (llmError) {
      const message = llmError instanceof Error ? llmError.message : "LLM 不可用";
      const result = fallbackDecompose({ prompt, visualStyle, references });
      return NextResponse.json({
        result,
        source: "fallback",
        warning: message,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "拆解失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
