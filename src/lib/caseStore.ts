"use client";

import { recordObservation } from "@/lib/socMemory";

export type SocCase = {
  case_id: string;
  created_at: string;
  status: "open" | "investigating" | "contained" | "closed";
  title: string;
  device: string;
  user: string;
  time: string;
  baseline_note?: string;
  findings?: any[];
  evidence: any[];
  analyst_notes: string[];
};

const KEY = "soc:cases";

export function getCases(): SocCase[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAll(cases: SocCase[]) {
  localStorage.setItem(KEY, JSON.stringify(cases));
}

export function getCaseById(case_id: string): SocCase | null {
  const all = getCases();
  return all.find((c) => c.case_id === case_id) || null;
}

function extractBestIp(evidence: any[] | undefined): string | undefined {
  if (!Array.isArray(evidence)) return undefined;

  for (const item of evidence) {
    if (!item || typeof item !== "object") continue;

    const candidates = [
      item.RemoteIP,
      item.IPAddress,
      item.IpAddress,
      item.RemoteAddress,
      item.RemoteIPv4,
      item.ClientIP,
      item.SourceIP,
      item.SourceIp,
    ];

    for (const c of candidates) {
      const v = String(c || "").trim();
      if (v && v !== "null" && v !== "undefined") return v;
    }
  }
  return undefined;
}

export function saveCase(c: SocCase) {
  const cases = getCases();
  cases.unshift(c);
  saveAll(cases);

  // ✅ Optional: Type 2 / Step 1 — record entities into SOC memory
  // (Safe even if memory page doesn’t exist)
  try {
    const ip = extractBestIp(c.evidence);
    recordObservation({
      caseId: c.case_id,
      device: c.device,
      user: c.user,
      ip,
      tags: ["case", c.status],
      riskBump: 10,
    });
  } catch {
    // ignore memory failures to keep UI stable
  }
}

/**
 * Update a case by id using a partial patch.
 * Returns the updated case (or null if not found).
 */
export function updateCase(case_id: string, patch: Partial<SocCase>): SocCase | null {
  const cases = getCases();
  const idx = cases.findIndex((c) => c.case_id === case_id);
  if (idx < 0) return null;

  const updated: SocCase = {
    ...cases[idx],
    ...patch,
    case_id: cases[idx].case_id, // prevent accidental id overwrite
  };

  cases[idx] = updated;
  saveAll(cases);
  return updated;
}

export function setCaseStatus(
  case_id: string,
  status: SocCase["status"]
): SocCase | null {
  return updateCase(case_id, { status });
}

export function deleteCase(case_id: string): boolean {
  const cases = getCases();
  const next = cases.filter((c) => c.case_id !== case_id);
  if (next.length === cases.length) return false;
  saveAll(next);
  return true;
}
