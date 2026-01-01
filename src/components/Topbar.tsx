export default function Topbar() {
  return (
    <header className="h-14 border-b border-[var(--soc-panel-border)] bg-[#020617]/80 backdrop-blur flex items-center justify-between px-6 text-xs text-slate-300">
      <span>Live SOC Console</span>
      <span className="text-slate-400">Workspace: Lab | Status: Ready</span>
    </header>
  );
}
