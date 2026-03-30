// ============================================================
// Deployment — Giorni di deploy consentiti
// ============================================================

/** Ambiente di deploy */
export type DeployEnvironment = 'dev' | 'prod'

/** Giorno di deploy ricorrente */
export interface DeploymentDay {
  id: string
  environment: DeployEnvironment
  /**
   * Giorno della settimana consentito per il deploy.
   * 0=domenica, 1=lunedì, ..., 6=sabato
   */
  dayOfWeek: number
  /** Se false, il giorno di deploy è temporaneamente disabilitato */
  active: boolean
}

/** Finestra di deploy specifica (override del pattern ricorrente) */
export interface DeploymentWindow {
  id: string
  environment: DeployEnvironment
  /** Data specifica in formato ISO YYYY-MM-DD */
  date: string
  /** true = giorno di deploy aggiuntivo, false = blocco deploy in quel giorno */
  allowed: boolean
  notes: string | null
}

