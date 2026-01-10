"use client";

import React from "react";

type Props = {
  title: string;
  rightText?: string;
};

type EngineHealth = {
  ok?: boolean;
  workspace_id_set?: boolean;
  mode?: string; // "live" | "demo"
};

export default function Topbar({ title, rightText }: Props) {
  const [health, setHealth] = React.useState<EngineHealth | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await fetch("/api/engine-health", { cache: "no-store" });
        const data = (await res.json()) as EngineHealth;
        if (alive) setHealth(data);
      } catch {
        if (alive) setHealth({ ok: false });
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const mode = (health?.mode || "live").toLowerCase();
  const isDemo = mode === "demo";
  const modeLabel = isDemo ? "Demo" : "Live";

  return (
    <header className="px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-300">{title}</div>

        <div className="flex items-center gap-3">
          {/* Mode badge */}
          <span
            className={[
              "text-xs px-2 py-1 rounded-full border",
              isDemo
                ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-200",
            ].join(" ")}
            title="Engine mode"
          >
            Mode: {modeLabel}
          </span>

          {/* Existing right-side text (kept) */}
          {rightText ? <span className="text-xs text-slate-400">{rightText}</span> : null}
        </div>
      </div>
    </header>
  );
}
