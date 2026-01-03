// src/app/intel/page.tsx
"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getMemory, SocEntityMemory, SocEntityType } from "@/lib/socMemory";
import { useRouter } from "next/navigation";

export default function IntelPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<SocEntityMemory[]>([]);
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState<SocEntityType | "all">("all");

  React.useEffect(() => {
    setRows(getMemory());
  }, []);

  const filtered = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows
      .filter((r) => (type === "all" ? true : r.type === type))
      .filter((r) => {
        if (!query) return true;
        return (
          r.id.toLowerCase().includes(query) ||
          (r.tags || []).some((t) => t.toLowerCase().includes(query)) ||
          (r.case_refs || []).some((c) => c.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => (a.last_seen < b.last_seen ? 1 : -1));
  }, [rows, q, type]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <Topbar title="Intel (Entity Memory)" />

          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <input
                className="w-full max-w-md bg-transparent border border-slate-700 rounded px-3 py-2 text-sm"
                placeholder="Search id / tag / case id..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <select
                className="bg-transparent border border-slate-700 rounded px-2 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="device">Device</option>
                <option value="user">User</option>
                <option value="ip">IP</option>
              </select>

              <button
                className="border border-slate-700 rounded px-3 py-2 text-sm hover:bg-slate-800"
                onClick={() => setRows(getMemory())}
              >
                Refresh
              </button>
            </div>

            <div className="border border-slate-700 rounded overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-700 text-xs uppercase tracking-wide">
                <div className="col-span-2">Type</div>
                <div className="col-span-4">ID</div>
                <div className="col-span-2">Risk</div>
                <div className="col-span-2">Last Seen</div>
                <div className="col-span-2">Cases</div>
              </div>

              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-sm text-slate-400">
                  No entity memory found yet. Create a case from Investigation to auto-populate.
                </div>
              ) : (
                filtered.map((r) => (
                  <div
                    key={`${r.type}:${r.id}`}
                    className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-800 text-sm hover:bg-slate-900/40"
                  >
                    <div className="col-span-2">{r.type}</div>
                    <div className="col-span-4 font-mono break-all">{r.id}</div>
                    <div className="col-span-2">{r.risk_score}</div>
                    <div className="col-span-2 font-mono text-xs">{r.last_seen}</div>
                    <div className="col-span-2">
                      <button
                        className="border border-slate-700 rounded px-2 py-1 text-xs hover:bg-slate-800 disabled:opacity-50"
                        onClick={() => {
                          const firstCase = (r.case_refs || [])[0];
                          if (firstCase) router.push(`/cases/${encodeURIComponent(firstCase)}`);
                        }}
                        disabled={!r.case_refs || r.case_refs.length === 0}
                      >
                        Open
                      </button>
                      <span className="ml-2 text-xs text-slate-400">
                        {(r.case_refs || []).length}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Stored in localStorage: <span className="font-mono">soc:memory</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
