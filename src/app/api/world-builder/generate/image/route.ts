import { NextResponse } from "next/server";
import { setRuntimeProviderConfig } from "@/lib/providers/config";
import { submitImageGeneration } from "@/lib/providers/image";
import type { ImageGenerateInput } from "@/lib/providers/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImageGenerateInput & {
      nodeId?: string;
      targetField?: "referenceImage" | "firstFrameRef";
      targetEntityId?: string;
      providerApiKey?: string;
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "缺少 prompt" }, { status: 400 });
    }

    if (body.providerApiKey) {
      setRuntimeProviderConfig({ image: { apiKey: body.providerApiKey } });
    }

    const { taskId } = await submitImageGeneration(
      {
        prompt: body.prompt,
        negativePrompt: body.negativePrompt,
        referenceImageUrl: body.referenceImageUrl,
        width: body.width,
        height: body.height,
        style: body.style,
      },
      {
        nodeId: body.nodeId,
        targetField: body.targetField,
        targetEntityId: body.targetEntityId,
      },
    );

    return NextResponse.json({ taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图像生成提交失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
