import React from "react";
import Shell from "@/components/Shell";

export default function ResultsPage() {
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Results</h1>
        <p className="mt-1 text-sm text-slate-400">
          Table + filters + details drawer (next).
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-300">Events Table</p>
            <input
              placeholder="Filter (e.g., AccountName, IP)"
              className="w-64 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-800">
            <div className="grid grid-cols-4 gap-2 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200">
              <div>LogonTime</div>
              <div>Account</div>
              <div>Type</div>
              <div>IP</div>
            </div>
            <div className="px-3 py-6 text-sm text-slate-400">
              No data yet — we’ll hook this to your SOC engine later.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-sm text-slate-300">Details</p>
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
            Select a row to see details here.
          </div>
        </div>
      </div>
    </Shell>
  );
}
