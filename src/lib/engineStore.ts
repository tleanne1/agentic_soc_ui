export type EngineRun = {
  ok: boolean;
  rows: any[];
  count?: number;
  error?: any;
  meta?: {
    huntName?: string;
    hours?: number;
    device?: string;
    kql?: string;
    ranAt?: string;
  };
};

const KEY = "agentic_soc:last_run";

// ✅ NEW: selected row key used by Investigation page
const SELECTED_KEY = "soc:selectedRow";

export function saveRun(run: EngineRun) {
  try {
    localStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

export function loadRun(): EngineRun | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EngineRun;
  } catch {
    return null;
  }
}

// Backwards-compatible alias (some pages import getLastRun)
export const getLastRun = loadRun;

export function clearRun() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------
   ✅ NEW: Selected Row helpers (for Investigation flow)
   Investigation page reads: localStorage.getItem("soc:selectedRow")
-------------------------------------------------------------------*/

export function saveSelectedRow(row: Record<string, any>) {
  try {
    localStorage.setItem(SELECTED_KEY, JSON.stringify(row));
  } catch {
    // ignore
  }
}

export function loadSelectedRow(): Record<string, any> | null {
  try {
    const raw = localStorage.getItem(SELECTED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<string, any>;
    return null;
  } catch {
    return null;
  }
}

export function clearSelectedRow() {
  try {
    localStorage.removeItem(SELECTED_KEY);
  } catch {
    // ignore
  }
}
