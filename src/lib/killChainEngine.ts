// src/lib/killChainEngine.ts
"use client";

import { SocCase } from "./caseStore";
import type { MitreFinding } from "./mitreEngine";
import type { LateralFinding } from "./lateralEngine";

/**
 * Kill Chain stages (SOC-friendly, presentation-ready)
 */
export type KillChainStage =
  | "Reconnaissance"
  | "Initial Access"
  | "Execution"
  | "Persistence"
  | "Privilege Escalation"
  | "Defense Evasion"
  | "Credential Access"
  | "Discovery"
  | "Lateral Movement"
  | "Collection"
  | "Command & Control"
  | "Exfiltration"
  | "Impact";

export type KillChainSummary = {
  stages: KillChainStage[];          // ordered unique stages present
  current_stage: KillChainStage | null;
  next_likely: KillChainStage[];     // predicted next steps (simple heuristic)
  confidence: number;               // 0–100
  evidence: {
    mitre_techniques: string[];      // e.g., ["T1110", "T1021"]
    lateral_moves: Array<{ from: string; to: string; user: string }>;
    signals: string[];              // human-readable explanation bullets
  };
};

/**
 * Minimal technique→stage inference.
 * We keep this lightweight + safe (no engine assumptions).
 * You can expand this over time.
 */
const TECHNIQUE_TO_STAGE_PREFIX: Array<{ prefix: string; stage: KillChainStage }> = [
  // Initial Access
  { prefix: "T1566", stage: "Initial Access" }, // Phishing
  { prefix: "T1190", stage: "Initial Access" }, // Exploit Public-Facing App
  { prefix: "T1078", stage: "Initial Access" }, // Valid Accounts

  // Execution
  { prefix: "T1059", stage: "Execution" }, // Command and Scripting Interpreter
  { prefix: "T1204", stage: "Execution" }, // User Execution

  // Persistence
  { prefix: "T1547", stage: "Persistence" }, // Boot or Logon Autostart Execution
  { prefix: "T1053", stage: "Persistence" }, // Scheduled Task/Job

  // Priv Esc
  { prefix: "T1068", stage: "Privilege Escalation" }, // Exploitation for Priv Esc
  { prefix: "T1548", stage: "Privilege Escalation" }, // Abuse Elevation Control Mechanism

  // Defense Evasion
  { prefix: "T1562", stage: "Defense Evasion" }, // Impair Defenses
  { prefix: "T1070", stage: "Defense Evasion" }, // Indicator Removal

  // Credential Access
  { prefix: "T1110", stage: "Credential Access" }, // Brute Force
  { prefix: "T1003", stage: "Credential Access" }, // OS Credential Dumping
  { prefix: "T1555", stage: "Credential Access" }, // Credentials from Password Stores

  // Discovery
  { prefix: "T1087", stage: "Discovery" }, // Account Discovery
  { prefix: "T1018", stage: "Discovery" }, // Remote System Discovery
  { prefix: "T1046", stage: "Discovery" }, // Network Service Discovery

  // Lateral Movement
  { prefix: "T1021", stage: "Lateral Movement" }, // Remote Services
  { prefix: "T1563", stage: "Lateral Movement" }, // Remote Service Session Hijacking

  // Collection
  { prefix: "T1005", stage: "Collection" }, // Data from Local System

  // C2
  { prefix: "T1071", stage: "Command & Control" }, // Application Layer Protocol
  { prefix: "T1095", stage: "Command & Control" }, // Non-Application Layer Protocol

  // Exfil
  { prefix: "T1041", stage: "Exfiltration" }, // Exfil over C2 Channel

  // Impact
  { prefix: "T1486", stage: "Impact" }, // Data Encrypted for Impact
];

const STAGE_ORDER: KillChainStage[] = [
  "Reconnaissance",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command & Control",
  "Exfiltration",
  "Impact",
];

function safe(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function clamp(n: number, min = 0, max = 100) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function sortStages(stages: KillChainStage[]) {
  const set = new Set(stages);
  return STAGE_ORDER.filter((s) => set.has(s));
}

function techniqueIdFromFinding(f: MitreFinding): string {
  // supports either technique.id or technique.technique_id patterns
  const t: any = f?.technique;
  return safe(t?.id || t?.technique_id || t?.techniqueId || t?.name).trim();
}

function stageFromTechnique(techId: string): KillChainStage | null {
  const id = safe(techId).trim();
  if (!id) return null;

  // Exact prefix match (T1110, T1110.001, etc.)
  for (const rule of TECHNIQUE_TO_STAGE_PREFIX) {
    if (id.startsWith(rule.prefix)) return rule.stage;
  }
  return null;
}

/**
 * Heuristic stage extraction from case text if MITRE is missing.
 * (Keeps system useful even when inference is sparse.)
 */
function stagesFromCaseText(caseItem: SocCase): KillChainStage[] {
  const hay = JSON.stringify(caseItem).toLowerCase();
  const out: KillChainStage[] = [];

  if (hay.includes("phish") || hay.includes("email link") || hay.includes("attachment")) out.push("Initial Access");
  if (hay.includes("powershell") || hay.includes("cmd.exe") || hay.includes("wscript") || hay.includes("script")) out.push("Execution");
  if (hay.includes("scheduled task") || hay.includes("autostart") || hay.includes("run key")) out.push("Persistence");
  if (hay.includes("admin") || hay.includes("elevat") || hay.includes("uac")) out.push("Privilege Escalation");
  if (hay.includes("disable defender") || hay.includes("tamper") || hay.includes("clear logs")) out.push("Defense Evasion");
  if (hay.includes("brute") || hay.includes("password spray") || hay.includes("credential dump") || hay.includes("lsass")) out.push("Credential Access");
  if (hay.includes("discovery") || hay.includes("enumerat") || hay.includes("net user") || hay.includes("nltest")) out.push("Discovery");
  if (hay.includes("rdp") || hay.includes("psexec") || hay.includes("remote service") || hay.includes("lateral")) out.push("Lateral Movement");
  if (hay.includes("c2") || hay.includes("beacon") || hay.includes("callback")) out.push("Command & Control");
  if (hay.includes("exfil") || hay.includes("upload") || hay.includes("stolen data")) out.push("Exfiltration");
  if (hay.includes("encrypt") || hay.includes("ransom")) out.push("Impact");

  return uniq(out);
}

/**
 * Build a kill-chain summary for a *set* of cases (campaign cluster or global view).
 *
 * Optional inputs:
 * - mitreFindings: inferred techniques for cases
 * - lateralFindings: device-to-device movement signals
 */
export function summarizeKillChain(params: {
  cases: SocCase[];
  mitreFindings?: MitreFinding[];
  lateralFindings?: LateralFinding[];
  // Optional: only consider these devices (useful when summarizing a campaign)
  restrictDevices?: string[];
}): KillChainSummary {
  const { cases, mitreFindings = [], lateralFindings = [], restrictDevices } = params;

  const restrict = Array.isArray(restrictDevices) && restrictDevices.length
    ? new Set(restrictDevices.map((d) => safe(d).trim()).filter(Boolean))
    : null;

  const scopedCases = restrict
    ? cases.filter((c: any) => restrict.has(safe(c.device).trim()))
    : cases;

  // 1) Stages from MITRE techniques
  const mitreTechs: string[] = [];
  const stagesFromMitre: KillChainStage[] = [];
  for (const f of mitreFindings) {
    const tech = techniqueIdFromFinding(f);
    if (!tech) continue;
    mitreTechs.push(tech);
    const stage = stageFromTechnique(tech);
    if (stage) stagesFromMitre.push(stage);
  }

  // 2) Stages from case text as fallback
  const stagesFromText: KillChainStage[] = [];
  for (const c of scopedCases) {
    stagesFromText.push(...stagesFromCaseText(c));
  }

  // 3) Lateral movement signals
  const lateralMoves = lateralFindings
    .map((l) => ({
      from: safe(l.from).trim(),
      to: safe(l.to).trim(),
      user: safe(l.user).trim(),
    }))
    .filter((x) => x.from && x.to);

  const stages: KillChainStage[] = sortStages(
    uniq([
      ...stagesFromMitre,
      ...stagesFromText,
      ...(lateralMoves.length ? (["Lateral Movement"] as KillChainStage[]) : []),
    ])
  );

  const current_stage = stages.length ? stages[stages.length - 1] : null;

  // Predict next likely steps based on where we are
  const next_likely: KillChainStage[] = (() => {
    if (!current_stage) return [];
    const idx = STAGE_ORDER.indexOf(current_stage);
    if (idx < 0) return [];

    const guesses: KillChainStage[] = [];

    // If we see credential access, likely lateral/discovery next
    if (stages.includes("Credential Access")) {
      if (!stages.includes("Discovery")) guesses.push("Discovery");
      if (!stages.includes("Lateral Movement")) guesses.push("Lateral Movement");
    }

    // If we already have lateral movement, C2/collection/exfil become likely
    if (stages.includes("Lateral Movement")) {
      if (!stages.includes("Collection")) guesses.push("Collection");
      if (!stages.includes("Command & Control")) guesses.push("Command & Control");
      if (!stages.includes("Exfiltration")) guesses.push("Exfiltration");
    }

    // Otherwise, just suggest the next stage in order
    const nextInOrder = STAGE_ORDER.slice(idx + 1, idx + 3);
    guesses.push(...nextInOrder);

    return uniq(guesses).filter(Boolean).slice(0, 4);
  })();

  // Confidence: combines presence of MITRE + stage coverage + lateral signals + case count
  const signals: string[] = [];
  let conf = 0;

  if (scopedCases.length) {
    conf += Math.min(20, scopedCases.length * 4);
    signals.push(`Observed ${scopedCases.length} case(s) contributing to this chain.`);
  }

  const uniqMitre = uniq(mitreTechs);
  if (uniqMitre.length) {
    conf += Math.min(40, uniqMitre.length * 10);
    signals.push(`MITRE inference matched ${uniqMitre.length} technique(s): ${uniqMitre.slice(0, 6).join(", ")}${uniqMitre.length > 6 ? "…" : ""}`);
  } else {
    signals.push("No MITRE techniques matched; using text-based heuristics only.");
  }

  if (stages.length) {
    conf += Math.min(25, stages.length * 5);
    signals.push(`Kill chain stages present: ${stages.join(" → ")}`);
  }

  if (lateralMoves.length) {
    conf += 20;
    signals.push(`Lateral movement signal detected (${lateralMoves.length} hop(s)).`);
  }

  // If everything is only “Initial Access” or only one stage, reduce confidence a bit
  if (stages.length <= 1) conf -= 10;

  conf = clamp(conf);

  return {
    stages,
    current_stage,
    next_likely,
    confidence: conf,
    evidence: {
      mitre_techniques: uniq(mitreTechs).slice(0, 25),
      lateral_moves: lateralMoves.slice(0, 25),
      signals,
    },
  };
}
