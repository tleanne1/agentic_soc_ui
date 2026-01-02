export async function POST(req: Request) {
  const body = await req.json();
  const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:8000";

  const r = await fetch(`${ENGINE_URL}/run-hunt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await r.json().catch(() => null);

  return new Response(JSON.stringify(data), {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
}
