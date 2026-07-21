import { NextResponse } from "next/server";
import { analyzeWithComfyUI } from "@/lib/worldBuilderServer";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      kind?: "image" | "video";
      url?: string;
      name?: string;
    };

    if (!body.kind || !body.url || !body.name) {
      return NextResponse.json({ error: "缺少 kind、url 或 name" }, { status: 400 });
    }

    const analysisSummary = await analyzeWithComfyUI({
      kind: body.kind,
      url: body.url,
      name: body.name,
    });

    return NextResponse.json({ analysisSummary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "分析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
