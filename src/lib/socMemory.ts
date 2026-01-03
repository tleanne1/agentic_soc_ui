// src/lib/socMemory.ts
"use client";

export type EntityType = "device" | "user" | "ip";
export type EntityKey = `${EntityType}:${string}`;

export type MemoryEntity = {
  key: EntityKey;
  type: EntityType;
  id: string;

  risk: number;
  first_seen: string | null;
  last_seen: string | null;

  tags: string[];
  case_refs: string[];
};

export type Observation = {
  caseId?: string;
  device?: string;
  user?: string;
  ip?: string;

  tags?: string[];
  riskBump?: number;
};

const STORAGE_KEY = "soc_memory_v1";

type MemoryState = {
  entities: Record<string, MemoryEntity>;
};

function nowIso() {
  return new Date().toISOString();
}

function safeStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function readState(): MemoryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entities: {} };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { entities: {} };
    if (!parsed.entities || typeof parsed.entities !== "object") return { entities: {} };

    return parsed as MemoryState;
  } catch {
    return { entities: {} };
  }
}

function writeState(state: MemoryState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureEntity(state: MemoryState, type: EntityType, id: string): MemoryEntity {
  const cleanId = safeStr(id).trim();
  const key = `${type}:${cleanId}` as EntityKey;

  const existing = state.entities[key];
  if (existing) return existing;

  const created: MemoryEntity = {
    key,
    type,
    id: cleanId,
    risk: 0,
    first_seen: null,
    last_seen: null,
    tags: [],
    case_refs: [],
  };

  state.entities[key] = created;
  return created;
}

/**
 * Primary getter used across the app.
 */
export function getMemory(): MemoryState {
  return readState();
}

/**
 * ✅ Intel Engine expects this exact export name.
 * Snapshot = safe read-only view (still localStorage),
 * but returns the same structure as getMemory().
 */
export function getMemorySnapshot(): MemoryState {
  return readState();
}

/**
 * Optional helper: clear memory.
 */
export function clearMemory() {
  writeState({ entities: {} });
}

/**
 * Record observations from Investigation/Case status changes
 * and keep entity risk/tags/timestamps aligned.
 */
export function recordObservation(obs: Observation) {
  const state = readState();
  const t = nowIso();

  const tags = Array.isArray(obs.tags) ? obs.tags.filter(Boolean) : [];
  const bump = Number(obs.riskBump ?? 0);

  // Device
  if (obs.device) {
    const e = ensureEntity(state, "device", obs.device);
    e.first_seen = e.first_seen || t;
    e.last_seen = t;
    e.risk = Math.max(0, e.risk + bump);
    e.tags = Array.from(new Set([...e.tags, ...tags]));
    if (obs.caseId) e.case_refs = Array.from(new Set([...e.case_refs, obs.caseId]));
  }

  // User
  if (obs.user) {
    const e = ensureEntity(state, "user", obs.user);
    e.first_seen = e.first_seen || t;
    e.last_seen = t;
    e.risk = Math.max(0, e.risk + bump);
    e.tags = Array.from(new Set([...e.tags, ...tags]));
    if (obs.caseId) e.case_refs = Array.from(new Set([...e.case_refs, obs.caseId]));
  }

  // IP
  if (obs.ip) {
    const e = ensureEntity(state, "ip", obs.ip);
    e.first_seen = e.first_seen || t;
    e.last_seen = t;
    e.risk = Math.max(0, e.risk + bump);
    e.tags = Array.from(new Set([...e.tags, ...tags]));
    if (obs.caseId) e.case_refs = Array.from(new Set([...e.case_refs, obs.caseId]));
  }

  writeState(state);
}

