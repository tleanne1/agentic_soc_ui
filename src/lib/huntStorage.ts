export type HuntParams = {
    name: string;
    timeframeHours: number;
    device?: string;
  };
  
  export type HuntRow = {
    id: string;
    time: string;
    device: string;
    user: string;
    logonType: string;
    severity: "Low" | "Medium" | "High" | "Critical";
    summary: string;
  };
  
  const KEY = "soc:lastHunt";
  
  export function saveHunt(payload: { params: HuntParams; rows: HuntRow[] }) {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(payload));
  }
  
  export function loadHunt():
    | { params: HuntParams; rows: HuntRow[] }
    | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  
  export function mockRows(params: HuntParams): HuntRow[] {
    const now = new Date();
    const devices = params.device ? [params.device] : ["windows-target-1", "windows-target-2", "linux-target-1"];
    const users = ["alice@contoso.com", "bob@contoso.com", "svc-backup@contoso.com", "admin@contoso.com"];
    const logons = ["Interactive", "RemoteInteractive", "Network", "CachedInteractive"] as const;
    const severities: HuntRow["severity"][] = ["Low", "Medium", "High", "Critical"];
  
    const rows: HuntRow[] = Array.from({ length: 18 }).map((_, i) => {
      const t = new Date(now.getTime() - (i + 1) * 1000 * 60 * 11);
      const device = devices[i % devices.length];
      const user = users[i % users.length];
      const logonType = logons[i % logons.length];
      const severity = severities[(i * 7) % severities.length];
  
      return {
        id: `${device}-${t.getTime()}`,
        time: t.toISOString(),
        device,
        user,
        logonType,
        severity,
        summary:
          severity === "Critical"
            ? "Multiple privileged logons within a short window"
            : severity === "High"
            ? "Unusual logon type observed for user"
            : "Baseline activity observed",
      };
    });
  
    return rows;
  }
  