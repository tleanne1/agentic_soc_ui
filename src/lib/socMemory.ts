// src/lib/socMemory.ts
export type SocEntityType = "device" | "user" | "ip";

export type SocEntityMemory = {
  id: string;
  type: SocEntityType;
  risk_score: number;
  first_seen: string;
  last_seen: string;
  case_refs: string[];
  tags: string[];
};

const KEY = "soc:memory";

export function getMemory(): SocEntityMemory[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveMemory(memory: SocEntityMemory[]) {
  localStorage.setItem(KEY, JSON.stringify(memory));
}

export function upsertMemory(entity: SocEntityMemory) {
  const all = getMemory();
  const idx = all.findIndex((e) => e.id === entity.id && e.type === entity.type);
  if (idx >= 0) all[idx] = entity;
  else all.push(entity);
  saveMemory(all);
}

function nowIso() {
  return new Date().toISOString();
}

function clampRisk(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/**
 * Record an observation from a case/investigation into SOC memory.
 * Minimal + safe: add/update device/user/ip, bump risk, attach the case id.
 */
export function recordObservation(params: {
  caseId: string;
  device?: string;
  user?: string;
  ip?: string;
  tags?: string[];
  riskBump?: number; // default 5
}) {
  const { caseId, device, user, ip, tags = [], riskBump = 5 } = params;

  const stamp = nowIso();

  const recordOne = (type: SocEntityType, idRaw: string | undefined) => {
    const id = (idRaw || "").trim();
    if (!id) return;

    const all = getMemory();
    const idx = all.findIndex((e) => e.type === type && e.id === id);

    if (idx >= 0) {
      const existing = all[idx];
      const mergedTags = Array.from(new Set([...(existing.tags || []), ...tags])).slice(0, 25);
      const mergedCases = Array.from(new Set([...(existing.case_refs || []), caseId])).slice(0, 200);

      all[idx] = {
        ...existing,
        last_seen: stamp,
        risk_score: clampRisk((existing.risk_score || 0) + riskBump),
        tags: mergedTags,
        case_refs: mergedCases,
      };
      saveMemory(all);
      return;
    }

    const created: SocEntityMemory = {
      id,
      type,
      risk_score: clampRisk(riskBump),
      first_seen: stamp,
      last_seen: stamp,
      case_refs: [caseId],
      tags: Array.from(new Set(tags)).slice(0, 25),
    };

    all.push(created);
    saveMemory(all);
  };

  recordOne("device", device);
  recordOne("user", user);
  recordOne("ip", ip);
}
