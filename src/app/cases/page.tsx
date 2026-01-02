"use client";

import React, { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getCases, updateCase, SocCase } from "@/lib/caseStore";
import { useRouter } from "next/navigation";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<SocCase[]>([]);

  useEffect(() => {
    setCases(getCases());
  }, []);

  function setStatus(c: SocCase, status: SocCase["status"]) {
    const updated = { ...c, status };
    updateCase(updated);
    setCases(getCases());
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Cases" />

        <main className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">SOC Cases</h1>

          {cases.length === 0 ? (
            <div className="text-sm text-slate-400">
              No cases saved yet.
            </div>
          ) : (
            <div className="border border-[var(--soc-panel-border)] rounded-lg overflow-hidden bg-[#020617]/80">
              <table className="w-full text-sm">
                <thead className="bg-[#020617] text-xs text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left">Case ID</th>
                    <th className="px-4 py-2 text-left">Title</th>
                    <th className="px-4 py-2 text-left">Device</th>
                    <th className="px-4 py-2 text-left">User</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {cases.map((c) => (
                    <tr
                      key={c.case_id}
                      className="border-b border-slate-900 hover:bg-slate-200/5"
                    >
                      <td className="px-4 py-2 font-mono text-xs text-slate-300">
                        {c.case_id}
                      </td>
                      <td className="px-4 py-2 text-slate-200">
                        {c.title}
                      </td>
                      <td className="px-4 py-2 text-slate-300">
                        {c.device}
                      </td>
                      <td className="px-4 py-2 text-slate-300">
                        {c.user}
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-200">
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 space-x-2">
                        <button
                          onClick={() => router.push("/investigation")}
                          className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-200 hover:bg-slate-200/10"
                        >
                          Open
                        </button>
                        {c.status !== "closed" && (
                          <button
                            onClick={() => setStatus(c, "closed")}
                            className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-200 hover:bg-slate-200/10"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </Shell>
  );
}
