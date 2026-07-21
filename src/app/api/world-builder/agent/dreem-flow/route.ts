import { NextResponse } from "next/server";
import {
  generateDreemFlowCode,
  getDreemBlueprint,
  understandDreemIntent,
} from "@/lib/dreemAutoAgent";

const MAX_QUERY_LENGTH = 4_000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: unknown;
      params?: unknown;
      generate?: unknown;
    };

    if (typeof body.query !== "string" || !body.query.trim()) {
      return NextResponse.json({ error: "请输入要自动化的任务" }, { status: 400 });
    }
    if (body.query.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `任务描述不能超过 ${MAX_QUERY_LENGTH} 个字符` },
        { status: 400 },
      );
    }

    const intent = understandDreemIntent(body.query);
    const blueprint = getDreemBlueprint(intent.blueprintId);
    let code: string | undefined;

    if (body.generate === true) {
      const params =
        body.params && typeof body.params === "object" && !Array.isArray(body.params)
          ? (body.params as Record<string, unknown>)
          : {};
      code = generateDreemFlowCode(intent.blueprintId, params);
    }

    return NextResponse.json({
      intent,
      blueprint,
      ...(code ? { code } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "工作流生成失败";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
