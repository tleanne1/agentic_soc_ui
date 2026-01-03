// src/lib/intelSearch.ts
// -------------------------------------------------------------
// Global Search across:
// - Cases (caseStore)
// - Memory Vault entities (socMemory)
// - Campaign clusters (intelBrain)
// - Relationship edges (intelBrain)
// -------------------------------------------------------------

import { getCases, SocCase } from "@/lib/caseStore";
import { getMemory, SocEntityMemory } from "@/lib/socMemory";
import { buildCampaigns, buildEdgesForCampaign, IntelCampaign, IntelEdge } from "@/lib/intelBrain";

export type SearchScope = "all" | "cases" | "entities" | "campaigns" | "edges";

export type SearchHit =
  | {
      kind: "case";
      id: string; // case_id
      title: string;
      subtitle: string;
      score: number;
      payload: SocCase;
    }
  | {
      kind: "entity";
      id: string; // `${type}:${id}`
      title: string;
      subtitle: string;
      score: number;
      payload: SocEntityMemory;
    }
  | {
      kind: "campaign";
      id: string; // CMP-x
      title: string;
      subtitle: string;
      score: number;
      payload: IntelCampaign;
    }
  | {
      kind: "edge";
      id: string; // computed edge key
      title: string;
      subtitle: string;
      score: number;
      payload: IntelEdge;
    };

function norm(s: any) {
  return String(s ?? "").toLowerCase().trim();
}

function tokenize(q: string) {
  return norm(q)
    .split(/[\s,]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function includesAllTokens(hay: string, toks: string[]) {
  return toks.every((t) => hay.includes(t));
}

function scoreMatch(hay: string, toks: string[]) {
  // simple scoring:
  // +10 for each token present
  // +15 if token appears in the beginning-ish (index < 20)
  let score = 0;
  for (const t of toks) {
    const idx = hay.indexOf(t);
    if (idx >= 0) {
      score += 10;
      if (idx < 20) score += 15;
    }
  }
  return score;
}

export function globalIntelSearch(args: {
  query: string;
  scope?: SearchScope;
  limit?: number;
}) {
  const q = args.query || "";
  const scope: SearchScope = args.scope || "all";
  const limit = Math.max(5, Math.min(200, args.limit ?? 60));

  const toks = tokenize(q);
  if (!toks.length) return { hits: [] as SearchHit[], totals: {} as Record<string, number> };

  const hits: SearchHit[] = [];

  // ---- CASES ----
  if (scope === "all" || scope === "cases") {
    const cases = getCases();

    for (const c of cases) {
      const hay = norm([
        c.case_id,
        c.title,
        c.status,
        c.device,
        c.user,
        c.time,
        c.created_at,
        c.baseline_note,
        ...(c.findings || []).map((f: any) => (typeof f === "string" ? f : JSON.stringify(f))),
        ...(c.analyst_notes || []),
        JSON.stringify(c.evidence || []),
      ].join(" | "));

      if (!includesAllTokens(hay, toks)) continue;

      const score = scoreMatch(hay, toks);

      hits.push({
        kind: "case",
        id: c.case_id,
        title: `${c.case_id} — ${c.title}`,
        subtitle: `status:${c.status} • device:${c.device} • user:${c.user} • created:${c.created_at}`,
        score,
        payload: c,
      });
    }
  }

  // ---- ENTITIES ----
  if (scope === "all" || scope === "entities") {
    const mem = getMemory();

    for (const e of mem) {
      const hay = norm([
        e.type,
        e.id,
        e.risk_score,
        e.first_seen,
        e.last_seen,
        (e.tags || []).join(" "),
        (e.case_refs || []).join(" "),
      ].join(" | "));

      if (!includesAllTokens(hay, toks)) continue;

      const score = scoreMatch(hay, toks) + Math.min(25, (e.risk_score || 0) / 2);

      hits.push({
        kind: "entity",
        id: `${e.type}:${e.id}`,
        title: `${e.type}:${e.id}`,
        subtitle: `risk:${e.risk_score} • cases:${e.case_refs?.length || 0} • last:${e.last_seen}`,
        score,
        payload: e,
      });
    }
  }

  // ---- CAMPAIGNS ----
  let campaignsCache: IntelCampaign[] | null = null;

  if (scope === "all" || scope === "campaigns") {
    campaignsCache = buildCampaigns();

    for (const c of campaignsCache) {
      const hay = norm([
        c.id,
        c.title,
        c.risk_score,
        c.first_seen,
        c.last_seen,
        (c.tags || []).join(" "),
        (c.case_ids || []).join(" "),
        (c.mitre || []).map((m) => `${m.id} ${m.name} ${m.tactic} ${m.match}`).join(" "),
      ].join(" | "));

      if (!includesAllTokens(hay, toks)) continue;

      const score = scoreMatch(hay, toks) + Math.min(30, c.risk_score / 2);

      hits.push({
        kind: "campaign",
        id: c.id,
        title: `${c.id} — ${c.title}`,
        subtitle: `risk:${c.risk_score} • cases:${c.case_ids.length} • entities:${c.entities.length}`,
        score,
        payload: c,
      });
    }
  }

  // ---- EDGES ----
  if (scope === "all" || scope === "edges") {
    const campaigns = campaignsCache || buildCampaigns();

    // limit edges search work: only top 20 campaigns by risk
    const topCampaigns = campaigns.slice(0, 20);

    for (const camp of topCampaigns) {
      const edges = buildEdgesForCampaign(camp.case_ids);

      for (const e of edges) {
        const key = `${e.a_type}:${e.a_id}__${e.b_type}:${e.b_id}`;
        const hay = norm([
          key,
          e.a_type,
          e.a_id,
          e.b_type,
          e.b_id,
          e.weight,
          e.last_seen,
          (e.sample_case_ids || []).join(" "),
          camp.id,
          camp.title,
        ].join(" | "));

        if (!includesAllTokens(hay, toks)) continue;

        const score = scoreMatch(hay, toks) + Math.min(30, e.weight * 4);

        hits.push({
          kind: "edge",
          id: key,
          title: `${e.a_type}:${e.a_id} ↔ ${e.b_type}:${e.b_id}`,
          subtitle: `weight:${e.weight} • last:${e.last_seen} • examples:${(e.sample_case_ids || []).join(", ")}`,
          score,
          payload: e,
        });
      }
    }
  }

  hits.sort((a, b) => (b.score || 0) - (a.score || 0));

  const limited = hits.slice(0, limit);
  const totals = limited.reduce(
    (acc, h) => {
      acc[h.kind] = (acc[h.kind] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return { hits: limited, totals };
}
