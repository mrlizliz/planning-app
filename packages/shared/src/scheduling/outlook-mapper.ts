// ============================================================
// Outlook Mapper — Funzioni pure per filtrare e mappare eventi Outlook
// ============================================================

import type {
  OutlookEvent,
  OutlookCapacityBlock,
  OutlookFilterConfig,
} from '../types/outlook.js'
import { differenceInMinutes, parseISO, format } from 'date-fns'

/**
 * Filtra gli eventi Outlook in base alla configurazione.
 * Esclude eventi free, tentative, opzionali, cancellati, e sotto soglia durata.
 */
export function filterOutlookEvents(
  events: OutlookEvent[],
  config: OutlookFilterConfig,
): OutlookEvent[] {
  return events.filter((event) => {
    // Escludi cancellati
    if (config.excludeCancelled && event.isCancelled) return false

    // Escludi opzionali
    if (config.excludeOptional && event.isOptional) return false

    // Filtra per showAs
    if (!config.includeShowAs.includes(event.showAs)) return false

    // Soglia durata minima (non si applica a eventi all-day)
    if (!event.isAllDay) {
      const durationMinutes = differenceInMinutes(parseISO(event.end), parseISO(event.start))
      if (durationMinutes < config.minDurationMinutes) return false
    }

    return true
  })
}

/**
 * Converte eventi Outlook filtrati in blocchi di capacità ridotta per giorno.
 */
export function mapEventsToCapacityBlocks(
  events: OutlookEvent[],
): OutlookCapacityBlock[] {
  const blocks: OutlookCapacityBlock[] = []

  for (const event of events) {
    const date = format(parseISO(event.start), 'yyyy-MM-dd')

    if (event.isAllDay) {
      blocks.push({
        date,
        minutes: 0,
        allDay: true,
        source: event.subject,
      })
    } else {
      const minutes = differenceInMinutes(parseISO(event.end), parseISO(event.start))
      blocks.push({
        date,
        minutes,
        allDay: false,
        source: event.subject,
      })
    }
  }

  return blocks
}

/**
 * Aggrega i blocchi di capacità per giorno.
 * Restituisce una mappa date → { totalMinutes, allDay }.
 */
export function aggregateCapacityByDay(
  blocks: OutlookCapacityBlock[],
): Map<string, { totalMinutes: number; allDay: boolean; sources: string[] }> {
  const byDay = new Map<string, { totalMinutes: number; allDay: boolean; sources: string[] }>()

  for (const block of blocks) {
    const existing = byDay.get(block.date) ?? { totalMinutes: 0, allDay: false, sources: [] }

    if (block.allDay) {
      existing.allDay = true
    }
    existing.totalMinutes += block.minutes
    existing.sources.push(block.source)

    byDay.set(block.date, existing)
  }

  return byDay
}

