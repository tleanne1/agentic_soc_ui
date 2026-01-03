// src/lib/mitreMap.ts
// -------------------------------------------------------------
// Simple MITRE ATT&CK mapping (local, lightweight)
//
// We map tags/keywords -> ATT&CK techniques.
// You can expand this over time.
// -------------------------------------------------------------

export type MitreTechnique = {
    id: string;          // Txxxx
    name: string;
    tactic: string;      // e.g., Initial Access
    match: string;       // what matched (tag/keyword)
  };
  
  type Rule = {
    whenIncludesAny: string[]; // keywords/tags
    technique: Omit<MitreTechnique, "match">;
  };
  
  const RULES: Rule[] = [
    {
      whenIncludesAny: ["bruteforce", "brute-force", "password spray", "spray", "credential stuffing"],
      technique: { id: "T1110", name: "Brute Force", tactic: "Credential Access" },
    },
    {
      whenIncludesAny: ["valid accounts", "signin", "login", "interactive logon", "successful logon"],
      technique: { id: "T1078", name: "Valid Accounts", tactic: "Defense Evasion" },
    },
    {
      whenIncludesAny: ["ssh", "sshd", "remote login", "remote"],
      technique: { id: "T1021", name: "Remote Services", tactic: "Lateral Movement" },
    },
    {
      whenIncludesAny: ["powershell", "pwsh"],
      technique: { id: "T1059.001", name: "PowerShell", tactic: "Execution" },
    },
    {
      whenIncludesAny: ["scheduled task", "schtasks", "cron"],
      technique: { id: "T1053", name: "Scheduled Task/Job", tactic: "Execution" },
    },
    {
      whenIncludesAny: ["persistence", "autorun", "startup"],
      technique: { id: "T1547", name: "Boot or Logon Autostart Execution", tactic: "Persistence" },
    },
    {
      whenIncludesAny: ["exfil", "exfiltration", "upload large", "data theft"],
      technique: { id: "T1041", name: "Exfiltration Over C2 Channel", tactic: "Exfiltration" },
    },
    {
      whenIncludesAny: ["command and control", "c2", "beacon"],
      technique: { id: "T1071", name: "Application Layer Protocol", tactic: "Command and Control" },
    },
    {
      whenIncludesAny: ["discovery", "whoami", "ipconfig", "ifconfig", "net user", "hostname"],
      technique: { id: "T1082", name: "System Information Discovery", tactic: "Discovery" },
    },
  ];
  
  function norm(s: string) {
    return (s || "").toLowerCase().trim();
  }
  
  export function inferMitreFromTags(tags: string[]): MitreTechnique[] {
    const hay = tags.map(norm).join(" | ");
  
    const out: MitreTechnique[] = [];
    for (const r of RULES) {
      const hit = r.whenIncludesAny.find((k) => hay.includes(norm(k)));
      if (hit) {
        out.push({ ...r.technique, match: hit });
      }
    }
  
    // de-dupe by technique id
    const seen = new Set<string>();
    return out.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }
  