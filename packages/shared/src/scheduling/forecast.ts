// ============================================================
// Forecast — Capacity forecast per settimana e KPI di planning
// ============================================================

import type { User } from '../types/user.js'
import type { Assignment } from '../types/assignment.js'
import type { Ticket } from '../types/ticket.js'
import type { Absence, RecurringMeeting } from '../types/calendar.js'
import type { ScheduledAssignment, OverallocationAlert } from './scheduler.js'
import { isWorkingDay, type CalendarConfig } from './calendar.js'
import { getUserDailyCapacity } from './capacity.js'
import { addDays, format, parseISO, startOfWeek, endOfWeek } from 'date-fns'

// ---- Types ----

export interface WeeklyCapacityForecast {
  /** Inizio settimana (lunedì) YYYY-MM-DD */
  weekStart: string
  /** Fine settimana (venerdì) YYYY-MM-DD */
  weekEnd: string
  /** Minuti totali disponibili (capacity netta di tutto il team) */
  availableMinutes: number
  /** Minuti totali pianificati (effort assegnato in questa settimana) */
  plannedMinutes: number
  /** Differenza: disponibili - pianificati (negativo = shortage) */
  deltaMinutes: number
  /** Percentuale saturazione: pianificati / disponibili × 100 */
  saturationPercent: number
  /** true se pianificati > disponibili */
  hasShortage: boolean
}

export interface UserWeeklyCapacity {
  userId: string
  weekStart: string
  availableMinutes: number
  plannedMinutes: number
  saturationPercent: number
}

export interface PlanningKPIs {
  /** Ore pianificate / capacità disponibile totale (%) */
  overallSaturation: number
  /** Ticket pianificati / ticket totali (%) */
  plannedTicketRatio: number
  /** Giorni con sovrallocazione / giorni totali pianificati (%) */
  overallocationRate: number
  /** Numero ticket senza stima */
  ticketsWithoutEstimate: number
  /** Totale effort pianificato in minuti */
  totalPlannedMinutes: number
  /** Totale capacità disponibile in minuti (nel range pianificato) */
  totalAvailableMinutes: number
  /** Numero ticket completati */
  completedTickets: number
  /** Numero ticket totali */
  totalTickets: number
}

// ---- Capacity Forecast ----

export interface ForecastInput {
  users: User[]
  assignments: Assignment[]
  scheduledAssignments: ScheduledAssignment[]
  calendar: CalendarConfig
  absences: Absence[]
  meetings: RecurringMeeting[]
  /** Inizio finestra forecast YYYY-MM-DD */
  fromDate: string
  /** Fine finestra forecast YYYY-MM-DD */
  toDate: string
}


/**
 * Calcola il forecast di capacità settimanale per il team.
 * Ritorna un array di settimane con ore disponibili vs ore pianificate.
 */
export function calculateWeeklyForecast(input: ForecastInput): WeeklyCapacityForecast[] {
  const { users, scheduledAssignments, calendar, absences, meetings, fromDate, toDate } = input

  const start = parseISO(fromDate)
  const end = parseISO(toDate)
  const weeks: WeeklyCapacityForecast[] = []

  // Itera settimana per settimana
  let weekStart = startOfWeek(start, { weekStartsOn: 1 })

  while (weekStart <= end) {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

    let availableMinutes = 0
    let plannedMinutes = 0

    // Per ogni giorno della settimana
    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d)
      const dayStr = format(day, 'yyyy-MM-dd')

      if (!isWorkingDay(day, calendar)) continue
      if (dayStr < fromDate || dayStr > toDate) continue

      // Capacità disponibile: somma capacità netta di tutti gli utenti attivi
      for (const user of users) {
        if (!user.active) continue
        availableMinutes += getUserDailyCapacity(user, day, absences, meetings)
      }

      // Minuti pianificati: assignment che coprono questo giorno
      for (const sa of scheduledAssignments) {
        if (sa.startDate <= dayStr && sa.endDate >= dayStr) {
          // Stima: distribuisce l'effort uniformemente sulla durata
          // (usa la stima del ticket diviso giorni di durata come approssimazione)
          const ticket = input.assignments.find((a) => a.id === sa.assignmentId)
          if (ticket) {
            const dailyPlanned = ticket.allocationPercent
              ? Math.floor((getUserDailyCapacity(
                  users.find((u) => u.id === sa.userId) ?? users[0],
                  day, absences, meetings,
                ) * ticket.allocationPercent) / 100)
              : 0
            plannedMinutes += dailyPlanned
          }
        }
      }
    }

    const saturationPercent = availableMinutes > 0
      ? Math.round((plannedMinutes / availableMinutes) * 100)
      : 0

    weeks.push({
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
      availableMinutes,
      plannedMinutes,
      deltaMinutes: availableMinutes - plannedMinutes,
      saturationPercent,
      hasShortage: plannedMinutes > availableMinutes,
    })

    weekStart = addDays(weekStart, 7)
  }

  return weeks
}

// ---- KPI ----

export interface KPIInput {
  tickets: Ticket[]
  assignments: Assignment[]
  scheduledAssignments: ScheduledAssignment[]
  overallocations: OverallocationAlert[]
  totalAvailableMinutes: number
}

/**
 * Calcola i KPI di planning del team.
 */
export function calculateKPIs(input: KPIInput): PlanningKPIs {
  const { tickets, scheduledAssignments, overallocations, totalAvailableMinutes } = input

  // Effort totale pianificato (dai ticket schedulati)
  const scheduledTicketIds = new Set(scheduledAssignments.map((s) => s.ticketId))
  const totalPlannedMinutes = tickets
    .filter((t) => scheduledTicketIds.has(t.id) && t.estimateMinutes)
    .reduce((sum, t) => sum + (t.estimateMinutes ?? 0), 0)

  // Saturazione
  const overallSaturation = totalAvailableMinutes > 0
    ? Math.round((totalPlannedMinutes / totalAvailableMinutes) * 100)
    : 0

  // Ratio ticket pianificati
  const totalTickets = tickets.length
  const plannedTickets = tickets.filter(
    (t) => t.status === 'planned' || t.status === 'in_progress' || t.status === 'done',
  ).length
  const plannedTicketRatio = totalTickets > 0
    ? Math.round((plannedTickets / totalTickets) * 100)
    : 0

  // Sovrallocazione: conta giorni unici con sovrallocazione
  const overallocDates = new Set(overallocations.map((o) => `${o.userId}-${o.date}`))
  // Conta giorni unici schedulati
  const scheduledDates = new Set<string>()
  for (const sa of scheduledAssignments) {
    let current = parseISO(sa.startDate)
    const end = parseISO(sa.endDate)
    while (current <= end) {
      scheduledDates.add(`${sa.userId}-${format(current, 'yyyy-MM-dd')}`)
      current = addDays(current, 1)
    }
  }
  const overallocationRate = scheduledDates.size > 0
    ? Math.round((overallocDates.size / scheduledDates.size) * 100)
    : 0

  // Ticket senza stima
  const ticketsWithoutEstimate = tickets.filter(
    (t) => t.estimateMinutes === null || t.estimateMinutes === 0,
  ).length

  // Ticket completati
  const completedTickets = tickets.filter((t) => t.status === 'done').length

  return {
    overallSaturation,
    plannedTicketRatio,
    overallocationRate,
    ticketsWithoutEstimate,
    totalPlannedMinutes,
    totalAvailableMinutes,
    completedTickets,
    totalTickets,
  }
}

