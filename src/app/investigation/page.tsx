"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { findMemoryEntity } from "@/lib/socMemory";

type SelectedRow = {
  DeviceName?: string;
  AccountName?: string;
  RemoteIP?: string;
  IPAddress?: string;
  [key: string]: any;
};

function riskLabel(score: number) {
  if (score >= 80) return "High";
  if (score >= 50) return "Medium";
  if (score >= 20) return "Low";
  return "Info";
}

export default function InvestigationPage() {
  const [row, setRow] = React.useState<SelectedRow | null>(null);

  // Entity memory hits
  const [deviceMem, setDeviceMem] = React.useState<any>(null);
  const [userMem, setUserMem] = React.useState<any>(null);
  const [ipMem, setIpMem] = React.useState<any>(null);

  React.useEffect(() => {
    // ⚠️ Adjust this key if your app uses a different one.
    // Common patterns: "soc:selectedRow", "soc:lastResultRow", etc.
    const raw =
      localStorage.getItem("soc:selectedResultRow") ||
      localStorage.getItem("soc:selectedRow") ||
      "";

    if (!raw) {
      setRow(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setRow(parsed);

      const device = parsed?.DeviceName || "";
      const user = parsed?.AccountName || "";
      const ip = parsed?.RemoteIP || parsed?.IPAddress || "";

      setDeviceMem(findMemoryEntity("device", device));
      setUserMem(findMemoryEntity("user", user));
      setIpMem(findMemoryEntity("ip", ip));
    } catch {
      setRow(null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100">
      <Topbar />
      <div className="flex">
        <Sidebar />

        <main className="flex-1 p-6">
          <h1 className="text-3xl font-semibold mb-2">Investigation</h1>

          {!row ? (
            <div className="border border-slate-700/60 bg-slate-900/30 rounded-md p-4 text-slate-300">
              No row selected. Go back to Results, click a row, then click Investigate.
            </div>
          ) : (
            <>
              {/* ✅ TYPE 1: Memory-driven warning panel */}
              {(deviceMem || userMem || ipMem) && (
                <div className="mb-4 border border-amber-500/40 bg-amber-500/10 rounded-md p-4">
                  <div className="font-semibold text-amber-200 mb-2">
                    ⚠ Previously Seen (SOC Memory)
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {deviceMem && (
                      <div className="border border-slate-700/60 bg-slate-900/30 rounded-md p-3">
                        <div className="font-medium">Device</div>
                        <div className="text-slate-200">{deviceMem.id}</div>
                        <div className="text-slate-300 mt-1">
                          Risk: <span className="font-semibold">{deviceMem.risk_score}</span> (
                          {riskLabel(deviceMem.risk_score)})
                        </div>
                        <div className="text-slate-400">
                          Linked cases: {deviceMem.case_refs?.length || 0}
                        </div>
                        {deviceMem.tags?.length > 0 && (
                          <div className="text-slate-400 mt-1">
                            Tags: {deviceMem.tags.join(", ")}
                          </div>
                        )}
                      </div>
                    )}

                    {userMem && (
                      <div className="border border-slate-700/60 bg-slate-900/30 rounded-md p-3">
                        <div className="font-medium">User</div>
                        <div className="text-slate-200">{userMem.id}</div>
                        <div className="text-slate-300 mt-1">
                          Risk: <span className="font-semibold">{userMem.risk_score}</span> (
                          {riskLabel(userMem.risk_score)})
                        </div>
                        <div className="text-slate-400">
                          Linked cases: {userMem.case_refs?.length || 0}
                        </div>
                        {userMem.tags?.length > 0 && (
                          <div className="text-slate-400 mt-1">
                            Tags: {userMem.tags.join(", ")}
                          </div>
                        )}
                      </div>
                    )}

                    {ipMem && (
                      <div className="border border-slate-700/60 bg-slate-900/30 rounded-md p-3">
                        <div className="font-medium">IP</div>
                        <div className="text-slate-200">{ipMem.id}</div>
                        <div className="text-slate-300 mt-1">
                          Risk: <span className="font-semibold">{ipMem.risk_score}</span> (
                          {riskLabel(ipMem.risk_score)})
                        </div>
                        <div className="text-slate-400">
                          Linked cases: {ipMem.case_refs?.length || 0}
                        </div>
                        {ipMem.tags?.length > 0 && (
                          <div className="text-slate-400 mt-1">
                            Tags: {ipMem.tags.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Existing investigation content */}
              <div className="border border-slate-700/60 bg-slate-900/30 rounded-md p-4">
                <div className="text-slate-300 text-sm mb-3">Selected event</div>
                <pre className="text-xs text-slate-200 whitespace-pre-wrap">
                  {JSON.stringify(row, null, 2)}
                </pre>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
