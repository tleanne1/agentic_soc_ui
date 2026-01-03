"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { getCases, SocCase } from "@/lib/caseStore";

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function CasesPage() {
  const [cases, setCases] = useState<SocCase[]>([]);

  const refresh = () => {
    const all = getCases();
    setCases(Array.isArray(all) ? all : []);
  };

  useEffect(() => {
    refresh();

    // Optional: keep it live if localStorage changes in another tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === "soc:cases") refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Cases" />

        <main className="p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Cases</h1>
              <div className="text-xs text-slate-400">
                Stored in localStorage under <span className="font-mono">soc:cases</span>
              </div>
            </div>

            <button
              onClick={refresh}
              className="rounded border border-slate-700 bg-slate-200/10 px-3 py-2 text-sm text-slate-200 hover:bg-slate-200/15"
            >
              Refresh
            </button>
          </div>

          <div className="rounded border border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
            <div className="text-xs text-slate-400 mb-3">Total: {cases.length}</div>

            {!cases.length ? (
              <div className="text-sm text-slate-300">
                No cases found.
                <div className="mt-2 text-xs text-slate-400">
                  Open DevTools Console and run:
                  <div className="mt-1 font-mono text-slate-300">
                    localStorage.getItem("soc:cases")
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {cases.map((c) => (
                  <div
                    key={c.case_id}
                    className="rounded border border-slate-800 bg-[#050A14] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-100">
                          {c.case_id} — {safe(c.title)}
                        </div>
                        <div className="text-xs text-slate-400">
                          status:{c.status} • device:{safe(c.device)} • user:{safe(c.user)} • created:
                          {safe(c.created_at)}
                        </div>
                      </div>

                      <Link
                        href={`/cases/${encodeURIComponent(c.case_id)}`}
                        className="text-xs underline text-slate-200 hover:text-white"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </Shell>
  );
}
