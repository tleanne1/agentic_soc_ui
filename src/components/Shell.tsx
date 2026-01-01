import React from "react";

export default function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex bg-[var(--soc-bg)]">{children}</div>;
}
