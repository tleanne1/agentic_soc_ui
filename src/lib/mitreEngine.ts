// src/lib/mitreEngine.ts
"use client";

import { MITRE_LIBRARY, MitreTechnique } from "@/lib/mitreModel";
import { SocCase } from "@/lib/caseStore";

export type MitreFinding = {
  case_id: string;
  technique: MitreTechnique;
};

/**
 * Very lightweight inference:
 * - stringify the case
 * - if any indicators match, emit the technique
 */
export function inferMitre(caseItem: SocCase): MitreFinding[] {
  const hay = JSON.stringify(caseItem).toLowerCase();

  return MITRE_LIBRARY
    .filter((t) => t.indicators.some((i) => hay.includes(i)))
    .map((t) => ({ case_id: caseItem.case_id, technique: t }));
}
