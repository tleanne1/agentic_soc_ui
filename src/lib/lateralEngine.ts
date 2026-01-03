// src/lib/lateralEngine.ts
"use client";

import { SocCase } from "@/lib/caseStore";

export type LateralFinding = {
  from: string;
  to: string;
  user: string;
};

/**
 * Detect naive lateral movement:
 * If a user appears on a new device and has been seen on a different device before,
 * emit a finding: (previous_device -> current_device).
 */
export function detectLateral(cases: SocCase[]): LateralFinding[] {
  // user -> set of devices they've touched
  const seenDevicesByUser = new Map<string, Set<string>>();

  // user -> last device observed (for stable "from")
  const lastDeviceByUser = new Map<string, string>();

  // dedupe findings
  const emitted = new Set<string>();

  const findings: LateralFinding[] = [];

  for (const c of cases) {
    const user = (c as any).user?.toString().trim() || "";
    const device = (c as any).device?.toString().trim() || "";
    if (!user || !device) continue;

    if (!seenDevicesByUser.has(user)) seenDevicesByUser.set(user, new Set());
    const visited = seenDevicesByUser.get(user)!;

    const last = lastDeviceByUser.get(user);

    // If they've been seen before AND this is a new device, flag potential lateral
    if (visited.size > 0 && !visited.has(device)) {
      const from = (last && last !== device) ? last : [...visited][0];
      const key = `${user}::${from}::${device}`;

      if (!emitted.has(key)) {
        emitted.add(key);
        findings.push({ from, to: device, user });
      }
    }

    visited.add(device);
    lastDeviceByUser.set(user, device);
  }

  return findings;
}
