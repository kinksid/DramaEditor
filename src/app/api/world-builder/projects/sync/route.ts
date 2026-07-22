import { NextResponse } from "next/server";
import { readSharedState, writeSharedState } from "@/lib/server/projectStore";
import type { SharedWorldBuilderPushBody } from "@/types/worldBuilderSync";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const revisionParam = searchParams.get("revision");
  const clientRevision = revisionParam ? Number(revisionParam) : -1;
  const state = await readSharedState();

  if (!Number.isNaN(clientRevision) && clientRevision >= 0 && clientRevision === state.revision) {
    return new NextResponse(null, { status: 304 });
  }

  return NextResponse.json(state);
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as SharedWorldBuilderPushBody;

    if (!body.clientId || !Array.isArray(body.projects)) {
      return NextResponse.json({ error: "请求体无效" }, { status: 400 });
    }

    const result = await writeSharedState(
      {
        lastClientId: body.clientId,
        activeProjectId: body.activeProjectId ?? "",
        projects: body.projects,
        creationSession: body.creationSession ?? { prompt: "", references: [] },
      },
      { expectedRevision: body.expectedRevision },
    );

    if (!result.ok) {
      return NextResponse.json(result.conflict, { status: 409 });
    }

    return NextResponse.json(result.state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
