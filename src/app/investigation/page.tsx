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
  // You may already store LLM findings separately — keep this resilient.
  const f = e?.findings || e?.Findings || e?.llm_findings;
  if (!f) return [];
  if (Array.isArray(f)) return f;
  return [f];
}

function extractBaselineNote(e: SelectedEvent) {
  return getFirstString(e, ["baseline_note", "BaselineNote", "baselineNote"]);
}

function extractEvidence(e: SelectedEvent) {
  // Store a minimal evidence bundle: the selected row + any extra context if present
  return [e];
}

const SELECTED_ROW_KEYS = [
  "soc:selectedRow",
  "soc:selected_row",
  "soc:selectedEvent",
  "soc:selected_event",
  "soc:investigation:selected",
  "soc:last_selected",
];

function loadSelectedEvent(): SelectedEvent | null {
  // Try localStorage keys
  for (const key of SELECTED_ROW_KEYS) {
    const parsed = safeJsonParse<SelectedEvent>(localStorage.getItem(key));
    if (parsed && typeof parsed === "object") return parsed;
  }

  // Some implementations store it under sessionStorage
  for (const key of SELECTED_ROW_KEYS) {
    const parsed = safeJsonParse<SelectedEvent>(sessionStorage.getItem(key));
    if (parsed && typeof parsed === "object") return parsed;
  }

  return null;
}

function clearSelectedEvent() {
  // Optional helper to prevent stale “selected row” being reused after save
  for (const key of SELECTED_ROW_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
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

      // 1) Save case
      saveCase(newCase);

      // 2) Record into SOC Entity Memory (device/user/ip)
      recordObservation({
        caseId: newCase.case_id,
        device: newCase.device,
        user: newCase.user,
        ip: derived.ip || "",
        tags: ["case", `status:${newCase.status}`, "source:investigation"],
        riskBump: 10,
      });

      setSavedId(case_id);

      // 3) Clear selected row so Investigation doesn’t re-use stale selection
      // Comment this out if you prefer to keep the selection for debugging.
      clearSelectedEvent();

      // 4) Go to Case Details
      router.push(`/cases/${case_id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050A14] text-slate-100">
      <Topbar title="Investigation" />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <h1 className="text-3xl font-semibold">Investigation</h1>

          {!selected ? (
            <div className="mt-4 rounded border border-slate-800 bg-[#060C18] p-4">
              <div className="text-slate-200">
                No row selected. Go back to Results, click a row, then click Investigate.
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded border border-slate-800 bg-[#060C18] p-4">
                <div className="text-sm text-slate-300">Source: Selected Result Row</div>

                <div className="mt-2 text-sm text-slate-200">
                  <span className="text-slate-400">Device:</span> {derived.device || "-"}
                  <span className="text-slate-400 ml-4">User:</span> {derived.user || "-"}
                  <span className="text-slate-400 ml-4">Time:</span> {derived.time || "-"}
                  <span className="text-slate-400 ml-4">IP:</span> {derived.ip || "-"}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-[#060C18] p-4">
                <div className="text-sm font-semibold">Case</div>
                <div className="mt-2 text-sm text-slate-300">
                  Save this investigation as a SOC case (stored locally for now).
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400 mb-1">Case title</div>
                  <input
                    value={caseTitle}
                    onChange={(e) => setCaseTitle(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-[#050A14] px-3 py-2 text-slate-100 outline-none"
                    placeholder="Investigation title..."
                  />
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    onClick={onSaveCase}
                    disabled={saving}
                    className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save as Case"}
                  </button>

                  {savedId && (
                    <span className="text-sm text-slate-300">
                      Saved as <span className="font-semibold">{savedId}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-[#060C18] p-4">
                <div className="text-sm font-semibold mb-2">Baseline note</div>
                <pre className="whitespace-pre-wrap text-xs text-slate-200">
                  {derived.baseline || "(none)"}
                </pre>

                <div className="text-sm font-semibold mt-4 mb-2">Findings</div>
                {Array.isArray(derived.findings) && derived.findings.length ? (
                  <ul className="list-disc pl-5 text-sm text-slate-200">
                    {derived.findings.map((f: any, i: number) => (
                      <li key={i}>{typeof f === "string" ? f : JSON.stringify(f)}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-slate-400">(none)</div>
                )}

                <div className="text-sm font-semibold mt-4 mb-2">Evidence</div>
                <pre className="whitespace-pre-wrap text-xs text-slate-200">
                  {JSON.stringify(selected, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
