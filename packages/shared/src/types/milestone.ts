// ============================================================
// Milestone — Milestone di progetto
// ============================================================

/** Stato calcolato automaticamente */
export type MilestoneStatus = 'on_track' | 'at_risk' | 'delayed'

export interface Milestone {
  id: string
  name: string
  description: string | null
  /** Data target in formato ISO YYYY-MM-DD */
  targetDate: string
  /** Stato calcolato in base ai ticket associati */
  status: MilestoneStatus
  createdAt: string
  updatedAt: string
}

