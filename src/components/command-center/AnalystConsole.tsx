// src/components/command-center/AnalystConsole.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function chip(text: string) {
  return (
    <span className="inline-flex items-center rounded border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200">
      {text}
    </span>
  );
}

export default function AnalystConsole(props: {
  suggestedQuery?: string;
  checklist?: string[];
}) {
  const storageKey = "soc_command_center_notes";
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setNotes(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, notes);
    } catch {}
  }, [notes]);

  const checklist = useMemo(() => (Array.isArray(props.checklist) ? props.checklist : []), [props.checklist]);

  return (
    <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
      <div>
        <div className="text-sm font-semibold text-slate-100">Analyst Console</div>
        <div className="text-xs text-slate-400 mt-1">Notes + checklist (local only)</div>
      </div>

      <div className="rounded border border-slate-800 bg-[#050A14] p-3">
        <div className="text-xs text-slate-400">Suggested next query</div>
        <div className="mt-2">{chip(safe(props.suggestedQuery || "Hunt suspicious logons / password spray over last 24h"))}</div>
      </div>

      <div className="rounded border border-slate-800 bg-[#050A14] p-3">
        <div className="text-xs text-slate-400">Evidence checklist</div>
        <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-200">
          {(checklist.length
            ? checklist
            : [
                "Confirm impacted users + devices (scope).",
                "Validate auth telemetry (success/fail, source IPs, geo).",
                "Check remote services usage (RDP/SSH/WinRM).",
                "Review endpoint events for execution/persistence indicators.",
                "Escalate only with confirmed evidence + approvals.",
              ]
          ).map((x, i) => (
            <li key={`chk-${i}`}>{safe(x)}</li>
          ))}
        </ul>
      </div>

      <div className="rounded border border-slate-800 bg-[#050A14] p-3">
        <div className="text-xs text-slate-400">Analyst notes</div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Type notes here… (saved locally)"
          className="mt-2 w-full min-h-[140px] rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
        />
      </div>

      <div className="text-[11px] text-slate-500">
        Guardrails: This console does not execute actions. It’s for triage notes + planning only.
      </div>
    </div>
  );
}
