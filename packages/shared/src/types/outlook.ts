// ============================================================
// Outlook — Tipi per eventi Microsoft Graph Calendar
// ============================================================

/** Evento da Microsoft Graph Calendar API */
export interface OutlookEvent {
  id: string
  subject: string
  /** ISO datetime start */
  start: string
  /** ISO datetime end */
  end: string
  /** Stato di disponibilità: free, tentative, busy, oof, workingElsewhere, unknown */
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'
  /** true se è un evento tutto il giorno */
  isAllDay: boolean
  /** true se la partecipazione è facoltativa */
  isOptional: boolean
  /** true se l'evento è stato cancellato */
  isCancelled: boolean
  /** Organizzatore */
  organizerEmail: string | null
}

/** Blocco di capacità ridotta derivato da un evento Outlook */
export interface OutlookCapacityBlock {
  /** Data in formato YYYY-MM-DD */
  date: string
  /** Minuti di capacità ridotta */
  minutes: number
  /** true = giornata intera (capacità = 0) */
  allDay: boolean
  /** Nome evento originale */
  source: string
}

/** Configurazione filtri per import Outlook */
export interface OutlookFilterConfig {
  /** Includi solo eventi con showAs in questa lista (default: ['busy', 'oof']) */
  includeShowAs: Array<OutlookEvent['showAs']>
  /** Durata minima evento in minuti per essere considerato (default: 15) */
  minDurationMinutes: number
  /** Escludi eventi opzionali (default: true) */
  excludeOptional: boolean
  /** Escludi eventi cancellati (default: true) */
  excludeCancelled: boolean
}

export const DEFAULT_OUTLOOK_FILTER: OutlookFilterConfig = {
  includeShowAs: ['busy', 'oof'],
  minDurationMinutes: 15,
  excludeOptional: true,
  excludeCancelled: true,
}

