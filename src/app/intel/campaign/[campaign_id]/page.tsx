// src/app/intel/campaign/[campaign_id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { buildIntelIndex, IntelIndex } from "@/lib/intelEngine";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

export default function CampaignDetailsPage() {
  const router = useRouter();
  const params = useParams<{ campaign_id: string }>();

  const campaignId = params?.campaign_id;

  const [index, setIndex] = useState<IntelIndex | null>(null);

  useEffect(() => {
    const idx = buildIntelIndex();
    setIndex(idx);
  }, []);

  const campaign = useMemo(() => {
    if (!index || !campaignId) return null;
    return index.campaigns.find((c: any) => String(c.campaign_id) === String(campaignId)) || null;
  }, [index, campaignId]);

  // Pull related cases
  const cases = useMemo(() => {
    if (!index || !campaign) return [];
    const ids = new Set<string>((campaign.case_ids || []).map((x: any) => String(x)));
    return index.cases.filter((c: any) => ids.has(String(c.case_id)));
  }, [index, campaign]);

  // Pull edges that involve any entity in this campaign
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

  // Derive a few useful rollups
  const entityTypes = useMemo(() => {
    if (!campaign) return [];
    const types = (campaign.entities || []).map((k: any) => String(k).split(":")[0] || "unknown");
    return uniq(types).sort((a, b) => a.localeCompare(b));
  }, [campaign]);

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
                risk:{campaign.risk} • cases:{(campaign.case_ids || []).length} • entities:
                {(campaign.entities || []).length}
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

          {/* CASES */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-2">
            <div className="text-sm font-semibold">Cases in this campaign</div>

            {cases.length ? (
              <div className="space-y-2">
                {cases.map((c: any) => (
                  <div
                    key={c.case_id}
                    className="relative rounded border border-slate-800 bg-[#050A14] p-3"
                  >
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
                  <div key={i} className="rounded border border-slate-800 bg-[#050A14] p-3">
                    <div className="text-sm text-slate-200">
                      <span className="font-semibold">{safe(e?.a)}</span> ↔{" "}
                      <span className="font-semibold">{safe(e?.b)}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      weight:{safe(e?.weight ?? "-")} • last:{safe(e?.last_seen ?? "-")} • examples:{safe((e?.examples || []).slice(0, 3).join(", "))}
                    </div>
                  </div>
                ))}
                {relatedEdges.length > 50 ? (
                  <div className="text-xs text-slate-400">Showing first 50 edges.</div>
                ) : null}
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
