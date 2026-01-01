import React from "react";

export default function Topbar({
  title = "Live SOC Console",
  status = "Workspace: Lab | Status: Ready",
}: {
  title?: string;
  status?: string;
}) {
  return (
    <header className="h-14 border-b border-[var(--soc-panel-border)] bg-[#020617]/70 backdrop-blur flex items-center justify-between px-6 text-xs text-slate-300">
      <span>{title}</span>
      <span className="text-slate-400">{status}</span>
    </header>
  );
}
