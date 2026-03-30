// ============================================================
// Capacity — Calcolo capacità netta e durata ticket
// ============================================================

import type { User } from '../types/user.js'
import type { Absence, RecurringMeeting } from '../types/calendar.js'
import { format, getDay } from 'date-fns'

/** Input per il calcolo della capacità netta giornaliera */
export interface DailyCapacityInput {
  /** Ore lavorative teoriche in minuti (default: 480 = 8h) */
  dailyWorkingMinutes: number
  /** Overhead fisso giornaliero in minuti (email, admin, ecc.) */
  dailyOverheadMinutes: number
  /** Minuti totali di meeting in quel giorno */
  meetingMinutes: number
  /** true = persona assente tutto il giorno */
  absent: boolean
  /** true = persona assente mezza giornata */
  halfDayAbsent: boolean
}

/** Risultato del calcolo della capacità */
export interface DailyCapacityResult {
  /** Capacità lorda (ore teoriche) in minuti */
  grossMinutes: number
  /** Capacità netta disponibile in minuti */
  netMinutes: number
  /** Minuti persi per meeting */
  meetingMinutes: number
  /** Minuti persi per overhead */
  overheadMinutes: number
  /** Minuti persi per assenza */
  absenceMinutes: number
  /** true se la capacità netta è ≤ 0 (alert) */
  alert: boolean
}

/**
 * Calcola la capacità netta giornaliera di una persona.
 *
 * Formula:
 *   capacità_netta = ore_lavorative - meeting - assenza - overhead
 *
 * La capacità netta non può essere negativa (floor a 0).
 */
export function calculateDailyCapacity(
  input: DailyCapacityInput,
): DailyCapacityResult {
  let grossMinutes = input.dailyWorkingMinutes

  // Assenza: giornata intera → capacità 0
  if (input.absent) {
    return {
      grossMinutes,
      netMinutes: 0,
      meetingMinutes: 0,
      overheadMinutes: 0,
      absenceMinutes: grossMinutes,
      alert: true,
    }
  }

  // Assenza: mezza giornata → dimezza le ore lavorative teoriche
  let absenceMinutes = 0
  if (input.halfDayAbsent) {
    absenceMinutes = Math.floor(grossMinutes / 2)
    grossMinutes = grossMinutes - absenceMinutes
  }

  const netMinutes = Math.max(
    0,
    grossMinutes - input.meetingMinutes - input.dailyOverheadMinutes,
  )

  return {
    grossMinutes: input.dailyWorkingMinutes,
    netMinutes,
    meetingMinutes: input.meetingMinutes,
    overheadMinutes: input.dailyOverheadMinutes,
    absenceMinutes,
    alert: netMinutes <= 0,
  }
}

/**
 * Calcola la capacità effettiva considerando l'allocazione percentuale.
 *
 * @param netCapacityMinutes - Capacità netta giornaliera in minuti
 * @param allocationPercent  - Percentuale allocazione (1-100)
 * @returns Minuti effettivamente disponibili per il ticket
 */
export function applyAllocation(
  netCapacityMinutes: number,
  allocationPercent: number,
): number {
  const clamped = Math.max(0, Math.min(100, allocationPercent))
  return Math.floor(netCapacityMinutes * (clamped / 100))
}

/**
 * Calcola la durata in giorni lavorativi di un ticket.
 *
 * Formula: durata = effort / (capacità_giornaliera × allocation%)
 *
 * @param estimateMinutes     - Stima effort in minuti
 * @param dailyCapacityMinutes - Capacità netta giornaliera in minuti
 * @param allocationPercent    - Percentuale allocazione (1-100)
 * @returns Numero di giorni lavorativi necessari (arrotondato per eccesso)
 */
export function calculateDurationDays(
  estimateMinutes: number,
  dailyCapacityMinutes: number,
  allocationPercent: number,
): number {
  if (estimateMinutes <= 0) return 0
  if (dailyCapacityMinutes <= 0) return Infinity
  if (allocationPercent <= 0) return Infinity

  const effectiveDaily = applyAllocation(dailyCapacityMinutes, allocationPercent)
  if (effectiveDaily <= 0) return Infinity

  return Math.ceil(estimateMinutes / effectiveDaily)
}

/**
 * Calcola i minuti di meeting per un dato giorno della settimana,
 * basandosi sulla lista di meeting ricorrenti.
 *
 * @param dayOfWeek - Giorno della settimana (0=dom, 1=lun, ..., 6=sab)
 * @param meetings  - Lista di meeting ricorrenti
 * @returns Minuti totali di meeting per quel giorno
 */
export function getMeetingMinutesForDay(
  dayOfWeek: number,
  meetings: RecurringMeeting[],
): number {
  let total = 0

  for (const meeting of meetings) {
    switch (meeting.frequency) {
      case 'daily':
        // Daily → tutti i giorni lavorativi (lun-ven)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          total += meeting.durationMinutes
        }
        break
      case 'weekly':
        if (meeting.daysOfWeek.includes(dayOfWeek)) {
          total += meeting.durationMinutes
        }
        break
      case 'biweekly':
        // Per semplicità: metà dell'impatto settimanale (media)
        if (meeting.daysOfWeek.includes(dayOfWeek)) {
          total += Math.floor(meeting.durationMinutes / 2)
        }
        break
      case 'monthly':
        // Impatto trascurabile su base giornaliera — ignorato nel daily
        break
    }
  }

  return total
}

/**
 * Rileva sovrallocazione: le ore assegnate superano la capacità.
 *
 * @param assignedMinutes  - Minuti totali assegnati alla persona in quel giorno
 * @param netCapacityMinutes - Capacità netta giornaliera
 * @returns true se c'è sovrallocazione
 */
export function isOverallocated(
  assignedMinutes: number,
  netCapacityMinutes: number,
): boolean {
  return assignedMinutes > netCapacityMinutes
}

/**
 * Calcola la capacità netta di un utente in un giorno specifico,
 * tenendo conto di assenze, meeting e overhead.
 *
 * Funzione di convenienza che compone getMeetingMinutesForDay + calculateDailyCapacity.
 */
export function getUserDailyCapacity(
  user: User,
  date: Date,
  absences: Absence[],
  meetings: RecurringMeeting[],
): number {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayOfWeek = getDay(date)

  const absence = absences.find(
    (a) => a.userId === user.id && a.startDate <= dateStr && a.endDate >= dateStr,
  )
  const absent = absence ? !absence.halfDay : false
  const halfDayAbsent = absence?.halfDay ?? false

  const userMeetings = meetings.filter(
    (m) => m.userId === null || m.userId === user.id,
  )
  const meetingMinutes = getMeetingMinutesForDay(dayOfWeek, userMeetings)

  const result = calculateDailyCapacity({
    dailyWorkingMinutes: user.dailyWorkingMinutes,
    dailyOverheadMinutes: user.dailyOverheadMinutes,
    meetingMinutes,
    absent,
    halfDayAbsent,
  })

  return result.netMinutes
}
