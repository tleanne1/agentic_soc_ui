// src/lib/intel.ts
import { getMemory, SocEntityMemory, SocEntityType } from "@/lib/socMemory";

export type IntelSummary = {
  totals: {
    devices: number;
    users: number;
    ips: number;
    all: number;
  };
  topRisk: SocEntityMemory[];
  repeatOffenders: SocEntityMemory[];
  recentlySeen: SocEntityMemory[];
  byType: Record<SocEntityType, SocEntityMemory[]>;
};

// ✅ Fix: accept string | null | undefined (your memory uses nulls)
function safeDateMs(iso?: string | null) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function uniqBy<T>(arr: T[], keyFn: (v: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function buildIntelSummary(): IntelSummary {
  const all = getMemory();

  const byType: Record<SocEntityType, SocEntityMemory[]> = {
    device: [],
    user: [],
    ip: [],
  };

  for (const e of all) {
    if (e?.type === "device") byType.device.push(e);
    if (e?.type === "user") byType.user.push(e);
    if (e?.type === "ip") byType.ip.push(e);
  }

  const topRisk = [...all]
    .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
    .slice(0, 20);

  const repeatOffenders = [...all]
    .sort((a, b) => (b.case_refs?.length || 0) - (a.case_refs?.length || 0))
    .filter((e) => (e.case_refs?.length || 0) >= 2)
    .slice(0, 20);

  const recentlySeen = [...all]
    .sort((a, b) => safeDateMs(b.last_seen) - safeDateMs(a.last_seen))
    .slice(0, 20);

  return {
    totals: {
      devices: byType.device.length,
      users: byType.user.length,
      ips: byType.ip.length,
      all: all.length,
    },
    topRisk,
    repeatOffenders,
    recentlySeen,
    byType: {
      device: uniqBy(byType.device, (e) => `${e.type}:${e.id}`),
      user: uniqBy(byType.user, (e) => `${e.type}:${e.id}`),
      ip: uniqBy(byType.ip, (e) => `${e.type}:${e.id}`),
    },
  };
}
