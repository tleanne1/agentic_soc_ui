// src/components/command-center/KillChainTimeline.tsx
"use client";

import React from "react";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

const ORDER = [
  "Reconnaissance",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command & Control",
  "Exfiltration",
  "Impact",
];

function nodeClass(active: boolean, current: boolean) {
  if (current) return "border-sky-400/60 bg-sky-500/15 text-sky-100";
  if (active) return "border-slate-500/60 bg-slate-200/10 text-slate-200";
  return "border-slate-800 bg-[#050A14] text-slate-500";
}

export default function KillChainTimeline(props: {
  stages?: string[];
  current?: string | null;
  next?: string[];
}) {
  const present = new Set((props.stages || []).map((s) => safe(s)));
  const next = new Set((props.next || []).map((s) => safe(s)));

  return (
    <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-100">Kill Chain Timeline</div>
          <div className="text-xs text-slate-400 mt-1">Stages observed (highlighted) • current stage emphasized</div>
        </div>
        <div className="text-xs text-slate-400">
          Current: <span className="text-slate-200 font-semibold">{safe(props.current || "(unknown)")}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ORDER.map((s) => {
          const isCurrent = safe(props.current) === s;
          const isPresent = present.has(s);
          const isNext = next.has(s);

          return (
            <div
              key={s}
              className={`inline-flex items-center gap-2 rounded border px-2 py-1 text-[11px] ${nodeClass(isPresent, isCurrent)}`}
              title={isNext ? "Next likely" : isPresent ? "Observed" : "Not observed"}
            >
              <span>{s}</span>
              {isNext ? <span className="text-[10px] text-slate-300/80">→ next</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
