// ============================================================
// Test — Forecast & KPI (T5-U04 … T5-U07)
// ============================================================

import { describe, it, expect } from 'vitest'
import { calculateWeeklyForecast, calculateKPIs, type ForecastInput, type KPIInput } from '../../src/scheduling/forecast.js'
import type { User } from '../../src/types/user.js'
import type { Assignment } from '../../src/types/assignment.js'
import type { Ticket } from '../../src/types/ticket.js'
import type { ScheduledAssignment, OverallocationAlert } from '../../src/scheduling/scheduler.js'
import type { CalendarConfig } from '../../src/scheduling/calendar.js'

const now = '2026-03-30T00:00:00.000Z'

function makeUser(id = 'u1'): User {
  return {
    id,
    displayName: `User ${id}`,
    email: `${id}@example.com`,
    appRole: 'dev',
    planningRoles: ['dev'],
    office: null,
    dailyWorkingMinutes: 480,
    dailyOverheadMinutes: 0,
    active: true,
  }
}

function makeTicket(id: string, estimate: number | null = 480, status: Ticket['status'] = 'planned'): Ticket {
  return {
    id,
    jiraKey: `PROJ-${id}`,
    summary: `Ticket ${id}`,
    description: null,
    estimateMinutes: estimate,
    jiraPriority: 'medium',
    priorityOverride: null,
    status,
    phase: 'dev',
    jiraAssigneeEmail: null, jiraAssigneeName: null,
    parentKey: null, fixVersions: [],
    milestoneId: null,
    releaseId: null,
    locked: false,
    warnings: [],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

function makeAssignment(id: string, ticketId: string, userId: string): Assignment {
  return {
    id,
    ticketId,
    userId,
    role: 'dev',
    allocationPercent: 100,
    startDate: '2026-04-06',
    endDate: '2026-04-07',
    durationDays: 2,
    locked: false,
    createdAt: now,
    updatedAt: now,
  }
}

const emptyCalendar: CalendarConfig = { holidays: [], exceptions: [] }

describe('Forecast — Weekly Capacity', () => {
  // T5-U05: Capacity forecast: settimana con 40h disponibili e 50h pianificate → shortage
  it('T5-U05: rileva shortage quando pianificato > disponibile', () => {
    const users = [makeUser('u1')]
    const scheduled: ScheduledAssignment[] = [
      { assignmentId: 'a1', ticketId: 't1', userId: 'u1', startDate: '2026-04-06', endDate: '2026-04-10', durationDays: 5 },
      { assignmentId: 'a2', ticketId: 't2', userId: 'u1', startDate: '2026-04-06', endDate: '2026-04-10', durationDays: 5 },
    ]
    const assignments: Assignment[] = [
      { ...makeAssignment('a1', 't1', 'u1'), allocationPercent: 100 },
      { ...makeAssignment('a2', 't2', 'u1'), allocationPercent: 100 },
    ]

    const input: ForecastInput = {
      users,
      assignments,
      scheduledAssignments: scheduled,
      calendar: emptyCalendar,
      absences: [],
      meetings: [],
      fromDate: '2026-04-06',
      toDate: '2026-04-10',
    }

    const weeks = calculateWeeklyForecast(input)
    expect(weeks.length).toBeGreaterThan(0)
    // Con 2 assignment al 100% sullo stesso utente, planned > available
    const week = weeks[0]
    expect(week.hasShortage).toBe(true)
    expect(week.saturationPercent).toBeGreaterThan(100)
  })

  it('nessun shortage con un solo assignment al 100%', () => {
    const users = [makeUser('u1')]
    const scheduled: ScheduledAssignment[] = [
      { assignmentId: 'a1', ticketId: 't1', userId: 'u1', startDate: '2026-04-06', endDate: '2026-04-10', durationDays: 5 },
    ]
    const assignments: Assignment[] = [
      { ...makeAssignment('a1', 't1', 'u1'), allocationPercent: 100 },
    ]

    const input: ForecastInput = {
      users,
      assignments,
      scheduledAssignments: scheduled,
      calendar: emptyCalendar,
      absences: [],
      meetings: [],
      fromDate: '2026-04-06',
      toDate: '2026-04-10',
    }

    const weeks = calculateWeeklyForecast(input)
    expect(weeks.length).toBeGreaterThan(0)
    expect(weeks[0].hasShortage).toBe(false)
  })
})

describe('KPI — Calcoli', () => {
  // T5-U06: Calcolo saturazione: 30h pianificate / 40h disponibili = 75%
  it('T5-U06: saturazione 1800min / 2400min = 75%', () => {
    const tickets = [makeTicket('t1', 1800, 'planned')]
    const scheduled: ScheduledAssignment[] = [
      { assignmentId: 'a1', ticketId: 't1', userId: 'u1', startDate: '2026-04-06', endDate: '2026-04-10', durationDays: 5 },
    ]

    const input: KPIInput = {
      tickets,
      assignments: [makeAssignment('a1', 't1', 'u1')],
      scheduledAssignments: scheduled,
      overallocations: [],
      totalAvailableMinutes: 2400,
    }

    const kpis = calculateKPIs(input)
    expect(kpis.overallSaturation).toBe(75)
  })

  // T5-U07: Tasso sovrallocazione calcolato correttamente
  it('T5-U07: tasso sovrallocazione', () => {
    const tickets = [makeTicket('t1', 480, 'planned')]
    const scheduled: ScheduledAssignment[] = [
      { assignmentId: 'a1', ticketId: 't1', userId: 'u1', startDate: '2026-04-06', endDate: '2026-04-06', durationDays: 1 },
    ]
    const overallocations: OverallocationAlert[] = [
      { userId: 'u1', date: '2026-04-06', assignedMinutes: 960, capacityMinutes: 480 },
    ]

    const input: KPIInput = {
      tickets,
      assignments: [makeAssignment('a1', 't1', 'u1')],
      scheduledAssignments: scheduled,
      overallocations,
      totalAvailableMinutes: 480,
    }

    const kpis = calculateKPIs(input)
    expect(kpis.overallocationRate).toBe(100) // 1 giorno su 1 → 100%
  })

  it('conteggio ticket senza stima', () => {
    const tickets = [
      makeTicket('t1', null, 'backlog'),
      makeTicket('t2', 0, 'backlog'),
      makeTicket('t3', 480, 'planned'),
    ]

    const input: KPIInput = {
      tickets,
      assignments: [],
      scheduledAssignments: [],
      overallocations: [],
      totalAvailableMinutes: 2400,
    }

    const kpis = calculateKPIs(input)
    expect(kpis.ticketsWithoutEstimate).toBe(2)
    expect(kpis.totalTickets).toBe(3)
  })

  it('planned ticket ratio', () => {
    const tickets = [
      makeTicket('t1', 480, 'planned'),
      makeTicket('t2', 480, 'done'),
      makeTicket('t3', 480, 'backlog'),
      makeTicket('t4', 480, 'backlog'),
    ]

    const input: KPIInput = {
      tickets,
      assignments: [],
      scheduledAssignments: [],
      overallocations: [],
      totalAvailableMinutes: 9600,
    }

    const kpis = calculateKPIs(input)
    expect(kpis.plannedTicketRatio).toBe(50) // 2 su 4
    expect(kpis.completedTickets).toBe(1)
  })
})

