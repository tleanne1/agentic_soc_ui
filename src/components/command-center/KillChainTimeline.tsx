"use client";

import React from "react";

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

export default function KillChainTimeline({
  stages = [],
  current,
  next = [],
}: {
  stages: string[];
  current: string | null;
  next?: string[];
}) {
  const curIndex = current ? ORDER.indexOf(current) : -1;

  return (
    <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
      <div className="text-sm font-semibold text-slate-100 mb-3">Kill Chain Timeline</div>

      <div className="flex flex-wrap gap-2">
        {ORDER.map((stage, i) => {
          const isDone = curIndex > i;
          const isCurrent = curIndex === i;
          const isNext = next.includes(stage);

          let tone =
            "border-slate-800 bg-slate-900/40 text-slate-500";

          if (isDone)
            tone = "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";

          if (isCurrent)
            tone =
              "border-violet-500/40 bg-violet-500/15 text-violet-200 shadow-[0_0_25px_rgba(139,92,246,0.35)] animate-pulse";

          if (isNext)
            tone = "border-sky-500/40 bg-sky-500/10 text-sky-200";

          return (
            <span
              key={stage}
              className={`px-3 py-1 rounded border text-[11px] tracking-wide ${tone}`}
            >
              {stage}
            </span>
          );
        })}
      </div>
    </div>
  );
}
