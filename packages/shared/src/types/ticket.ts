// ============================================================
// Ticket — Ticket Jira importato con stime
// ============================================================

import type { PlanningRole } from './user.js'

/** Priorità Jira standard */
export type JiraPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'

/** Stato del ticket nel ciclo di vita dell'app */
export type TicketStatus =
  | 'backlog'       // importato, non ancora pianificato
  | 'planned'       // schedulato (ha date start/end)
  | 'in_progress'   // in lavorazione
  | 'done'          // completato

/** Fase di lavorazione del ticket */
export type TicketPhase = 'dev' | 'qa'

export interface Ticket {
  id: string
  /** Key Jira (es. PROJ-123) */
  jiraKey: string
  summary: string
  description: string | null
  /**
   * Stima originale in MINUTI (usiamo minuti internamente per evitare
   * problemi di precisione con i decimali).
   * null = ticket senza stima (genera warning).
   */
  estimateMinutes: number | null
  /** Priorità importata da Jira */
  jiraPriority: JiraPriority
  /** Override priorità dal PM (se presente, ha precedenza) */
  priorityOverride: number | null
  status: TicketStatus
  /** Fase corrente del ticket */
  phase: TicketPhase
  /** Assignee Jira originale */
  jiraAssigneeEmail: string | null
  /** Nome visualizzato dell'assignee Jira */
  jiraAssigneeName: string | null
  /** Stato originale su Jira (es. "To Do", "In Progress", "Done") */
  jiraStatus: string | null
  /** Epic o parent key da Jira */
  parentKey: string | null
  /** Fix versions da Jira */
  fixVersions: string[]
  /** ID milestone associata */
  milestoneId: string | null
  /** ID release associata */
  releaseId: string | null
  /** Flag: il PM ha modificato manualmente le date — non ricalcolare */
  locked: boolean
  /** Segnala se il ticket ha anomalie (es. senza stima) */
  warnings: TicketWarning[]
  /** Timestamp ultimo sync da Jira */
  lastSyncedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TicketWarning =
  | 'missing_estimate'
  | 'missing_assignee'
  | 'estimate_zero'

