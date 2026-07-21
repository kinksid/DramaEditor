import { NextResponse } from "next/server";
import { getMergedTaskProfiles } from "@/lib/providers/llm/resolveTask";
import { loadDefaultLlmTaskProfiles } from "@/lib/providers/llm/taskProfiles";

export async function GET() {
  const [defaults, current] = await Promise.all([
    loadDefaultLlmTaskProfiles(),
    getMergedTaskProfiles(),
  ]);
  return NextResponse.json({ defaults, current });
}
