"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getLastRun, saveSelectedRow, clearSelectedRow } from "@/lib/engineStore";
import { useRouter } from "next/navigation";

export default function ResultsPage() {
  const [run, setRun] = React.useState<any>(null);
  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [deviceFilter, setDeviceFilter] = React.useState("All devices");
  const [selectedRow, setSelectedRow] = React.useState<any>(null);
  const [copied, setCopied] = React.useState(false);

  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);

    // ✅ Clear stale selected row so you don't investigate an old selection
    clearSelectedRow();

    const r = getLastRun();
    setRun(r);
  }, []);

  const rows = Array.isArray(run?.rows) ? run.rows : [];

  const devices = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      if (r?.DeviceName) set.add(String(r.DeviceName));
      if (r?.device) set.add(String(r.device));
    }
    return ["All devices", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r: any) => {
      const dev = String(r?.DeviceName ?? r?.device ?? "");
      if (deviceFilter !== "All devices" && dev !== deviceFilter) return false;
      if (!q) return true;
      return JSON.stringify(r).toLowerCase().includes(q);
    });
  }, [rows, query, deviceFilter]);

  function onRowClick(row: any) {
    setSelectedRow(row);
    setCopied(false);

    // ✅ THIS is what Investigation needs
    saveSelectedRow(row);
  }

  function onInvestigate() {
    if (!selectedRow) return;
    router.push("/investigation");
  }

  function onClearSelection() {
    setSelectedRow(null);
    setCopied(false);
    clearSelectedRow();
  }

  async function onCopyJson() {
    if (!selectedRow) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedRow, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  const showingCap = 200;
  const shownCount = Math.min(filtered.length, showingCap);

  return (
    <div className="h-screen flex bg-gradient-to-b from-[#030712] to-[#020617] text-slate-100">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar title="Live SOC Console" rightText="Workspace: Lab | Status: Ready" />

        <main className="p-8">
          <h1 className="text-2xl font-semibold">Results</h1>

          <div className="mt-2 text-xs text-slate-400" suppressHydrationWarning>
            Rows: {mounted ? shownCount : "—"}
            {mounted ? ` (showing up to ${showingCap})` : ""}
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                <input
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search results..."
                />

                <select
                  className="rounded-xl bg-black/30 border border-white/10 px-3 py-2"
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value)}
                >
                  {devices.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <button
                  className={[
                    "rounded-xl px-4 py-2 border border-white/10",
                    selectedRow ? "bg-white/10 hover:bg-white/15" : "bg-white/5 opacity-50 cursor-not-allowed",
                  ].join(" ")}
                  onClick={onInvestigate}
                  disabled={!selectedRow}
                  title={!selectedRow ? "Select a row to investigate" : "Open Investigation"}
                >
                  Investigate
                </button>
              </div>

              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-slate-300">
                      <tr>
                        {filtered[0]
                          ? Object.keys(filtered[0]).map((k) => (
                              <th key={k} className="text-left px-3 py-2 font-medium">
                                {k}
                              </th>
                            ))
                          : ["No data"].map((k) => (
                              <th key={k} className="text-left px-3 py-2 font-medium">
                                {k}
                              </th>
                            ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0, showingCap).map((row: any, idx: number) => {
                        const isSelected = selectedRow === row;
                        return (
                          <tr
                            key={idx}
                            className={[
                              "border-t border-white/10 cursor-pointer",
                              isSelected ? "bg-white/10" : "hover:bg-white/5",
                            ].join(" ")}
                            onClick={() => onRowClick(row)}
                          >
                            {Object.keys(filtered[0] || {}).map((k) => (
                              <td
                                key={k}
                                className="px-3 py-2 text-slate-100/90 max-w-[260px] truncate"
                                title={String(row?.[k] ?? "")}
                              >
                                {String(row?.[k] ?? "")}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-3 py-2 text-xs text-slate-400 border-t border-white/10 flex items-center justify-between">
                  <span>Showing up to {showingCap} rows for UI performance.</span>
                  {filtered.length > showingCap ? (
                    <span className="text-slate-500">Refine search/filter to narrow results.</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">Details</h2>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onCopyJson}
                    disabled={!selectedRow}
                    className={[
                      "text-xs rounded-lg px-3 py-1 border border-white/10",
                      selectedRow ? "bg-white/10 hover:bg-white/15" : "bg-white/5 opacity-50 cursor-not-allowed",
                    ].join(" ")}
                    title={!selectedRow ? "Select a row first" : "Copy JSON to clipboard"}
                  >
                    {copied ? "Copied" : "Copy JSON"}
                  </button>

                  <button
                    onClick={onClearSelection}
                    disabled={!selectedRow}
                    className={[
                      "text-xs rounded-lg px-3 py-1 border border-white/10",
                      selectedRow ? "bg-black/20 hover:bg-black/30" : "bg-white/5 opacity-50 cursor-not-allowed",
                    ].join(" ")}
                    title={!selectedRow ? "No selection to clear" : "Clear selection"}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {!selectedRow ? (
                <div className="text-sm text-slate-400">Click a row to view details.</div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <pre className="text-xs whitespace-pre-wrap break-words text-slate-200/90">
                    {JSON.stringify(selectedRow, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
