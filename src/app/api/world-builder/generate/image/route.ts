import { NextResponse } from "next/server";
import { getProviderConfig, setRuntimeProviderConfig } from "@/lib/providers/config";
import { isZimageTxt2ImgWorkflow } from "@/lib/providers/comfy/zimageTxt2Img";
import { isTxt2ImgPromptEnabledResolved, runLlmTask } from "@/lib/providers/llm/resolveTask";
import { submitImageGeneration } from "@/lib/providers/image";
import type { ImageGenerateInput } from "@/lib/providers/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImageGenerateInput & {
      nodeId?: string;
      targetField?: "referenceImage" | "firstFrameRef";
      targetEntityId?: string;
      entityType?: "character" | "location";
      providerApiKey?: string;
      seed?: number;
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "缺少 prompt" }, { status: 400 });
    }

    if (body.providerApiKey) {
      setRuntimeProviderConfig({ image: { apiKey: body.providerApiKey } });
    }

    let prompt = body.prompt.trim();
    const config = getProviderConfig();
    const isCharacterReference =
      body.targetField === "referenceImage" && body.entityType === "character";
    const isZimageTxt2Img =
      !body.referenceImageUrl &&
      config.image.provider === "comfyui" &&
      isZimageTxt2ImgWorkflow(config.image.comfyWorkflowTxt2Img);
    if (
      !isCharacterReference &&
      !isZimageTxt2Img &&
      (await isTxt2ImgPromptEnabledResolved()) &&
      config.image.provider === "comfyui"
    ) {
      try {
        const expanded = await runLlmTask("txt2img_prompt", { custom: prompt });
        if (expanded.content.trim()) {
          prompt = expanded.content.trim();
        }
      } catch {
        // 扩写失败则使用原始 prompt
      }
    }

    const { taskId } = await submitImageGeneration(
      {
        prompt,
        negativePrompt: body.negativePrompt,
        referenceImageUrl: body.referenceImageUrl,
        width: body.width,
        height: body.height,
        aspectRatio: body.aspectRatio,
        style: body.style,
        seed: body.seed,
      },
      {
        nodeId: body.nodeId,
        targetField: body.targetField,
        targetEntityId: body.targetEntityId,
        entityType: body.entityType,
      },
    );

    return NextResponse.json({ taskId, expandedPrompt: prompt !== body.prompt ? prompt : undefined });
  } catch (error) {
    const message = error instanceof Error ? error.message : "图像生成提交失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
