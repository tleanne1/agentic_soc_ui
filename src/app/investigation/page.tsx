"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { saveCase, SocCase } from "@/lib/caseStore";
import { recordObservation } from "@/lib/socMemory";

type SelectedEvent = Record<string, any>;

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function genCaseId() {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SOC-${year}-${rand}`;
}

function getFirstString(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function extractDevice(e: SelectedEvent) {
  return getFirstString(e, ["DeviceName", "Device", "device", "Hostname", "HostName"]);
}

function extractUser(e: SelectedEvent) {
  return getFirstString(e, ["AccountName", "User", "user", "UserPrincipalName", "UPN"]);
}

function extractTime(e: SelectedEvent) {
  return getFirstString(e, ["TimeGenerated", "Timestamp", "time", "Time"]);
}

function extractIp(e: SelectedEvent) {
  return getFirstString(e, [
    "RemoteIP",
    "RemoteIp",
    "RemoteAddress",
    "IPAddress",
    "IpAddress",
    "SourceIP",
    "SrcIp",
    "src_ip",
  ]);
}

function extractFindings(e: SelectedEvent) {
  const f = e?.findings || e?.Findings || e?.llm_findings;
  if (!f) return [];
  if (Array.isArray(f)) return f;
  return [f];
}

function extractBaselineNote(e: SelectedEvent) {
  return getFirstString(e, ["baseline_note", "BaselineNote", "baselineNote"]);
}

function extractEvidence(e: SelectedEvent) {
  return [e];
}

/**
 * Results page stores selected row via engineStore under:
 * localStorage key = "soc:selectedRow"
 */
function loadSelectedEvent(): SelectedEvent | null {
  const parsed = safeJsonParse<SelectedEvent>(localStorage.getItem("soc:selectedRow"));
  if (parsed && typeof parsed === "object") return parsed;
  return null;
}

function clearSelectedEvent() {
  localStorage.removeItem("soc:selectedRow");
}

export default function InvestigationPage() {
  const router = useRouter();

  const [selected, setSelected] = useState<SelectedEvent | null>(null);
  const [caseTitle, setCaseTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    const ev = loadSelectedEvent();
    setSelected(ev);

    if (ev) {
      const device = extractDevice(ev) || "unknown-device";
      const user = extractUser(ev) || "unknown-user";
      setCaseTitle(`Investigation: ${device} (${user})`);
    }
  }, []);

  const derived = useMemo(() => {
    const e = selected || {};
    return {
      device: extractDevice(e),
      user: extractUser(e),
      time: extractTime(e),
      ip: extractIp(e),
      findings: extractFindings(e),
      baseline: extractBaselineNote(e),
      evidence: extractEvidence(e),
    };
  }, [selected]);

  async function copyJson() {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selected, null, 2));
    } catch {
      // ignore clipboard failures
    }
  }

  function clearSelectionAndReturn() {
    clearSelectedEvent();
    setSelected(null);
    router.push("/results");
  }

  const onSaveCase = async () => {
    if (!selected) return;

    setSaving(true);
    try {
      const case_id = genCaseId();
      const now = new Date().toISOString();

      const device = derived.device || "unknown-device";
      const user = derived.user || "unknown-user";
      const time = derived.time || now;

      const newCase: SocCase = {
        case_id,
        created_at: now,
        status: "open",
        title: caseTitle?.trim() || `Investigation: ${device} (${user})`,
        device,
        user,
        time,
        baseline_note: derived.baseline || "",
        findings: derived.findings || [],
        evidence: derived.evidence || [],
        analyst_notes: [],
      };

      saveCase(newCase);

      recordObservation({
        caseId: newCase.case_id,
        device: newCase.device,
        user: newCase.user,
        ip: derived.ip || "",
        tags: ["case", `status:${newCase.status}`, "source:investigation"],
        riskBump: 10,
      });

      setSavedId(case_id);

      clearSelectedEvent();
      router.push(`/cases/${case_id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex bg-gradient-to-b from-[#030712] to-[#020617] text-slate-100">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar title="Investigation" rightText="Evidence → Case workflow" />

        <main className="p-8 space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Investigation</h1>
              <p className="mt-1 text-sm text-slate-400">
                Review the selected event, capture notes, and promote to a case.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/results")}
                className="rounded-xl px-3 py-2 text-sm bg-black/20 hover:bg-black/30 border border-white/10"
              >
                Back to Results
              </button>

              <button
                onClick={clearSelectionAndReturn}
                className="rounded-xl px-3 py-2 text-sm bg-black/20 hover:bg-black/30 border border-white/10"
                title="Clear selected row and return to Results"
              >
                Clear selection
              </button>
            </div>
          </div>

          {!selected ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
              <div className="text-sm text-slate-200">
                No row selected.
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Go to Results, click a row, then click <span className="text-slate-200">Investigate</span>.
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => router.push("/results")}
                  className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10"
                >
                  Go to Results
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* LEFT: Source + Case */}
              <div className="lg:col-span-2 space-y-6">
                {/* Source Card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-slate-400">Source</div>
                      <div className="text-sm text-slate-200 mt-1">Selected Result Row</div>
                    </div>

                    <button
                      onClick={copyJson}
                      className="text-xs px-3 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10"
                      title="Copy selected row as JSON"
                    >
                      Copy JSON
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">Device</div>
                      <div className="mt-1 text-slate-100">{derived.device || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">User</div>
                      <div className="mt-1 text-slate-100">{derived.user || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">Time</div>
                      <div className="mt-1 text-slate-100">{derived.time || "—"}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                      <div className="text-xs text-slate-400">IP</div>
                      <div className="mt-1 text-slate-100">{derived.ip || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Case Card */}
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Case</div>
                      <div className="mt-1 text-sm text-slate-400">
                        Promote this investigation to a SOC case (stored locally for now).
                      </div>
                    </div>
                    {savedId ? (
                      <span className="text-xs text-slate-300">
                        Saved: <span className="font-semibold">{savedId}</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4">
                    <div className="text-xs text-slate-400 mb-2">Case title</div>
                    <input
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-slate-100 outline-none"
                      placeholder="Investigation title..."
                    />
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={onSaveCase}
                      disabled={saving}
                      className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save as Case"}
                    </button>

                    <div className="text-xs text-slate-500">
                      This will archive evidence + metadata and open the Case view.
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Notes / Findings / Evidence */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="text-sm font-semibold mb-2">Baseline note</div>
                  <div className="text-sm text-slate-400">
                    {derived.baseline ? (
                      <pre className="text-xs whitespace-pre-wrap break-words text-slate-200/90 rounded-xl bg-black/25 border border-white/10 p-3">
                        {derived.baseline}
                      </pre>
                    ) : (
                      "(none)"
                    )}
                  </div>

                  <div className="text-sm font-semibold mt-5 mb-2">Findings</div>
                  {Array.isArray(derived.findings) && derived.findings.length ? (
                    <ul className="list-disc pl-5 text-sm text-slate-200">
                      {derived.findings.map((f: any, i: number) => (
                        <li key={i}>{typeof f === "string" ? f : JSON.stringify(f)}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-slate-400">(none)</div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">Evidence</div>
                    <button
                      onClick={copyJson}
                      className="text-xs px-3 py-1 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10"
                    >
                      Copy JSON
                    </button>
                  </div>

                  <pre className="text-xs whitespace-pre-wrap break-words text-slate-200/90 rounded-xl bg-black/25 border border-white/10 p-3 max-h-[360px] overflow-auto">
                    {JSON.stringify(selected, null, 2)}
                  </pre>

                  <div className="mt-2 text-xs text-slate-500">
                    Evidence is currently the selected row (more sources will be added later).
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
