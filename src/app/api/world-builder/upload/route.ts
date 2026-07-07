import { NextResponse } from "next/server";
import {
  referenceKindFromMime,
  saveUploadedFile,
} from "@/lib/worldBuilderServer";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const scope = String(formData.get("scope") ?? "session");
    const textContent = formData.get("textContent");

    if (textContent && typeof textContent === "string") {
      const name = String(formData.get("name") ?? "文本参考.txt");
      return NextResponse.json({
        id: crypto.randomUUID(),
        kind: "text" as const,
        name,
        textContent,
      });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "缺少 file 或 textContent" }, { status: 400 });
    }

    const saved = await saveUploadedFile(file, scope);
    const kind = referenceKindFromMime(saved.mimeType, saved.name);

    return NextResponse.json({
      id: saved.id,
      kind,
      name: saved.name,
      url: saved.url,
      mimeType: saved.mimeType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
