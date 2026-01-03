// src/lib/socDecisionEngine.ts
"use client";

import type { IntelIndex } from "@/lib/intelEngine";
import type { KillChainSummary } from "@/lib/killChainEngine";

export type DecisionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type SocRecommendation = {
  id: string;
  title: string;
  severity: DecisionSeverity;
  rationale: string[];
  suggested_actions: string[];
  suggested_hunts: string[];
  guardrails: string[];
};

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function clamp(n: number, min = 0, max = 100) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function severityFromScore(score: number): DecisionSeverity {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 35) return "MEDIUM";
  return "LOW";
}

/**
 * SOC Decision Engine
 * - Inference-only: generates analyst recommendations.
 * - NEVER triggers isolation or automated remediation.
 */
export function decideSocActions(params: {
  index: IntelIndex;
  killchain: KillChainSummary | null;
}): { score: number; recommendations: SocRecommendation[]; inputs_used: string[] } {
  const { index, killchain } = params;

  const openCases = index.cases.filter((c: any) => String(c.status) !== "closed");
  const openCount = openCases.length;

  const mitre = uniq(index.mitreFindings?.map((f: any) => safe(f?.technique?.id || f?.technique?.technique_id || "")).filter(Boolean) || []);
  const lateralCount = index.lateralFindings?.length || 0;

  const stages = killchain?.stages || [];
  const currentStage = safe(killchain?.current_stage || "");
  const confidence = Number(killchain?.confidence || 0);

  // Build a simple global “risk score” from signals
  let score = 0;

  // Open cases pressure
  score += Math.min(35, openCount * 4);

  // Lateral movement is a strong escalator
  if (stages.includes("Lateral Movement") || lateralCount > 0) score += 30;

  // Credential Access is a strong escalator
  if (stages.includes("Credential Access")) score += 20;

  // Priv Esc is meaningful
  if (stages.includes("Privilege Escalation")) score += 12;

  // MITRE technique volume adds some confidence
  score += Math.min(15, mitre.length * 5);

  // Confidence acts as a multiplier-ish (but clamped)
  score += Math.min(10, Math.floor(confidence / 10));

  score = clamp(score);

  const inputs_used = [
    "risk",
    "kill chain",
    "MITRE",
    "lateral",
    "open cases",
  ];

  const guardrails = [
    "Inference-only engine: no automated actions are performed.",
    "No device isolation is triggered by this UI.",
    "Use confirmed evidence + approvals before any containment step.",
  ];

  const recommendations: SocRecommendation[] = [];

  // 1) Global progression alert
  if (openCount >= 5 || stages.length >= 3) {
    const sev = severityFromScore(score);

    const credSpray =
      mitre.some((t) => t.startsWith("T1110")) || stages.includes("Credential Access");

    recommendations.push({
      id: "rec-global-progression",
      title: "Investigate potential attacker progression (global)",
      severity: sev,
      rationale: [
        `Multiple open cases in this scope (open=${openCount}).`,
        stages.includes("Credential Access")
          ? "Kill chain indicates Credential Access."
          : "Kill chain shows multi-stage behavior.",
        credSpray ? "MITRE suggests Brute Force / Password Spray (T1110*)." : "MITRE inference present.",
        stages.includes("Lateral Movement") || lateralCount > 0
          ? "Kill chain includes Lateral Movement."
          : "No lateral movement signal detected.",
      ],
      suggested_actions: [
        "Validate scope: confirm which users/devices are involved and whether activity is expected.",
        "Triage highest-risk campaign first: review timeline + case evidence + entity memory.",
        "If confirmed malicious: initiate containment process via your real SOC tooling (manual step).",
      ],
      suggested_hunts: [
        "Hunt: new logons for involved users across multiple devices (last 24h/7d).",
        "Hunt: failed logons / password spray patterns tied to the same user(s).",
        "Hunt: remote service usage (RDP/SSH/WinRM) between involved hosts.",
      ],
      guardrails,
    });
  }

  // 2) Execution / persistence checks when Execution stage present
  if (stages.includes("Execution") || currentStage === "Execution") {
    recommendations.push({
      id: "rec-exec-persist",
      title: "Validate execution/persistence/defense-evasion signals",
      severity: "LOW",
      rationale: [
        "Kill chain indicates Execution stage.",
      ],
      suggested_actions: [
        "Review process + command execution evidence on the primary device(s).",
        "Check for scheduled tasks, autoruns, new services, and suspicious startup entries.",
        "Review endpoint protection events for tampering/disable actions (manual verification).",
      ],
      suggested_hunts: [
        "Hunt: suspicious PowerShell / cmd.exe usage tied to the same user/device.",
        "Hunt: scheduled task creation or service installs near the case timestamps.",
        "Hunt: security control tampering or log clearing events.",
      ],
      guardrails,
    });
  }

  // 3) C2 / exfil monitoring suggestions (always safe)
  recommendations.push({
    id: "rec-monitor-c2-exfil",
    title: "Monitor for C2 / exfiltration indicators",
    severity: stages.includes("Command & Control") || stages.includes("Exfiltration") ? "MEDIUM" : "LOW",
    rationale: [
      stages.includes("Command & Control") || stages.includes("Exfiltration")
        ? "Kill chain suggests C2/Exfiltration-related stages."
        : "No direct C2/exfil indicators detected; maintain monitoring baseline.",
    ],
    suggested_actions: [
      "Review outbound network patterns from involved hosts (manual step).",
      "Confirm no unusual uploads/downloads or suspicious destinations/domains.",
      "If suspicious: escalate to incident response process (manual).",
    ],
    suggested_hunts: [
      "Hunt: unusual outbound connections or repeated beacons from affected devices.",
      "Hunt: large outbound transfers or cloud uploads near suspicious activity windows.",
      "Hunt: DNS anomalies or uncommon domains associated with the same user/device set.",
    ],
    guardrails,
  });

  return { score, recommendations, inputs_used };
}
