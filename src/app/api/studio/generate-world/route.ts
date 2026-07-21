import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type GenerateBody = {
  prompt?: string;
  visualStyle?: string;
  genre?: string;
  references?: string[];
  apiBaseUrl?: string;
  apiKey?: string;
};

/**
 * Proxies world generation to the configured Studio / DramaPlay API.
 * Expected upstream: POST {base}/worlds/generate
 * Body: { prompt, visualStyle, genre?, references? }
 */
export async function POST(request: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ ok: false, error: "prompt is required" }, { status: 400 });
  }

  const apiBaseUrl = (
    body.apiBaseUrl?.trim() ||
    process.env.STUDIO_API_BASE ||
    "https://api.dramaplay.dev/v1"
  ).replace(/\/$/, "");
  const apiKey = body.apiKey?.trim() || process.env.STUDIO_API_KEY || "";

  if (!apiKey || apiKey.includes("••••")) {
    return NextResponse.json(
      {
        ok: false,
        error: "API Key missing. Set it in Settings or STUDIO_API_KEY.",
        code: "MISSING_API_KEY",
      },
      { status: 401 },
    );
  }

  const upstream = `${apiBaseUrl}/worlds/generate`;
  try {
    const response = await fetch(upstream, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        visualStyle: body.visualStyle,
        genre: body.genre,
        references: body.references ?? [],
      }),
    });

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Upstream ${response.status}`,
          upstream,
          data,
          code: "UPSTREAM_ERROR",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, upstream, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        upstream,
        code: "NETWORK_ERROR",
      },
      { status: 502 },
    );
  }
}
