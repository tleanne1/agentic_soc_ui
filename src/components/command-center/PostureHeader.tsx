// src/components/command-center/PostureHeader.tsx
"use client";

import React from "react";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function postureFromSeverity(sev: string) {
  const s = safe(sev).toUpperCase();
  if (s.includes("CRITICAL")) return { label: "Critical", tone: "border-red-500/40 bg-red-500/10 text-red-200" };
  if (s.includes("HIGH")) return { label: "Elevated", tone: "border-amber-500/40 bg-amber-500/10 text-amber-200" };
  if (s.includes("MED")) return { label: "Monitoring", tone: "border-sky-500/40 bg-sky-500/10 text-sky-200" };
  return { label: "Normal", tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" };
}

function chip(text: string) {
  return (
    <span className="inline-flex items-center rounded border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200">
      {text}
    </span>
  );
}

export default function PostureHeader(props: {
  topSeverity?: string;
  casesCount: number;
  openCasesCount: number;
  campaignsCount: number;
  highestCampaign?: { id: string; risk: number } | null;
  topMitre?: string[];
  lateralCount?: number;
  confidence?: number;
}) {
  const posture = postureFromSeverity(props.topSeverity || "");

  return (
    <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs text-slate-400">Global Threat Posture</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${posture.tone}`}>
              {posture.label}
            </span>
            <span className="text-sm text-slate-200">
              Confidence: <span className="font-semibold">{safe(props.confidence ?? 0)}%</span>
            </span>
            <span className="text-xs text-slate-500">
              Inference-only • No automated actions • No isolation
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
          {chip(`Cases: ${props.casesCount}`)}
          {chip(`Open: ${props.openCasesCount}`)}
          {chip(`Campaigns: ${props.campaignsCount}`)}
          {chip(`Lateral: ${props.lateralCount || 0}`)}
          {props.highestCampaign ? chip(`Top: ${props.highestCampaign.id} (risk ${props.highestCampaign.risk})`) : chip("Top: (none)")}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="text-xs text-slate-500 mr-1">Top MITRE:</div>
        {(props.topMitre?.length ? props.topMitre.slice(0, 8) : ["(none)"]).map((t, i) => (
          <React.Fragment key={`${t}-${i}`}>{chip(safe(t))}</React.Fragment>
        ))}
      </div>
    </div>
  );
}
