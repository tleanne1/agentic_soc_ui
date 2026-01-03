// src/lib/caseStore.ts
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

export function saveCase(c: SocCase) {
  const cases = getCases();
  cases.unshift(c);
  localStorage.setItem(KEY, JSON.stringify(cases));
}

export function updateCase(caseId: string, patch: Partial<SocCase>) {
  const all = getCases();
  const idx = all.findIndex((c) => c.case_id === caseId);
  if (idx < 0) return;

  all[idx] = { ...all[idx], ...patch };
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteCase(caseId: string) {
  const all = getCases().filter((c) => c.case_id !== caseId);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function setCaseStatus(caseId: string, status: SocCaseStatus) {
  updateCase(caseId, { status });
}

export function addCaseNote(caseId: string, note: string) {
  const all = getCases();
  const idx = all.findIndex((c) => c.case_id === caseId);
  if (idx < 0) return;

  const stamp = new Date().toISOString();
  const entry = `${stamp} — ${note}`;

  const notes = Array.isArray(all[idx].analyst_notes) ? all[idx].analyst_notes : [];
  all[idx] = { ...all[idx], analyst_notes: [entry, ...notes] };

  localStorage.setItem(KEY, JSON.stringify(all));
}
