import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8787";

type EngineHealth = {
  ok?: boolean;
  workspace_id_set?: boolean;
  mode?: string; // "live" | "demo" | "unknown"
  detail?: string;
  error?: string;
};

export async function GET() {
  try {
    const upstream = await fetch(`${ENGINE_URL}/health`, { cache: "no-store" });
    const text = await upstream.text();

    // Try to normalize JSON so the UI always gets ok/workspace_id_set/mode
    try {
      const data = JSON.parse(text) as EngineHealth;

      const modeRaw = String(data?.mode ?? "live").toLowerCase();
      const mode = modeRaw === "demo" || modeRaw === "live" ? modeRaw : "live";

      const normalized: EngineHealth = {
        ok: Boolean(data?.ok),
        workspace_id_set: Boolean(data?.workspace_id_set),
        mode,
      };

      return NextResponse.json(normalized, { status: upstream.status });
    } catch {
      // If upstream returned non-JSON, just pass it through unchanged
      return new NextResponse(text, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("content-type") ?? "application/json",
        },
      });
    }
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        workspace_id_set: false,
        mode: "unknown",
        detail: `Unable to reach SOC engine at ${ENGINE_URL}. Is the engine server running?`,
        error: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}
