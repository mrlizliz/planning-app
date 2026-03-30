// ============================================================
// Routes — Scheduler (auto-schedule trigger)
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import { autoSchedule, generateAlerts, type SchedulerInput } from '@planning/shared'
import { format } from 'date-fns'

export async function schedulerRoutes(app: FastifyInstance) {
  // POST /api/scheduler/run — Esegue auto-scheduling
  app.post('/api/scheduler/run', async (request) => {
    const store = getStore()
    const body = request.body as { planningStartDate?: string } | undefined

    const planningStartDate = body?.planningStartDate ?? format(new Date(), 'yyyy-MM-dd')

    const input: SchedulerInput = {
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
      planningStartDate,
    }

    const result = autoSchedule(input)

    // Aggiorna gli assignment con le date calcolate
    for (const scheduled of result.scheduled) {
      const assignment = store.assignments.get(scheduled.assignmentId)
      if (assignment && !assignment.locked) {
        store.assignments.set(scheduled.assignmentId, {
          ...assignment,
          startDate: scheduled.startDate,
          endDate: scheduled.endDate,
          durationDays: scheduled.durationDays,
          updatedAt: new Date().toISOString(),
        })
      }
    }

    // Aggiorna lo status dei ticket schedulati
    for (const scheduled of result.scheduled) {
      const ticket = store.tickets.get(scheduled.ticketId)
      if (ticket && ticket.status === 'backlog') {
        store.tickets.set(scheduled.ticketId, {
          ...ticket,
          status: 'planned',
          updatedAt: new Date().toISOString(),
        })
      }
    }

    return {
      scheduledCount: result.scheduled.length,
      errorsCount: result.errors.length,
      overallocationsCount: result.overallocations.length,
      scheduled: result.scheduled,
      errors: result.errors,
      overallocations: result.overallocations,
      alerts: generateAlerts({
        tickets: Array.from(store.tickets.values()),
        assignments: Array.from(store.assignments.values()),
        dependencies: Array.from(store.dependencies.values()),
        releases: Array.from(store.releases.values()),
        overallocations: result.overallocations,
      }),
    }
  })

  // GET /api/scheduler/status — Stato attuale della pianificazione
  app.get('/api/scheduler/status', async () => {
    const store = getStore()
    const assignments = Array.from(store.assignments.values())
    const tickets = Array.from(store.tickets.values())

    return {
      totalTickets: tickets.length,
      plannedTickets: tickets.filter((t) => t.status === 'planned').length,
      backlogTickets: tickets.filter((t) => t.status === 'backlog').length,
      totalAssignments: assignments.length,
      scheduledAssignments: assignments.filter((a) => a.startDate !== null).length,
      lockedAssignments: assignments.filter((a) => a.locked).length,
    }
  })
}

