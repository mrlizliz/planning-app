// ============================================================
// Dependency — Relazione tra ticket
// ============================================================

/** Tipo di dipendenza */
export type DependencyType =
  | 'finish_to_start'  // B inizia dopo che A è finito (default)
  | 'parallel'         // A e B possono procedere in parallelo
  | 'blocking'         // A blocca l'inizio di B (evidenza visiva)

export interface Dependency {
  id: string
  /** Ticket sorgente (predecessore) */
  fromTicketId: string
  /** Ticket destinazione (successore) */
  toTicketId: string
  type: DependencyType
  /** Importato da Jira issuelinks */
  importedFromJira: boolean
  createdAt: string
}

