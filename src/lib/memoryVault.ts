// src/lib/memoryVault.ts
import React from "react";

export type MemorySource = {
  kind: "note" | "hunt" | "investigation" | "case";
  ref?: string; // optional id/path reference
};

export type MemoryItem = {
  id: string;
  created_at: string;
  title: string;
  content: string;
  tags: string[];
  source: MemorySource;
};

const KEY = "soc:memory";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getMemory(): MemoryItem[] {
  return safeParse<MemoryItem[]>(localStorage.getItem(KEY), []);
}

export function saveMemoryItem(item: MemoryItem) {
  const items = getMemory();
  items.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function deleteMemoryItem(id: string) {
  const items = getMemory().filter((x) => x.id !== id);
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function clearMemory() {
  localStorage.removeItem(KEY);
}
