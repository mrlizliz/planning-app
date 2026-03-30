// ============================================================
// Integration Test — Dependencies & Advanced Scheduling (T4-I01 … T4-I04)
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

// ---- Helpers ----

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

function addTicket(id: string, jiraKey: string, estimateMinutes: number) {
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
    releaseId: null,
    locked: false,
    warnings: [],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  })
}

async function createAssignment(
  id: string,
  ticketId: string,
  userId: string,
  allocationPercent = 100,
  locked = false,
) {
  return app.inject({
    method: 'POST',
    url: '/api/assignments',
    payload: {
      id,
      ticketId,
      userId,
      role: 'dev',
      allocationPercent,
      startDate: null,
      endDate: null,
      durationDays: null,
      locked,
      createdAt: now,
      updatedAt: now,
    },
  })
}

async function createDependency(fromTicketId: string, toTicketId: string, type = 'finish_to_start') {
  return app.inject({
    method: 'POST',
    url: '/api/dependencies',
    payload: {
      id: `dep-${fromTicketId}-${toTicketId}`,
      fromTicketId,
      toTicketId,
      type,
      importedFromJira: false,
      createdAt: now,
    },
  })
}

// ---- Tests ----

describe('Dependencies CRUD', () => {
  it('POST + GET dipendenza', async () => {
    addTicket('t1', 'PROJ-1', 480)
    addTicket('t2', 'PROJ-2', 480)

    const postRes = await createDependency('t1', 't2')
    expect(postRes.statusCode).toBe(201)

    const getRes = await app.inject({ method: 'GET', url: '/api/dependencies' })
    expect(getRes.statusCode).toBe(200)
    const deps = getRes.json()
    expect(deps).toHaveLength(1)
    expect(deps[0].fromTicketId).toBe('t1')
    expect(deps[0].toTicketId).toBe('t2')
  })

  it('rifiuta dipendenza che crea ciclo', async () => {
    addTicket('t1', 'PROJ-1', 480)
    addTicket('t2', 'PROJ-2', 480)

    await createDependency('t1', 't2')
    const res = await createDependency('t2', 't1')
    expect(res.statusCode).toBe(400)
    expect(res.json().error).toContain('ciclo')
  })

  it('DELETE dipendenza', async () => {
    addTicket('t1', 'PROJ-1', 480)
    addTicket('t2', 'PROJ-2', 480)

    await createDependency('t1', 't2')
    const delRes = await app.inject({
      method: 'DELETE',
      url: '/api/dependencies/dep-t1-t2',
    })
    expect(delRes.statusCode).toBe(200)

    const getRes = await app.inject({ method: 'GET', url: '/api/dependencies' })
    expect(getRes.json()).toHaveLength(0)
  })

  it('filtra dipendenze per ticketId', async () => {
    addTicket('t1', 'PROJ-1', 480)
    addTicket('t2', 'PROJ-2', 480)
    addTicket('t3', 'PROJ-3', 480)

    await createDependency('t1', 't2')
    await createDependency('t2', 't3')

    const res = await app.inject({ method: 'GET', url: '/api/dependencies?ticketId=t2' })
    expect(res.json()).toHaveLength(2) // t1→t2 e t2→t3
  })
})

// T4-I02: Auto-plan con dipendenze
describe('T4-I02: Auto-plan con dipendenze', () => {
  it('schedule di 3 ticket con dipendenze → ordine e date coerenti', async () => {
    await createUser('user-1')
    addTicket('t1', 'PROJ-1', 480)
    addTicket('t2', 'PROJ-2', 480)
    addTicket('t3', 'PROJ-3', 480)

    await createAssignment('a1', 't1', 'user-1')
    await createAssignment('a2', 't2', 'user-1')
    await createAssignment('a3', 't3', 'user-1')

    await createDependency('t1', 't2')
    await createDependency('t2', 't3')

    const schedRes = await app.inject({
      method: 'POST',
      url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })
    expect(schedRes.statusCode).toBe(200)

    const result = schedRes.json()
    expect(result.scheduledCount).toBe(3)

    const s1 = result.scheduled.find((s: any) => s.ticketId === 't1')
    const s2 = result.scheduled.find((s: any) => s.ticketId === 't2')
    const s3 = result.scheduled.find((s: any) => s.ticketId === 't3')

    expect(s1).toBeDefined()
    expect(s2).toBeDefined()
    expect(s3).toBeDefined()

    // t1 finisce prima che t2 inizi, t2 finisce prima che t3 inizi
    expect(s2.startDate > s1.endDate).toBe(true)
    expect(s3.startDate > s2.endDate).toBe(true)
  })
})

// T4-I03: Override + ricalcolo
describe('T4-I03: Override + ricalcolo', () => {
  it('lock ticket + modifica → solo ticket non-locked ricalcolati', async () => {
    await createUser('user-1')
    addTicket('t1', 'PROJ-1', 480)
    addTicket('t2', 'PROJ-2', 480)

    await createAssignment('a1', 't1', 'user-1', 100, true)
    // Set date sul locked
    const store = getStore()
    const lockedAssignment = store.assignments.get('a1')!
    store.assignments.set('a1', {
      ...lockedAssignment,
      startDate: '2026-04-06',
      endDate: '2026-04-06',
      durationDays: 1,
    })

    await createAssignment('a2', 't2', 'user-1')

    const schedRes = await app.inject({
      method: 'POST',
      url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })
    const result = schedRes.json()

    // t1 locked non ricalcolato (mantenute date originali)
    const s1 = result.scheduled.find((s: any) => s.ticketId === 't1')
    expect(s1.startDate).toBe('2026-04-06')
    expect(s1.endDate).toBe('2026-04-06')

    // t2 ricalcolato
    const s2 = result.scheduled.find((s: any) => s.ticketId === 't2')
    expect(s2).toBeDefined()
    expect(s2.startDate).toBeDefined()
  })
})

// T4-I04: Alerts nel risultato dello scheduler
describe('T4-I04: Alerts nel risultato dello scheduler', () => {
  it('scheduler restituisce alerts', async () => {
    await createUser('user-1')
    addTicket('t-no-estimate', 'PROJ-99', null as any)
    await createAssignment('a1', 't-no-estimate', 'user-1')

    const schedRes = await app.inject({
      method: 'POST',
      url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })
    const result = schedRes.json()

    expect(result.alerts).toBeDefined()
    expect(result.alerts.length).toBeGreaterThan(0)
    expect(result.alerts.some((a: any) => a.type === 'missing_estimate')).toBe(true)
  })
})

// Impact analysis
describe('Impact Analysis API', () => {
  it('GET /api/dependencies/impact/:ticketId', async () => {
    addTicket('t1', 'PROJ-1', 480)
    addTicket('t2', 'PROJ-2', 480)
    addTicket('t3', 'PROJ-3', 480)

    await createDependency('t1', 't2')
    await createDependency('t2', 't3')

    const res = await app.inject({
      method: 'GET',
      url: '/api/dependencies/impact/t1',
    })
    expect(res.statusCode).toBe(200)
    const result = res.json()
    expect(result.impactedTicketIds).toContain('t2')
    expect(result.impactedTicketIds).toContain('t3')
  })
})

