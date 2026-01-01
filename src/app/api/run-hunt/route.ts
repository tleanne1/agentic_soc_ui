import { NextResponse } from "next/server";

export const runtime = "nodejs"; // important

export async function POST(req: Request) {
  const body = await req.json();
  const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8000";

  const r = await fetch(`${ENGINE_URL}/run-hunt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await r.text();

  // Always respond with JSON (even if engine returns text)
  try {
    return NextResponse.json(JSON.parse(text), { status: r.status });
  } catch {
    return NextResponse.json({ raw: text }, { status: r.status });
  }
}
