"use client";

import React from "react";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function postureFromSeverity(sev: string) {
  const s = safe(sev).toUpperCase();
  if (s.includes("CRITICAL"))
    return {
      label: "CRITICAL",
      badge: "border-red-500/40 bg-red-500/10 text-red-200",
      rail: "bg-red-500/60",
    };
  if (s.includes("HIGH"))
    return {
      label: "ELEVATED",
      badge: "border-amber-500/40 bg-amber-500/10 text-amber-200",
      rail: "bg-amber-400/60",
    };
  if (s.includes("MED"))
    return {
      label: "MONITORING",
      badge: "border-sky-500/40 bg-sky-500/10 text-sky-200",
      rail: "bg-sky-400/60",
    };
  return {
    label: "NORMAL",
    badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    rail: "bg-emerald-400/60",
  };
}

function Chip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded border border-slate-800 bg-slate-950/40 px-2 py-0.5 text-[11px] text-slate-200">
      {text}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#020617]/70 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100 leading-none">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-400">{sub}</div> : null}
    </div>
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
  const confidence = Number(props.confidence ?? 0);
  const lateral = Number(props.lateralCount ?? 0);

  const topThreatText = props.highestCampaign
    ? `${safe(props.highestCampaign.id)} (risk ${safe(props.highestCampaign.risk)})`
    : "(none)";

  return (
    <section className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 overflow-hidden">
      {/* rail accent */}
      <div className={`h-[2px] w-full ${posture.rail}`} />

      <div className="p-4">
        {/* Top line */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="text-xs text-slate-400">GLOBAL THREAT POSTURE</div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${posture.badge}`}>
                {posture.label}
              </span>

              <span className="text-sm text-slate-200">
                Confidence (model): <span className="font-semibold">{safe(confidence)}%</span>
              </span>

              <span className="text-xs text-slate-500">
                Inference-only • No automated actions • No isolation
              </span>
            </div>

            {/* mini chips row (optional / compact) */}
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip text={`Cases: ${safe(props.casesCount)}`} />
              <Chip text={`Open: ${safe(props.openCasesCount)}`} />
              <Chip text={`Campaigns: ${safe(props.campaignsCount)}`} />
              <Chip text={`Lateral: ${safe(lateral)}`} />
              <Chip text={`Top: ${topThreatText}`} />
            </div>
          </div>

          <div className="text-xs text-slate-400 md:text-right">
            <div className="mt-1">
              <span className="text-slate-300">Signals</span> <span className="text-slate-600">→</span>{" "}
              <span className="text-slate-300">MITRE</span> <span className="text-slate-600">→</span>{" "}
              <span className="text-slate-300">Kill chain</span> <span className="text-slate-600">→</span>{" "}
              <span className="text-slate-300">Decisions</span>
            </div>
          </div>
        </div>

        {/* Metrics grid (THIS is what fixes your “full width row” look) */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Cases" value={safe(props.casesCount)} />
          <MetricCard label="Open" value={safe(props.openCasesCount)} />
          <MetricCard label="Campaigns" value={safe(props.campaignsCount)} />
          <MetricCard label="Lateral" value={safe(lateral)} sub={lateral ? "signals" : "no signals"} />
          <MetricCard label="Top Threat" value={props.highestCampaign ? safe(props.highestCampaign.id) : "—"} sub={props.highestCampaign ? `risk ${safe(props.highestCampaign.risk)}` : "(none)"} />
        </div>

        {/* Top MITRE */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="text-xs text-slate-400 mr-1">Top MITRE Techniques</div>
          {(props.topMitre?.length ? props.topMitre.slice(0, 10) : ["(none)"]).map((t, i) => (
            <Chip key={`${t}-${i}`} text={safe(t)} />
          ))}
        </div>
      </div>
    </section>
  );
}

