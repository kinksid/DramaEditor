import { NextResponse } from "next/server";
import { getProviderConfig } from "@/lib/providers/config";
import { llmChatJson } from "@/lib/providers/llm";

const SYSTEM_PROMPT = `你是互动短剧画布助手。根据剧本摘要，建议创建 scene（视频）和 interaction（互动）节点链。
只输出 JSON，不要 markdown：
{
  "nodes": [
    { "kind": "scene"|"interaction"|"ending", "title": "string", "promptOrInstruction": "string" }
  ],
  "summary": "string 简短说明"
}
不要自动触发生成，只建节点建议。`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { script?: string; episodeTitle?: string };
    const script = body.script?.trim();
    if (!script) {
      return NextResponse.json({ error: "缺少 script" }, { status: 400 });
    }

    const config = getProviderConfig();
    const user = [
      body.episodeTitle ? `剧集：${body.episodeTitle}` : "",
      `剧本摘要：\n${script.slice(0, 4000)}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const raw = await llmChatJson(config, { system: SYSTEM_PROMPT, user });
    const parsed = JSON.parse(raw) as {
      nodes?: Array<{ kind: string; title: string; promptOrInstruction?: string }>;
      summary?: string;
    };

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
