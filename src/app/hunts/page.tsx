"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { saveRun } from "@/lib/engineStore";

export default function HuntsPage() {
  const router = useRouter();

  const [huntName, setHuntName] = useState("Multiple logons (last 24h)");
  const [timeframeHours, setTimeframeHours] = useState(24);
  const [device, setDevice] = useState("");
  const [loading, setLoading] = useState(false);

  const prompt = useMemo(() => {
    const dev = device.trim();
    const name = huntName.trim() || "Threat hunt";
    return `${name}${dev ? ` on ${dev}` : ""} in last ${timeframeHours} hours`;
  }, [huntName, device, timeframeHours]);

  async function runHunt() {
    try {
      setLoading(true);

      const res = await fetch("/api/run-hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          include_pivots: false,
          include_llm_findings: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Engine error:", data);
        alert(
          typeof data?.detail === "string"
            ? data.detail
            : "Hunt failed. Check engine terminal output."
        );
        return;
      }

      saveRun(data);
      router.push("/results");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Threat Hunts" />
        <main className="p-6 space-y-6">
          <h1 className="text-xl font-semibold">Threat Hunts</h1>

          <div className="border border-[var(--soc-panel-border)] rounded-lg p-4 bg-[#020617]/80 space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1">
                <div className="text-xs text-slate-400">Hunt name</div>
                <input
                  value={huntName}
                  onChange={(e) => setHuntName(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
                />
              </label>

              <label className="space-y-1">
                <div className="text-xs text-slate-400">Time range (hours)</div>
                <select
                  value={timeframeHours}
                  onChange={(e) => setTimeframeHours(Number(e.target.value))}
                  className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
                >
                  <option value={1}>Last 1 hour</option>
                  <option value={6}>Last 6 hours</option>
                  <option value={24}>Last 24 hours</option>
                  <option value={72}>Last 3 days</option>
                  <option value={168}>Last 7 days</option>
                </select>
              </label>

              <label className="space-y-1">
                <div className="text-xs text-slate-400">Device (optional)</div>
                <input
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
                  placeholder="windows-target-1"
                />
              </label>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                Prompt: <span className="text-slate-200">{prompt}</span>
              </div>

              <button
                onClick={runHunt}
                disabled={loading}
                className={[
                  "rounded-md px-4 py-2 text-sm border transition",
                  loading
                    ? "bg-slate-950/40 text-slate-500 border-slate-800 cursor-not-allowed"
                    : "bg-slate-200/10 text-slate-100 border-slate-700 hover:bg-slate-200/15",
                ].join(" ")}
              >
                {loading ? "Running…" : "Run Hunt"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </Shell>
  );
}
