import { NextResponse } from "next/server";
import { getProviderConfig, setRuntimeProviderConfig } from "@/lib/providers/config";
import { testComfyCharacterConnection, testComfyImageConnection } from "@/lib/providers/image/comfyui";
import { testSeedanceImageConnection } from "@/lib/providers/image/seedance";
import { runLlmTask } from "@/lib/providers/llm/resolveTask";
import type { LlmTaskId } from "@/lib/providers/llm/taskProfiles";
import type { ProviderConfig } from "@/lib/providers/types";
import { testComfyVideoConnection } from "@/lib/providers/video/comfyui";
import { testSeedanceVideoConnection } from "@/lib/providers/video/seedance";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      target?: "llm" | "image" | "video";
      llmApiKey?: string;
      llmPresetId?: string;
      llmTaskId?: LlmTaskId;
      llmTaskVars?: { custom?: string; image?: string };
      imageApiKey?: string;
      imageEndpoint?: "general" | "character";
      imageConfig?: Partial<ProviderConfig["image"]>;
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
    if (body.imageConfig) patch.image = { ...patch.image, ...body.imageConfig };
    if (body.videoApiKey) patch.video = { apiKey: body.videoApiKey };
    if (Object.keys(patch).length > 0) setRuntimeProviderConfig(patch);

    const config = getProviderConfig();

    if (body.target === "llm") {
      const taskId = body.llmTaskId ?? "health_check";
      const vars = body.llmTaskVars ?? (
        taskId === "suggest_chain"
          ? { custom: "测试剧集", image: "第一场：主角进入雨夜街道。" }
          : taskId === "decompose"
            ? { custom: "赛博朋克侦探故事，霓虹雨夜。" }
            : taskId === "txt2img_prompt"
              ? { custom: "19岁中国美女" }
              : taskId === "reference_analyze"
                ? { custom: "测试参考图" }
                : { custom: "ping" }
      );
      const result = await runLlmTask(taskId, vars);
      return NextResponse.json({
        message: `任务 ${taskId} 执行成功`,
        content: result.content.slice(0, 500),
        thinking: result.thinking?.slice(0, 300),
        parsed: result.parsed,
      });
    }

    let message: string;
    if (body.target === "image") {
      message =
        config.image.provider === "seedance"
          ? await testSeedanceImageConnection(config)
          : body.imageEndpoint === "character"
            ? await testComfyCharacterConnection(config)
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
