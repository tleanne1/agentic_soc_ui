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
    input_type?: string;
    kql_used?: string;
  };
};

export default function HuntsPage() {
  const router = useRouter();

  // ✅ Start empty so nothing "dev-y" shows by default
  const [input, setInput] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function runHunt() {
    const trimmed = input.trim();
    if (!trimmed) {
      setErr("Please enter a prompt or a KQL query.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      // ✅ Default to 24h. Smart endpoint can use this.
      const res = await fetch("/api/run-hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          // ✅ Keep this as kql for backwards-compat with older engines,
          // but route.ts will map it into `prompt` for smart endpoint.
          kql: trimmed,
          hours: 24,
        }),
      });

      const text = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
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

      const rows = Array.isArray(data?.rows) ? data.rows : [];

      const run: EngineRun = {
        ok: true,
        rows,
        count: typeof data?.count === "number" ? data.count : rows.length,
        error: data?.error ?? null,
        meta: {
          huntName: "Ad-hoc",
          hours: 24,
          // Keep original user input for reference
          kql: trimmed,
          ranAt: new Date().toISOString(),
          // If smart endpoint returns these, store them
          input_type: data?.input_type,
          kql_used: data?.kql_used,
        },
      };

      saveRun(run);
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
        <Topbar title="Threat Hunts" rightText="Prompt or KQL mode" />

        <main className="p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Run a Threat Hunt</h1>
            <p className="mt-2 text-sm text-slate-400">
              Type a <span className="text-slate-200">natural-language prompt</span> (recommended) or paste{" "}
              <span className="text-slate-200">raw KQL</span>.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Examples:{" "}
              <span className="text-slate-300">“check for suspicious logons in the last 24 hours”</span> or{" "}
              <span className="text-slate-300">Heartbeat | take 10</span>
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <div className="text-xs text-slate-400 mb-2">Prompt or KQL</div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full min-h-[220px] rounded-xl bg-black/30 border border-white/10 px-3 py-3 text-sm text-slate-100 outline-none"
              placeholder={`Try:
- check for suspicious logons in the last 24 hours
- show top devices by failed logons
- list machines with multiple logon failures

Or paste raw KQL:
Heartbeat | take 10`}
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

              {/* ✅ Minimal cleanup: remove "Reset example" button so the page looks less like a dev demo */}

              <div className="text-xs text-slate-500">Default time window: 24h</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
