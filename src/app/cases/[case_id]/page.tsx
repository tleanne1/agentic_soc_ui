"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";

import { getCases, updateCase, deleteCase, SocCase } from "@/lib/caseStore";
import { recordObservation, getMemory, SocEntityMemory } from "@/lib/socMemory";

function riskBumpForStatus(status: SocCase["status"]) {
  switch (status) {
    case "investigating":
      return 5;
    case "contained":
      return 15;
    case "closed":
      return 0;
    default:
      return 3;
  }
}

function normalizeId(s: any) {
  return String(s || "").trim();
}

function getEntitySnapshot(type: "device" | "user" | "ip", id: string): SocEntityMemory | null {
  const all = getMemory();
  const found = all.find((e) => e.type === type && e.id === id);
  return found || null;
}

function fmtIso(iso?: string) {
  if (!iso) return "-";
  return iso;
}

function badgeForRisk(score: number) {
  if (score >= 70) return "border-red-700 bg-red-500/10 text-red-200";
  if (score >= 40) return "border-amber-700 bg-amber-500/10 text-amber-200";
  if (score >= 15) return "border-sky-700 bg-sky-500/10 text-sky-200";
  return "border-slate-700 bg-slate-200/10 text-slate-200";
}

export default function CaseDetailsPage() {
  const params = useParams<{ case_id: string }>();
  const router = useRouter();

  const caseId = params?.case_id;

  const [socCase, setSocCase] = useState<SocCase | null>(null);
  const [note, setNote] = useState("");

  // entity intel snapshots (from Memory Vault)
  const [deviceIntel, setDeviceIntel] = useState<SocEntityMemory | null>(null);
  const [userIntel, setUserIntel] = useState<SocEntityMemory | null>(null);
  const [ipIntel, setIpIntel] = useState<SocEntityMemory | null>(null);

  useEffect(() => {
    if (!caseId) return;
    const all = getCases();
    const found = all.find((c) => c.case_id === caseId) || null;
    setSocCase(found);
  }, [caseId]);

  // load intel snapshots anytime the case changes (or after status updates)
  useEffect(() => {
    if (!socCase) return;

    const deviceId = normalizeId(socCase.device);
    const userId = normalizeId(socCase.user);

    const ipFromCase =
      // If you later add socCase.ip, this will just work
      normalizeId((socCase as any).ip) ||
      // Otherwise try to scrape from evidence[0] (often the selected row)
      normalizeId((socCase.evidence?.[0] as any)?.RemoteIP) ||
      normalizeId((socCase.evidence?.[0] as any)?.IPAddress) ||
      normalizeId((socCase.evidence?.[0] as any)?.IpAddress) ||
      normalizeId((socCase.evidence?.[0] as any)?.RemoteAddress) ||
      normalizeId((socCase.evidence?.[0] as any)?.SourceIP) ||
      "";

    setDeviceIntel(deviceId ? getEntitySnapshot("device", deviceId) : null);
    setUserIntel(userId ? getEntitySnapshot("user", userId) : null);
    setIpIntel(ipFromCase ? getEntitySnapshot("ip", ipFromCase) : null);
  }, [socCase]);

  const status = socCase?.status;

  const evidenceList = useMemo(() => socCase?.evidence || [], [socCase]);

  const onSetStatus = (nextStatus: SocCase["status"]) => {
    if (!socCase) return;

    updateCase(socCase.case_id, { status: nextStatus });

    // record into entity memory
    recordObservation({
      caseId: socCase.case_id,
      device: socCase.device,
      user: socCase.user,
      // If you later store IP in case, pass it here too.
      tags: ["case", `status:${nextStatus}`, "source:case-details"],
      riskBump: riskBumpForStatus(nextStatus),
    });

    // refresh local state
    const next = { ...socCase, status: nextStatus };
    setSocCase(next);

    // refresh intel snapshots (localStorage-backed)
    // (useEffect will also run because socCase changes)
  };

  const onAddNote = () => {
    if (!socCase) return;
    const trimmed = note.trim();
    if (!trimmed) return;

    const stamped = `${new Date().toISOString()} — ${trimmed}`;
    const nextNotes = [...(socCase.analyst_notes || []), stamped];

    updateCase(socCase.case_id, { analyst_notes: nextNotes });
    setSocCase({ ...socCase, analyst_notes: nextNotes });
    setNote("");
  };

  const onDelete = () => {
    if (!socCase) return;
    deleteCase(socCase.case_id);
    router.push("/cases");
  };

  if (!socCase) {
    return (
      <div className="min-h-screen bg-[#050A14] text-slate-100">
        <Topbar title="Case Details" />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <h1 className="text-2xl font-semibold">Case Details</h1>
            <div className="mt-4 rounded border border-slate-800 bg-[#060C18] p-4 text-slate-300">
              Case not found.
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050A14] text-slate-100">
      <Topbar title="Case Details" />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">
                {socCase.case_id} — {socCase.title}
              </h1>
              <div className="mt-2 text-sm text-slate-300">
                <span className="text-slate-400">Device:</span> {socCase.device}{" "}
                <span className="text-slate-400 ml-4">User:</span> {socCase.user}{" "}
                <span className="text-slate-400 ml-4">Time:</span> {socCase.time}{" "}
                <span className="text-slate-400 ml-4">Created:</span> {socCase.created_at}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="rounded border border-slate-700 bg-[#060C18] px-3 py-2 text-sm"
                onClick={() => router.push("/cases")}
              >
                Back to Cases
              </button>
              <button
                className="rounded border border-red-700 bg-[#12070A] px-3 py-2 text-sm text-red-200"
                onClick={onDelete}
              >
                Delete
              </button>
            </div>
          </div>

          {/* TOP GRID: Status + Intel */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* STATUS */}
            <div className="rounded border border-slate-800 bg-[#060C18] p-4 lg:col-span-2">
              <div className="text-sm font-semibold mb-2">Update status</div>
              <div className="flex flex-wrap gap-2">
                {(["open", "investigating", "contained", "closed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onSetStatus(s)}
                    className={[
                      "rounded px-3 py-2 text-sm border",
                      status === s
                        ? "border-slate-200 bg-slate-200 text-slate-900 font-semibold"
                        : "border-slate-700 bg-[#050A14] text-slate-200",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                Status changes also update Memory Vault risk/tags for this case’s entities.
              </div>
            </div>

            {/* ENTITY INTEL */}
            <div className="rounded border border-slate-800 bg-[#060C18] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Entity intel</div>
                <button
                  onClick={() => {
                    const deviceId = normalizeId(socCase.device);
                    const userId = normalizeId(socCase.user);

                    const ipFromCase =
                      normalizeId((socCase as any).ip) ||
                      normalizeId((socCase.evidence?.[0] as any)?.RemoteIP) ||
                      normalizeId((socCase.evidence?.[0] as any)?.IPAddress) ||
                      normalizeId((socCase.evidence?.[0] as any)?.IpAddress) ||
                      normalizeId((socCase.evidence?.[0] as any)?.RemoteAddress) ||
                      normalizeId((socCase.evidence?.[0] as any)?.SourceIP) ||
                      "";

                    setDeviceIntel(deviceId ? getEntitySnapshot("device", deviceId) : null);
                    setUserIntel(userId ? getEntitySnapshot("user", userId) : null);
                    setIpIntel(ipFromCase ? getEntitySnapshot("ip", ipFromCase) : null);
                  }}
                  className="rounded border border-slate-700 bg-[#050A14] px-2 py-1 text-xs text-slate-200 hover:bg-slate-900/40"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-3 space-y-3 text-sm">
                {/* Device */}
                <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                  <div className="text-xs text-slate-400">Device</div>
                  <div className="mt-1 font-mono break-all">{socCase.device || "-"}</div>
                  {deviceIntel ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]",
                            badgeForRisk(deviceIntel.risk_score),
                          ].join(" ")}
                        >
                          Risk {deviceIntel.risk_score}
                        </span>
                        <span className="text-xs text-slate-500">
                          seen {fmtIso(deviceIntel.first_seen)} → {fmtIso(deviceIntel.last_seen)}
                        </span>
                      </div>

                      {(deviceIntel.tags || []).length ? (
                        <div className="flex flex-wrap gap-1">
                          {deviceIntel.tags.slice(0, 10).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-md border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">(no tags)</div>
                      )}

                      <div className="text-xs text-slate-500">
                        Case refs: {(deviceIntel.case_refs || []).length}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">
                      No memory record yet (will appear after Save as Case / status updates).
                    </div>
                  )}
                </div>

                {/* User */}
                <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                  <div className="text-xs text-slate-400">User</div>
                  <div className="mt-1 font-mono break-all">{socCase.user || "-"}</div>
                  {userIntel ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]",
                            badgeForRisk(userIntel.risk_score),
                          ].join(" ")}
                        >
                          Risk {userIntel.risk_score}
                        </span>
                        <span className="text-xs text-slate-500">
                          seen {fmtIso(userIntel.first_seen)} → {fmtIso(userIntel.last_seen)}
                        </span>
                      </div>

                      {(userIntel.tags || []).length ? (
                        <div className="flex flex-wrap gap-1">
                          {userIntel.tags.slice(0, 10).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-md border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">(no tags)</div>
                      )}

                      <div className="text-xs text-slate-500">
                        Case refs: {(userIntel.case_refs || []).length}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">
                      No memory record yet (will appear after Save as Case / status updates).
                    </div>
                  )}
                </div>

                {/* IP (optional) */}
                <div className="rounded border border-slate-800 bg-[#050A14] p-3">
                  <div className="text-xs text-slate-400">IP (if available)</div>
                  <div className="mt-1 font-mono break-all">
                    {normalizeId((socCase as any).ip) ||
                      normalizeId((socCase.evidence?.[0] as any)?.RemoteIP) ||
                      normalizeId((socCase.evidence?.[0] as any)?.IPAddress) ||
                      normalizeId((socCase.evidence?.[0] as any)?.IpAddress) ||
                      normalizeId((socCase.evidence?.[0] as any)?.RemoteAddress) ||
                      normalizeId((socCase.evidence?.[0] as any)?.SourceIP) ||
                      "-"}
                  </div>

                  {ipIntel ? (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px]",
                            badgeForRisk(ipIntel.risk_score),
                          ].join(" ")}
                        >
                          Risk {ipIntel.risk_score}
                        </span>
                        <span className="text-xs text-slate-500">
                          seen {fmtIso(ipIntel.first_seen)} → {fmtIso(ipIntel.last_seen)}
                        </span>
                      </div>

                      {(ipIntel.tags || []).length ? (
                        <div className="flex flex-wrap gap-1">
                          {ipIntel.tags.slice(0, 10).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-md border border-slate-700 bg-slate-200/10 px-2 py-0.5 text-[11px] text-slate-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">(no tags)</div>
                      )}

                      <div className="text-xs text-slate-500">
                        Case refs: {(ipIntel.case_refs || []).length}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-500">
                      No IP memory record yet (save a case that includes an IP).
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* EVIDENCE */}
          <div className="mt-4 rounded border border-slate-800 bg-[#060C18] p-4">
            <div className="text-sm font-semibold mb-2">Evidence ({evidenceList.length})</div>
            {evidenceList.length ? (
              <div className="space-y-3">
                {evidenceList.map((item, idx) => (
                  <pre
                    key={idx}
                    className="whitespace-pre-wrap rounded border border-slate-800 bg-[#050A14] p-3 text-xs text-slate-200"
                  >
                    {JSON.stringify(item, null, 2)}
                  </pre>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">(none)</div>
            )}
          </div>

          {/* FINDINGS */}
          <div className="mt-4 rounded border border-slate-800 bg-[#060C18] p-4">
            <div className="text-sm font-semibold mb-2">Findings</div>
            {Array.isArray(socCase.findings) && socCase.findings.length ? (
              <ul className="list-disc pl-5 text-sm text-slate-200">
                {socCase.findings.map((f: any, i: number) => (
                  <li key={i}>{typeof f === "string" ? f : JSON.stringify(f)}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400">(none)</div>
            )}
          </div>

          {/* BASELINE */}
          <div className="mt-4 rounded border border-slate-800 bg-[#060C18] p-4">
            <div className="text-sm font-semibold mb-2">Baseline note</div>
            <pre className="whitespace-pre-wrap text-xs text-slate-200">
              {socCase.baseline_note || "(none)"}
            </pre>
          </div>

          {/* NOTES */}
          <div className="mt-4 rounded border border-slate-800 bg-[#060C18] p-4">
            <div className="text-sm font-semibold mb-2">Analyst notes</div>

            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 rounded border border-slate-700 bg-[#050A14] px-3 py-2 text-sm text-slate-100 outline-none"
                placeholder="Add a note…"
              />
              <button
                onClick={onAddNote}
                className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                Add
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {(socCase.analyst_notes || []).length ? (
                (socCase.analyst_notes || []).map((n, i) => (
                  <div
                    key={i}
                    className="rounded border border-slate-800 bg-[#050A14] p-2 text-xs text-slate-200"
                  >
                    {n}
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">(none)</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
