import { NextResponse } from "next/server";
import { ensureActiveLlmPreset } from "@/lib/providers/llm/presets";
import { runLlmTaskJson } from "@/lib/providers/llm/resolveTask";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      script?: string;
      episodeTitle?: string;
      llmPresetId?: string;
    };
    const script = body.script?.trim();
    if (!script) {
      return NextResponse.json({ error: "缺少 script" }, { status: 400 });
    }

    await ensureActiveLlmPreset(body.llmPresetId ?? null);

    const { data: parsed } = await runLlmTaskJson<{
      nodes?: Array<{ kind: string; title: string; promptOrInstruction?: string }>;
      summary?: string;
    }>("suggest_chain", {
      custom: body.episodeTitle ?? "未命名剧集",
      image: script.slice(0, 4000),
    });

    return NextResponse.json({
      nodes: (parsed.nodes ?? []).filter((node) =>
        ["scene", "interaction", "ending"].includes(node.kind),
      ),
      summary: parsed.summary ?? "已生成节点链建议",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "建链建议失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
