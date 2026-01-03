// src/app/cases/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { getCases, SocCase, SocCaseStatus } from "@/lib/caseStore";

type StatusFilter = "all" | SocCaseStatus;

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function CasesPage() {
  const [allCases, setAllCases] = useState<SocCase[]>([]);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");

  const refresh = () => {
    // IMPORTANT: do NOT filter here (this is the bug you had)
    const cases = getCases();
    setAllCases(Array.isArray(cases) ? cases : []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const totals = useMemo(() => {
    const total = allCases.length;
    const openLike = allCases.filter((c) => c.status !== "closed").length;
    const investigating = allCases.filter((c) => c.status === "investigating").length;
    const contained = allCases.filter((c) => c.status === "contained").length;
    const closed = allCases.filter((c) => c.status === "closed").length;
    return { total, openLike, investigating, contained, closed };
  }, [allCases]);

  const filtered = useMemo(() => {
    let list = [...allCases];

    // status filter
    if (status !== "all") {
      list = list.filter((c) => c.status === status);
    }

    // search filter
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((c) => {
        const hay = [
          safe(c.case_id),
          safe(c.title),
          safe(c.status),
          safe(c.device),
          safe(c.user),
          safe(c.time),
          safe(c.created_at),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      });
    }

    return list;
  }, [allCases, status, q]);

  const pillBase =
    "rounded border border-slate-700 bg-slate-200/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-200/15";
  const pillActive = "border-slate-500 bg-slate-200/20";

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Cases" />

        <main className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Cases</h1>
              <div className="text-sm text-slate-300 mt-1">
                All saved cases from localStorage (open + investigating + contained + closed).
              </div>
            </div>

            <button
              onClick={refresh}
              className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
            >
              Refresh
            </button>
          </div>

          {/* METRICS */}
          <div className="grid gap-3 md:grid-cols-5">
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Total</div>
              <div className="text-2xl font-semibold">{totals.total}</div>
            </div>
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Not Closed</div>
              <div className="text-2xl font-semibold">{totals.openLike}</div>
            </div>
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Investigating</div>
              <div className="text-2xl font-semibold">{totals.investigating}</div>
            </div>
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Contained</div>
              <div className="text-2xl font-semibold">{totals.contained}</div>
            </div>
            <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-3">
              <div className="text-xs text-slate-400">Closed</div>
              <div className="text-2xl font-semibold">{totals.closed}</div>
            </div>
          </div>

          {/* FILTERS + SEARCH */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStatus("all")}
                className={`${pillBase} ${status === "all" ? pillActive : ""}`}
              >
                All
              </button>
              <button
                onClick={() => setStatus("open")}
                className={`${pillBase} ${status === "open" ? pillActive : ""}`}
              >
                Open
              </button>
              <button
                onClick={() => setStatus("investigating")}
                className={`${pillBase} ${status === "investigating" ? pillActive : ""}`}
              >
                Investigating
              </button>
              <button
                onClick={() => setStatus("contained")}
                className={`${pillBase} ${status === "contained" ? pillActive : ""}`}
              >
                Contained
              </button>
              <button
                onClick={() => setStatus("closed")}
                className={`${pillBase} ${status === "closed" ? pillActive : ""}`}
              >
                Closed
              </button>

              <div className="flex-1" />

              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search: "SOC-2026", "orca", "umfd-1", "investigating"'
                className="w-full md:w-[420px] rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Case List</div>
              <div className="text-xs text-slate-400">Showing {filtered.length}</div>
            </div>

            <div className="overflow-x-auto rounded border border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-[#050A14] text-slate-300">
                  <tr>
                    <th className="text-left p-2 border-b border-slate-800">Case ID</th>
                    <th className="text-left p-2 border-b border-slate-800">Title</th>
                    <th className="text-left p-2 border-b border-slate-800">Status</th>
                    <th className="text-left p-2 border-b border-slate-800">Device</th>
                    <th className="text-left p-2 border-b border-slate-800">User</th>
                    <th className="text-left p-2 border-b border-slate-800">Created</th>
                    <th className="text-right p-2 border-b border-slate-800">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.case_id} className="bg-[#020617]/40 text-slate-200">
                      <td className="p-2 border-b border-slate-900 whitespace-nowrap">
                        {c.case_id}
                      </td>
                      <td className="p-2 border-b border-slate-900">
                        {c.title || "(untitled)"}
                      </td>
                      <td className="p-2 border-b border-slate-900">{c.status}</td>
                      <td className="p-2 border-b border-slate-900">{safe(c.device)}</td>
                      <td className="p-2 border-b border-slate-900">{safe(c.user)}</td>
                      <td className="p-2 border-b border-slate-900 whitespace-nowrap">
                        {safe(c.created_at || c.time)}
                      </td>
                      <td className="p-2 border-b border-slate-900 text-right whitespace-nowrap">
                        <Link
                          href={`/cases/${encodeURIComponent(c.case_id)}`}
                          className="text-xs underline text-slate-200 hover:text-white"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}

                  {!filtered.length ? (
                    <tr>
                      <td colSpan={7} className="p-3 text-slate-400 bg-[#020617]/40">
                        No cases match this filter/search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </Shell>
  );
}
