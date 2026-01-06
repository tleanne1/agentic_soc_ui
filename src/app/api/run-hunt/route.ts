import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8787";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const primaryUrl = `${ENGINE_URL}/api/hunt`;
  // Back-compat for older engine versions (some used /hunt).
  const fallbackUrl = `${ENGINE_URL}/hunt`;

  try {
    let upstream = await fetch(primaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    // If engine returns 404 for /api/hunt, try /hunt automatically.
    if (upstream.status === 404) {
      upstream = await fetch(fallbackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
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
