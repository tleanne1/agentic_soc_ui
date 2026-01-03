// src/lib/mitreModel.ts

export type MitreTactic =
  | "Initial Access"
  | "Persistence"
  | "Privilege Escalation"
  | "Defense Evasion"
  | "Credential Access"
  | "Lateral Movement"
  | "Command and Control"
  | "Exfiltration";

export type MitreTechnique = {
  id: string;
  name: string;
  tactic: MitreTactic;
  indicators: string[];
  risk: number;
};

export const MITRE_LIBRARY: MitreTechnique[] = [
  { id: "T1078", name: "Valid Accounts", tactic: "Credential Access", indicators: ["ssh", "login", "password"], risk: 20 },
  { id: "T1021", name: "Remote Services", tactic: "Lateral Movement", indicators: ["rdp", "ssh", "remote"], risk: 25 },
  { id: "T1110", name: "Brute Force", tactic: "Credential Access", indicators: ["brute", "failed login"], risk: 30 },
  { id: "T1105", name: "Ingress Tool Transfer", tactic: "Command and Control", indicators: ["curl", "wget", "download"], risk: 25 },
  { id: "T1041", name: "Exfiltration Over C2", tactic: "Exfiltration", indicators: ["exfil", "upload", "scp"], risk: 35 }
];
