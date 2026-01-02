// src/app/memory/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

import Shell from "@/components/Shell";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import {
  MemoryItem,
  getMemory,
  saveMemoryItem,
  deleteMemoryItem,
  clearMemory,
} from "@/lib/memoryVault";

function makeId() {
  // short + readable
  return `MEM-${Math.random().toString(16).slice(2, 6)}${Math.random()
    .toString(16)
    .slice(2, 6)}`.toUpperCase();
}

export default function MemoryPage() {
  const [items, setItems] = useState<MemoryItem[]>([]);
  const [title, setTitle] = useState("Quick note");
  const [content, setContent] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  useEffect(() => {
    setItems(getMemory());
  }, []);

  const tags = useMemo(() => {
    return tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);
  }, [tagsRaw]);

  function refresh() {
    setItems(getMemory());
  }

  function onAdd() {
    const t = title.trim() || "Quick note";
    const c = content.trim();
    if (!c) return;

    const item: MemoryItem = {
      id: makeId(),
      created_at: new Date().toISOString(),
      title: t,
      content: c,
      tags,
      source: { kind: "note" },
    };

    saveMemoryItem(item);
    setContent("");
    setTagsRaw("");
    refresh();
  }

  function onDelete(id: string) {
    deleteMemoryItem(id);
    refresh();
  }

  function onClearAll() {
    clearMemory();
    refresh();
  }

  return (
    <Shell>
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar title="Memory Vault" />

        <main className="p-6 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Memory Vault</h1>
              <div className="text-xs text-slate-400 mt-1">
                Stored locally in your browser for now (localStorage:
                <span className="text-slate-200"> soc:memory</span>)
              </div>
            </div>

            <button
              onClick={onClearAll}
              className="rounded-md px-4 py-2 text-sm border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-200/10"
            >
              Clear all
            </button>
          </div>

          {/* ADD NOTE */}
          <div className="border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
              Add memory
            </div>

            <div className="p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Title</div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
                    placeholder="e.g., Suspicious logon pattern"
                  />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-slate-400">Tags (comma-separated)</div>
                  <input
                    value={tagsRaw}
                    onChange={(e) => setTagsRaw(e.target.value)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
                    placeholder="e.g., ssh, brute-force, baseline"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-400">Content</div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[110px] rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none"
                  placeholder="Write what you want to remember…"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onAdd}
                  disabled={!content.trim()}
                  className={[
                    "rounded-md px-4 py-2 text-sm border transition",
                    content.trim()
                      ? "bg-slate-200/10 text-slate-100 border-slate-700 hover:bg-slate-200/15"
                      : "bg-slate-950/40 text-slate-500 border-slate-800 cursor-not-allowed",
                  ].join(" ")}
                >
                  Save to Vault
                </button>
              </div>
            </div>
          </div>

          {/* LIST */}
          <div className="border border-[var(--soc-panel-border)] rounded-lg bg-[#020617]/80 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--soc-panel-border)] text-xs text-slate-400">
              Items ({items.length})
            </div>

            {items.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">
                Nothing saved yet. Add a note above to test the vault.
              </div>
            ) : (
              <div className="divide-y divide-slate-900/70">
                {items.map((m) => (
                  <div key={m.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-slate-200 font-medium">
                          {m.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {m.id} • {new Date(m.created_at).toLocaleString()}
                          {" • "}
                          source: {m.source?.kind}
                        </div>
                      </div>

                      <button
                        onClick={() => onDelete(m.id)}
                        className="rounded-md px-3 py-1.5 text-xs border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-200/10"
                      >
                        Delete
                      </button>
                    </div>

                    {m.tags?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {m.tags.map((t) => (
                          <span
                            key={t}
                            className="text-[11px] px-2 py-1 rounded-full border border-slate-800 bg-slate-950/40 text-slate-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="text-sm text-slate-200 whitespace-pre-wrap">
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </Shell>
  );
}
