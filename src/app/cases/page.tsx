// src/app/cases/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Shell from "@/components/Shell";
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

    if (status !== "all") list = list.filter((c) => c.status === status);

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
    "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10";
  const pillActive = "bg-white/10 border-white/20";

  return (
    <Shell>
      <div className="flex-1 min-w-0">
        <main className="p-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Cases</h1>
              <div className="text-sm text-slate-400 mt-1">
                All saved cases from localStorage (open + investigating + contained + closed).
              </div>
            </div>

            <button
              onClick={refresh}
              className="rounded-xl px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/10"
            >
              Refresh
            </button>
          </div>

          {/* METRICS */}
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["Total", totals.total],
              ["Not Closed", totals.openLike],
              ["Investigating", totals.investigating],
              ["Contained", totals.contained],
              ["Closed", totals.closed],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <div className="text-xs text-slate-400">{label}</div>
                <div className="text-2xl font-semibold">{value as any}</div>
              </div>
            ))}
          </div>

          {/* FILTERS + SEARCH */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setStatus("all")} className={`${pillBase} ${status === "all" ? pillActive : ""}`}>
                All
              </button>
              <button onClick={() => setStatus("open")} className={`${pillBase} ${status === "open" ? pillActive : ""}`}>
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
                className="w-full md:w-[420px] rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Case List</div>
              <div className="text-xs text-slate-400">Showing {filtered.length}</div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-slate-300">
                  <tr>
                    <th className="text-left p-3 border-b border-white/10">Case ID</th>
                    <th className="text-left p-3 border-b border-white/10">Title</th>
                    <th className="text-left p-3 border-b border-white/10">Status</th>
                    <th className="text-left p-3 border-b border-white/10">Device</th>
                    <th className="text-left p-3 border-b border-white/10">User</th>
                    <th className="text-left p-3 border-b border-white/10">Created</th>
                    <th className="text-right p-3 border-b border-white/10">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.case_id} className="border-t border-white/10 hover:bg-white/5">
                      <td className="p-3 whitespace-nowrap">{c.case_id}</td>
                      <td className="p-3">{c.title || "(untitled)"}</td>
                      <td className="p-3">{c.status}</td>
                      <td className="p-3">{safe(c.device)}</td>
                      <td className="p-3">{safe(c.user)}</td>
                      <td className="p-3 whitespace-nowrap">{safe(c.created_at || c.time)}</td>
                      <td className="p-3 text-right whitespace-nowrap">
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
                      <td colSpan={7} className="p-4 text-slate-400">
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
