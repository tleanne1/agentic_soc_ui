// src/lib/intelLinks.ts
// -------------------------------------------------------------
// Build deep-links into the Global Intel Center.
// -------------------------------------------------------------

import type { SocEntityType } from "@/lib/socMemory";

export function intelEntityLink(type: SocEntityType, id: string) {
  const t = encodeURIComponent(type);
  const i = encodeURIComponent(id);
  return `/intel?entityType=${t}&entityId=${i}`;
}

export function intelCampaignLink(campaignId: string) {
  return `/intel?campaign=${encodeURIComponent(campaignId)}`;
}

export function intelEdgeLink(edgeKey: string) {
  return `/intel?edge=${encodeURIComponent(edgeKey)}`;
}

export function caseLink(caseId: string) {
  return `/cases/${encodeURIComponent(caseId)}`;
}
