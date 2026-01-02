// src/app/cases/[case_id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { getCaseById, updateCase, deleteCase, SocCase, SocCaseStatus } from "@/lib/caseStore";

function safeString(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function StatusPill({ status }: { status: SocCaseStatus }) {
  const map: Record<SocCaseStatus, string> = {
    open: "bg-slate-200/10 text-slate-100 border-slate-700",
    investigating: "bg-slate-200/10 text-slate-100 border-slate-700",
    contained: "bg-slate-200/10 text-slate-100 border-slate-700",
    closed: "bg-slate-950/40 text-slate-400 border-slate-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${map[status]}`}>
      {status}
    </span>
  );
}

export default function CaseDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const caseId = useMemo(() => {
    const raw = (params as any)?.case_id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const [socCase, setSocCase] = useState<SocCase | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!caseId) return;
    const c = getCaseById(String(caseId));
    setSocCase(c);
  }, [caseId]);

  function refresh() {
    if (!caseId) return;
    setSocCase(getCaseById(String(caseId)));
  }

  function setStatus(status: SocCaseStatus) {
    if (!socCase) return;
    updateCase(socCase.case_id, { status });
    refresh();
  }

  function addNote() {
    if (!socCase) return;
    const trimmed = note.trim();
    if (!trimmed) return;

    const stamped = `${new Date().toISOString()} — ${trimmed}`;
    const next = Array.isArray(socCase.analyst_notes) ? [...socCase.analyst_notes, stamped] : [stamped];

    updateCase(socCase.case_id, { analyst_notes: next });
    setNote("");
    refresh();
  }

  function onDelete() {
    if (!socCase) return;
    const ok = confirm(`Delete case ${socCase.case_id}? This cannot be undone.`);
    if (!ok) return;
    deleteCase(socCase.case_id);
    router.push("/cases");
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Case Details" />

        <main className="p-6 space-y-4">
          {!socCase ? (
            <div className="border border-[var(--soc-panel-border)] rounded-lg p-4 bg-[#020617]/80 text-slate-200">
              <div className="text-sm text-slate-300">Case not found.</div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => router.push("/cases")}
                  className="rounded-md px-4 py-2 text-sm border border-slate-700 bg-slate-200/10 hover:bg-slate-200/15"
                >
                  Back to Cases
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-400">Case</div>
                  <h1 className="text-xl font-semibold text-slate-100">
                    {socCase.case_id} — {socCase.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <StatusPill status={socCase.status} />
                    <span>Device: <span className="text-slate-200">{socCase.device || "—"}</span></span>
                    <span>User: <span className="text-slate-200">{socCase.user || "—"}</span></span>
                    <span>Time: <span className="text-slate-200">{socCase.time || "—"}</span></span>
                    <span>Created: <span className="text-slate-200">{socCase.created_at || "—"}</span></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push("/cases")}
                    className="rounded-md px-4 py-2 text-sm border border-slate-700 bg-slate-200/10 hover:bg-slate-200/15"
                  >
                    Back to Cases
                  </button>

                  <button
                    onClick={onDelete}
                    className="rounded-md px-4 py-2 text-sm border border-slate-800 bg-slate-950/40 text-slate-300 hover:bg-slate-950/55"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Status actions */}
              <div className="border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 p-4">
                <div className="text-xs text-slate-400 mb-2">Update status</div>
                <div className="flex flex-wrap gap-2">
                  {(["open", "investigating", "contained", "closed"] as SocCaseStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={[
                        "rounded-md px-3 py-2 text-sm border transition",
                        socCase.status === s
                          ? "bg-slate-200/10 text-slate-100 border-slate-700"
                          : "bg-slate-950/40 text-slate-300 border-slate-800 hover:bg-slate-950/55",
                      ].join(" ")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {/* Left: Evidence + Findings */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Evidence */}
                  <div className="border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                      Evidence ({Array.isArray(socCase.evidence) ? socCase.evidence.length : 0})
                    </div>
                    <div className="p-4">
                      {Array.isArray(socCase.evidence) && socCase.evidence.length > 0 ? (
                        <div className="space-y-3">
                          {socCase.evidence.map((ev, i) => (
                            <div key={i} className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                              <div className="text-xs text-slate-400 mb-2">Item {i + 1}</div>
                              <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words">
                                {safeString(ev)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">No evidence saved.</div>
                      )}
                    </div>
                  </div>

                  {/* Findings */}
                  <div className="border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                      Findings
                    </div>
                    <div className="p-4">
                      {Array.isArray(socCase.findings) && socCase.findings.length > 0 ? (
                        <ul className="space-y-2">
                          {socCase.findings.map((f: any, idx: number) => (
                            <li key={idx} className="text-sm text-slate-200">
                              • {String(f?.summary || f?.title || safeString(f))}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-sm text-slate-400">No findings saved.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Baseline + Notes */}
                <div className="space-y-4">
                  {/* Baseline */}
                  <div className="border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                      Baseline note
                    </div>
                    <div className="p-4">
                      {socCase.baseline_note ? (
                        <pre className="text-xs text-slate-200 whitespace-pre-wrap break-words">
                          {socCase.baseline_note}
                        </pre>
                      ) : (
                        <div className="text-sm text-slate-400">No baseline note saved.</div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 overflow-hidden">
                    <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                      Analyst notes
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex gap-2">
                        <input
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Add a note…"
                          className="flex-1 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
                        />
                        <button
                          onClick={addNote}
                          className="rounded-md px-4 py-2 text-sm border border-slate-700 bg-slate-200/10 hover:bg-slate-200/15"
                        >
                          Add
                        </button>
                      </div>

                      {Array.isArray(socCase.analyst_notes) && socCase.analyst_notes.length > 0 ? (
                        <div className="space-y-2">
                          {socCase.analyst_notes.slice().reverse().map((n, idx) => (
                            <div
                              key={idx}
                              className="rounded-md border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-200 whitespace-pre-wrap break-words"
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400">No notes yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </Shell>
  );
}
