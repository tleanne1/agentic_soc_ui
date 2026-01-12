// src/app/cases/[case_id]/page.tsx
"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { addCaseNote, getCases, setCaseStatus, SocCase, SocCaseStatus } from "@/lib/caseStore";

function fmt(ts: string) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

function safeString(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function statusBadgeClass(s: SocCaseStatus) {
  const base =
    "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] leading-none";
  switch (s) {
    case "open":
      return `${base} border-white/10 bg-white/5 text-slate-200`;
    case "investigating":
      return `${base} border-white/10 bg-white/10 text-slate-100`;
    case "contained":
      return `${base} border-white/10 bg-white/5 text-slate-200`;
    case "closed":
      return `${base} border-white/10 bg-black/20 text-slate-300`;
    default:
      return `${base} border-white/10 bg-white/5 text-slate-200`;
  }
}

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams<{ case_id?: string }>();

  const raw = params?.case_id;
  const caseId = React.useMemo(() => {
    const val = Array.isArray(raw) ? raw[0] : raw;
    if (!val) return "";
    try {
      return decodeURIComponent(val);
    } catch {
      return val;
    }
  }, [raw]);

  const [c, setC] = React.useState<SocCase | null>(null);
  const [mounted, setMounted] = React.useState(false);

  const [note, setNote] = React.useState("");
  const [status, setStatus] = React.useState<SocCaseStatus>("open");

  const refresh = React.useCallback(() => {
    if (!caseId) {
      setC(null);
      return;
    }
    const all = getCases();
    const found = all.find((x) => x.case_id === caseId) || null;
    setC(found);
    if (found?.status) setStatus(found.status);
  }, [caseId]);

  React.useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  const onChangeStatus = (next: SocCaseStatus) => {
    if (!caseId) return;
    setStatus(next);
    setCaseStatus(caseId, next);
    refresh();
  };

  const onAddNote = () => {
    if (!caseId) return;
    const trimmed = note.trim();
    if (!trimmed) return;
    addCaseNote(caseId, trimmed);
    setNote("");
    refresh();
  };

  async function copyJson(data: any) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-screen flex bg-gradient-to-b from-[#030712] to-[#020617] text-slate-100">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title="Cases" rightText="Case Details" />

        <main className="p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Case Details</h1>
              <div className="mt-2 text-xs text-slate-400" suppressHydrationWarning>
                Case ID:{" "}
                <span className="text-slate-200">{mounted ? caseId || "—" : "—"}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10"
                onClick={() => router.push("/cases")}
              >
                ← Back to Cases
              </button>
              <button
                className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10"
                onClick={refresh}
              >
                Refresh
              </button>
            </div>
          </div>

          {!c ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 text-slate-200">
              <div className="font-semibold mb-1">Case not found</div>
              <div className="text-sm text-slate-400">
                This case ID doesn’t exist in local storage. Go back to Cases and try again.
              </div>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: Summary */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Title</div>
                      <div className="text-lg font-semibold text-slate-100">
                        {c.title || "(untitled)"}
                      </div>

                      <div className="mt-3 text-sm text-slate-200/90">
                        <span className="text-slate-400">Device:</span> {c.device || "-"}
                        <span className="text-slate-400 ml-4">User:</span> {c.user || "-"}
                      </div>

                      <div className="mt-1 text-sm text-slate-200/90">
                        <span className="text-slate-400">Event time:</span> {fmt(c.time) || "-"}
                      </div>

                      <div className="mt-1 text-sm text-slate-200/90">
                        <span className="text-slate-400">Created:</span> {fmt(c.created_at) || "-"}
                      </div>
                    </div>

                    <div className="min-w-[220px]">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400 mb-1">Status</div>
                        <span className={statusBadgeClass(status)}>
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-400/70" />
                          {status}
                        </span>
                      </div>

                      <select
                        value={status}
                        onChange={(e) => onChangeStatus(e.target.value as SocCaseStatus)}
                        className="mt-2 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-slate-100"
                      >
                        <option value="open">open</option>
                        <option value="investigating">investigating</option>
                        <option value="contained">contained</option>
                        <option value="closed">closed</option>
                      </select>

                      <div className="mt-2 text-[11px] text-slate-400">
                        Status updates are stored locally.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Baseline */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="font-semibold mb-2">Baseline note</div>
                  <pre className="text-xs whitespace-pre-wrap break-words text-slate-200/90">
                    {safeString(c.baseline_note) || "(none)"}
                  </pre>
                </div>

                {/* Findings */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="font-semibold mb-2">Findings</div>
                  {Array.isArray(c.findings) && c.findings.length ? (
                    <ul className="list-disc pl-5 text-sm text-slate-200/90 space-y-1">
                      {c.findings.map((f: any, i: number) => (
                        <li key={i}>{typeof f === "string" ? f : JSON.stringify(f)}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-400">(none)</div>
                  )}
                </div>

                {/* Evidence */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Evidence</div>
                    <button
                      onClick={() => copyJson(c.evidence ?? [])}
                      className="rounded-lg px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10"
                    >
                      Copy JSON
                    </button>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3 max-h-[360px] overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap break-words text-slate-200/90">
                      {JSON.stringify(c.evidence ?? [], null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* RIGHT: Notes */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="font-semibold mb-2">Add analyst note</div>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full min-h-[120px] rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-slate-100 outline-none"
                    placeholder="Write your note…"
                  />

                  <button
                    className="mt-3 w-full rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-60"
                    onClick={onAddNote}
                    disabled={!note.trim()}
                  >
                    Add Note
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="font-semibold mb-2">Analyst notes</div>
                  {Array.isArray(c.analyst_notes) && c.analyst_notes.length ? (
                    <div className="space-y-3">
                      {c.analyst_notes.map((n, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200/90 whitespace-pre-wrap break-words"
                        >
                          {n}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">(none)</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}