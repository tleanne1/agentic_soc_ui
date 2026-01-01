import React from "react";
import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

export default function DashboardLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title={title} />
        <main className="p-6 space-y-6">{children}</main>
      </div>
    </Shell>
  );
}
