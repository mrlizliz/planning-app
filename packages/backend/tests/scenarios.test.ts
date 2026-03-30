// ============================================================
// Integration Test — Scenarios, Forecast & Reports (T5-I01 … T5-I03)
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { buildApp } from '../src/index.js'
import { resetStore, getStore } from '../src/store/index.js'
import type { FastifyInstance } from 'fastify'

let app: FastifyInstance

beforeEach(async () => {
  resetStore()
  app = await buildApp({ logger: false, persist: false })
})

const now = new Date().toISOString()

async function createUser(id = 'user-1') {
  return app.inject({
    method: 'POST',
    url: '/api/users',
    payload: {
      id,
      displayName: 'Mario Rossi',
      email: `${id}@example.com`,
      appRole: 'dev',
      planningRoles: ['dev'],
      office: null,
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 0,
      active: true,
    },
  })
}

function addTicket(id: string, jiraKey: string, estimateMinutes: number, releaseId: string | null = null) {
  const store = getStore()
  store.tickets.set(id, {
    id,
    jiraKey,
    summary: `Ticket ${jiraKey}`,
    description: null,
    estimateMinutes,
    jiraPriority: 'medium',
    priorityOverride: null,
    status: 'backlog',
    phase: 'dev',
    jiraAssigneeEmail: null, jiraAssigneeName: null,
    parentKey: null, fixVersions: [],
    milestoneId: null,
    releaseId,
    locked: false,
    warnings: [],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  })
}

async function createAssignment(id: string, ticketId: string, userId: string) {
  return app.inject({
    method: 'POST',
    url: '/api/assignments',
    payload: {
      id,
      ticketId,
      userId,
      role: 'dev',
      allocationPercent: 100,
      startDate: null,
      endDate: null,
      durationDays: null,
      locked: false,
      createdAt: now,
      updatedAt: now,
    },
  })
}

// T5-I01: What-if completo
describe('T5-I01: What-if scenario completo', () => {
  it('crea scenario → modifica assignee → confronta con stato corrente', async () => {
    await createUser('user-1')
    await createUser('user-2')
    addTicket('t1', 'PROJ-1', 480)
    await createAssignment('a1', 't1', 'user-1')

    // Schedule per avere date
    await app.inject({
      method: 'POST',
      url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })

    // Crea scenario
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/scenarios',
      payload: { name: 'What-If: cambio assignee', description: 'Test scenario' },
    })
    expect(createRes.statusCode).toBe(201)
    const scenario = createRes.json()
    expect(scenario.snapshot.assignments).toHaveLength(1)

    // Modifica assignee nello scenario
    const modifyRes = await app.inject({
      method: 'PUT',
      url: `/api/scenarios/${scenario.id}/assignment/a1`,
      payload: { userId: 'user-2' },
    })
    expect(modifyRes.statusCode).toBe(200)
    const modified = modifyRes.json()
    expect(modified.snapshot.assignments[0].userId).toBe('user-2')

    // Confronta con stato corrente
    const compareRes = await app.inject({
      method: 'GET',
      url: `/api/scenarios/${scenario.id}/compare`,
    })
    expect(compareRes.statusCode).toBe(200)
    const comparison = compareRes.json()
    expect(comparison.changedFields).toBeGreaterThan(0)
    const userDiff = comparison.diffs.find((d: any) => d.field === 'userId')
    expect(userDiff).toBeDefined()
    expect(userDiff.currentValue).toBe('user-1')
    expect(userDiff.scenarioValue).toBe('user-2')
  })
})

// Scenario CRUD
describe('Scenarios CRUD', () => {
  it('GET + POST + DELETE scenario', async () => {
    addTicket('t1', 'PROJ-1', 480)

    // Crea
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/scenarios',
      payload: { name: 'Test Scenario' },
    })
    expect(postRes.statusCode).toBe(201)
    const scenario = postRes.json()

    // Lista
    const listRes = await app.inject({ method: 'GET', url: '/api/scenarios' })
    expect(listRes.json()).toHaveLength(1)

    // Promuovi
    await createUser('user-1')
    await createAssignment('a1', 't1', 'user-1')
    const promoteRes = await app.inject({
      method: 'POST',
      url: `/api/scenarios/${scenario.id}/promote`,
    })
    expect(promoteRes.statusCode).toBe(200)

    // Elimina
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/scenarios/${scenario.id}`,
    })
    expect(delRes.statusCode).toBe(200)

    const listRes2 = await app.inject({ method: 'GET', url: '/api/scenarios' })
    expect(listRes2.json()).toHaveLength(0)
  })
})

// T5-I03: Report generation
describe('T5-I03: Report generation', () => {
  it('genera report planning in JSON', async () => {
    await createUser('user-1')
    addTicket('t1', 'PROJ-1', 480)
    await createAssignment('a1', 't1', 'user-1')

    await app.inject({
      method: 'POST',
      url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })

    const res = await app.inject({ method: 'GET', url: '/api/reports/planning' })
    expect(res.statusCode).toBe(200)
    const rows = res.json()
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].jiraKey).toBe('PROJ-1')
    expect(rows[0].assignee).toBe('Mario Rossi')
  })

  it('genera report planning in CSV', async () => {
    await createUser('user-1')
    addTicket('t1', 'PROJ-1', 480)
    await createAssignment('a1', 't1', 'user-1')

    const res = await app.inject({ method: 'GET', url: '/api/reports/planning?format=csv' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('text/csv')
    const csv = res.body
    expect(csv).toContain('jiraKey')
    expect(csv).toContain('PROJ-1')
  })

  it('genera release report', async () => {
    const store = getStore()
    store.releases.set('r1', {
      id: 'r1',
      name: 'Sprint 1',
      description: null,
      targetDate: '2026-05-01',
      forecastDate: null,
      createdAt: now,
      updatedAt: now,
    })
    addTicket('t1', 'PROJ-1', 480, 'r1')

    const res = await app.inject({ method: 'GET', url: '/api/reports/releases' })
    expect(res.statusCode).toBe(200)
    const rows = res.json()
    expect(rows).toHaveLength(1)
    expect(rows[0].releaseName).toBe('Sprint 1')
  })
})

// KPI endpoint
describe('KPI endpoint', () => {
  it('GET /api/kpis', async () => {
    await createUser('user-1')
    addTicket('t1', 'PROJ-1', 480)
    await createAssignment('a1', 't1', 'user-1')

    const res = await app.inject({ method: 'GET', url: '/api/kpis' })
    expect(res.statusCode).toBe(200)
    const kpis = res.json()
    expect(kpis).toHaveProperty('overallSaturation')
    expect(kpis).toHaveProperty('plannedTicketRatio')
    expect(kpis).toHaveProperty('overallocationRate')
    expect(kpis).toHaveProperty('totalTickets')
  })
})

// Forecast endpoint
describe('Forecast endpoint', () => {
  it('GET /api/forecast/weekly', async () => {
    await createUser('user-1')
    addTicket('t1', 'PROJ-1', 480)
    await createAssignment('a1', 't1', 'user-1')

    const res = await app.inject({
      method: 'GET',
      url: '/api/forecast/weekly?from=2026-04-06&to=2026-04-17',
    })
    expect(res.statusCode).toBe(200)
    const weeks = res.json()
    expect(weeks.length).toBeGreaterThan(0)
    expect(weeks[0]).toHaveProperty('weekStart')
    expect(weeks[0]).toHaveProperty('availableMinutes')
    expect(weeks[0]).toHaveProperty('plannedMinutes')
    expect(weeks[0]).toHaveProperty('hasShortage')
  })
})

