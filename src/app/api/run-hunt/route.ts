import { NextResponse } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8787";

// ✅ Optional: set DEMO_MODE=true in .env.local (no NEXT_PUBLIC needed)
// This affects only the server route (not client code).
const DEMO_MODE = String(process.env.DEMO_MODE ?? "").toLowerCase() === "true";

function demoRowsForPrompt(prompt: string) {
  const p = (prompt || "").toLowerCase();

  // Heartbeat-ish demo
  if (p.includes("heartbeat") || p.includes("alive") || p.includes("agent")) {
    return [
      {
        Computer: "windows-target-1",
        Category: "Direct Agent",
        OSType: "Windows",
        TimeGenerated: new Date().toISOString(),
      },
      {
        Computer: "linux-target-1",
        Category: "Direct Agent",
        OSType: "Linux",
        TimeGenerated: new Date().toISOString(),
      },
    ];
  }

  // Logon-ish demo
  if (p.includes("logon") || p.includes("login") || p.includes("signin") || p.includes("sign-in")) {
    const now = new Date();
    const t1 = new Date(now.getTime() - 1000 * 60 * 12).toISOString();
    const t2 = new Date(now.getTime() - 1000 * 60 * 42).toISOString();
    const t3 = new Date(now.getTime() - 1000 * 60 * 90).toISOString();

    return [
      {
        DeviceName: "windows-target-1",
        AccountName: "jsmith",
        UserPrincipalName: "jsmith@contoso.local",
        ActionType: "LogonSuccess",
        RemoteIP: "198.51.100.23",
        LogonType: "RemoteInteractive",
        TimeGenerated: t1,
      },
      {
        DeviceName: "windows-target-1",
        AccountName: "jsmith",
        UserPrincipalName: "jsmith@contoso.local",
        ActionType: "LogonFailed",
        RemoteIP: "203.0.113.10",
        LogonType: "Network",
        TimeGenerated: t2,
      },
      {
        DeviceName: "linux-target-1",
        AccountName: "root",
        UserPrincipalName: "",
        ActionType: "LogonFailed",
        RemoteIP: "203.0.113.10",
        LogonType: "SSH",
        TimeGenerated: t3,
      },
    ];
  }

  // Generic “something happened” demo
  return [
    {
      DeviceName: "windows-target-1",
      ActionType: "ProcessCreated",
      ProcessCommandLine: "powershell.exe -nop -w hidden -enc ...",
      AccountName: "jsmith",
      TimeGenerated: new Date().toISOString(),
    },
    {
      DeviceName: "windows-target-2",
      ActionType: "NetworkConnection",
      RemoteUrl: "hxxp://example-malicious[.]com",
      RemoteIP: "203.0.113.55",
      AccountName: "svc-backup",
      TimeGenerated: new Date().toISOString(),
    },
  ];
}

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const hours = Number(body?.hours ?? 24);

  // Your UI currently sends: { kql, hours }
  // Smart endpoint expects: { prompt, hours }
  const smartPayload = {
    prompt: body?.prompt ?? body?.kql ?? "",
    hours,
  };

  // ✅ If demo mode is enabled, never call the engine
  if (DEMO_MODE) {
    const rows = demoRowsForPrompt(String(smartPayload.prompt ?? ""));
    return NextResponse.json(
      {
        ok: true,
        rows,
        count: rows.length,
        input_type: "demo",
        kql_used: "demo",
        hours,
      },
      { status: 200 }
    );
  }

  const smartUrl = `${ENGINE_URL}/api/hunt/smart`;
  const primaryUrl = `${ENGINE_URL}/api/hunt`;
  const fallbackUrl = `${ENGINE_URL}/hunt`;

  try {
    // 1) Try smart endpoint first
    let upstream = await fetch(smartUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(smartPayload),
      cache: "no-store",
    });

    // If smart doesn't exist (older engine), fall back to raw KQL
    if (upstream.status === 404) {
      upstream = await fetch(primaryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (upstream.status === 404) {
        upstream = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        });
      }
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        detail: `Unable to reach SOC engine at ${ENGINE_URL}. Is the engine server running?`,
        error: String(e?.message ?? e),
      },
      { status: 500 }
    );
  }
}
