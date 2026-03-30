// ============================================================
// User — Utente del sistema (PM, DEV, QA)
// ============================================================

/** Ruoli applicativi — determinano i permessi */
export type AppRole = 'pm' | 'dev' | 'qa'

/** Ruoli pianificabili — usati per assignment e scheduling */
export type PlanningRole = 'dev' | 'qa'

/** Sede di riferimento — determina i festivi patronali applicabili */
export type Office = 'milano' | 'venezia' | 'roma'

export interface User {
  id: string
  displayName: string
  email: string
  appRole: AppRole
  /** Ruoli pianificabili assegnati (una persona può essere sia DEV che QA) */
  planningRoles: PlanningRole[]
  /** Sede di riferimento (determina i patroni applicabili) */
  office: Office | null
  /** Ore lavorative teoriche giornaliere (default: 480 minuti = 8h) */
  dailyWorkingMinutes: number
  /** Overhead fisso giornaliero in minuti (email, admin, ecc.) */
  dailyOverheadMinutes: number
  /** Attivo nel team */
  active: boolean
}

