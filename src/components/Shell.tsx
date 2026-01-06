"use client";

import React from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function Shell({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-[#020617] text-slate-100">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        {/* Pages handle their own padding/layout */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
