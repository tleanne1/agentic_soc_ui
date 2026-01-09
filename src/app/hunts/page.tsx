"use client";

import React from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { saveRun } from "@/lib/engineStore";

type EngineRun = {
  ok: boolean;
  rows: any[];
  count?: number;
  error?: any;
  meta?: {
    huntName?: string;
    hours?: number;
    device?: string;
    kql?: string;
    ranAt?: string;
  };
};

export default function HuntsPage() {
  const router = useRouter();

  const [kql, setKql] = React.useState<string>("Heartbeat | take 10");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function runHunt() {
    const trimmed = kql.trim();
    if (!trimmed) {
      setErr("Please enter a KQL query.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      // ✅ No hours dropdown anymore — default to 24h.
      // If your engine ignores hours, it's still safe.
      const res = await fetch("/api/run-hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          kql: trimmed,
          hours: 24,
        }),
      });

      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        // non-json error response
        throw new Error(text || "Unexpected response from /api/run-hunt");
      }

      if (!res.ok || data?.ok === false) {
        const detail =
          data?.detail ||
          data?.error ||
          data?.message ||
          `Request failed (${res.status})`;
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }

      const run: EngineRun = {
        ok: true,
        rows: Array.isArray(data?.rows) ? data.rows : [],
        count: typeof data?.count === "number" ? data.count : undefined,
        error: data?.error ?? null,
        meta: {
          huntName: "Ad-hoc query",
          hours: 24,
          kql: trimmed,
          ranAt: new Date().toISOString(),
        },
      };

      // ✅ Save to localStorage so /results can read it
      saveRun(run);

      // ✅ Go to results page
      router.push("/results");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex bg-gradient-to-b from-[#030712] to-[#020617] text-slate-100">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title="Threat Hunts" rightText="Live query mode" />

        <main className="p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Run a Threat Hunt</h1>
            <p className="mt-2 text-sm text-slate-400">
              Paste any KQL query below. Example: <span className="text-slate-300">Heartbeat | take 10</span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <div className="text-xs text-slate-400 mb-2">KQL query</div>

            <textarea
              value={kql}
              onChange={(e) => setKql(e.target.value)}
              className="w-full min-h-[220px] rounded-xl bg-black/30 border border-white/10 px-3 py-3 text-sm text-slate-100 outline-none"
              placeholder={`Example:\nHeartbeat | take 10\n\nOr:\nSecurityEvent | take 10`}
            />

            {err ? (
              <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {err}
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={runHunt}
                disabled={loading}
                className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-60"
              >
                {loading ? "Running..." : "Run Hunt"}
              </button>

              <button
                onClick={() => setKql("Heartbeat | take 10")}
                disabled={loading}
                className="rounded-xl px-4 py-2 bg-black/20 hover:bg-black/30 border border-white/10 disabled:opacity-60"
              >
                Reset example
              </button>

              <div className="text-xs text-slate-500">
                Default time window: 24h (no dropdown)
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
