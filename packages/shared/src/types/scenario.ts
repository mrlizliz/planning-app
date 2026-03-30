// ============================================================
// Scenario — Snapshot dello stato per what-if analysis
// ============================================================

export interface Scenario {
  id: string
  name: string
  description: string | null
  /** true = scenario corrente (può essercene solo uno) */
  isCurrent: boolean
  /** Snapshot dei dati al momento della creazione */
  snapshot: ScenarioSnapshot
  createdAt: string
  updatedAt: string
}

/** Snapshot dei dati pianificabili */
export interface ScenarioSnapshot {
  /** Copie degli assignment (con date eventualmente modificate) */
  assignments: ScenarioAssignment[]
  /** IDs dei ticket inclusi */
  ticketIds: string[]
}

/** Assignment nello scenario (copia leggera) */
export interface ScenarioAssignment {
  assignmentId: string
  ticketId: string
  userId: string
  role: 'dev' | 'qa'
  allocationPercent: number
  startDate: string | null
  endDate: string | null
  durationDays: number | null
  locked: boolean
}

