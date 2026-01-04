// src/components/command-center/DecisionCards.tsx
"use client";

import React from "react";
import Link from "next/link";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function badge(sev: string) {
  const s = safe(sev).toUpperCase();
  if (s.includes("CRITICAL")) return "border-red-500/40 bg-red-500/10 text-red-200";
  if (s.includes("HIGH")) return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  if (s.includes("MED")) return "border-sky-500/40 bg-sky-500/10 text-sky-200";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
}

function chip(text: string) {
  return (
    <span className="inline-flex items-center rounded border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200">
      {text}
    </span>
  );
}

export type DecisionRec = {
  id: string;
  title: string;
  severity: string; // CRITICAL/HIGH/MED/LOW
  rationale: string[];
  actions: string[];
  hunts?: string[];
  focusCampaignId?: string | null;
  focusMitre?: string | null;
};

export default function DecisionCards(props: { recs: DecisionRec[] }) {
  const recs = Array.isArray(props.recs) ? props.recs : [];

  return (
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

      {recs.length ? (
        <div className="space-y-3">
          {recs.map((r) => (
            <div key={r.id} className="rounded border border-slate-800 bg-[#050A14] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] ${badge(r.severity)}`}>
                      {safe(r.severity)}
                    </span>
                    <div className="text-sm font-semibold text-slate-100">{safe(r.title)}</div>
                  </div>

                  <div className="mt-2">
                    <div className="text-xs text-slate-400">Rationale</div>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-slate-200">
                      {(r.rationale || []).map((x, i) => (
                        <li key={`${r.id}-rat-${i}`}>{safe(x)}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-slate-400">Suggested analyst actions</div>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-slate-200">
                      {(r.actions || []).map((x, i) => (
                        <li key={`${r.id}-act-${i}`}>{safe(x)}</li>
                      ))}
                    </ul>
                  </div>

                  {r.hunts?.length ? (
                    <div className="mt-3">
                      <div className="text-xs text-slate-400">Suggested hunts</div>
                      <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-slate-200">
                        {r.hunts.map((x, i) => (
                          <li key={`${r.id}-hunt-${i}`}>{safe(x)}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap gap-2 justify-end">
                    {r.focusMitre ? chip(`MITRE: ${r.focusMitre}`) : null}
                    {r.focusCampaignId ? chip(`Focus: ${r.focusCampaignId}`) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    {r.focusCampaignId ? (
                      <Link
                        href={`/intel/campaign/${encodeURIComponent(r.focusCampaignId)}`}
                        className="text-xs underline text-slate-200 hover:text-white whitespace-nowrap"
                      >
                        Open top campaign
                      </Link>
                    ) : null}

                    {r.focusMitre ? (
                      <Link
                        href={`/intel?q=${encodeURIComponent(r.focusMitre)}`}
                        className="text-xs underline text-slate-200 hover:text-white whitespace-nowrap"
                      >
                        Search MITRE
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 text-right">
                    Guardrails: analyst-driven only • validate evidence before escalation
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-slate-800 bg-[#050A14] p-3 text-sm text-slate-400">
          No recommendations at this time.
        </div>
      )}
    </div>
  );
}
