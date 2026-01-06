"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { saveRun } from "@/lib/engineStore";
import { HUNT_TEMPLATES } from "@/lib/huntTemplates";

function hoursFromLabel(label: string) {
  const m = label.match(/(\d+)/);
  return m ? Number(m[1]) : 24;
}

export default function HuntsPage() {
  const router = useRouter();

  const [huntName, setHuntName] = React.useState(HUNT_TEMPLATES[0]?.name ?? "Multiple logons (last 24h)");
  const [hoursLabel, setHoursLabel] = React.useState("Last 24 hours");
  const [device, setDevice] = React.useState("");
  const [advanced, setAdvanced] = React.useState(false);
  const [kqlOverride, setKqlOverride] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const hours = hoursFromLabel(hoursLabel);

  const template = React.useMemo(() => {
    return HUNT_TEMPLATES.find((t) => t.name === huntName) ?? HUNT_TEMPLATES[0];
  }, [huntName]);

  const prompt = template?.prompt ?? "";

  const kql = React.useMemo(() => {
    if (advanced && kqlOverride.trim()) return kqlOverride.trim();
    return template?.buildKql({ hours, device }) ?? "";
  }, [advanced, kqlOverride, template, hours, device]);

  async function runHunt() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/run-hunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kql,
          hours,
          device: device.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        console.error("Engine error:", data);
        setError(typeof data?.detail === "string" ? data.detail : "Engine error (see console).");
        setLoading(false);
        return;
      }

      saveRun({
        id: `run_${Date.now()}`,
        createdAt: Date.now(),
        huntName,
        prompt,
        hours,
        device: device.trim() || undefined,
        kql,
        rows: Array.isArray(data.rows) ? data.rows : [],
        meta: data.meta ?? {},
      });

      router.push("/results");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex bg-gradient-to-b from-[#030712] to-[#020617] text-slate-100">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar title="Live SOC Console" rightText="Workspace: Lab | Status: Ready" />
        <main className="p-8">
          <h1 className="text-2xl font-semibold mb-6">Threat Hunts</h1>

          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400">Hunt name</label>
                <select
                  className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2"
                  value={huntName}
                  onChange={(e) => setHuntName(e.target.value)}
                >
                  {HUNT_TEMPLATES.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-slate-400 mt-2">Prompt: {prompt}</div>
              </div>

              <div>
                <label className="text-xs text-slate-400">Time range (hours)</label>
                <select
                  className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2"
                  value={hoursLabel}
                  onChange={(e) => setHoursLabel(e.target.value)}
                >
                  <option>Last 1 hour</option>
                  <option>Last 6 hours</option>
                  <option>Last 12 hours</option>
                  <option>Last 24 hours</option>
                  <option>Last 48 hours</option>
                  <option>Last 72 hours</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400">Device (optional)</label>
                <input
                  className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2"
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  placeholder="windows-target-1"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={advanced} onChange={(e) => setAdvanced(e.target.checked)} />
                Show Advanced (KQL override)
              </label>
            </div>

            {advanced && (
              <div className="mt-4">
                <label className="text-xs text-slate-400">KQL override</label>
                <textarea
                  className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 font-mono text-xs min-h-[160px]"
                  value={kqlOverride}
                  onChange={(e) => setKqlOverride(e.target.value)}
                  placeholder={template?.buildKql({ hours, device })}
                />
              </div>
            )}

            {error && <div className="mt-4 text-sm text-red-400">Error: {error}</div>}

            <div className="mt-6 flex justify-end">
              <button
                onClick={runHunt}
                disabled={loading || !kql.trim()}
                className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-50"
              >
                {loading ? "Running..." : "Run Hunt"}
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
