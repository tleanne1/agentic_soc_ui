import Link from "next/link";
import { Shield, Activity, FileSearch } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-[var(--soc-panel-border)] bg-[#020617]/90 backdrop-blur-md">
      <div className="p-5 font-semibold tracking-wide text-slate-200">
        Agentic SOC
      </div>

      <nav className="space-y-2 px-3 text-sm text-slate-300">
        <Link className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-800" href="/hunts">
          <Activity size={16}/> Threat Hunts
        </Link>
        <Link className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-800" href="/results">
          <FileSearch size={16}/> Results
        </Link>
        <Link className="flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-800" href="/investigation">
          <Shield size={16}/> Investigation
        </Link>
      </nav>
    </aside>
  );
}
