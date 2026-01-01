export type EngineRow = Record<string, any>;

export type RunHuntResponse = {
  query_context?: any;
  count?: number;
  columns?: string[];
  rows?: EngineRow[];

  baseline_note?: string;
  pivot_blocks?: string;
  planner_steps?: any[];

  killchain?: any;
  escalation?: any;

  findings?: any[];

  // error shape if blocked / failed
  detail?: any;
};

const KEY = "soc:lastHunt";

export function saveRun(data: RunHuntResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadRun(): RunHuntResponse | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
