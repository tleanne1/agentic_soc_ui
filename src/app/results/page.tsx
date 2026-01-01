"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { loadRun, type EngineRow } from "@/lib/engineStore";

export default function ResultsPage() {
  const router = useRouter();
  const run = loadRun();

  const columns = run?.columns ?? [];
  const rows = run?.rows ?? [];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selected: EngineRow | null = useMemo(() => {
    if (selectedIndex === null) return null;
    return rows[selectedIndex] ?? null;
  }, [rows, selectedIndex]);

  function investigate() {
    if (selectedIndex === null) return;
    router.push(`/investigation?i=${selectedIndex}`);
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Results" />
        <main className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Results</h1>
              <p className="mt-1 text-sm text-slate-400">
                {run?.count != null ? `Rows: ${run.count}` : "Run a hunt to see results."}
              </p>
            </div>

            <button
              disabled={selectedIndex === null}
              onClick={investigate}
              className={[
                "rounded-md px-4 py-2 text-sm border transition",
                selectedIndex !== null
                  ? "bg-slate-200/10 text-slate-100 border-slate-700 hover:bg-slate-200/15"
                  : "bg-slate-950/40 text-slate-500 border-slate-800 cursor-not-allowed",
              ].join(" ")}
            >
              Investigate
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 overflow-hidden">
              <div className="px-4 py-3 text-sm text-slate-300 border-b border-slate-800">
                Events
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr className="border-b border-slate-800">
                      {columns.map((c) => (
                        <th key={c} className="text-left px-4 py-3 whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="text-slate-200">
                    {rows.map((r, idx) => {
                      const active = idx === selectedIndex;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedIndex(idx)}
                          className={[
                            "border-b border-slate-900 cursor-pointer",
                            "hover:bg-slate-900/40",
                            active ? "bg-slate-900/50" : "",
                          ].join(" ")}
                        >
                          {columns.map((c) => (
                            <td key={c} className="px-4 py-3 whitespace-nowrap">
                              {String(r?.[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      );
                    })}

                    {rows.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-slate-500" colSpan={Math.max(columns.length, 1)}>
                          No results yet. Go to Hunts and run one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-300">Baseline / Anomalies</p>
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400 whitespace-pre-wrap">
                  {run?.baseline_note?.trim()
                    ? run.baseline_note
                    : "No baseline notes returned (or none detected)."}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-300">LLM Findings</p>
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
                  {Array.isArray(run?.findings) && run.findings.length > 0 ? (
                    <ul className="space-y-2 list-disc pl-5">
                      {run.findings.map((f: any, i: number) => (
                        <li key={i} className="whitespace-pre-wrap">
                          {typeof f === "string" ? f : JSON.stringify(f, null, 2)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "No findings returned."
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-300">Selected Row</p>
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 whitespace-pre-wrap">
                  {selected ? JSON.stringify(selected, null, 2) : "Click a row to see details."}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </Shell>
  );
}
