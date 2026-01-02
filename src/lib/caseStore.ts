export type SocCase = {
  case_id: string
  created_at: string
  status: "open" | "investigating" | "contained" | "closed"
  title: string
  device: string
  user: string
  time: string
  baseline_note?: string
  findings?: any[]
  evidence: any[]
  analyst_notes: string[]
}

const KEY = "soc:cases"

export function getCases(): SocCase[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]")
  } catch {
    return []
  }
}

export function saveCase(c: SocCase) {
  const cases = getCases()
  cases.unshift(c)
  localStorage.setItem(KEY, JSON.stringify(cases))
}

/**
 * ✅ NEW — update an existing case by case_id
 * (used by the Cases page)
 */
export function updateCase(updated: SocCase) {
  const cases = getCases().map((c) =>
    c.case_id === updated.case_id ? updated : c
  )
  localStorage.setItem(KEY, JSON.stringify(cases))
}
