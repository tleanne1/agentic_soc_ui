import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8787";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  // Your UI currently sends: { kql, hours }
  // Smart endpoint expects: { prompt, hours }
  const smartPayload = {
    prompt: body?.prompt ?? body?.kql ?? "",
    hours: Number(body?.hours ?? 24),
  };

  const smartUrl = `${ENGINE_URL}/api/hunt/smart`;
  const primaryUrl = `${ENGINE_URL}/api/hunt`;
  const fallbackUrl = `${ENGINE_URL}/hunt`;

  try {
    // 1) Try smart endpoint first
    let upstream = await fetch(smartUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smartPayload),
      cache: "no-store",
    });

    // If smart doesn't exist (older engine), fall back to raw KQL
    if (upstream.status === 404) {
      upstream = await fetch(primaryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (upstream.status === 404) {
        upstream = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        });
      }
    }

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
        detail: `Unable to reach SOC engine at ${ENGINE_URL}. Is the engine server running?`,
        error: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}
