// src/app/intel/campaign/[campaign_id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

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

function priorityBadge(p: string) {
  const base =
    "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";
  if (p === "CRITICAL") return <span className={`${base} border-red-600/60 bg-red-500/10 text-red-200`}>CRITICAL</span>;
  if (p === "HIGH") return <span className={`${base} border-orange-600/60 bg-orange-500/10 text-orange-200`}>HIGH</span>;
  if (p === "MEDIUM") return <span className={`${base} border-yellow-600/60 bg-yellow-500/10 text-yellow-200`}>MEDIUM</span>;
  return <span className={`${base} border-slate-600 bg-slate-200/10 text-slate-200`}>LOW</span>;
}

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams<{ campaign_id: string }>();

  const campaignId = params?.campaign_id;
  const [index, setIndex] = useState<IntelIndex | null>(null);

  useEffect(() => {
    setIndex(buildIntelIndex());
  }, []);

  const campaign = useMemo(() => {
    if (!index || !campaignId) return null;
    return index.campaigns.find((c: any) => String(c.campaign_id) === String(campaignId)) || null;
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
    const types = (campaign.entities || []).map((k: any) => String(k).split(":")[0] || "unknown");
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

  if (!index) {
    return (
      <Shell>
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar title="Intel" />
          <main className="p-6">
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 text-slate-200">
              Loading intel…
            </div>
          </main>
        </div>
      </Shell>
    );
  }

  if (!campaign) {
    return (
      <Shell>
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar title="Intel" />
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
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Intel" />

        <main className="p-6 space-y-4">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">
                {campaign.campaign_id} — {campaign.title}
              </h1>
              <div className="text-sm text-slate-300 mt-1">
                risk:{campaign.risk} • cases:{(campaign.case_ids || []).length} • entities:{(campaign.entities || []).length}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {safe(campaign.start)} → {safe(campaign.end)}
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
              <div className="text-sm text-slate-200 mt-1">
                <div>Start: {safe(campaign.start) || "-"}</div>
                <div>End: {safe(campaign.end) || "-"}</div>
              </div>
            </div>

            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
              <div className="text-xs text-slate-400">Entity types</div>
              <div className="text-sm text-slate-200 mt-1">
                {entityTypes.length ? entityTypes.join(" • ") : "(none)"}
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
                <div className="text-xs text-slate-400 mt-1">Inference-only. No automated actions or isolation.</div>
              </div>
              <div className="text-sm text-slate-200">
                Confidence: <span className="font-semibold">{safe(killChain?.confidence ?? 0)}%</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                <div className="text-xs text-slate-400">Stages observed</div>
                <div className="text-sm text-slate-200 mt-1 flex flex-wrap gap-1">
                  {(killChain?.stages?.length ? killChain.stages : ["(none)"]).map((s: any) =>
                    pill(String(s), `kc-stage-${String(s)}`)
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                <div className="text-xs text-slate-400">Current stage</div>
                <div className="text-sm text-slate-200 mt-1">
                  {killChain?.current_stage
                    ? pill(killChain.current_stage, `kc-cur-${killChain.current_stage}`)
                    : pill("(unknown)", "kc-cur-unknown")}
                </div>

                <div className="text-xs text-slate-400 mt-3">Next likely</div>
                <div className="text-sm text-slate-200 mt-1 flex flex-wrap gap-1">
                  {(killChain?.next_likely?.length ? killChain.next_likely : ["(none)"]).map((s: any) =>
                    pill(String(s), `kc-next-${String(s)}`)
                  )}
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                <div className="text-xs text-slate-400">MITRE techniques</div>
                <div className="text-sm text-slate-200 mt-1 flex flex-wrap gap-1">
                  {(killChain?.evidence?.mitre_techniques?.length
                    ? killChain.evidence.mitre_techniques.slice(0, 10)
                    : ["(none)"]
                  ).map((t: any) => pill(String(t), `kc-mitre-${String(t)}`))}
                </div>

                <div className="text-xs text-slate-400 mt-3">Lateral movement</div>
                <div className="text-sm text-slate-200 mt-1">
                  {killChain?.evidence?.lateral_moves?.length ? (
                    <div className="space-y-1">
                      {killChain.evidence.lateral_moves.slice(0, 5).map((m: any, i: number) => (
                        <div key={`kc-lat-${i}-${safe(m.from)}-${safe(m.to)}`} className="text-xs text-slate-200">
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

            <div className="rounded border border-slate-800 bg-[#050A14] p-3">
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
                <div className="text-xs text-slate-400 mt-1">Recommendations only — no automated actions, no isolation.</div>
              </div>
              <div className="text-xs text-slate-400">Scope: {campaign.campaign_id}</div>
            </div>

            <div className="space-y-2">
              {decisions.map((d) => (
                <div key={d.id} className="rounded border border-slate-800 bg-[#050A14] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm text-slate-200 font-semibold">{d.title}</div>
                    {priorityBadge(d.priority)}
                  </div>

                  <div className="text-xs text-slate-400">Rationale</div>
                  <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1">
                    {d.rationale.map((r, i) => (
                      <li key={`${d.id}-r-${i}`}>{r}</li>
                    ))}
                  </ul>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs text-slate-400">Suggested analyst actions</div>
                      <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1 mt-1">
                        {d.suggested_actions.map((a, i) => (
                          <li key={`${d.id}-a-${i}`}>{a}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400">Suggested hunts</div>
                      <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1 mt-1">
                        {d.suggested_hunts.map((h, i) => (
                          <li key={`${d.id}-h-${i}`}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="text-xs text-slate-400">Guardrails</div>
                  <div className="flex flex-wrap gap-1">
                    {d.guardrails.map((g, i) => pill(g, `${d.id}-g-${i}`))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CASES */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
            <div className="text-sm font-semibold">Cases in this campaign</div>

            {cases.length ? (
              <div className="space-y-2">
                {cases.map((c: any) => (
                  <div key={c.case_id} className="relative rounded border border-slate-800 bg-[#050A14] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-100">
                          {c.case_id} — {c.title}
                        </div>
                        <div className="text-xs text-slate-400">
                          status:{c.status} • device:{safe(c.device)} • user:{safe(c.user)} • time:{safe(c.time)}
                        </div>
                      </div>

                      <Link
                        href={`/cases/${encodeURIComponent(c.case_id)}`}
                        className="relative z-20 pointer-events-auto text-xs underline text-slate-200 hover:text-white"
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
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-100">{key}</div>
                          <div className="text-xs text-slate-400">
                            risk:{safe(mem?.risk ?? "-")} • cases:{safe(mem?.case_refs?.length ?? 0)} • last:{safe(mem?.last_seen ?? "-")}
                          </div>
                        </div>

                        <Link
                          href={`/intel?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`}
                          className="relative z-20 pointer-events-auto text-xs underline text-slate-200 hover:text-white"
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
                {relatedEdges.slice(0, 50).map((e: any, i: number) => (
                  <div key={`edge-${i}-${safe(e?.edge_id)}`} className="rounded border border-slate-800 bg-[#050A14] p-3">
                    <div className="text-sm text-slate-200">
                      <span className="font-semibold">{safe(e?.a)}</span> ↔{" "}
                      <span className="font-semibold">{safe(e?.b)}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      weight:{safe(e?.weight ?? "-")} • last:{safe(e?.last_seen ?? "-")} • examples:{safe((e?.examples || []).slice(0, 3).join(", "))}
                    </div>
                  </div>
                ))}
                {relatedEdges.length > 50 ? <div className="text-xs text-slate-400">Showing first 50 edges.</div> : null}
              </div>
            ) : (
              <div className="text-sm text-slate-400">(none)</div>
            )}
          </div>
        </main>
      </div>
    </Shell>
  );
}
