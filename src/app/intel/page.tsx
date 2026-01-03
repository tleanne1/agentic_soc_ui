// src/app/intel/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { buildIntelSummary } from "@/lib/intel";
import type { SocEntityMemory, SocEntityType } from "@/lib/socMemory";

function pillClasses(type: SocEntityType) {
  switch (type) {
    case "device":
      return "border-slate-700 bg-slate-200/10 text-slate-200";
    case "user":
      return "border-slate-700 bg-slate-200/10 text-slate-200";
    case "ip":
      return "border-slate-700 bg-slate-200/10 text-slate-200";
    default:
      return "border-slate-700 bg-slate-200/10 text-slate-200";
  }
}

function riskBadge(risk: number) {
  if (risk >= 70) return "border-red-700 bg-red-500/10 text-red-200";
  if (risk >= 40) return "border-amber-700 bg-amber-500/10 text-amber-200";
  if (risk >= 15) return "border-sky-700 bg-sky-500/10 text-sky-200";
  return "border-slate-700 bg-slate-200/10 text-slate-200";
}

function safeIso(iso?: string) {
  if (!iso) return "-";
  return iso.replace("T", " ").replace("Z", "");
}

function EntityRow({
  e,
  onOpenCase,
}: {
  e: SocEntityMemory;
  onOpenCase: (caseId: string) => void;
}) {
  const last = safeIso(e.last_seen);
  const first = safeIso(e.first_seen);
  const cases = e.case_refs || [];
  const tags = e.tags || [];

  return (
    <div className="rounded-md border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]",
                pillClasses(e.type),
              ].join(" ")}
            >
              {e.type.toUpperCase()}
            </span>

            <span
              className={[
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]",
                riskBadge(e.risk_score || 0),
              ].join(" ")}
            >
              Risk {e.risk_score ?? 0}
            </span>
          </div>

          <div className="mt-2 text-sm text-slate-100 break-all">{e.id}</div>

          <div className="mt-2 text-xs text-slate-400">
            First seen {first} → Last seen {last}
          </div>

          {tags.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.slice(0, 10).map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-md border border-slate-700 bg-slate-200/5 px-2 py-0.5 text-[11px] text-slate-200"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xs text-slate-400">Case refs</div>
          <div className="mt-1 text-sm text-slate-200">{cases.length}</div>

          <div className="mt-2 space-y-1">
            {cases.slice(0, 3).map((c) => (
              <button
                key={c}
                onClick={() => onOpenCase(c)}
                className="block w-full rounded-md border border-slate-700 bg-slate-200/10 px-2 py-1 text-[12px] text-slate-200 hover:bg-slate-200/15"
                title="Open case"
              >
                Open {c}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IntelPage() {
  const router = useRouter();

  const [refreshTick, setRefreshTick] = useState(0);
  const [filter, setFilter] = useState<"all" | "device" | "user" | "ip">("all");
  const [q, setQ] = useState("");

  const intel = useMemo(() => buildIntelSummary(), [refreshTick]);

  const list = useMemo(() => {
    const all = [
      ...intel.byType.device,
      ...intel.byType.user,
      ...intel.byType.ip,
    ];

    const typed =
      filter === "all" ? all : all.filter((e) => e.type === filter);

    const query = q.trim().toLowerCase();
    if (!query) return typed;

    return typed.filter((e) => {
      const id = (e.id || "").toLowerCase();
      const tags = (e.tags || []).join(" ").toLowerCase();
      return id.includes(query) || tags.includes(query);
    });
  }, [intel, filter, q]);

  function onOpenCase(caseId: string) {
    router.push(`/cases/${caseId}`);
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Intel" />

        <main className="p-6 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Global Intel Center</h1>
              <div className="text-xs text-slate-400 mt-1">
                Memory-backed entity reputation across devices, users, and IPs.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshTick((n) => n + 1)}
                className="rounded-md px-4 py-2 text-sm border border-slate-700 bg-slate-200/10 hover:bg-slate-200/15 text-slate-100"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
              <div className="text-xs text-slate-400">Total entities</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">
                {intel.totals.all}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
              <div className="text-xs text-slate-400">Devices</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">
                {intel.totals.devices}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
              <div className="text-xs text-slate-400">Users</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">
                {intel.totals.users}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
              <div className="text-xs text-slate-400">IPs</div>
              <div className="mt-1 text-2xl font-semibold text-slate-100">
                {intel.totals.ips}
              </div>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {(["all", "device", "user", "ip"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={[
                    "rounded-md px-3 py-2 text-sm border transition",
                    filter === t
                      ? "bg-slate-200 text-slate-900 border-slate-200 font-semibold"
                      : "bg-slate-200/10 text-slate-100 border-slate-700 hover:bg-slate-200/15",
                  ].join(" ")}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search entities (id or tags)…"
              className="w-80 max-w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
            />
          </div>

          {/* 3 KEY LISTS */}
          <div className="grid gap-4 lg:grid-cols-3">
            <section className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                Top Risk (memory reputation)
              </div>
              <div className="p-4 space-y-3">
                {intel.topRisk.length ? (
                  intel.topRisk.slice(0, 6).map((e) => (
                    <EntityRow key={`${e.type}:${e.id}`} e={e} onOpenCase={onOpenCase} />
                  ))
                ) : (
                  <div className="text-sm text-slate-400">
                    No memory yet. Save a case to start building intel.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                Repeat Offenders (2+ case refs)
              </div>
              <div className="p-4 space-y-3">
                {intel.repeatOffenders.length ? (
                  intel.repeatOffenders.slice(0, 6).map((e) => (
                    <EntityRow key={`${e.type}:${e.id}`} e={e} onOpenCase={onOpenCase} />
                  ))
                ) : (
                  <div className="text-sm text-slate-400">
                    No repeat offenders yet.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                Recently Seen
              </div>
              <div className="p-4 space-y-3">
                {intel.recentlySeen.length ? (
                  intel.recentlySeen.slice(0, 6).map((e) => (
                    <EntityRow key={`${e.type}:${e.id}`} e={e} onOpenCase={onOpenCase} />
                  ))
                ) : (
                  <div className="text-sm text-slate-400">
                    No activity yet.
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* FULL LIST */}
          <section className="rounded-lg border border-[var(--soc-panel-border)] bg-[#020617]/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
              All Entities ({list.length})
            </div>

            <div className="p-4">
              {list.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {list.slice(0, 50).map((e) => (
                    <EntityRow key={`${e.type}:${e.id}`} e={e} onOpenCase={onOpenCase} />
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-400">No entities match.</div>
              )}
            </div>
          </section>
        </main>
      </div>
    </Shell>
  );
}
