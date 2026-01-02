import React from "react";

const RUN_KEY = "soc:lastRun";
const SELECTED_KEY = "soc:selectedRow";

export type HuntRun = Record<string, any>;

export function saveRun(run: HuntRun) {
  const payload = {
    ...run,
    _savedAt: new Date().toISOString(),
  };
  localStorage.setItem(RUN_KEY, JSON.stringify(payload));
}

export function getRun(): HuntRun | null {
  const raw = localStorage.getItem(RUN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearRun() {
  localStorage.removeItem(RUN_KEY);
}

export function saveSelectedRow(row: any) {
  localStorage.setItem(SELECTED_KEY, JSON.stringify(row));
}

export function getSelectedRow<T = any>(): T | null {
  const raw = localStorage.getItem(SELECTED_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSelectedRow() {
  localStorage.removeItem(SELECTED_KEY);
}
