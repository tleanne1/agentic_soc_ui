// src/app/intel/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { buildIntelIndex, scoreSearch, EntityKey, IntelIndex } from "@/lib/intelEngine";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function parseEntityKey(k: string): { type: string; id: string } {
  const [type, ...rest] = k.split(":");
  return { type, id: rest.join(":") };
}

export default function IntelPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [index, setIndex] = useState<IntelIndex | null>(null);
  const [q, setQ] = useState("");

  // entity timeline lookup inputs
  const [entityType, setEntityType] = useState("device");
  const [entityId, setEntityId] = useState("");

  // loaded entity
  const loadedKey = useMemo(() => {
    const t = sp.get("type");
    const id = sp.get("id");
    if (!t || !id) return "";
    return `${t}:${id}`;
  }, [sp]);

  useEffect(() => {
    const idx = buildIntelIndex();
    setIndex(idx);

    // If arriving via /intel?type=device&id=orca, preload inputs
    if (loadedKey) {
      const p = parseEntityKey(loadedKey);
      setEntityType(p.type);
      setEntityId(p.id);
    }
  }, [loadedKey]);

  const totals = useMemo(() => {
    if (!index) return { cases: 0, openCases: 0, entities: 0, highRisk: 0 };
    const cases = index.cases.length;
    const openCases = index.cases.filter((c) => c.status !== "closed").length;
    const entities = Object.keys(index.entities).length;
    const highRisk = Object.values(index.entities).filter((e) => e.risk >= 50).length;
    return { cases, openCases, entities, highRisk };
  }, [index]);

  const searchHits = useMemo(() => {
    if (!index) return [];
    return scoreSearch(index, q);
  }, [index, q]);

  const entityKey = useMemo(() => {
    if (!entityType || !entityId) return "";
    return `${entityType}:${entityId}`;
  }, [entityType, entityId]);

  const entity = useMemo(() => {
    if (!index || !entityKey) return null;
    return index.entities[entityKey as EntityKey] || null;
  }, [index, entityKey]);

  // campaign clusters
  const campaigns = useMemo(() => {
    if (!index) return [];
    return index.campaigns.slice(0, 25);
  }, [index]);

  const onRefresh = () => {
    const idx = buildIntelIndex();
    setIndex(idx);
  };

  const onLoadEntity = () => {
    if (!entityType || !entityId) return;
    router.push(`/intel?type=${encodeURIComponent(entityType)}&id=${encodeURIComponent(entityId)}`);
  };

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Intel" />

        <main className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Global Intelligence Center</h1>
              <div className="text-sm text-slate-300 mt-1">
                Campaign clustering + MITRE inference + entity correlation edges + global search.
              </div>
            </div>

            <button
              onClick={onRefresh}
              className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
            >
              Refresh
            </button>
          </div>

          {/* METRICS */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Cases</div>
              <div className="text-2xl font-semibold">{totals.cases}</div>
            </div>
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Open Cases</div>
              <div className="text-2xl font-semibold">{totals.openCases}</div>
            </div>
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Entities in Memory</div>
              <div className="text-2xl font-semibold">{totals.entities}</div>
            </div>
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">High Risk Entities</div>
              <div className="text-2xl font-semibold">{totals.highRisk}</div>
            </div>
          </div>

          {/* GLOBAL SEARCH */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
            <div>
              <div className="text-sm font-semibold">Global Search</div>
              <div className="text-xs text-slate-400">
                Search across cases, memory entities, campaigns, and correlation edges.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Try: "umfd-1", "orca", "T1110", "ssh"'
                className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>

            {q.trim() ? (
              <div className="mt-2 space-y-2">
                <div className="text-xs text-slate-400">Results ({searchHits.length})</div>

                <div className="space-y-2">
                  {searchHits.map((h, i) => {
                    if (h.type === "case") {
                      return (
                        <div
                          key={i}
                          className="rounded border border-slate-800 bg-[#050A14] p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold">
                                [case]{h.case_id} — {h.title}
                              </div>
                              <div className="text-xs text-slate-400">{h.meta}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/cases/${h.case_id}`}
                                className="text-xs underline text-slate-200 hover:text-white"
                              >
                                Open case
                              </Link>
                              <div className="text-xs text-slate-400">score: {h.score}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (h.type === "entity") {
                      const { type, id } = parseEntityKey(h.key);
                      return (
                        <div
                          key={i}
                          className="rounded border border-slate-800 bg-[#050A14] p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold">[entity]{h.key}</div>
                              <div className="text-xs text-slate-400">{h.meta}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/intel?type=${encodeURIComponent(type)}&id=${encodeURIComponent(
                                  id
                                )}`}
                                className="text-xs underline text-slate-200 hover:text-white"
                              >
                                Open in Intel
                              </Link>
                              <div className="text-xs text-slate-400">score: {h.score}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (h.type === "campaign") {
                      return (
                        <div
                          key={i}
                          className="rounded border border-slate-800 bg-[#050A14] p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold">
                                [campaign]{h.campaign_id} — {h.title}
                              </div>
                              <div className="text-xs text-slate-400">{h.meta}</div>
                            </div>

                            {/* ✅ FIX: real route link so “Open campaign” always works */}
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/intel/campaign/${h.campaign_id}`}
                                className="text-xs underline text-slate-200 hover:text-white"
                              >
                                Open campaign
                              </Link>
                              <div className="text-xs text-slate-400">score: {h.score}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // edge
                    return (
                      <div
                        key={i}
                        className="rounded border border-slate-800 bg-[#050A14] p-3 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold">[edge]{h.edge_id}</div>
                            <div className="text-xs text-slate-400">{h.meta}</div>
                          </div>
                          <div className="text-xs text-slate-400">score: {h.score}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* ENTITY TIMELINE LOOKUP */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
            <div className="text-sm font-semibold">Entity Timeline Lookup</div>

            <div className="flex items-center gap-3">
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
              >
                <option value="device">device</option>
                <option value="user">user</option>
                <option value="ip">ip</option>
              </select>

              <input
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                placeholder="orca / umfd-1 / 10.0.0.5"
                className="flex-1 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
              />

              <button
                onClick={onLoadEntity}
                className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
              >
                Open in Intel
              </button>

              {loadedKey ? (
                <div className="text-xs text-slate-400">Loaded: {loadedKey}</div>
              ) : null}
            </div>

            <div className="rounded border border-slate-800 bg-[#050A14] p-3">
              <div className="text-xs text-slate-400 mb-1">Memory Snapshot</div>
              {!entity ? (
                <div className="text-sm text-slate-300">No memory record yet for this entity.</div>
              ) : (
                <div className="text-sm text-slate-200 space-y-1">
                  <div>Risk: {entity.risk}</div>
                  <div>First seen: {entity.first_seen || "-"}</div>
                  <div>Last seen: {entity.last_seen || "-"}</div>
                  <div>Case refs: {entity.case_refs.length}</div>
                  <div className="text-xs text-slate-400 mt-2">Tags</div>
                  <div className="text-xs text-slate-200 break-all">{entity.tags.join(" • ")}</div>
                </div>
              )}
            </div>
          </div>

          {/* CAMPAIGN CLUSTERS */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Campaign Clusters</div>
              <div className="text-xs text-slate-400">{campaigns.length} found</div>
            </div>

            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.campaign_id} className="rounded border border-slate-800 bg-[#050A14] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-100">
                        {c.campaign_id} — {c.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        risk:{c.risk} • cases:{c.case_ids.length} • entities:{c.entities.length}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {safe(c.start)} → {safe(c.end)}
                      </div>
                    </div>

                    {/* ✅ FIX: Link is always clickable */}
                    <Link
                      href={`/intel/campaign/${c.campaign_id}`}
                      className="text-xs underline text-slate-200 hover:text-white"
                    >
                      Open campaign
                    </Link>
                  </div>
                </div>
              ))}
              {!campaigns.length ? <div className="text-sm text-slate-400">(none)</div> : null}
            </div>
          </div>
        </main>
      </div>
    </Shell>
  );
}
