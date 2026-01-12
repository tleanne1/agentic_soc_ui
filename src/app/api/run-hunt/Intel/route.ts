// src/app/api/intel/route.ts
import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8787";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  // Expected from UI:
  // { prompt: string }
  const primaryUrl = `${ENGINE_URL}/api/intel`;

  try {
    const upstream = await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: String(e?.message ?? e),
        detail: `Unable to reach SOC engine at ${ENGINE_URL}. Is the engine API running?`,
      },
      { status: 500 }
    );
  }
}