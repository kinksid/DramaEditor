import { NextResponse } from "next/server";
import { setRuntimeProviderConfig } from "@/lib/providers/config";
import { submitVideoGeneration } from "@/lib/providers/video";
import type { VideoGenerateInput } from "@/lib/providers/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VideoGenerateInput & {
      nodeId?: string;
      providerApiKey?: string;
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "缺少 prompt" }, { status: 400 });
    }

    if (body.providerApiKey) {
      setRuntimeProviderConfig({ video: { apiKey: body.providerApiKey } });
    }

    const { taskId } = await submitVideoGeneration(
      {
        prompt: body.prompt,
        style: body.style,
        duration: body.duration,
        aspectRatio: body.aspectRatio,
        firstFrameRef: body.firstFrameRef,
        referenceImageUrls: body.referenceImageUrls,
      },
      { nodeId: body.nodeId },
    );

    return NextResponse.json({ taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "视频生成提交失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
