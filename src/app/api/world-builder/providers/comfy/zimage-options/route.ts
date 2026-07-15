import { NextResponse } from "next/server";
import { getProviderConfig } from "@/lib/providers/config";
import {
  isZimageTxt2ImgWorkflow,
  resolveZimageTxt2ImgOptions,
} from "@/lib/providers/comfy/zimageTxt2Img";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const config = getProviderConfig();
    const baseUrl = url.searchParams.get("baseUrl") ?? config.image.baseUrl;
    const workflowPath = url.searchParams.get("workflow") ?? config.image.comfyWorkflowTxt2Img;

    if (!isZimageTxt2ImgWorkflow(workflowPath)) {
      return NextResponse.json({
        supported: false,
        aspectRatios: [],
        defaults: null,
        source: "unsupported",
      });
    }

    const options = await resolveZimageTxt2ImgOptions(baseUrl);
    return NextResponse.json({
      supported: true,
      ...options,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "无法加载 Z-Image 选项";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
