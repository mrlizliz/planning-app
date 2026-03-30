// ============================================================
// Helper — Costruisce SchedulerInput dallo store
// ============================================================

import { getStore } from '../store/index.js'
import { type SchedulerInput } from '@planning/shared'
import { format } from 'date-fns'

/**
 * Costruisce un SchedulerInput completo a partire dallo stato corrente dello store.
 * Evita la duplicazione nelle route scheduler, scenarios, forecast, kpis e report.
 */
export function buildSchedulerInput(planningStartDate?: string): SchedulerInput {
  const store = getStore()

  return {
    tickets: Array.from(store.tickets.values()),
    assignments: Array.from(store.assignments.values()),
    users: Array.from(store.users.values()),
    calendar: {
      holidays: store.calendar.holidays
        .filter((h) => h.office === null || h.office === undefined)
        .map((h) => h.date),
      exceptions: store.calendar.exceptions.map((e) => e.date),
    },
    holidays: store.calendar.holidays.map((h) => ({
      date: h.date,
      office: h.office ?? null,
    })),
    absences: Array.from(store.absences.values()),
    meetings: Array.from(store.meetings.values()),
    dependencies: Array.from(store.dependencies.values()),
    planningStartDate: planningStartDate ?? format(new Date(), 'yyyy-MM-dd'),
  }
}

