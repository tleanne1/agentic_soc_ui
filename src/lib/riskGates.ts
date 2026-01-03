// src/lib/riskGates.ts
"use client";

import type { KillChainSummary, KillChainStage } from "@/lib/killChainEngine";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type RiskGateResult = {
  severity: Severity;
  score: number; // 0-100 rollup
  recommended_actions: string[]; // suggestions only
  reasons: string[]; // explainable bullets
};

function clamp(n: number, min = 0, max = 100) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function hasAnyStage(summary: KillChainSummary, stages: KillChainStage[]) {
  const set = new Set(summary.stages || []);
  return stages.some((s) => set.has(s));
}

export function evaluateRiskGates(summary: KillChainSummary): RiskGateResult {
  const confidence = Number(summary.confidence || 0);
  const lateralHops = summary.evidence?.lateral_moves?.length || 0;

  const hasLateral = lateralHops > 0 || (summary.stages || []).includes("Lateral Movement");
  const hasC2 = hasAnyStage(summary, ["Command & Control"]);
  const hasExfil = hasAnyStage(summary, ["Exfiltration"]);
  const hasImpact = hasAnyStage(summary, ["Impact"]);

  // Score rollup (simple + explainable)
  let score = 0;
  const reasons: string[] = [];

  score += Math.min(50, confidence); // confidence contributes up to 50
  reasons.push(`Kill chain confidence: ${confidence}%`);

  if (hasLateral) {
    score += 20;
    reasons.push(`Lateral movement signals present (${lateralHops || 1} hop(s)).`);
  }

  if (hasC2) {
    score += 15;
    reasons.push("Command & Control stage present.");
  }

  if (hasExfil) {
    score += 15;
    reasons.push("Exfiltration stage present.");
  }

  if (hasImpact) {
    score += 20;
    reasons.push("Impact stage present.");
  }

  // MITRE presence slightly bumps (kept small to avoid over-weighting inference)
  const mitreCount = summary.evidence?.mitre_techniques?.length || 0;
  if (mitreCount) {
    score += Math.min(10, mitreCount * 2);
    reasons.push(`MITRE techniques observed: ${mitreCount}.`);
  } else {
    reasons.push("No MITRE techniques detected (text heuristics may be driving stages).");
  }

  score = clamp(score);

  // Determine severity gates
  let severity: Severity = "info";
  const actions: string[] = [];

  // Critical: Impact or Exfil with high confidence + lateral/C2
  if ((hasImpact || hasExfil) && confidence >= 80 && (hasLateral || hasC2)) {
    severity = "critical";
    actions.push("⛔ Isolation recommended (manual approval only).");
    actions.push("🚨 IR review required: validate scope, affected accounts, and data access.");
    actions.push("📌 Preserve evidence: export logs, keep case notes, capture IOC timeline.");
  }
  // High: C2 or Lateral with strong confidence
  else if ((hasC2 || hasLateral) && confidence >= 70) {
    severity = "high";
    actions.push("🚨 IR review required (manual): confirm pivot path and account legitimacy.");
    actions.push("🔍 Expand hunt: look for persistence, C2 beacons, and additional affected devices.");
    actions.push("✅ Consider containment actions (manual approval only).");
  }
  // Medium: Cred Access + Discovery/Exec
  else if (hasAnyStage(summary, ["Credential Access"]) && confidence >= 55) {
    severity = "medium";
    actions.push("🔔 SOC alert: validate account activity and check for password spray/brute force.");
    actions.push("🔍 Hunt next: Discovery + Lateral Movement indicators.");
    actions.push("🧾 Add notes: affected user, device, and time window.");
  }
  // Low: Initial/Execution with modest confidence
  else if (confidence >= 40 && hasAnyStage(summary, ["Initial Access", "Execution"])) {
    severity = "low";
    actions.push("🔔 Triage: verify triggering events and enrich with related cases/entities.");
    actions.push("🔍 Monitor: watch for Credential Access or Lateral Movement signals.");
  } else {
    severity = "info";
    actions.push("ℹ️ Informational: keep monitoring and enrich with more evidence.");
  }

  // Always remind: no automation
  actions.push("✅ Inference-only. No automated actions are executed.");

  return { severity, score, recommended_actions: actions, reasons };
}
