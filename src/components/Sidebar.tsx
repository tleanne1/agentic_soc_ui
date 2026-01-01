"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Activity, FileSearch } from "lucide-react";

const nav = [
  { href: "/hunts", label: "Threat Hunts", icon: Activity },
  { href: "/results", label: "Results", icon: FileSearch },
  { href: "/investigation", label: "Investigation", icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[var(--soc-panel-border)] bg-[#020617]/90 backdrop-blur-md">
      <div className="p-5 font-semibold tracking-wide text-slate-200">
        Agentic SOC
      </div>

      <nav className="space-y-2 px-3 text-sm text-slate-300">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-2 px-3 py-2 rounded",
                "hover:bg-slate-800 transition",
                active ? "bg-slate-800 text-slate-100" : "",
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
