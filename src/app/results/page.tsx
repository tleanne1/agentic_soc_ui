"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { getRun, saveSelectedRow, clearSelectedRow } from "@/lib/engineStore";

type AnyRow = Record<string, any>;

function safeString(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function pickDisplayColumns(columns: string[]) {
  const preferred = ["DeviceName", "TimeGenerated", "AccountName", "UserPrincipalName", "ActionType"];
  const picked: string[] = [];
  for (const c of preferred) {
    if (columns.includes(c)) picked.push(c);
  }
  // Fill remaining with first columns
  for (const c of columns) {
    if (picked.length >= 5) break;
    if (!picked.includes(c)) picked.push(c);
  }
  return picked.slice(0, 5);
}

export default function ResultsPage() {
  const router = useRouter();

  const [run, setRun] = useState<any | null>(null);
  const [selected, setSelected] = useState<AnyRow | null>(null);

  const [q, setQ] = useState("");
  const [deviceFilter, setDeviceFilter] = useState<string>("__all__");

  useEffect(() => {
    const r = getRun();
    setRun(r);
    // Don’t auto-select anything until rows exist
    clearSelectedRow();
  }, []);

  const columns: string[] = useMemo(() => {
    const cols = run?.columns;
    return Array.isArray(cols) ? cols : [];
  }, [run]);

  const rows: AnyRow[] = useMemo(() => {
    const rs = run?.rows;
    return Array.isArray(rs) ? rs : [];
  }, [run]);

  const devices = useMemo(() => {
    const s = new Set<string>();
    for (const row of rows) {
      const d = safeString(row?.DeviceName).trim();
      if (d) s.add(d);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const displayColumns = useMemo(() => pickDisplayColumns(columns), [columns]);

  const filteredRows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (deviceFilter !== "__all__") {
        const d = safeString(row?.DeviceName);
        if (d !== deviceFilter) return false;
      }

      if (!query) return true;

      // Search across visible columns (and a couple common fields)
      const haystackKeys = new Set<string>([
        ...displayColumns,
        "DeviceName",
        "AccountName",
        "UserPrincipalName",
        "ActionType",
        "RemoteIP",
        "IPAddress",
      ]);

      for (const key of haystackKeys) {
        if (row && key in row) {
          const v = safeString(row[key]).toLowerCase();
          if (v.includes(query)) return true;
        }
      }
      return false;
    });
  }, [rows, q, deviceFilter, displayColumns]);

  function onRowClick(row: AnyRow) {
    setSelected(row);
    saveSelectedRow(row);
  }

  function onInvestigate() {
    if (!selected) return;
    router.push("/investigation");
  }

  if (!run) {
    return (
      <Shell>
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Topbar title="Results" />
          <main className="p-6 space-y-4">
            <h1 className="text-xl font-semibold">Results</h1>
            <div className="border border-[var(--soc-panel-border)] rounded-lg p-4 bg-[#020617]/80 text-slate-200">
              No hunt results found yet.
              <div className="mt-3">
                <button
                  onClick={() => router.push("/hunts")}
                  className="rounded-md px-4 py-2 text-sm border border-slate-700 bg-slate-200/10 hover:bg-slate-200/15"
                >
                  Go to Threat Hunts
                </button>
              </div>
            </div>
          </main>
        </div>
      </Shell>
    );
  }

  const totalCount = Number(run?.count ?? rows.length ?? 0);
  const truncated = Boolean(run?.truncated); // ✅ NEW (from SOC engine)

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Results" />
        <main className="p-6 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Results</h1>

              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>
                  Rows: <span className="text-slate-200">{rows.length}</span>
                  {totalCount > rows.length ? (
                    <>
                      {" "}
                      <span className="text-slate-500">/</span>{" "}
                      <span className="text-slate-300">{totalCount}</span>{" "}
                      <span className="text-slate-500">(showing first {rows.length})</span>
                    </>
                  ) : null}
                </span>

                {/* ✅ NEW: Truncated badge */}
                {truncated ? (
                  <span className="inline-flex items-center rounded-md border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200">
                    Truncated
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search results…"
                className="w-64 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
              />

              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
              >
                <option value="__all__">All devices</option>
                {devices.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <button
                onClick={onInvestigate}
                disabled={!selected}
                className={[
                  "rounded-md px-4 py-2 text-sm border transition",
                  selected
                    ? "bg-slate-200/10 text-slate-100 border-slate-700 hover:bg-slate-200/15"
                    : "bg-slate-950/40 text-slate-500 border-slate-800 cursor-not-allowed",
                ].join(" ")}
              >
                Investigate
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* TABLE */}
            <div className="lg:col-span-2 border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                Events ({filteredRows.length})
              </div>

              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[#020617]">
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-800">
                      {displayColumns.map((c) => (
                        <th key={c} className="px-4 py-2 font-medium whitespace-nowrap">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row, idx) => {
                      const isSelected = selected === row;
                      return (
                        <tr
                          key={idx}
                          onClick={() => onRowClick(row)}
                          className={[
                            "cursor-pointer border-b border-slate-900/70",
                            isSelected ? "bg-slate-200/10" : "hover:bg-slate-200/5",
                          ].join(" ")}
                        >
                          {displayColumns.map((c) => (
                            <td key={c} className="px-4 py-2 whitespace-nowrap text-slate-200">
                              {safeString(row?.[c])}
                            </td>
                          ))}
                        </tr>
                      );
                    })}

                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={displayColumns.length} className="px-4 py-6 text-sm text-slate-400">
                          No results match your filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* DETAILS PANEL */}
            <div className="border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
                Details
              </div>

              <div className="p-4 space-y-4">
                {!selected ? (
                  <div className="text-sm text-slate-400">Click a row to view details.</div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-xs text-slate-400">Selected event</div>
                    <div className="space-y-2">
                      {Object.entries(selected).map(([k, v]) => (
                        <div key={k} className="flex gap-3 text-sm">
                          <div className="w-32 shrink-0 text-slate-400">{k}</div>
                          <div className="flex-1 text-slate-200 break-all">{safeString(v)}</div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-800" />

                    {run?.baseline_note ? (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">Baseline note</div>
                        <div className="text-sm text-slate-200 whitespace-pre-wrap">
                          {safeString(run.baseline_note)}
                        </div>
                      </div>
                    ) : null}

                    {Array.isArray(run?.findings) && run.findings.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">LLM findings</div>
                        <div className="space-y-2">
                          {run.findings.slice(0, 5).map((f: any, i: number) => (
                            <div key={i} className="text-sm text-slate-200">
                              • {safeString(f?.summary || f?.title || JSON.stringify(f))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </Shell>
  );
}
