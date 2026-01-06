export type HuntTemplate = {
    name: string;
    /** Human-friendly description shown under the selector */
    prompt: string;
    /** Build KQL from UI inputs */
    buildKql: (args: { hours: number; device?: string }) => string;
  };
  
  function deviceWhere(device?: string) {
    const d = (device || "").trim();
    if (!d) return "";
    // Defensive quoting for KQL: escape single quotes
    const safe = d.replace(/'/g, "''");
    return `| where DeviceName == "${safe}" or DeviceName == '${safe}'`;
  }
  
  export const HUNT_TEMPLATES: HuntTemplate[] = [
    {
      name: "Multiple logons (last 24h)",
      prompt: "Identify accounts with many logons per device (possible credential abuse).",
      buildKql: ({ hours, device }) => `
  DeviceLogonEvents
  | where TimeGenerated >= ago(${hours}h)
  ${deviceWhere(device)}
  | summarize Logons=count() by DeviceName, AccountName, LogonType
  | order by Logons desc
  | take 2000
  `.trim(),
    },
    {
      name: "New local admin accounts (last 24h)",
      prompt: "Detect new local admin account creation events.",
      buildKql: ({ hours, device }) => `
  DeviceEvents
  | where TimeGenerated >= ago(${hours}h)
  ${deviceWhere(device)}
  | where ActionType has_any ("UserAccountCreated","UserAddedToLocalGroup","LocalUserCreated")
  | project TimeGenerated, DeviceName, ActionType, AccountName, InitiatingProcessAccountName, AdditionalFields
  | order by TimeGenerated desc
  | take 2000
  `.trim(),
    },
  ];
  