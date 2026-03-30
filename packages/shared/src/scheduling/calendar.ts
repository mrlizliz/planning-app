// ============================================================
// Calendar — Funzioni pure per giorni lavorativi
// ============================================================

import {
  isWeekend,
  eachDayOfInterval,
  addDays,
  format,
} from 'date-fns'

/** Opzioni per il calcolo dei giorni lavorativi */
export interface CalendarConfig {
  /** Lista di giorni festivi (formato YYYY-MM-DD) */
  holidays: string[]
  /** Eccezioni: giorni normalmente non lavorativi che diventano lavorativi (formato YYYY-MM-DD) */
  exceptions: string[]
}

/**
 * Verifica se una data è un giorno lavorativo.
 *
 * Regole:
 * 1. Se è un'eccezione manuale (es. sabato lavorativo) → lavorativo
 * 2. Se è weekend (sabato o domenica) → non lavorativo
 * 3. Se è un giorno festivo → non lavorativo
 * 4. Altrimenti → lavorativo
 */
export function isWorkingDay(
  date: Date,
  config: CalendarConfig,
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')

  // 1. Eccezione manuale → forza lavorativo (anche se weekend/festivo)
  if (config.exceptions.includes(dateStr)) {
    return true
  }

  // 2. Weekend → non lavorativo
  if (isWeekend(date)) {
    return false
  }

  // 3. Festivo → non lavorativo
  if (config.holidays.includes(dateStr)) {
    return false
  }

  // 4. Giorno lavorativo normale
  return true
}

/**
 * Conta i giorni lavorativi in un intervallo [start, end] (estremi inclusi).
 */
export function getWorkingDaysCount(
  start: Date,
  end: Date,
  config: CalendarConfig,
): number {
  if (start > end) return 0

  const days = eachDayOfInterval({ start, end })
  return days.filter((day) => isWorkingDay(day, config)).length
}

/**
 * Restituisce la lista di date lavorative in un intervallo [start, end].
 */
export function getWorkingDays(
  start: Date,
  end: Date,
  config: CalendarConfig,
): Date[] {
  if (start > end) return []

  const days = eachDayOfInterval({ start, end })
  return days.filter((day) => isWorkingDay(day, config))
}

/**
 * Dato un giorno di inizio e un numero di giorni lavorativi,
 * calcola la data di fine.
 *
 * Esempio: start=lunedì, workingDays=5, nessun festivo → fine=venerdì
 *
 * @param start - Data di inizio (deve essere un giorno lavorativo)
 * @param workingDays - Numero di giorni lavorativi necessari (≥ 1)
 * @param config - Configurazione calendario
 * @returns Data di fine (giorno lavorativo)
 */
export function addWorkingDays(
  start: Date,
  workingDays: number,
  config: CalendarConfig,
): Date {
  if (workingDays <= 0) return start

  let count = 0
  let current = start

  // Se il giorno di inizio non è lavorativo, avanza al primo lavorativo
  while (!isWorkingDay(current, config)) {
    current = addDays(current, 1)
  }

  // Il giorno di inizio conta come primo giorno lavorativo
  count = 1

  while (count < workingDays) {
    current = addDays(current, 1)
    if (isWorkingDay(current, config)) {
      count++
    }
  }

  return current
}

/**
 * Trova il prossimo giorno lavorativo a partire da una data (inclusa).
 */
export function nextWorkingDay(
  date: Date,
  config: CalendarConfig,
): Date {
  let current = date
  while (!isWorkingDay(current, config)) {
    current = addDays(current, 1)
  }
  return current
}


