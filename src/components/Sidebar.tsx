// src/components/Sidebar.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const nav = [
    { href: "/hunts", label: "Threat Hunts" },
    { href: "/results", label: "Results" },
    { href: "/investigation", label: "Investigation" },
    { href: "/cases", label: "Cases" },
    { href: "/memory", label: "Memory Vault" },
    { href: "/intel", label: "Intel" },
  ];

  return (
    <aside className="w-56 border-r border-slate-800 bg-[#020617]/80 p-4">
      <div className="font-semibold mb-3">Agentic SOC</div>
      <nav className="space-y-1">
        {nav.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block text-sm px-2 py-1 rounded",
                active ? "bg-slate-800 text-slate-100" : "text-slate-300 hover:bg-slate-900/40",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
