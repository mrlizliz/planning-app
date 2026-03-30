// ============================================================
// Assignment — Assegnazione di un ticket a una persona
// ============================================================

import type { PlanningRole } from './user.js'

export interface Assignment {
  id: string
  ticketId: string
  userId: string
  /** Ruolo per cui è assegnato (dev o qa) */
  role: PlanningRole
  /**
   * Percentuale di allocazione: 100 = full-time, 50 = metà giornata, ecc.
   * Valore intero 1-100.
   */
  allocationPercent: number
  /** Data inizio calcolata (o override manuale) — formato ISO YYYY-MM-DD */
  startDate: string | null
  /** Data fine calcolata (o override manuale) — formato ISO YYYY-MM-DD */
  endDate: string | null
  /** Durata calcolata in giorni lavorativi */
  durationDays: number | null
  /** Il PM ha forzato le date manualmente */
  locked: boolean
  createdAt: string
  updatedAt: string
}

