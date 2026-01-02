"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { getRun, getSelectedRow, saveRun } from "@/lib/engineStore";
import { saveCase, type SocCase } from "@/lib/caseStore";

type AnyRow = Record<string, any>;

function safeString(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    const s = safeString(v).trim();
    if (s) return v;
  }
  return "";
}

function makeCaseId() {
  // Minimal local ID generation (no backend yet)
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `SOC-${new Date().getFullYear()}-${n}`;
}

export default function InvestigationPage() {
  const router = useRouter();

  const [run, setRun] = useState<any>(null);
  const [row, setRow] = useState<AnyRow | null>(null);

  const [loadingPivot, setLoadingPivot] = useState<string | null>(null);

  // NEW: case UI state
  const [caseTitle, setCaseTitle] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setRun(getRun());
    const r = getSelectedRow();
    setRow(r);

    // Default case title from row context
    const d = safeString(
      pickFirst(r?.DeviceName, r?.Device, r?.Hostname, r?.Computer, r?.Machine)
    ).trim();
    const u = safeString(
      pickFirst(r?.AccountName, r?.UserPrincipalName, r?.User)
    ).trim();

    setCaseTitle(
      `Investigation${d ? `: ${d}` : ""}${u ? ` (${u})` : ""}`
    );
  }, []);

  const device = useMemo(() => {
    if (!row) return "";
    return safeString(
      pickFirst(
        row.DeviceName,
        row.Device,
        row.device,
        row.Hostname,
        row.Computer,
        row.Machine,
        row.DstDeviceName
      )
    ).trim();
  }, [row]);

  const user = useMemo(() => {
    if (!row) return "";
    return safeString(
      pickFirst(
        row.AccountName,
        row.User,
        row.user,
        row.UserPrincipalName,
        row.InitiatingProcessAccountName
      )
    ).trim();
  }, [row]);

  const time = useMemo(() => {
    if (!row) return "";
    return safeString(
      pickFirst(row.TimeGenerated, row.Timestamp, row.TimeCreated, row.EventTime)
    ).trim();
  }, [row]);

  const headline = useMemo(() => {
    if (!row) return "Investigation";
    return `Investigation${device ? ` • ${device}` : ""}${user ? ` • ${user}` : ""}`;
  }, [row, device, user]);

  async function runPivot(pivotLabel: string, prompt: string) {
    try {
      setLoadingPivot(pivotLabel);

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
        console.error("Pivot error:", data);
        alert(typeof data?.detail === "string" ? data.detail : "Pivot failed. Check engine terminal output.");
        return;
      }

      saveRun(data);
      router.push("/results");
    } finally {
      setLoadingPivot(null);
    }
  }

  const pivotPrompts = useMemo(() => {
    const baseScope = device ? ` on ${device}` : "";
    const userScope = user ? ` for ${user}` : "";
    return {
      logons: `Hunt suspicious logons${baseScope}${userScope} in last 24 hours`,
      processes: `Hunt suspicious process activity${baseScope}${userScope} in last 24 hours`,
      network: `Hunt suspicious network connections${baseScope}${userScope} in last 24 hours`,
    };
  }, [device, user]);

  function onSaveCase() {
    if (!row) return;

    const c: SocCase = {
      case_id: makeCaseId(),
      created_at: new Date().toISOString(),
      status: "open",
      title: (caseTitle || "New SOC Case").trim(),
      device,
      user,
      time,
      baseline_note: safeString(run?.baseline_note || ""),
      findings: Array.isArray(run?.findings) ? run.findings : [],
      evidence: [row],
      analyst_notes: [],
    };

    saveCase(c);

    setSavedMsg(`Saved as ${c.case_id}`);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Investigation" />
        <main className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-semibold">{headline}</h1>
              <div className="text-xs text-slate-400">
                Source: <span className="text-slate-200">Selected Result Row</span>
                {run?._savedAt ? <span className="text-slate-500"> • saved {run._savedAt}</span> : null}
              </div>
              {(device || user || time) && (
                <div className="text-xs text-slate-500 mt-1">
                  {device ? <span className="mr-2">Device: {device}</span> : null}
                  {user ? <span className="mr-2">User: {user}</span> : null}
                  {time ? <span>Time: {time}</span> : null}
                </div>
              )}
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              {savedMsg ? (
                <div className="text-xs text-slate-200 border border-slate-700 bg-slate-200/10 px-3 py-2 rounded-md">
                  {savedMsg}
                </div>
              ) : null}

              <button
                onClick={() => router.push("/results")}
                className="rounded-md px-4 py-2 text-sm border border-slate-700 bg-slate-200/10 text-slate-100 hover:bg-slate-200/15 transition"
              >
                ← Back to Results
              </button>
            </div>
          </div>

          {!row ? (
            <div className="border border-[var(--soc-panel-border)] rounded-lg p-4 bg-[#020617]/80 text-slate-400">
              No row selected. Go back to Results and click a row, then click Investigate.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
              {/* LEFT: PIVOTS + CASE */}
              <div className="border border-[var(--soc-panel-border)] rounded-lg p-4 bg-[#020617]/80 space-y-5">
                {/* CASE BOX */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-200">Case</div>
                  <div className="text-xs text-slate-400">
                    Save this investigation as a SOC case (stored locally for now).
                  </div>

                  <label className="block space-y-1">
                    <div className="text-xs text-slate-400">Case title</div>
                    <input
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
                    />
                  </label>

                  <button
                    onClick={onSaveCase}
                    className="w-full rounded-md px-4 py-2 text-sm border border-slate-700 bg-slate-200/10 text-slate-100 hover:bg-slate-200/15 transition"
                  >
                    Save as Case
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800" />

                {/* PIVOTS */}
                <div>
                  <div className="text-sm font-semibold text-slate-200">Pivot Hunts</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Run a focused follow-up hunt using the selected row context. (Loads in Results page.)
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button
                      onClick={() => runPivot("Logons", pivotPrompts.logons)}
                      disabled={!!loadingPivot}
                      className={[
                        "rounded-md px-3 py-2 text-xs border transition text-left",
                        loadingPivot
                          ? "bg-slate-950/40 text-slate-500 border-slate-800 cursor-not-allowed"
                          : "bg-slate-200/10 text-slate-100 border-slate-700 hover:bg-slate-200/15",
                      ].join(" ")}
                      title={pivotPrompts.logons}
                    >
                      {loadingPivot === "Logons" ? "Running…" : "Logons pivot"}
                    </button>

                    <button
                      onClick={() => runPivot("Processes", pivotPrompts.processes)}
                      disabled={!!loadingPivot}
                      className={[
                        "rounded-md px-3 py-2 text-xs border transition text-left",
                        loadingPivot
                          ? "bg-slate-950/40 text-slate-500 border-slate-800 cursor-not-allowed"
                          : "bg-slate-200/10 text-slate-100 border-slate-700 hover:bg-slate-200/15",
                      ].join(" ")}
                      title={pivotPrompts.processes}
                    >
                      {loadingPivot === "Processes" ? "Running…" : "Process pivot"}
                    </button>

                    <button
                      onClick={() => runPivot("Network", pivotPrompts.network)}
                      disabled={!!loadingPivot}
                      className={[
                        "rounded-md px-3 py-2 text-xs border transition text-left",
                        loadingPivot
                          ? "bg-slate-950/40 text-slate-500 border-slate-800 cursor-not-allowed"
                          : "bg-slate-200/10 text-slate-100 border-slate-700 hover:bg-slate-200/15",
                      ].join(" ")}
                      title={pivotPrompts.network}
                    >
                      {loadingPivot === "Network" ? "Running…" : "Network pivot"}
                    </button>
                  </div>
                </div>

                {run?.baseline_note ? (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">Baseline note</div>
                    <div className="text-sm text-slate-200 whitespace-pre-wrap">{safeString(run.baseline_note)}</div>
                  </div>
                ) : null}

                {Array.isArray(run?.findings) && run.findings.length > 0 ? (
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    <div className="text-sm font-semibold text-slate-200">LLM findings</div>
                    <div className="space-y-2">
                      {run.findings.slice(0, 5).map((f: any, i: number) => (
                        <div key={i} className="text-sm text-slate-200">
                          • {safeString(f?.summary || f?.title || JSON.stringify(f))}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* RIGHT: EVIDENCE */}
              <div className="border border-[var(--soc-panel-border)] rounded-lg p-4 bg-[#020617]/80">
                <div className="text-sm font-semibold text-slate-200">Evidence</div>

                <div className="mt-3 max-h-[560px] overflow-auto pr-2 space-y-2">
                  {Object.entries(row).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[140px_1fr] gap-3">
                      <div className="text-xs text-slate-400 truncate">{k}</div>
                      <div className="text-xs text-slate-200 break-all">{safeString(v)}</div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(row, null, 2))}
                  className="mt-4 w-full rounded-md px-3 py-2 text-xs border border-slate-700 bg-slate-200/10 text-slate-100 hover:bg-slate-200/15 transition"
                >
                  Copy evidence JSON
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </Shell>
  );
}
