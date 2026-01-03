// src/lib/intelEngine.ts
"use client";

import { getCases, SocCase } from "@/lib/caseStore";
import { getMemorySnapshot, EntityType, EntityKey, MemoryEntity } from "@/lib/socMemory";

// NEW: lateral + mitre inference
import { detectLateral } from "@/lib/lateralEngine";
import { inferMitre } from "@/lib/mitreEngine";

/**
 * Edge = correlation between two entities (device<->user, device<->ip, user<->ip)
 */
export type CorrelationEdge = {
  edge_id: string;
  a: EntityKey;
  b: EntityKey;
  weight: number;
  last_seen: string;
  examples: string[]; // case ids
};

export type CampaignCluster = {
  campaign_id: string;
  title: string;

  risk: number;
  case_ids: string[];
  entities: EntityKey[];

  start: string | null;
  end: string | null;
};

export type IntelIndex = {
  cases: SocCase[];
  entities: Record<string, MemoryEntity>;
  edges: CorrelationEdge[];
  campaigns: CampaignCluster[];
};

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function nowIso() {
  return new Date().toISOString();
}

function toEntityKey(type: EntityType, id: string): EntityKey {
  return `${type}:${safe(id).trim()}` as EntityKey;
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function maxRisk(entities: Record<string, MemoryEntity>, keys: EntityKey[]) {
  let m = 0;
  for (const k of keys) {
    const e = entities[k];
    if (e && typeof e.risk === "number") m = Math.max(m, e.risk);
  }
  return m;
}

function minDate(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function maxDate(a: string | null, b: string | null) {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

/**
 * Build correlation edges from cases:
 * - If a case has device+user, add device<->user
 * - If a case has device+ip, add device<->ip
 * - If a case has user+ip, add user<->ip
 *
 * weight increments each time the pair appears.
 */
function buildEdgesFromCases(cases: SocCase[]): CorrelationEdge[] {
  const map = new Map<string, CorrelationEdge>();

  const bump = (a: EntityKey, b: EntityKey, caseId: string, lastSeen: string) => {
    const a0 = a <= b ? a : b;
    const b0 = a <= b ? b : a;
    const edgeId = `${a0}↔${b0}`;

    const existing = map.get(edgeId);
    if (!existing) {
      map.set(edgeId, {
        edge_id: edgeId,
        a: a0,
        b: b0,
        weight: 1,
        last_seen: lastSeen || nowIso(),
        examples: [caseId],
      });
      return;
    }

    existing.weight += 1;
    existing.last_seen = lastSeen || existing.last_seen;
    if (caseId) existing.examples = uniq([...existing.examples, caseId]).slice(0, 10);
  };

  for (const c of cases) {
    const caseId = safe(c.case_id);
    const lastSeen = safe(c.created_at || c.time || "");

    const device = safe((c as any).device).trim();
    const user = safe((c as any).user).trim();
    const ip = safe((c as any).ip).trim();

    if (device && user) bump(toEntityKey("device", device), toEntityKey("user", user), caseId, lastSeen);
    if (device && ip) bump(toEntityKey("device", device), toEntityKey("ip", ip), caseId, lastSeen);
    if (user && ip) bump(toEntityKey("user", user), toEntityKey("ip", ip), caseId, lastSeen);
  }

  return Array.from(map.values()).sort((x, y) => y.weight - x.weight);
}

/**
 * Naive campaign clustering:
 * Group cases by primary device if available, else user, else fallback bucket.
 * Then attach entities based on observed device/user/ip + memory refs.
 */
function buildCampaigns(cases: SocCase[], entities: Record<string, MemoryEntity>): CampaignCluster[] {
  const buckets = new Map<string, SocCase[]>();

  for (const c of cases) {
    const device = safe((c as any).device).trim();
    const user = safe((c as any).user).trim();
    const ip = safe((c as any).ip).trim();

    const key = device ? `device:${device}` : user ? `user:${user}` : ip ? `ip:${ip}` : "misc:unknown";
    const arr = buckets.get(key) || [];
    arr.push(c);
    buckets.set(key, arr);
  }

  const clusters: CampaignCluster[] = [];

  let n = 1;
  for (const [bucketKey, list] of buckets.entries()) {
    const entitySet = new Set<EntityKey>();
    let start: string | null = null;
    let end: string | null = null;

    for (const c of list) {
      const device = safe((c as any).device).trim();
      const user = safe((c as any).user).trim();
      const ip = safe((c as any).ip).trim();

      if (device) entitySet.add(toEntityKey("device", device));
      if (user) entitySet.add(toEntityKey("user", user));
      if (ip) entitySet.add(toEntityKey("ip", ip));

      const t = safe(c.time || c.created_at || "");
      if (t) {
        start = minDate(start, t);
        end = maxDate(end, t);
      }
    }

    const caseIds = list.map((c) => safe(c.case_id));
    const entitiesArr = Array.from(entitySet.values());

    const risk = Math.max(
      maxRisk(entities, entitiesArr),
      Math.min(75, Math.max(0, caseIds.length * 7))
    );

    const campaignId = `CMP-${n++}`;
    const title = `Cluster: ${bucketKey}`;

    clusters.push({
      campaign_id: campaignId,
      title,
      risk,
      case_ids: caseIds,
      entities: entitiesArr,
      start,
      end,
    });
  }

  return clusters.sort((a, b) => b.risk - a.risk);
}

/**
 * Main index builder used by Intel UI
 */
export function buildIntelIndex(): IntelIndex {
  const cases = getCases();
  const mem = getMemorySnapshot();

  const entities = (mem?.entities || {}) as Record<string, MemoryEntity>;
  const edges = buildEdgesFromCases(cases);
  const campaigns = buildCampaigns(cases, entities);

  // -----------------------------
  // NEW: MITRE inference + lateral movement → campaign risk escalation
  // -----------------------------
  const mitreFindings = cases.flatMap(inferMitre); // currently not returned, but computed for future UI use
  const lateralFindings = detectLateral(cases);

  // Escalate campaign risk if lateral movement is detected inside that campaign cluster
  campaigns.forEach((c) => {
    const hasLateral = lateralFindings.some((l) => {
      const fromKey = `device:${safe(l.from).trim()}` as any;
      const toKey = `device:${safe(l.to).trim()}` as any;
      return c.entities.includes(fromKey) && c.entities.includes(toKey);
    });

    if (hasLateral) c.risk += 30;
  });

  // If you have lint warnings for unused findings:
  void mitreFindings;

  return { cases, entities, edges, campaigns };
}

/**
 * Search scoring — returns a mixed list of hits for UI rendering.
 */
export function scoreSearch(index: IntelIndex, query: string): any[] {
  const q = safe(query).trim().toLowerCase();
  if (!q) return [];

  const hits: any[] = [];

  // cases
  for (const c of index.cases) {
    const hay = [
      safe(c.case_id),
      safe(c.title),
      safe((c as any).device),
      safe((c as any).user),
      safe((c as any).ip),
      safe(c.status),
      safe(c.created_at),
      safe(c.time),
    ]
      .join(" ")
      .toLowerCase();

    if (hay.includes(q)) {
      const score = 25;
      hits.push({
        type: "case",
        score,
        case_id: c.case_id,
        title: c.title,
        meta: `status:${c.status} • device:${safe((c as any).device)} • user:${safe((c as any).user)} • created:${safe(
          c.created_at
        )}`,
      });
    }
  }

  // entities
  for (const [k, e] of Object.entries(index.entities)) {
    const hay = `${k} ${e.tags.join(" ")} ${e.case_refs.join(" ")} ${safe(e.first_seen)} ${safe(e.last_seen)}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push({
        type: "entity",
        key: k,
        score: 15 + Math.min(40, Number(e.risk || 0)),
        meta: `risk:${e.risk} • cases:${e.case_refs.length} • last:${safe(e.last_seen)}`,
      });
    }
  }

  // campaigns
  for (const c of index.campaigns) {
    const hay = `${c.campaign_id} ${c.title} ${c.case_ids.join(" ")} ${c.entities.join(" ")}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push({
        type: "campaign",
        campaign_id: c.campaign_id,
        title: c.title,
        score: 10 + Math.min(60, Number(c.risk || 0)),
        meta: `risk:${c.risk} • cases:${c.case_ids.length} • entities:${c.entities.length}`,
      });
    }
  }

  // edges
  for (const e of index.edges) {
    const hay = `${e.edge_id} ${e.a} ${e.b} ${e.examples.join(" ")}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push({
        type: "edge",
        edge_id: e.edge_id,
        score: 12 + Math.min(30, Number(e.weight || 0) * 2),
        meta: `weight:${e.weight} • last:${safe(e.last_seen)} • examples:${e.examples.slice(0, 3).join(", ")}`,
      });
    }
  }

  return hits.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 50);
}
