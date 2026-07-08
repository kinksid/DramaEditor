import { NextResponse } from "next/server";
import { getProviderConfig, setRuntimeProviderConfig } from "@/lib/providers/config";
import { testComfyImageConnection } from "@/lib/providers/image/comfyui";
import { testSeedanceImageConnection } from "@/lib/providers/image/seedance";
import { testLlmConnection } from "@/lib/providers/llm";
import { testComfyVideoConnection } from "@/lib/providers/video/comfyui";
import { testSeedanceVideoConnection } from "@/lib/providers/video/seedance";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      target?: "llm" | "image" | "video";
      llmApiKey?: string;
      llmPresetId?: string;
      imageApiKey?: string;
      videoApiKey?: string;
    };

    if (!body.target) {
      return NextResponse.json({ error: "缺少 target" }, { status: 400 });
    }

    const patch: Parameters<typeof setRuntimeProviderConfig>[0] = {};
    if (body.llmPresetId) {
      const { applyLlmPreset } = await import("@/lib/providers/llm/presets");
      await applyLlmPreset(body.llmPresetId);
    }
    if (body.llmApiKey) patch.llm = { apiKey: body.llmApiKey };
    if (body.imageApiKey) patch.image = { apiKey: body.imageApiKey };
    if (body.videoApiKey) patch.video = { apiKey: body.videoApiKey };
    if (Object.keys(patch).length > 0) setRuntimeProviderConfig(patch);

    const config = getProviderConfig();
    let message: string;

    if (body.target === "llm") {
      message = await testLlmConnection(config);
    } else if (body.target === "image") {
      message =
        config.image.provider === "seedance"
          ? await testSeedanceImageConnection(config)
          : await testComfyImageConnection(config);
    } else {
      message =
        config.video.provider === "comfyui"
          ? await testComfyVideoConnection(config)
          : await testSeedanceVideoConnection(config);
    }

    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : "连接测试失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
