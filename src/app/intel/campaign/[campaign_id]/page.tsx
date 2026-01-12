// src/app/intel/campaign/[campaign_id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Shell from "@/components/Shell";

import { buildIntelIndex, IntelIndex } from "@/lib/intelEngine";
import { summarizeKillChain } from "@/lib/killChainEngine";
import { buildSocDecisions } from "@/lib/decisionEngine";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function pill(txt: string, key?: string) {
  return (
    <span
      key={key || txt}
      className="inline-flex items-center rounded border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200"
    >
      {txt}
    </span>
  );
}

function fmtDate(v: any) {
  if (!v) return "-";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function clampText(s: any, max = 140) {
  const str = safe(s);
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}

function riskBadge(risk: any) {
  const n = Number(risk || 0);
  const base =
    "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";

  // Simple, deterministic bucketing (no external deps)
  if (n >= 75) return <span className={`${base} border-red-600/60 bg-red-500/10 text-red-200`}>risk {n}</span>;
  if (n >= 50) return <span className={`${base} border-orange-600/60 bg-orange-500/10 text-orange-200`}>risk {n}</span>;
  if (n >= 25) return <span className={`${base} border-yellow-600/60 bg-yellow-500/10 text-yellow-200`}>risk {n}</span>;
  return <span className={`${base} border-slate-600 bg-slate-200/10 text-slate-200`}>risk {n}</span>;
}

function countBadge(label: string, value: any) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200">
      <span className="text-slate-300">{label}:</span>
      <span className="font-semibold">{safe(value)}</span>
    </span>
  );
}

function priorityBadge(p: string) {
  const base =
    "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";
  const pp = safe(p).toUpperCase();

  if (pp === "CRITICAL")
    return <span className={`${base} border-red-600/60 bg-red-500/10 text-red-200`}>CRITICAL</span>;
  if (pp === "HIGH")
    return <span className={`${base} border-orange-600/60 bg-orange-500/10 text-orange-200`}>HIGH</span>;
  if (pp === "MEDIUM")
    return <span className={`${base} border-yellow-600/60 bg-yellow-500/10 text-yellow-200`}>MEDIUM</span>;
  return <span className={`${base} border-slate-600 bg-slate-200/10 text-slate-200`}>LOW</span>;
}

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams<{ campaign_id: string }>();

  const campaignId = params?.campaign_id;
  const [index, setIndex] = useState<IntelIndex | null>(null);

  // collapsible SOC decision cards
  const [openDecisionIds, setOpenDecisionIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIndex(buildIntelIndex());
  }, []);

  const campaign = useMemo(() => {
    if (!index || !campaignId) return null;
    return (
      index.campaigns.find((c: any) => String(c.campaign_id) === String(campaignId)) || null
    );
  }, [index, campaignId]);

  const cases = useMemo(() => {
    if (!index || !campaign) return [];
    const ids = new Set<string>((campaign.case_ids || []).map((x: any) => String(x)));
    return index.cases.filter((c: any) => ids.has(String(c.case_id)));
  }, [index, campaign]);

  const relatedEdges = useMemo(() => {
    if (!index || !campaign) return [];
    const entities = new Set<string>((campaign.entities || []).map((e: any) => String(e)));
    const edges = Array.isArray(index.edges) ? index.edges : [];
    return edges.filter((e: any) => {
      const a = String(e?.a || "");
      const b = String(e?.b || "");
      return entities.has(a) || entities.has(b);
    });
  }, [index, campaign]);

  const entityTypes = useMemo(() => {
    if (!campaign) return [];
    const types = (campaign.entities || []).map(
      (k: any) => String(k).split(":")[0] || "unknown"
    );
    return uniq(types).sort((a, b) => a.localeCompare(b));
  }, [campaign]);

  const killChain = useMemo(() => {
    if (!index || !campaign) return null;

    const devices = (campaign.entities || [])
      .map((k: any) => String(k))
      .filter((k: string) => k.startsWith("device:"))
      .map((k: string) => k.split(":").slice(1).join(":"));

    return summarizeKillChain({
      cases,
      mitreFindings: index.mitreFindings,
      lateralFindings: index.lateralFindings,
      restrictDevices: devices,
    });
  }, [index, campaign, cases]);

  const decisions = useMemo(() => {
    if (!index || !campaign) return [];
    return buildSocDecisions({
      scope: "campaign",
      index,
      killChain,
      campaign,
      cases,
    });
  }, [index, campaign, killChain, cases]);

  // open the top (highest priority) recommendation by default
  useEffect(() => {
    if (!decisions?.length) return;

    const order = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
    const top = [...decisions].sort((a: any, b: any) => {
      const ai = order.indexOf(safe(a?.priority).toUpperCase());
      const bi = order.indexOf(safe(b?.priority).toUpperCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })[0];

    if (top?.id && openDecisionIds[top.id] === undefined) {
      setOpenDecisionIds((prev) => ({ ...prev, [top.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decisions]);

  function toggleDecision(id: string) {
    setOpenDecisionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ----------------------------
  // Loading state
  // ----------------------------
  if (!index) {
    return (
      <Shell>
        <main className="p-6">
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 text-slate-200">
            Loading intel…
          </div>
        </main>
      </Shell>
    );
  }

  // ----------------------------
  // Campaign not found state
  // ----------------------------
  if (!campaign) {
    return (
      <Shell>
        <main className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Campaign</h1>
            <button
              onClick={() => router.push("/intel")}
              className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
            >
              Back to Intel
            </button>
          </div>

          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 text-slate-200">
            Campaign not found: <span className="font-semibold">{safe(campaignId)}</span>
          </div>
        </main>
      </Shell>
    );
  }

  const caseCount = (campaign.case_ids || []).length;
  const entityCount = (campaign.entities || []).length;

  // ----------------------------
  // Normal render
  // ----------------------------
  return (
    <Shell>
      <main className="p-6 space-y-4">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold">
              {campaign.campaign_id} — {campaign.title}
            </h1>

            {/* cleaner, scan-friendly badges */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {riskBadge(campaign.risk)}
              {countBadge("cases", caseCount)}
              {countBadge("entities", entityCount)}
              {entityTypes.length ? pill(entityTypes.join(" • "), "entity-types") : pill("unknown entities", "entity-types")}
            </div>

            {/* readable dates */}
            <div className="text-xs text-slate-400 mt-2">
              {fmtDate(campaign.start)} → {fmtDate(campaign.end)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/intel")}
              className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
            >
              Back to Intel
            </button>
            <button
              onClick={() => setIndex(buildIntelIndex())}
              className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="text-xs text-slate-400">Campaign window</div>
            <div className="text-sm text-slate-200 mt-1 space-y-1">
              <div>
                <span className="text-slate-400">Start:</span> {fmtDate(campaign.start)}
              </div>
              <div>
                <span className="text-slate-400">End:</span> {fmtDate(campaign.end)}
              </div>
            </div>
          </div>

          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="text-xs text-slate-400">Entity types</div>
            <div className="text-sm text-slate-200 mt-2 flex flex-wrap gap-1">
              {entityTypes.length ? entityTypes.map((t) => pill(t, `etype-${t}`)) : pill("(none)", "etype-none")}
            </div>
          </div>

          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="text-xs text-slate-400">Notes</div>
            <div className="text-sm text-slate-200 mt-1">
              {safe((campaign as any).summary) || "Cluster generated from correlated entities + cases."}
            </div>
          </div>
        </div>

        {/* ✅ Campaign Kill Chain Summary */}
        <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-100">Kill Chain Summary</div>
              <div className="text-xs text-slate-400 mt-1">
                Inference-only. No automated actions or isolation.
              </div>
            </div>
            <div className="text-sm text-slate-200">
              Confidence: <span className="font-semibold">{safe(killChain?.confidence ?? 0)}%</span>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {/* soften inner panels a bit (less boxy) */}
            <div className="rounded border border-slate-800/80 bg-[#050A14]/70 p-3">
              <div className="text-xs text-slate-400">Stages observed</div>
              <div className="text-sm text-slate-200 mt-2 flex flex-wrap gap-1">
                {(killChain?.stages?.length ? killChain.stages : ["(none)"]).map((s: any) =>
                  pill(String(s), `kc-stage-${String(s)}`)
                )}
              </div>
            </div>

            <div className="rounded border border-slate-800/80 bg-[#050A14]/70 p-3">
              <div className="text-xs text-slate-400">Current stage</div>
              <div className="text-sm text-slate-200 mt-2">
                {killChain?.current_stage
                  ? pill(killChain.current_stage, `kc-cur-${killChain.current_stage}`)
                  : pill("(unknown)", "kc-cur-unknown")}
              </div>

              <div className="text-xs text-slate-400 mt-3">Next likely</div>
              <div className="text-sm text-slate-200 mt-2 flex flex-wrap gap-1">
                {(killChain?.next_likely?.length ? killChain.next_likely : ["(none)"]).map((s: any) =>
                  pill(String(s), `kc-next-${String(s)}`)
                )}
              </div>
            </div>

            <div className="rounded border border-slate-800/80 bg-[#050A14]/70 p-3">
              <div className="text-xs text-slate-400">MITRE techniques</div>
              <div className="text-sm text-slate-200 mt-2 flex flex-wrap gap-1">
                {(killChain?.evidence?.mitre_techniques?.length
                  ? killChain.evidence.mitre_techniques.slice(0, 10)
                  : ["(none)"]
                ).map((t: any) => pill(String(t), `kc-mitre-${String(t)}`))}
              </div>

              <div className="text-xs text-slate-400 mt-3">Lateral movement</div>
              <div className="text-sm text-slate-200 mt-2">
                {killChain?.evidence?.lateral_moves?.length ? (
                  <div className="space-y-1">
                    {killChain.evidence.lateral_moves.slice(0, 5).map((m: any, i: number) => (
                      <div
                        key={`kc-lat-${i}-${safe(m.from)}-${safe(m.to)}`}
                        className="text-xs text-slate-200"
                      >
                        {pill(`${safe(m.from)} → ${safe(m.to)}`, `kc-latpill-${i}-${safe(m.from)}-${safe(m.to)}`)}{" "}
                        <span className="text-slate-400">({safe(m.user)})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">(none)</div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded border border-slate-800/80 bg-[#050A14]/70 p-3">
            <div className="text-xs text-slate-400">Signals</div>
            <ul className="mt-2 space-y-1 text-sm text-slate-200 list-disc pl-5">
              {(killChain?.evidence?.signals?.length ? killChain.evidence.signals : ["No signals available."]).map(
                (s: any, i: number) => (
                  <li key={`kc-sig-${i}`}>{String(s)}</li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* ✅ SOC Decision Engine (campaign-scoped) */}
        <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-slate-100">SOC Decision Engine</div>
              <div className="text-xs text-slate-400 mt-1">
                Recommendations only — no automated actions, no isolation.
              </div>
            </div>
            <div className="text-xs text-slate-400">Scope: {campaign.campaign_id}</div>
          </div>

          <div className="space-y-2">
            {decisions.map((d: any) => {
              const isOpen = !!openDecisionIds[safe(d.id)];
              const rationale = Array.isArray(d.rationale) ? d.rationale : [];
              const actions = Array.isArray(d.suggested_actions) ? d.suggested_actions : [];
              const hunts = Array.isArray(d.suggested_hunts) ? d.suggested_hunts : [];
              const guardrails = Array.isArray(d.guardrails) ? d.guardrails : [];

              // small 1-line summary when collapsed
              const summaryBits = [
                rationale[0] ? clampText(rationale[0], 90) : "",
                actions[0] ? clampText(actions[0], 70) : "",
                hunts[0] ? clampText(hunts[0], 70) : "",
              ].filter(Boolean);

              return (
                <div
                  key={d.id}
                  className="rounded border border-slate-800 bg-[#050A14] p-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleDecision(safe(d.id))}
                    className="w-full text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm text-slate-200 font-semibold">
                          {d.title}
                        </div>

                        {!isOpen ? (
                          <div className="text-xs text-slate-400 mt-1">
                            {summaryBits.length ? summaryBits.join(" • ") : "Click to expand details."}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {priorityBadge(d.priority)}
                        <span className="text-[11px] text-slate-400">
                          {isOpen ? "Collapse" : "Expand"}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-slate-400">Rationale</div>
                      <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1">
                        {rationale.map((r: string, i: number) => (
                          <li key={`${d.id}-r-${i}`}>{r}</li>
                        ))}
                      </ul>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-xs text-slate-400">Suggested analyst actions</div>
                          <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1 mt-1">
                            {actions.map((a: string, i: number) => (
                              <li key={`${d.id}-a-${i}`}>{a}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <div className="text-xs text-slate-400">Suggested hunts</div>
                          <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1 mt-1">
                            {hunts.map((h: string, i: number) => (
                              <li key={`${d.id}-h-${i}`}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400">Guardrails</div>
                      <div className="flex flex-wrap gap-1">
                        {guardrails.map((g: string, i: number) => pill(g, `${d.id}-g-${i}`))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* CASES */}
        <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
          <div className="text-sm font-semibold">Cases in this campaign</div>

          {cases.length ? (
            <div className="space-y-2">
              {cases.map((c: any) => (
                <div
                  key={c.case_id}
                  className="rounded border border-slate-800 bg-[#050A14] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-100 truncate">
                        {c.case_id} — {c.title}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        {pill(`status:${safe(c.status)}`, `case-status-${c.case_id}`)}
                        {pill(`device:${clampText(c.device, 40)}`, `case-device-${c.case_id}`)}
                        {pill(`user:${clampText(c.user, 28)}`, `case-user-${c.case_id}`)}
                        {pill(`time:${fmtDate(c.time)}`, `case-time-${c.case_id}`)}
                      </div>
                    </div>

                    <Link
                      href={`/cases/${encodeURIComponent(c.case_id)}`}
                      className="shrink-0 rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-xs text-slate-200 hover:bg-slate-200/15"
                    >
                      Open case
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400">(none)</div>
          )}
        </div>

        {/* ENTITIES */}
        <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
          <div className="text-sm font-semibold">Entities in this campaign</div>

          {(campaign.entities || []).length ? (
            <div className="grid gap-2 md:grid-cols-2">
              {(campaign.entities || []).map((k: any) => {
                const key = String(k);
                const [type, ...rest] = key.split(":");
                const id = rest.join(":");
                const mem = (index.entities as any)?.[key];

                return (
                  <div key={key} className="rounded border border-slate-800 bg-[#050A14] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">{key}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
                          {pill(`risk:${safe(mem?.risk ?? "-")}`, `ent-risk-${key}`)}
                          {pill(`cases:${safe(mem?.case_refs?.length ?? 0)}`, `ent-cases-${key}`)}
                          {pill(`last:${fmtDate(mem?.last_seen ?? "-")}`, `ent-last-${key}`)}
                        </div>
                      </div>

                      <Link
                        href={`/intel?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`}
                        className="shrink-0 rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-xs text-slate-200 hover:bg-slate-200/15"
                      >
                        Open in Intel
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-400">(none)</div>
          )}
        </div>

        {/* CORRELATION EDGES */}
        <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
          <div className="text-sm font-semibold">Correlation edges</div>
          <div className="text-xs text-slate-400">
            These are entity-to-entity relationships observed across cases in this cluster.
          </div>

          {relatedEdges.length ? (
            <div className="space-y-2">
              {relatedEdges.slice(0, 50).map((e: any, i: number) => {
                const examples = Array.isArray(e?.examples) ? e.examples : [];
                const shown = examples.slice(0, 2);
                const remaining = Math.max(0, examples.length - shown.length);

                return (
                  <div
                    key={`edge-${i}-${safe(e?.edge_id)}`}
                    className="rounded border border-slate-800 bg-[#050A14] p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {pill(safe(e?.a) || "unknown", `edge-a-${i}`)}
                      <span className="text-slate-400 text-xs">↔</span>
                      {pill(safe(e?.b) || "unknown", `edge-b-${i}`)}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                      {pill(`weight:${safe(e?.weight ?? "-")}`, `edge-w-${i}`)}
                      {pill(`last:${fmtDate(e?.last_seen ?? "-")}`, `edge-last-${i}`)}
                      {shown.length ? (
                        <span className="text-slate-400">
                          <span className="text-slate-500">examples:</span>{" "}
                          {shown.join(", ")}
                          {remaining ? <span className="text-slate-500"> +{remaining} more</span> : null}
                        </span>
                      ) : (
                        <span className="text-slate-500">examples: (none)</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {relatedEdges.length > 50 ? (
                <div className="text-xs text-slate-400">Showing first 50 edges.</div>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-slate-400">(none)</div>
          )}
        </div>
      </main>
    </Shell>
  );
}