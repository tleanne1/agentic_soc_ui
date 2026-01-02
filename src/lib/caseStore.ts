// src/lib/caseStore.ts
"use client";

export type SocCaseStatus = "open" | "investigating" | "contained" | "closed";

export type SocCase = {
  case_id: string;
  created_at: string;
  status: SocCaseStatus;
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

export function getCaseById(case_id: string): SocCase | null {
  const cases = getCases();
  return cases.find((c) => c.case_id === case_id) || null;
}

export function saveCase(c: SocCase) {
  const cases = getCases();
  cases.unshift(c);
  localStorage.setItem(KEY, JSON.stringify(cases));
}

// Patch/update a case by id (used by Cases page + Case Details page)
export function updateCase(case_id: string, patch: Partial<SocCase>) {
  const cases = getCases();
  const idx = cases.findIndex((c) => c.case_id === case_id);
  if (idx === -1) return;

  cases[idx] = {
    ...cases[idx],
    ...patch,
  };

  localStorage.setItem(KEY, JSON.stringify(cases));
}

export function deleteCase(case_id: string) {
  const cases = getCases().filter((c) => c.case_id !== case_id);
  localStorage.setItem(KEY, JSON.stringify(cases));
}
