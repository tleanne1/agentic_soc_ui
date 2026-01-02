"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const linkClass = (path: string) =>
    `block px-4 py-2 rounded-md transition ${
      pathname === path
        ? "bg-slate-200/10 text-slate-100"
        : "text-slate-400 hover:bg-slate-200/5 hover:text-slate-200"
    }`;

  return (
    <aside className="w-56 border-r border-[var(--soc-panel-border)] bg-[#020617]/90 text-sm">
      <div className="p-4 font-semibold text-slate-200">Agentic SOC</div>

      <nav className="px-2 space-y-1">
        <Link href="/hunts" className={linkClass("/hunts")}>
          Threat Hunts
        </Link>

        <Link href="/results" className={linkClass("/results")}>
          Results
        </Link>

        <Link href="/investigation" className={linkClass("/investigation")}>
          Investigation
        </Link>

        {/* 🆕 CASES */}
        <Link href="/cases" className={linkClass("/cases")}>
          Cases
        </Link>
      </nav>
    </aside>
  );
}
