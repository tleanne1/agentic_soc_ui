"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Search,
  List,
  Microscope,
  Briefcase,
  Vault,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
};

const NAV: NavItem[] = [
  { href: "/hunts", label: "Threat Hunts", Icon: Search },
  { href: "/results", label: "Results", Icon: List },
  { href: "/investigation", label: "Investigation", Icon: Microscope },
  { href: "/cases", label: "Cases", Icon: Briefcase }, // ✅ add this
  { href: "/memory", label: "Memory Vault", Icon: Vault },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-[var(--soc-panel-border)] bg-[#020617]/80 p-4">
      <div className="flex items-center gap-2 mb-4 text-slate-200">
        <Shield size={18} />
        <span className="font-semibold">Agentic SOC</span>
      </div>

      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.Icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                active ? "bg-slate-800 text-slate-100" : "text-slate-300 hover:bg-slate-900/60",
              ].join(" ")}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
