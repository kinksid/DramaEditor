import { NextResponse } from "next/server";
import {
  buildDecomposeUserPrompt,
  callOllamaDecompose,
  fallbackDecompose,
} from "@/lib/worldBuilderServer";
import type { CreationReference } from "@/types/worldBuilder";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      visualStyle?: string;
      references?: CreationReference[];
      useFallback?: boolean;
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
      const result = await callOllamaDecompose(userPrompt);
      return NextResponse.json({ result, source: "ollama" });
    } catch (ollamaError) {
      const message = ollamaError instanceof Error ? ollamaError.message : "Ollama 不可用";
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
