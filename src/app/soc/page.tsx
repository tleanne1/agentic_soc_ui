// src/app/soc/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Shell from "@/components/Shell";

import { buildIntelIndex, IntelIndex } from "@/lib/intelEngine";
import { summarizeKillChain } from "@/lib/killChainEngine";
import { buildSocDecisions } from "@/lib/decisionEngine";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
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
  const pp = safe(p).toUpperCase();

  if (pp === "CRITICAL")
    return (
      <span className={`${base} border-red-600/60 bg-red-500/10 text-red-200`}>
        CRITICAL
      </span>
    );
  if (pp === "HIGH")
    return (
      <span
        className={`${base} border-orange-600/60 bg-orange-500/10 text-orange-200`}
      >
        HIGH
      </span>
    );
  if (pp === "MEDIUM")
    return (
      <span
        className={`${base} border-yellow-600/60 bg-yellow-500/10 text-yellow-200`}
      >
        MEDIUM
      </span>
    );

  return (
    <span className={`${base} border-slate-600 bg-slate-200/10 text-slate-200`}>
      LOW
    </span>
  );
}

type EngineHealth = {
  ok: boolean;
  mode?: string;
  latency_ms?: number;
  checked_at?: string;
};

function relativeTime(iso?: string) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";

  const diffMs = Date.now() - t;
  const diffSec = Math.max(0, Math.round(diffMs / 1000));

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
}

export default function SocHomePage() {
  const [index, setIndex] = useState<IntelIndex | null>(null);
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [checking, setChecking] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIndex(buildIntelIndex());
  }, []);

  async function refreshHealth() {
    try {
      setChecking(true);
      const t0 = performance.now();
      const res = await fetch("/api/engine-health", { cache: "no-store" });
      const t1 = performance.now();
      const checkedAt = new Date().toISOString();

      if (!res.ok) {
        setHealth({
          ok: false,
          mode: "UNKNOWN",
          latency_ms: Math.round(t1 - t0),
          checked_at: checkedAt,
        });
        return;
      }

      const json = await res.json();
      setHealth({
        ok: Boolean(json?.ok ?? true),
        mode: String(json?.mode ?? "LIVE"),
        latency_ms: Number(json?.latency_ms ?? Math.round(t1 - t0)),
        checked_at: String(json?.checked_at ?? checkedAt),
      });
    } catch {
      setHealth({
        ok: false,
        mode: "UNKNOWN",
        latency_ms: undefined,
        checked_at: new Date().toISOString(),
      });
    } finally {
      setChecking(false);
    }
  }

  async function refreshAll() {
    setIndex(buildIntelIndex());
    await refreshHealth();
  }

  useEffect(() => {
    refreshHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const campaignsSorted = useMemo(() => {
    if (!index) return [];
    const list = Array.isArray(index.campaigns) ? index.campaigns : [];
    return [...list].sort(
      (a: any, b: any) => Number(b?.risk ?? 0) - Number(a?.risk ?? 0)
    );
  }, [index]);

  const highestCampaign = useMemo(() => {
    return campaignsSorted.length ? campaignsSorted[0] : null;
  }, [campaignsSorted]);

  const highestCampaignCases = useMemo(() => {
    if (!index || !highestCampaign) return [];
    const ids = new Set<string>(
      (highestCampaign.case_ids || []).map((x: any) => String(x))
    );
    return (index.cases || []).filter((c: any) => ids.has(String(c.case_id)));
  }, [index, highestCampaign]);

  const killChain = useMemo(() => {
    if (!index || !highestCampaign) return null;

    const devices = (highestCampaign.entities || [])
      .map((k: any) => String(k))
      .filter((k: string) => k.startsWith("device:"))
      .map((k: string) => k.split(":").slice(1).join(":"));

    return summarizeKillChain({
      cases: highestCampaignCases,
      mitreFindings: index.mitreFindings,
      lateralFindings: index.lateralFindings,
      restrictDevices: devices,
    });
  }, [index, highestCampaign, highestCampaignCases]);

  const decisions = useMemo(() => {
    if (!index || !highestCampaign) return [];
    return buildSocDecisions({
      scope: "campaign",
      index,
      killChain,
      campaign: highestCampaign,
      cases: highestCampaignCases,
    });
  }, [index, highestCampaign, killChain, highestCampaignCases]);

  const topDecision = useMemo(() => {
    if (!decisions?.length) return null;
    return decisions[0];
  }, [decisions]);

  const topSeverity = useMemo(() => {
    return safe(topDecision?.priority || "LOW").toUpperCase() || "LOW";
  }, [topDecision]);

  const caseCounts = useMemo(() => {
    if (!index) return { total: 0, open: 0 };
    const all = Array.isArray(index.cases) ? index.cases : [];
    const open = all.filter(
      (c: any) => String(c?.status || "").toLowerCase() !== "closed"
    ).length;
    return { total: all.length, open };
  }, [index]);

  const campaignCounts = useMemo(() => {
    if (!index) return { total: 0, highestRisk: 0 };
    const all = Array.isArray(index.campaigns) ? index.campaigns : [];
    const highestRisk = all.reduce(
      (m: number, c: any) => Math.max(m, Number(c?.risk ?? 0)),
      0
    );
    return { total: all.length, highestRisk };
  }, [index]);

  if (!index) {
    return (
      <Shell title="SOC Home">
        <main className="p-6">
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 text-slate-200">
            Loading SOC Home…
          </div>
        </main>
      </Shell>
    );
  }

  const campaignId = safe(highestCampaign?.campaign_id);
  const campaignTitle = safe(highestCampaign?.title);
  const campaignHref = campaignId
    ? `/intel/campaign/${encodeURIComponent(campaignId)}`
    : "";

  async function copyCampaignId() {
    if (!campaignId) return;
    try {
      await navigator.clipboard.writeText(campaignId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback: do nothing (silent)
    }
  }

  const topbarActions = (
    <>
      {/* Copy campaign ID */}
      <button
        type="button"
        onClick={copyCampaignId}
        disabled={!campaignId}
        className="rounded border border-slate-700 bg-slate-200/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-200/15 disabled:opacity-50"
        title={campaignId ? `Copy ${campaignId}` : "No campaign available"}
      >
        {copied ? "Copied!" : "Copy campaign ID"}
      </button>

      {/* Go to highest-risk campaign */}
      {campaignId ? (
        <Link
          href={campaignHref}
          className="rounded border border-slate-700 bg-slate-200/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-200/15"
          title="Open highest-risk campaign"
        >
          View highest-risk
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="rounded border border-slate-700 bg-slate-200/10 px-3 py-1.5 text-xs text-slate-200 opacity-50"
          title="No campaign available"
        >
          View highest-risk
        </button>
      )}
    </>
  );

  return (
    <Shell title="Dashboard" topbarActions={topbarActions}>
      <main className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-100">Dashboard</h1>
            <div className="text-sm text-slate-300 mt-1">
              Operational dashboard: posture → highest-risk campaign → recommended next actions.
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="inline-flex items-center gap-2">
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    health?.ok ? "bg-emerald-400" : "bg-rose-400",
                  ].join(" ")}
                />
                Engine:{" "}
                <span className="text-slate-200">
                  {safe(health?.mode || "LIVE")}
                </span>
              </span>

              <span className="text-slate-600">•</span>
              <span>
                Last check:{" "}
                <span className="text-slate-200">
                  {relativeTime(health?.checked_at)}
                </span>
              </span>

              <span className="text-slate-600">•</span>
              <span>
                Latency:{" "}
                <span className="text-slate-200">
                  {typeof health?.latency_ms === "number"
                    ? `${health.latency_ms}ms`
                    : "—"}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshAll}
              disabled={checking}
              className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15 disabled:opacity-60"
            >
              {checking ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="text-xs text-slate-400">Top severity</div>
            <div className="mt-2">{priorityBadge(topSeverity)}</div>
            <div className="text-xs text-slate-400 mt-2">
              Based on highest-risk campaign recommendation.
            </div>
          </div>

          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="text-xs text-slate-400">Cases</div>
            <div className="text-2xl font-semibold text-slate-100 mt-1">
              {caseCounts.total}
            </div>
            <div className="text-xs text-slate-400 mt-1">Open: {caseCounts.open}</div>
          </div>

          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="text-xs text-slate-400">Campaigns</div>
            <div className="text-2xl font-semibold text-slate-100 mt-1">
              {campaignCounts.total}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Highest risk: {campaignCounts.highestRisk}
            </div>
          </div>

          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="text-xs text-slate-400">Campaign kill chain confidence</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border border-slate-700 flex items-center justify-center text-slate-100 font-semibold">
                {safe(killChain?.confidence ?? 0)}%
              </div>
              <div className="text-xs text-slate-300">
                <div className="text-slate-400">Confidence</div>
                <div className="text-slate-200">
                  Current: {safe(killChain?.current_stage || "(unknown)")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Highest-risk campaign */}
        <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-400">Highest-risk campaign</div>

              <div className="text-lg font-semibold text-slate-100 mt-1 break-words">
                {highestCampaign ? `${campaignId} — ${campaignTitle}` : "(none)"}
              </div>

              {highestCampaign ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pill(`risk ${safe(highestCampaign.risk)}`)}
                    {pill(`cases ${safe((highestCampaign.case_ids || []).length)}`)}
                    {pill(`entities ${safe((highestCampaign.entities || []).length)}`)}
                    {killChain?.current_stage ? pill(String(killChain.current_stage)) : null}
                  </div>

                  <div className="text-xs text-slate-400 mt-2">
                    {safe(highestCampaign.start)} → {safe(highestCampaign.end)}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 mt-2">
                  No campaigns detected yet. Run a hunt or load sample data.
                </div>
              )}
            </div>

            {highestCampaign ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={campaignHref}
                  className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
                >
                  Open campaign
                </Link>
                <Link
                  href={`/investigation`}
                  className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
                >
                  Start investigation
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {/* Recommendation + Right rail */}
        <div className="grid gap-3 md:grid-cols-3">
          {/* Top recommendation */}
          <div className="md:col-span-2 rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Top recommendation</div>
                <div className="text-xs text-slate-400 mt-1">
                  Inference-only — no automated containment is performed.
                </div>
              </div>
              {topDecision ? priorityBadge(topDecision.priority) : priorityBadge("LOW")}
            </div>

            {topDecision ? (
              <div className="mt-3 rounded border border-slate-800 bg-[#050A14] p-3">
                <div className="text-sm font-semibold text-slate-100">{topDecision.title}</div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-400">Suggested actions</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-200">
                      {(topDecision.suggested_actions || []).map((a: string, i: number) => (
                        <li key={`a-${i}`}>{a}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Suggested hunts</div>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-slate-200">
                      {(topDecision.suggested_hunts || []).map((h: string, i: number) => (
                        <li key={`h-${i}`}>{h}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-slate-400">Guardrails</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(topDecision.guardrails || []).map((g: string, i: number) =>
                      pill(g, `g-${i}`)
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-400">
                (No recommendations available yet.)
              </div>
            )}
          </div>

          {/* Right rail */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
            <div className="rounded border border-slate-800 bg-[#050A14] p-3">
              <div className="text-sm font-semibold text-slate-100">Quick links</div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <Link className="underline text-slate-200 hover:text-white" href="/intel">
                  Intel
                </Link>
                <Link className="underline text-slate-200 hover:text-white" href="/hunts">
                  Threat Hunts
                </Link>
                <Link className="underline text-slate-200 hover:text-white" href="/cases">
                  Cases
                </Link>
                <Link className="underline text-slate-200 hover:text-white" href="/memory">
                  Memory Vault
                </Link>
                <Link className="underline text-slate-200 hover:text-white" href="/investigation">
                  Investigation
                </Link>
              </div>
            </div>

            <div className="rounded border border-slate-800 bg-[#050A14] p-3">
              <div className="text-sm font-semibold text-slate-100">Operational guardrails</div>
              <div className="text-xs text-slate-400 mt-2">
                This UI is an inference assistant only. It does not isolate devices, terminate
                processes, block users, or execute remediation. Any containment must occur in
                approved tooling with human validation.
              </div>
            </div>
          </div>
        </div>

        {/* Footer advisory */}
        <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3 text-xs text-slate-400">
          🛡️ Advisory-only console. No automated containment or isolation is executed by this UI.
        </div>
      </main>
    </Shell>
  );
}
