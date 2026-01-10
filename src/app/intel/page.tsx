// src/app/intel/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Shell from "@/components/Shell";

import { buildIntelIndex, scoreSearch, IntelIndex } from "@/lib/intelEngine";
import { summarizeKillChain } from "@/lib/killChainEngine";
import { decideSocActions } from "@/lib/socDecisionEngine";

// ✅ UI blocks
import PostureHeader from "@/components/command-center/PostureHeader";
import KillChainTimeline from "@/components/command-center/KillChainTimeline";
import DecisionCards, { DecisionRec } from "@/components/command-center/DecisionCards";
import AnalystConsole from "@/components/command-center/AnalystConsole";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function pill(txt: string) {
  return (
    <span className="inline-flex items-center rounded border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200">
      {txt}
    </span>
  );
}

export default function IntelPage() {
  const [index, setIndex] = useState<IntelIndex | null>(null);

  // Global Search (local index search)
  const [q, setQ] = useState("");

  // --- LIVE TELEMETRY SEARCH (engine-backed) ---
  const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL || "http://127.0.0.1:8787";
  const [liveRows, setLiveRows] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string>("");

  useEffect(() => {
    setIndex(buildIntelIndex());
  }, []);

  // allow /intel?q=T1110 deep links
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const qq = url.searchParams.get("q");
      if (qq) setQ(qq);
    } catch {}
  }, []);

  function toKqlFromInput(input: string) {
    const s = (input || "").trim();
    if (!s) return "";

    // If user already typed KQL with pipes, treat as full KQL
    if (s.includes("|")) return s;

    // If they typed a table name, auto-expand to a safe preview
    return `${s} | take 25`;
  }

  async function runLiveSearch(input: string) {
    const kql = toKqlFromInput(input);
    if (!kql) return;

    setLiveLoading(true);
    setLiveError("");
    setLiveRows([]);

    try {
      const res = await fetch(`${ENGINE_URL}/api/hunt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kql, hours: 24 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `Engine error (${res.status})`);
      }

      const data = await res.json();
      setLiveRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e: any) {
      setLiveError(e?.message || "Live search failed.");
    } finally {
      setLiveLoading(false);
    }
  }

  const commandCenter = useMemo(() => {
    if (!index) return null;
    return summarizeKillChain({
      cases: index.cases,
      mitreFindings: index.mitreFindings,
      lateralFindings: index.lateralFindings,
    });
  }, [index]);

  const highestCampaign = useMemo(() => {
    if (!index?.campaigns?.length) return null;
    const top = [...index.campaigns].sort(
      (a: any, b: any) => Number(b.risk || 0) - Number(a.risk || 0)
    )[0];
    return top ? { id: safe(top.campaign_id), risk: Number(top.risk || 0) } : null;
  }, [index]);

  const openCasesCount = useMemo(() => {
    if (!index) return 0;
    return index.cases.filter((c: any) => String(c.status) !== "closed").length;
  }, [index]);

  const decisions = useMemo((): DecisionRec[] => {
    if (!index || !commandCenter) return [];

    const raw = decideSocActions({
      index,
      killchain: commandCenter,
    });

    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];

    return arr.map((r: any, i: number): DecisionRec => ({
      id: safe(r?.id || `rec-${i}`),
      title: safe(r?.title || "Recommendation"),
      severity: safe(r?.severity || "LOW"),
      rationale: Array.isArray(r?.rationale) ? r.rationale.map(String) : [],
      actions: Array.isArray(r?.actions) ? r.actions.map(String) : [],
      hunts: Array.isArray(r?.hunts) ? r.hunts.map(String) : [],
      focusCampaignId: r?.focusCampaignId ? safe(r.focusCampaignId) : null,
      focusMitre: r?.focusMitre ? safe(r.focusMitre) : null,
    }));
  }, [index, commandCenter]);

  const topSeverity = useMemo(() => {
    if (!decisions.length) return "LOW";
    const order = ["CRITICAL", "HIGH", "MED", "LOW"];
    const best = [...decisions].sort(
      (a, b) =>
        order.indexOf(safe(a.severity).toUpperCase()) -
        order.indexOf(safe(b.severity).toUpperCase())
    )[0];
    return safe(best?.severity || "LOW");
  }, [decisions]);

  const hits = useMemo(() => {
    if (!index) return [];
    return scoreSearch(index, q);
  }, [index, q]);

  if (!index) {
    return (
      <Shell>
        <main className="p-6">
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 text-slate-200">
            Loading intel…
          </div>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Cyber Command Center</h1>
            <div className="text-sm text-slate-300 mt-1">
              Global posture + kill chain + decision engine + campaign clustering + search (inference-only).
            </div>
          </div>

          <button
            onClick={() => setIndex(buildIntelIndex())}
            className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
          >
            Refresh
          </button>
        </div>

        {/* Posture header */}
        <PostureHeader
          topSeverity={topSeverity}
          casesCount={index.cases.length}
          openCasesCount={openCasesCount}
          campaignsCount={index.campaigns.length}
          highestCampaign={highestCampaign}
          topMitre={commandCenter?.evidence?.mitre_techniques?.slice(0, 8) || []}
          lateralCount={index.lateralFindings?.length || 0}
          confidence={commandCenter?.confidence || 0}
        />

        {/* 3-column layout */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-4 space-y-4">
            {/* Metrics mini grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
                <div className="text-xs text-slate-400">Cases</div>
                <div className="text-2xl font-semibold text-slate-100">{index.cases.length}</div>
              </div>
              <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
                <div className="text-xs text-slate-400">Open Cases</div>
                <div className="text-2xl font-semibold text-slate-100">{openCasesCount}</div>
              </div>
              <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
                <div className="text-xs text-slate-400">Entities in Memory</div>
                <div className="text-2xl font-semibold text-slate-100">
                  {Object.keys(index.entities || {}).length}
                </div>
              </div>
              <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
                <div className="text-xs text-slate-400">Lateral Signals</div>
                <div className="text-2xl font-semibold text-slate-100">
                  {index.lateralFindings?.length || 0}
                </div>
              </div>
            </div>

            {/* Global Search */}
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-100">Global Search</div>
              <div className="text-xs text-slate-400">
                Search across cases, memory entities, campaigns, and edges.
              </div>

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Try: "umfd-1", "orca", "T1110", "ssh"'
                className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
              />

              {/* --- LIVE TELEMETRY (KQL) SEARCH --- */}
              <div className="mt-3 rounded border border-slate-800 bg-[#050A14] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-200">Live Telemetry Search (KQL)</div>
                  <div className="text-[11px] text-slate-400">Engine: {ENGINE_URL}</div>
                </div>

                <div className="text-[11px] text-slate-400">
                  Tip: type a table name like <span className="text-slate-200">Heartbeat</span>{" "}
                  (auto adds <span className="text-slate-200">| take 25</span>) or paste full KQL.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runLiveSearch(q)}
                    className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-xs text-slate-200 hover:bg-slate-200/15"
                  >
                    Run Live
                  </button>

                  <button
                    onClick={() => {
                      setLiveRows([]);
                      setLiveError("");
                    }}
                    className="rounded border border-slate-700 bg-transparent px-3 py-2 text-xs text-slate-300 hover:text-white"
                  >
                    Clear
                  </button>

                  {liveLoading ? <span className="text-xs text-slate-400">Running…</span> : null}
                </div>

                {liveError ? (
                  <div className="text-xs text-red-300 border border-red-900/40 bg-red-950/30 rounded p-2">
                    {liveError}
                  </div>
                ) : null}

                {liveRows?.length ? (
                  <div className="rounded border border-slate-800 overflow-hidden">
                    <div className="px-3 py-2 text-[11px] text-slate-400 bg-[#020617]/40">
                      Showing {Math.min(liveRows.length, 10)} of {liveRows.length} rows
                    </div>
                    <div className="divide-y divide-slate-800">
                      {liveRows.slice(0, 10).map((r: any, i: number) => (
                        <div key={`live-${i}`} className="p-3 text-xs text-slate-200 bg-[#020617]/30">
                          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(r, null, 2)}</pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    No live results yet. Click <span className="text-slate-200">Run Live</span>.
                  </div>
                )}
              </div>

              {q.trim() ? (
                <div className="rounded border border-slate-800 overflow-hidden">
                  {hits.length ? (
                    <div className="divide-y divide-slate-800">
                      {hits.slice(0, 10).map((h: any, i: number) => {
                        const type = safe(h.type);
                        const score = safe(h.score);

                        let actionHref = "";
                        let actionLabel = "";

                        if (type === "case") {
                          actionHref = `/cases/${encodeURIComponent(h.case_id)}`;
                          actionLabel = "Open case";
                        } else if (type === "campaign") {
                          actionHref = `/intel/campaign/${encodeURIComponent(h.campaign_id)}`;
                          actionLabel = "Open campaign";
                        } else if (type === "entity") {
                          const key = safe(h.key);
                          const [t, ...rest] = key.split(":");
                          actionHref = `/intel?type=${encodeURIComponent(t)}&id=${encodeURIComponent(rest.join(":"))}`;
                          actionLabel = "Open in Intel";
                        } else if (type === "edge") {
                          actionHref = `/intel`;
                          actionLabel = "View edges";
                        }

                        return (
                          <div key={`${type}-${i}`} className="bg-[#020617]/40 p-3 flex items-center justify-between gap-4">
                            <div>
                              <div className="text-sm text-slate-200">
                                {pill(type)} <span className="text-slate-400">score:</span> {score}
                              </div>
                              <div className="text-xs text-slate-300 mt-1">
                                {safe(h.title || h.case_id || h.campaign_id || h.key || h.edge_id)}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">{safe(h.meta)}</div>
                            </div>

                            {actionHref ? (
                              <Link href={actionHref} className="text-xs underline text-slate-200 hover:text-white whitespace-nowrap">
                                {actionLabel}
                              </Link>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-slate-400 bg-[#020617]/40">No results.</div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Campaign Heat List */}
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">Campaign Heat</div>
                <div className="text-xs text-slate-400">{index.campaigns.length} found</div>
              </div>

              <div className="space-y-2">
                {index.campaigns.slice(0, 10).map((c: any) => {
                  const risk = Number(c.risk || 0);
                  const pct = Math.max(0, Math.min(100, risk));
                  return (
                    <div key={safe(c.campaign_id)} className="rounded border border-slate-800 bg-[#050A14] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-sm text-slate-200">
                          <span className="font-semibold">{safe(c.campaign_id)}</span> — {safe(c.title)}
                          <div className="text-xs text-slate-400 mt-1">
                            risk:{risk} • cases:{safe((c.case_ids || []).length)} • entities:{safe((c.entities || []).length)}
                          </div>
                          <div className="mt-2 h-2 w-full rounded bg-slate-900/60 overflow-hidden">
                            <div className="h-full bg-slate-200/30" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        <Link
                          href={`/intel/campaign/${encodeURIComponent(c.campaign_id)}`}
                          className="text-xs underline text-slate-200 hover:text-white whitespace-nowrap"
                        >
                          Open
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {index.campaigns.length > 10 ? <div className="text-xs text-slate-500">Showing top 10 by risk.</div> : null}
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div className="lg:col-span-5 space-y-4">
            <KillChainTimeline
              stages={commandCenter?.stages || []}
              current={commandCenter?.current_stage || null}
              next={commandCenter?.next_likely || []}
            />

            <DecisionCards recs={decisions} />

            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-100">Evidence Signals</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-200 list-disc pl-5">
                {(commandCenter?.evidence?.signals?.length ? commandCenter.evidence.signals : ["No signals available."]).map(
                  (s: any, i: number) => (
                    <li key={`sig-${i}`}>{String(s)}</li>
                  )
                )}
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-3 space-y-4">
            <AnalystConsole
              suggestedQuery="Hunt: password spray / brute force patterns (T1110) + new logons across multiple devices (24h/7d)"
              checklist={[
                "Confirm scope: impacted users + devices + time window.",
                "Validate auth telemetry: success/fail, source IPs, geo, ASN.",
                "Check remote services: RDP/SSH/WinRM (possible lateral).",
                "Review endpoint events: execution + persistence artifacts.",
                "Escalate only with confirmed evidence + approvals (manual).",
              ]}
            />

            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
              <div className="text-sm font-semibold text-slate-100">Guardrails</div>
              <div className="text-xs text-slate-400 mt-2 leading-relaxed">
                This UI is an inference assistant only. It does not isolate devices, terminate processes, block users, or execute remediation.
                Any containment must occur in approved tooling with human validation.
              </div>
            </div>
          </div>
        </div>
      </main>
    </Shell>
  );
}
