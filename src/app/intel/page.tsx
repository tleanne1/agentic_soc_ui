// src/app/intel/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { buildIntelIndex, scoreSearch, IntelIndex } from "@/lib/intelEngine";
import { summarizeKillChain } from "@/lib/killChainEngine";
import { buildSocDecisions } from "@/lib/decisionEngine";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function pill(txt: string, key?: string) {
  return (
    <span
      key={key || txt}
      className="inline-flex items-center rounded border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200"
    >
      {txt}
    </span>
  );
}

function priorityBadge(p: string) {
  const base =
    "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";
  if (p === "CRITICAL") return <span className={`${base} border-red-600/60 bg-red-500/10 text-red-200`}>CRITICAL</span>;
  if (p === "HIGH") return <span className={`${base} border-orange-600/60 bg-orange-500/10 text-orange-200`}>HIGH</span>;
  if (p === "MEDIUM") return <span className={`${base} border-yellow-600/60 bg-yellow-500/10 text-yellow-200`}>MEDIUM</span>;
  return <span className={`${base} border-slate-600 bg-slate-200/10 text-slate-200`}>LOW</span>;
}

export default function IntelPage() {
  const [index, setIndex] = useState<IntelIndex | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    setIndex(buildIntelIndex());
  }, []);

  const commandCenter = useMemo(() => {
    if (!index) return null;

    return summarizeKillChain({
      cases: index.cases,
      mitreFindings: index.mitreFindings,
      lateralFindings: index.lateralFindings,
    });
  }, [index]);

  const decisions = useMemo(() => {
    if (!index) return [];
    return buildSocDecisions({
      scope: "global",
      index,
      killChain: commandCenter,
      cases: index.cases,
    });
  }, [index, commandCenter]);

  const hits = useMemo(() => {
    if (!index) return [];
    return scoreSearch(index, q);
  }, [index, q]);

  if (!index) {
    return (
      <Shell>
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar title="Intel" />
          <main className="p-6">
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 text-slate-200">
              Loading intel…
            </div>
          </main>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Intel" />

        <main className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Global Intelligence Center</h1>
              <div className="text-sm text-slate-300 mt-1">
                Campaign clustering + MITRE inference + lateral movement + correlation edges + global search.
              </div>
            </div>

            <button
              onClick={() => setIndex(buildIntelIndex())}
              className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
            >
              Refresh
            </button>
          </div>

          {/* Metrics */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Cases</div>
              <div className="text-2xl font-semibold text-slate-100">{index.cases.length}</div>
            </div>

            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Open Cases</div>
              <div className="text-2xl font-semibold text-slate-100">
                {index.cases.filter((c: any) => String(c.status) !== "closed").length}
              </div>
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

          {/* ✅ Global Kill Chain Command Center */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">Kill Chain Command Center</div>
                <div className="text-xs text-slate-400 mt-1">
                  Inference-only. No automated actions or isolation.
                </div>
              </div>

              <div className="text-sm text-slate-200">
                Confidence:{" "}
                <span className="font-semibold">{safe(commandCenter?.confidence ?? 0)}%</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                <div className="text-xs text-slate-400">Stages observed</div>
                <div className="text-sm text-slate-200 mt-1 flex flex-wrap gap-1">
                  {(commandCenter?.stages?.length ? commandCenter.stages : ["(none)"]).map((s: any) =>
                    pill(String(s), `stage-${String(s)}`)
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                <div className="text-xs text-slate-400">Current stage</div>
                <div className="text-sm text-slate-200 mt-1">
                  {commandCenter?.current_stage
                    ? pill(commandCenter.current_stage, `cur-${commandCenter.current_stage}`)
                    : pill("(unknown)", "cur-unknown")}
                </div>

                <div className="text-xs text-slate-400 mt-3">Next likely</div>
                <div className="text-sm text-slate-200 mt-1 flex flex-wrap gap-1">
                  {(commandCenter?.next_likely?.length ? commandCenter.next_likely : ["(none)"]).map((s: any) =>
                    pill(String(s), `next-${String(s)}`)
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                <div className="text-xs text-slate-400">MITRE techniques</div>
                <div className="text-sm text-slate-200 mt-1 flex flex-wrap gap-1">
                  {(commandCenter?.evidence?.mitre_techniques?.length
                    ? commandCenter.evidence.mitre_techniques.slice(0, 10)
                    : ["(none)"]
                  ).map((t: any) => pill(String(t), `mitre-${String(t)}`))}
                </div>

                <div className="text-xs text-slate-400 mt-3">Lateral movement</div>
                <div className="text-sm text-slate-200 mt-1">
                  {commandCenter?.evidence?.lateral_moves?.length ? (
                    <div className="space-y-1">
                      {commandCenter.evidence.lateral_moves.slice(0, 5).map((m: any, i: number) => (
                        <div key={`lat-${i}-${safe(m.from)}-${safe(m.to)}`} className="text-xs text-slate-200">
                          {pill(`${safe(m.from)} → ${safe(m.to)}`, `latpill-${i}-${safe(m.from)}-${safe(m.to)}`)}{" "}
                          <span className="text-slate-400">({safe(m.user)})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">(none)</div>
                  )}
                </div>
              </div>
            </div>

            {/* Signals */}
            <div className="rounded border border-slate-800 bg-[#050A14] p-3">
              <div className="text-xs text-slate-400">Signals</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-200 list-disc pl-5">
                {(commandCenter?.evidence?.signals?.length
                  ? commandCenter.evidence.signals
                  : ["No signals available."]
                ).map((s: any, i: number) => (
                  <li key={`sig-${i}`}>{String(s)}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* ✅ SOC Decision Engine */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-100">SOC Decision Engine</div>
                <div className="text-xs text-slate-400 mt-1">
                  Recommendations only — no automated actions, no isolation.
                </div>
              </div>
              <div className="text-xs text-slate-400">
                Inputs: risk + kill chain + MITRE + lateral + open cases
              </div>
            </div>

            <div className="space-y-2">
              {decisions.map((d) => (
                <div key={d.id} className="rounded border border-slate-800 bg-[#050A14] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-slate-200 font-semibold">{d.title}</div>
                    {priorityBadge(d.priority)}
                  </div>

                  <div className="text-xs text-slate-400">Rationale</div>
                  <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1">
                    {d.rationale.map((r, i) => (
                      <li key={`${d.id}-r-${i}`}>{r}</li>
                    ))}
                  </ul>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-slate-400">Suggested analyst actions</div>
                      <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1 mt-1">
                        {d.suggested_actions.map((a, i) => (
                          <li key={`${d.id}-a-${i}`}>{a}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">Suggested hunts</div>
                      <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1 mt-1">
                        {d.suggested_hunts.map((h, i) => (
                          <li key={`${d.id}-h-${i}`}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">Guardrails</div>
                  <div className="flex flex-wrap gap-1">
                    {d.guardrails.map((g, i) => pill(g, `${d.id}-g-${i}`))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global Search */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-100">Global Search</div>
            <div className="text-xs text-slate-400">
              Search across cases, memory entities, campaigns, and correlation edges.
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Try: "umfd-1", "orca", "T1110", "ssh"'
              className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
            />

            {q.trim() ? (
              <div className="rounded border border-slate-800 overflow-hidden">
                {hits.length ? (
                  <div className="divide-y divide-slate-800">
                    {hits.slice(0, 12).map((h: any, i: number) => {
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
                        <div key={`hit-${i}-${type}-${safe(h.title || h.case_id || h.campaign_id || h.key || h.edge_id)}`} className="bg-[#020617]/40 p-3 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-sm text-slate-200">
                              {pill(type, `hit-type-${i}-${type}`)} <span className="text-slate-400">score:</span> {score}
                            </div>
                            <div className="text-xs text-slate-300 mt-1">
                              {safe(h.title || h.case_id || h.campaign_id || h.key || h.edge_id)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">{safe(h.meta)}</div>
                          </div>

                          {actionHref ? (
                            <Link
                              href={actionHref}
                              className="text-xs underline text-slate-200 hover:text-white whitespace-nowrap"
                            >
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

          {/* Campaign Clusters */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-100">Campaign Clusters</div>
              <div className="text-xs text-slate-400">{index.campaigns.length} found</div>
            </div>

            <div className="space-y-2">
              {index.campaigns.slice(0, 25).map((c: any) => (
                <div key={c.campaign_id} className="rounded border border-slate-800 bg-[#050A14] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-200">
                      <span className="font-semibold">{c.campaign_id}</span> — {safe(c.title)}
                      <div className="text-xs text-slate-400 mt-1">
                        risk:{safe(c.risk)} • cases:{safe((c.case_ids || []).length)} • entities:{safe((c.entities || []).length)}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {safe(c.start)} → {safe(c.end)}
                      </div>
                    </div>

                    <Link
                      href={`/intel/campaign/${encodeURIComponent(c.campaign_id)}`}
                      className="text-xs underline text-slate-200 hover:text-white whitespace-nowrap"
                    >
                      Open campaign
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </Shell>
  );
}
