// src/lib/intelBrain.ts
// -------------------------------------------------------------
// Global Intelligence Brain (local-only)
// Builds:
// - Campaign clusters (entity correlation)
// - Entity timeline (cases over time for a device/user/ip)
// - Risk rollups + inferred campaign labels
// - Relationship edges (device<->user<->ip) derived from cases/evidence
// - MITRE mapping from inferred tags
// -------------------------------------------------------------

import { getCases, SocCase } from "@/lib/caseStore";
import { getMemory, SocEntityMemory, SocEntityType } from "@/lib/socMemory";
import { inferMitreFromTags, MitreTechnique } from "@/lib/mitreMap";

export type IntelCampaign = {
  id: string;
  title: string;
  case_ids: string[];
  entities: SocEntityMemory[];
  tags: string[];              // includes inferred tags
  mitre: MitreTechnique[];     // inferred from tags
  risk_score: number;
  first_seen: string;
  last_seen: string;
};

export type EntityKey = string; // `${type}:${id}`

export type EntityTimelineEvent = {
  ts: string; // ISO
  case_id: string;
  title: string;
  status: SocCase["status"];
  device?: string;
  user?: string;
  time?: string;
};

export type IntelEdge = {
  a_type: SocEntityType;
  a_id: string;
  b_type: SocEntityType;
  b_id: string;
  weight: number; // number of co-occurrences
  last_seen: string;
  sample_case_ids: string[];
};

function nowIso() {
  return new Date().toISOString();
}

function safeIso(v: any) {
  const s = String(v || "").trim();
  return s || "";
}

function clamp(n: number, lo = 0, hi = 100) {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export function entityKey(type: SocEntityType, id: string): EntityKey {
  return `${type}:${id}`;
}

class DSU {
  parent: Map<string, string> = new Map();
  rank: Map<string, number> = new Map();

  make(x: string) {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  find(x: string): string {
    this.make(x);
    const p = this.parent.get(x)!;
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }

  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;

    const rka = this.rank.get(ra) || 0;
    const rkb = this.rank.get(rb) || 0;

    if (rka < rkb) this.parent.set(ra, rb);
    else if (rkb < rka) this.parent.set(rb, ra);
    else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rka + 1);
    }
  }
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function sortIsoAsc(a: string, b: string) {
  return (a || "").localeCompare(b || "");
}

function sortIsoDesc(a: string, b: string) {
  return (b || "").localeCompare(a || "");
}

function norm(s: string) {
  return (s || "").toLowerCase().trim();
}

// ---------- Inference helpers ----------

function inferTagsFromCase(c: SocCase): string[] {
  const tags: string[] = [];

  const title = norm(c.title);
  const evidence = Array.isArray(c.evidence) ? c.evidence : [];
  const blob = norm(JSON.stringify(evidence));

  // Bruteforce patterns
  if (
    title.includes("brute") ||
    title.includes("spray") ||
    blob.includes("bruteforce") ||
    blob.includes("password") ||
    blob.includes("invalid password") ||
    blob.includes("failed")
  ) {
    tags.push("campaign:bruteforce");
    tags.push("tactic:credential-access");
    tags.push("technique:brute-force");
  }

  // SSH patterns
  if (title.includes("ssh") || blob.includes("sshd") || blob.includes("ssh")) {
    tags.push("surface:ssh");
    tags.push("tactic:lateral-movement");
  }

  // Persistence-ish hints
  if (title.includes("persistence") || blob.includes("cron") || blob.includes("scheduled task")) {
    tags.push("tactic:persistence");
  }

  // Privilege escalation hints
  if (title.includes("root") || blob.includes("sudo") || blob.includes("admin")) {
    tags.push("tactic:privilege-escalation");
  }

  // Remote login hints
  if (title.includes("logon") || blob.includes("logontype") || blob.includes("remote")) {
    tags.push("behavior:remote-logon");
  }

  // You can add more rules later (exfil, C2, malware, etc.)
  return uniq(tags);
}

function deriveCampaignTitle(entities: SocEntityMemory[], tags: string[]) {
  const campaignTag =
    tags.find((t) => t.toLowerCase().startsWith("campaign:")) ||
    tags.find((t) => t.toLowerCase().startsWith("operation:"));

  if (campaignTag) return campaignTag;

  const top = [...entities].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))[0];
  if (top) return `Cluster: ${top.type} ${top.id}`;

  return "Cluster: Unnamed";
}

// ---------- Relationship edges ----------

function edgeKey(aT: SocEntityType, aI: string, bT: SocEntityType, bI: string) {
  // stable ordering to de-dupe (A-B same as B-A)
  const left = `${aT}:${aI}`;
  const right = `${bT}:${bI}`;
  return left < right ? `${left}__${right}` : `${right}__${left}`;
}

function extractIpsFromEvidence(evidence: any[]): string[] {
  const ips: string[] = [];
  const re = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
  const blob = JSON.stringify(evidence || []);
  const matches = blob.match(re) || [];
  for (const ip of matches) ips.push(ip);
  return uniq(ips).slice(0, 20);
}

export function buildEdgesForCampaign(caseIds: string[]): IntelEdge[] {
  const cases = getCases();
  const subset = cases.filter((c) => caseIds.includes(c.case_id));

  const edgeMap = new Map<string, IntelEdge>();

  for (const c of subset) {
    const dev = (c.device || "").trim();
    const usr = (c.user || "").trim();
    const ips = extractIpsFromEvidence(Array.isArray(c.evidence) ? c.evidence : []);

    const seenAt = safeIso(c.created_at) || safeIso(c.time) || nowIso();

    const pairs: Array<[SocEntityType, string, SocEntityType, string]> = [];

    if (dev && usr) pairs.push(["device", dev, "user", usr]);
    for (const ip of ips) {
      if (dev) pairs.push(["device", dev, "ip", ip]);
      if (usr) pairs.push(["user", usr, "ip", ip]);
    }

    for (const [aT, aI, bT, bI] of pairs) {
      const k = edgeKey(aT, aI, bT, bI);
      const prev = edgeMap.get(k);

      if (!prev) {
        edgeMap.set(k, {
          a_type: aT,
          a_id: aI,
          b_type: bT,
          b_id: bI,
          weight: 1,
          last_seen: seenAt,
          sample_case_ids: [c.case_id],
        });
      } else {
        prev.weight += 1;
        if (seenAt > prev.last_seen) prev.last_seen = seenAt;
        if (prev.sample_case_ids.length < 5 && !prev.sample_case_ids.includes(c.case_id)) {
          prev.sample_case_ids.push(c.case_id);
        }
      }
    }
  }

  return Array.from(edgeMap.values()).sort((a, b) => (b.weight || 0) - (a.weight || 0));
}

// ---------- Core builders ----------

export function buildCampaigns(): IntelCampaign[] {
  const mem = getMemory();
  const cases = getCases();

  const byKey = new Map<EntityKey, SocEntityMemory>();
  const keys: EntityKey[] = [];
  for (const e of mem) {
    const k = entityKey(e.type, e.id);
    byKey.set(k, e);
    keys.push(k);
  }

  const dsu = new DSU();
  for (const k of keys) dsu.make(k);

  // Connect entities that share case refs
  const caseToEntities = new Map<string, EntityKey[]>();
  for (const e of mem) {
    const k = entityKey(e.type, e.id);
    for (const c of e.case_refs || []) {
      if (!caseToEntities.has(c)) caseToEntities.set(c, []);
      caseToEntities.get(c)!.push(k);
    }
  }

  for (const [, list] of caseToEntities.entries()) {
    const uniqList = uniq(list);
    for (let i = 1; i < uniqList.length; i++) {
      dsu.union(uniqList[0], uniqList[i]);
    }
  }

  // Also connect device+user that co-occur inside a case
  for (const c of cases) {
    const dev = (c.device || "").trim();
    const usr = (c.user || "").trim();
    if (dev && usr) {
      const kd = entityKey("device", dev);
      const ku = entityKey("user", usr);
      dsu.make(kd);
      dsu.make(ku);
      dsu.union(kd, ku);
    }
  }

  // Group by root
  const groups = new Map<string, EntityKey[]>();
  for (const k of dsu.parent.keys()) {
    const root = dsu.find(k);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(k);
  }

  const campaigns: IntelCampaign[] = [];
  let idx = 1;

  for (const [, groupKeys] of groups.entries()) {
    const entities = groupKeys.map((k) => byKey.get(k)).filter(Boolean) as SocEntityMemory[];
    if (!entities.length) continue;

    const caseIds = uniq(entities.flatMap((e) => e.case_refs || []));

    // Base tags from memory
    const baseTags = uniq(entities.flatMap((e) => e.tags || [])).slice(0, 200);

    // Inferred tags from cases in this cluster
    const inferredCaseTags = uniq(
      caseIds.flatMap((id) => {
        const c = cases.find((x) => x.case_id === id);
        return c ? inferTagsFromCase(c) : [];
      })
    );

    const tags = uniq([...baseTags, ...inferredCaseTags]).slice(0, 300);
    const mitre = inferMitreFromTags(tags);

    const maxRisk = Math.max(...entities.map((e) => e.risk_score || 0));
    const rollupRisk = clamp(maxRisk + Math.min(20, Math.floor(entities.length * 2)));

    const first =
      entities.map((e) => safeIso(e.first_seen)).filter(Boolean).sort(sortIsoAsc)[0] || nowIso();
    const last =
      entities.map((e) => safeIso(e.last_seen)).filter(Boolean).sort(sortIsoDesc)[0] || nowIso();

    const title = deriveCampaignTitle(entities, tags);

    campaigns.push({
      id: `CMP-${idx++}`,
      title,
      case_ids: caseIds,
      entities: entities.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 300),
      tags,
      mitre,
      risk_score: rollupRisk,
      first_seen: first,
      last_seen: last,
    });
  }

  campaigns.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  return campaigns;
}

export function buildEntityTimeline(params: { type: SocEntityType; id: string }): EntityTimelineEvent[] {
  const { type, id } = params;
  const cases = getCases();

  const matches = cases.filter((c) => {
    if (type === "device") return (c.device || "").trim() === id;
    if (type === "user") return (c.user || "").trim() === id;

    // IP timeline: infer from evidence
    if (type === "ip") {
      const needle = id.trim();
      if (!needle) return false;
      const evidence = Array.isArray(c.evidence) ? c.evidence : [];
      return evidence.some((ev: any) => JSON.stringify(ev || {}).includes(needle));
    }
    return false;
  });

  const timeline: EntityTimelineEvent[] = matches.map((c) => ({
    ts: safeIso(c.created_at) || safeIso(c.time) || nowIso(),
    case_id: c.case_id,
    title: c.title,
    status: c.status,
    device: c.device,
    user: c.user,
    time: c.time,
  }));

  timeline.sort((a, b) => sortIsoDesc(a.ts, b.ts));
  return timeline;
}

export function getIntelSummary() {
  const cases = getCases();
  const mem = getMemory();

  const openCount = cases.filter((c) => c.status !== "closed").length;
  const highRisk = mem.filter((e) => (e.risk_score || 0) >= 50).length;

  return {
    caseCount: cases.length,
    openCaseCount: openCount,
    entityCount: mem.length,
    highRiskEntityCount: highRisk,
  };
}

export function findEntityInMemory(type: SocEntityType, id: string): SocEntityMemory | null {
  const mem = getMemory();
  return mem.find((e) => e.type === type && e.id === id) || null;
}
