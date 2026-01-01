"use client";

import React, { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { loadRun } from "@/lib/engineStore";

export default function InvestigationPage() {
  const sp = useSearchParams();
  const i = sp.get("i");
  const idx = i ? Number(i) : NaN;

  const run = loadRun();

  const row = useMemo(() => {
    if (!run?.rows || !Number.isFinite(idx)) return null;
    return run.rows[idx] ?? null;
  }, [run, idx]);

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Investigation" />
        <main className="p-6 space-y-6">
          <h1 className="text-xl font-semibold">Investigation</h1>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            {!row ? (
              <p className="text-sm text-slate-400">
                No selected event. Go to <span className="text-slate-200">Results</span>, select a row, then click{" "}
                <span className="text-slate-200">Investigate</span>.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-slate-300">
                  Investigation context from engine output:
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 whitespace-pre-wrap">
                  {JSON.stringify(row, null, 2)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-xs text-slate-400">Killchain</div>
                    <pre className="mt-2 text-xs text-slate-400 whitespace-pre-wrap">
                      {JSON.stringify(run?.killchain ?? {}, null, 2)}
                    </pre>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <div className="text-xs text-slate-400">Escalation</div>
                    <pre className="mt-2 text-xs text-slate-400 whitespace-pre-wrap">
                      {JSON.stringify(run?.escalation ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </Shell>
  );
}
