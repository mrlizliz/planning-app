// ============================================================
// Calendar — Calendario lavorativo, festivi, assenze, meeting
// ============================================================

/** Giorno festivo del team */
export interface Holiday {
  id: string
  /** Data in formato ISO YYYY-MM-DD */
  date: string
  name: string
  /** Se true, è una festività ricorrente ogni anno */
  recurring: boolean
  /** Sede a cui si applica il festivo. null = tutte le sedi (festivo nazionale) */
  office: string | null
}

/** Eccezione al calendario: un giorno normalmente non lavorativo diventa lavorativo */
export interface CalendarException {
  id: string
  /** Data in formato ISO YYYY-MM-DD */
  date: string
  description: string
}

/** Tipologia di assenza */
export type AbsenceType = 'vacation' | 'sick' | 'permit' | 'training' | 'other'

/** Assenza individuale */
export interface Absence {
  id: string
  userId: string
  /** Data in formato ISO YYYY-MM-DD */
  date: string
  type: AbsenceType
  /** true = mezza giornata (capacità dimezzata) */
  halfDay: boolean
  notes: string | null
}

/** Frequenza di un meeting ricorrente */
export type MeetingFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'

/** Tipologia di meeting */
export type MeetingType =
  | 'standup'
  | 'refinement'
  | 'sprint_planning'
  | 'retrospective'
  | 'one_on_one'
  | 'custom'

/** Meeting ricorrente che riduce la capacità */
export interface RecurringMeeting {
  id: string
  /** null = meeting di team (impatta tutti) */
  userId: string | null
  name: string
  type: MeetingType
  /** Durata in minuti */
  durationMinutes: number
  frequency: MeetingFrequency
  /**
   * Giorno della settimana (0=domenica, 1=lunedì, ..., 6=sabato).
   * Per frequency='daily' → ignorato (tutti i giorni lavorativi).
   */
  dayOfWeek: number | null
}

/** Calendario lavorativo del team */
export interface WorkingCalendar {
  id: string
  name: string
  holidays: Holiday[]
  exceptions: CalendarException[]
}

