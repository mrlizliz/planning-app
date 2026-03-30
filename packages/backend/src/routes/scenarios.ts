// ============================================================
// Routes — Scenarios, Forecast, KPI, Reports
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import {
  createScenario,
  modifyScenarioAssignment,
  promoteScenario,
  compareScenarios,
  calculateWeeklyForecast,
  calculateKPIs,
  generatePlanningReport,
  generateReleaseReport,
  toCSV,
  autoSchedule,
  type SchedulerInput,
} from '@planning/shared'
import type { Scenario } from '@planning/shared'
import { format, addDays } from 'date-fns'

export async function scenarioRoutes(app: FastifyInstance) {
  // ---- Scenarios CRUD ----

  // GET /api/scenarios
  app.get('/api/scenarios', async () => {
    const store = getStore()
    return Array.from(store.scenarios.values())
  })

  // POST /api/scenarios — Crea scenario dallo stato corrente
  app.post('/api/scenarios', async (request, reply) => {
    const body = request.body as { name: string; description?: string | null }
    if (!body.name) {
      return reply.status(400).send({ error: 'Nome obbligatorio' })
    }

    const store = getStore()
    const assignments = Array.from(store.assignments.values())
    const scenario = createScenario(body.name, body.description ?? null, assignments)

    store.scenarios.set(scenario.id, scenario)
    return reply.status(201).send(scenario)
  })

  // PUT /api/scenarios/:id/assignment/:assignmentId — Modifica assignment nello scenario
  app.put('/api/scenarios/:id/assignment/:assignmentId', async (request, reply) => {
    const { id, assignmentId } = request.params as { id: string; assignmentId: string }
    const body = request.body as { userId?: string; allocationPercent?: number; locked?: boolean }

    const store = getStore()
    const scenario = store.scenarios.get(id)
    if (!scenario) {
      return reply.status(404).send({ error: 'Scenario non trovato' })
    }

    const modified = modifyScenarioAssignment(scenario, assignmentId, body)
    store.scenarios.set(id, modified)
    return modified
  })

  // POST /api/scenarios/:id/promote — Promuove scenario a stato corrente
  app.post('/api/scenarios/:id/promote', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const scenario = store.scenarios.get(id)
    if (!scenario) {
      return reply.status(404).send({ error: 'Scenario non trovato' })
    }

    const existingAssignments = Array.from(store.assignments.values())
    const promoted = promoteScenario(scenario, existingAssignments)

    // Aggiorna gli assignment nello store
    for (const a of promoted) {
      store.assignments.set(a.id, a)
    }

    return { ok: true, updatedAssignments: promoted.length }
  })

  // GET /api/scenarios/:id/compare — Confronta scenario con stato corrente
  app.get('/api/scenarios/:id/compare', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const scenario = store.scenarios.get(id)
    if (!scenario) {
      return reply.status(404).send({ error: 'Scenario non trovato' })
    }

    const currentAssignments = Array.from(store.assignments.values())
    const diffs = compareScenarios(currentAssignments, scenario)
    const changedOnly = diffs.filter((d) => d.changed)

    return { totalFields: diffs.length, changedFields: changedOnly.length, diffs: changedOnly }
  })

  // DELETE /api/scenarios/:id
  app.delete('/api/scenarios/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.scenarios.delete(id)) {
      return reply.status(404).send({ error: 'Scenario non trovato' })
    }
    return { ok: true }
  })

  // ---- Forecast ----

  // GET /api/forecast/weekly?from=...&to=...
  app.get('/api/forecast/weekly', async (request) => {
    const query = request.query as { from?: string; to?: string }
    const store = getStore()

    const fromDate = query.from ?? format(new Date(), 'yyyy-MM-dd')
    const toDate = query.to ?? format(addDays(new Date(), 28), 'yyyy-MM-dd')

    // Run scheduler to get scheduled assignments
    const schedInput: SchedulerInput = {
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
      planningStartDate: fromDate,
    }

    const schedResult = autoSchedule(schedInput)

    const forecast = calculateWeeklyForecast({
      users: Array.from(store.users.values()),
      assignments: Array.from(store.assignments.values()),
      scheduledAssignments: schedResult.scheduled,
      calendar: schedInput.calendar,
      absences: Array.from(store.absences.values()),
      meetings: Array.from(store.meetings.values()),
      fromDate,
      toDate,
    })

    return forecast
  })

  // ---- KPI ----

  // GET /api/kpis
  app.get('/api/kpis', async () => {
    const store = getStore()

    const schedInput: SchedulerInput = {
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
      planningStartDate: format(new Date(), 'yyyy-MM-dd'),
    }

    const schedResult = autoSchedule(schedInput)

    // Calcola capacità totale disponibile (prossimi 30 giorni × utenti attivi)
    const activeUsers = Array.from(store.users.values()).filter((u) => u.active)
    const totalAvailableMinutes = activeUsers.reduce(
      (sum, u) => sum + (u.dailyWorkingMinutes - u.dailyOverheadMinutes) * 20, // ~20 giorni lavorativi/mese
      0,
    )

    return calculateKPIs({
      tickets: Array.from(store.tickets.values()),
      assignments: Array.from(store.assignments.values()),
      scheduledAssignments: schedResult.scheduled,
      overallocations: schedResult.overallocations,
      totalAvailableMinutes,
    })
  })

  // ---- Reports ----

  // GET /api/reports/planning?format=json|csv
  app.get('/api/reports/planning', async (request, reply) => {
    const query = request.query as { format?: string }
    const store = getStore()

    const schedInput: SchedulerInput = {
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
      planningStartDate: format(new Date(), 'yyyy-MM-dd'),
    }

    const schedResult = autoSchedule(schedInput)

    const rows = generatePlanningReport(
      Array.from(store.tickets.values()),
      Array.from(store.assignments.values()),
      schedResult.scheduled,
      Array.from(store.users.values()),
      Array.from(store.releases.values()),
      Array.from(store.milestones.values()),
    )

    if (query.format === 'csv') {
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', 'attachment; filename="planning-report.csv"')
      return toCSV(rows)
    }

    return rows
  })

  // GET /api/reports/releases?format=json|csv
  app.get('/api/reports/releases', async (request, reply) => {
    const query = request.query as { format?: string }
    const store = getStore()

    const rows = generateReleaseReport(
      Array.from(store.releases.values()),
      Array.from(store.tickets.values()),
      Array.from(store.assignments.values()),
    )

    if (query.format === 'csv') {
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', 'attachment; filename="release-report.csv"')
      return toCSV(rows)
    }

    return rows
  })
}

