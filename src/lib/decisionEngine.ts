// src/lib/decisionEngine.ts
"use client";

import type { SocCase } from "@/lib/caseStore";
import type { IntelIndex, CampaignCluster } from "@/lib/intelEngine";
import type { KillChainSummary, KillChainStage } from "@/lib/killChainEngine";

export type DecisionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DecisionItem = {
  id: string;
  priority: DecisionPriority;
  title: string;
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

function scorePriority(score: number): DecisionPriority {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function hasStage(summary: KillChainSummary | null, stage: KillChainStage) {
  return !!summary?.stages?.includes(stage);
}

function hasTechnique(summary: KillChainSummary | null, prefix: string) {
  const techs = summary?.evidence?.mitre_techniques || [];
  return techs.some((t) => safe(t).startsWith(prefix));
}

/**
 * SOC Decision Engine
 * - Produces recommendations ONLY (no actions, no isolation)
 * - Uses: campaign risk + kill chain stage + MITRE techniques + lateral signals
 */
export function buildSocDecisions(params: {
  scope: "global" | "campaign";
  index: IntelIndex;
  killChain: KillChainSummary | null;
  campaign?: CampaignCluster | null;
  cases?: SocCase[];
}): DecisionItem[] {
  const { scope, index, killChain, campaign, cases = [] } = params;

  const openCases = cases.filter((c: any) => String(c.status || "").toLowerCase() !== "closed").length;
  const lateralHops = killChain?.evidence?.lateral_moves?.length || 0;
  const mitreCount = killChain?.evidence?.mitre_techniques?.length || 0;

  const baseRisk =
    scope === "campaign"
      ? Number(campaign?.risk || 0)
      : Math.min(80, index.campaigns.reduce((m, c) => Math.max(m, Number(c.risk || 0)), 0));

  const decisions: DecisionItem[] = [];

  // ---------------------------
  // DECISION 1: Possible active intrusion (lateral movement / cred access)
  // ---------------------------
  {
    let score = 0;
    const rationale: string[] = [];
    const actions: string[] = [];
    const hunts: string[] = [];

    score += Math.min(35, baseRisk * 0.45);
    if (baseRisk >= 60) rationale.push(`Elevated risk score detected (risk=${baseRisk}).`);

    if (openCases >= 3) {
      score += 10;
      rationale.push(`Multiple open cases in this scope (open=${openCases}).`);
    }

    if (hasStage(killChain, "Credential Access")) {
      score += 25;
      rationale.push(`Kill chain indicates Credential Access.`);
    }
    if (hasTechnique(killChain, "T1110")) {
      score += 20;
      rationale.push(`MITRE technique suggests Brute Force / Password Spray (T1110*).`);
    }

    if (lateralHops > 0) {
      score += 30;
      rationale.push(`Lateral movement signal present (${lateralHops} hop(s)).`);
    }
    if (hasStage(killChain, "Lateral Movement")) {
      score += 20;
      rationale.push(`Kill chain stage includes Lateral Movement.`);
    }

    // Suggested analyst actions (NO automation)
    actions.push(
      "Validate scope: confirm which users/devices are involved and whether activity is expected.",
      "Triage highest-risk campaign first: review timeline + case evidence + entity memory.",
      "If confirmed malicious: initiate containment process via your real SOC tooling (manual step)."
    );

    hunts.push(
      "Hunt: new logons for involved users across multiple devices (last 24h/7d).",
      "Hunt: failed logons / password spray patterns tied to the same user(s).",
      "Hunt: remote service usage (RDP/SSH/WinRM) between involved hosts."
    );

    decisions.push({
      id: scope === "campaign" ? "DEC-001-CAM" : "DEC-001-GLB",
      priority: scorePriority(score),
      title: scope === "campaign" ? "Investigate potential attacker progression in this campaign" : "Investigate potential attacker progression (global)",
      rationale: rationale.length ? rationale : ["Insufficient indicators to assert active intrusion; continue monitoring."],
      suggested_actions: actions,
      suggested_hunts: hunts,
      guardrails: [
        "Inference-only engine: no automated actions are performed.",
        "No device isolation is triggered by this UI.",
        "Use confirmed evidence + approvals before any containment step.",
      ],
    });
  }

  // ---------------------------
  // DECISION 2: Confirm persistence / execution / defense evasion
  // ---------------------------
  {
    let score = 0;
    const rationale: string[] = [];
    const actions: string[] = [];
    const hunts: string[] = [];

    score += Math.min(25, baseRisk * 0.35);

    if (hasStage(killChain, "Execution")) {
      score += 15;
      rationale.push(`Kill chain indicates Execution stage.`);
    }
    if (hasTechnique(killChain, "T1059")) {
      score += 15;
      rationale.push(`Technique indicates scripting/command execution (T1059*).`);
    }

    if (hasStage(killChain, "Persistence")) {
      score += 15;
      rationale.push(`Kill chain indicates Persistence stage.`);
    }
    if (hasTechnique(killChain, "T1547") || hasTechnique(killChain, "T1053")) {
      score += 15;
      rationale.push(`Technique indicates persistence via autoruns/scheduled tasks (T1547*/T1053*).`);
    }

    if (hasStage(killChain, "Defense Evasion")) {
      score += 10;
      rationale.push(`Kill chain indicates Defense Evasion stage.`);
    }
    if (hasTechnique(killChain, "T1562") || hasTechnique(killChain, "T1070")) {
      score += 10;
      rationale.push(`Technique indicates impaired defenses or log deletion (T1562*/T1070*).`);
    }

    actions.push(
      "Review process + command execution evidence on the primary device(s).",
      "Check for scheduled tasks, autoruns, new services, and suspicious startup entries.",
      "Review endpoint protection events for tampering/disable actions (manual verification)."
    );

    hunts.push(
      "Hunt: suspicious PowerShell / cmd.exe usage tied to the same user/device.",
      "Hunt: scheduled task creation or service installs near the case timestamps.",
      "Hunt: security control tampering or log clearing events."
    );

    decisions.push({
      id: scope === "campaign" ? "DEC-002-CAM" : "DEC-002-GLB",
      priority: scorePriority(score),
      title: "Validate execution/persistence/defense-evasion signals",
      rationale: rationale.length ? rationale : ["No strong execution/persistence indicators detected; keep as watchlist check."],
      suggested_actions: actions,
      suggested_hunts: hunts,
      guardrails: [
        "No remediation is executed by this engine.",
        "All actions are suggested for an analyst to perform in approved tools.",
      ],
    });
  }

  // ---------------------------
  // DECISION 3: Exfiltration / C2 watch
  // ---------------------------
  {
    let score = 0;
    const rationale: string[] = [];
    const actions: string[] = [];
    const hunts: string[] = [];

    score += Math.min(20, baseRisk * 0.25);

    if (hasStage(killChain, "Command & Control")) {
      score += 20;
      rationale.push(`Kill chain indicates Command & Control stage.`);
    }
    if (hasTechnique(killChain, "T1071") || hasTechnique(killChain, "T1095")) {
      score += 15;
      rationale.push(`Technique indicates C2 protocols (T1071*/T1095*).`);
    }

    if (hasStage(killChain, "Exfiltration")) {
      score += 25;
      rationale.push(`Kill chain indicates Exfiltration stage.`);
    }
    if (hasTechnique(killChain, "T1041")) {
      score += 15;
      rationale.push(`Technique indicates Exfil over C2 channel (T1041*).`);
    }

    // If lateral movement exists, we heighten C2/exfil watch even if not directly detected
    if (lateralHops > 0) {
      score += 10;
      rationale.push("Lateral movement increases likelihood of follow-on collection/exfil.");
    }

    actions.push(
      "Review outbound network patterns from involved hosts (manual step).",
      "Confirm no unusual uploads/downloads or suspicious destinations.",
      "If suspicious: escalate to incident response process (manual)."
    );

    hunts.push(
      "Hunt: unusual outbound connections or repeated beacons from affected devices.",
      "Hunt: large outbound transfers or cloud uploads near suspicious activity windows.",
      "Hunt: DNS anomalies or uncommon domains associated with the same user/device set."
    );

    decisions.push({
      id: scope === "campaign" ? "DEC-003-CAM" : "DEC-003-GLB",
      priority: scorePriority(score),
      title: "Monitor for C2 / exfiltration indicators",
      rationale: rationale.length ? rationale : ["No direct C2/exfil indicators detected; maintain monitoring baseline."],
      suggested_actions: actions,
      suggested_hunts: hunts,
      guardrails: [
        "Inference only — suggestions are not enforcement.",
        "Validate with network telemetry before escalation.",
      ],
    });
  }

  // Sort by priority strength
  const order: Record<DecisionPriority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return decisions.sort((a, b) => (order[b.priority] || 0) - (order[a.priority] || 0));
}
