// ============================================================
// Integration Test — API Routes (T1-I01 … T1-I04)
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

// ---- Helper ----

async function createUser(id = 'user-1') {
  return app.inject({
    method: 'POST',
    url: '/api/users',
    payload: {
      id,
      displayName: 'Mario Rossi',
      email: 'mario@example.com',
      appRole: 'dev',
      planningRoles: ['dev'],
      office: null,
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 0,
      active: true,
    },
  })
}

async function createTicketDirect(id: string, jiraKey: string, estimateMinutes: number) {
  const store = getStore()
  const now = new Date().toISOString()
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
  const now = new Date().toISOString()
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

// ---- Tests ----

describe('API — Health', () => {
  it('GET /api/health → 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ok')
  })
})

describe('API — Users CRUD', () => {
  it('POST + GET utente', async () => {
    const res = await createUser()
    expect(res.statusCode).toBe(201)

    const get = await app.inject({ method: 'GET', url: '/api/users/user-1' })
    expect(get.statusCode).toBe(200)
    expect(get.json().displayName).toBe('Mario Rossi')
  })

  it('GET utente non esistente → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/users/non-esiste' })
    expect(res.statusCode).toBe(404)
  })

  it('DELETE utente', async () => {
    await createUser()
    const del = await app.inject({ method: 'DELETE', url: '/api/users/user-1' })
    expect(del.statusCode).toBe(200)
    const get = await app.inject({ method: 'GET', url: '/api/users/user-1' })
    expect(get.statusCode).toBe(404)
  })
})

describe('API — Tickets', () => {
  it('GET /api/tickets → lista vuota iniziale', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tickets' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('PUT ticket → aggiorna campi', async () => {
    await createTicketDirect('t-1', 'PROJ-1', 960)
    const res = await app.inject({
      method: 'PUT',
      url: '/api/tickets/t-1',
      payload: { locked: true, priorityOverride: 1 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().locked).toBe(true)
    expect(res.json().priorityOverride).toBe(1)
  })
})

describe('API — Calendar', () => {
  it('POST + GET holiday', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/holidays',
      payload: { id: 'h-1', date: '2026-04-25', name: 'Liberazione', recurring: true, office: null },
    })
    expect(res.statusCode).toBe(201)

    const list = await app.inject({ method: 'GET', url: '/api/calendar/holidays' })
    expect(list.json()).toHaveLength(1)
    expect(list.json()[0].name).toBe('Liberazione')
  })

  it('DELETE holiday', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/calendar/holidays',
      payload: { id: 'h-1', date: '2026-04-25', name: 'Liberazione', recurring: true, office: null },
    })
    const del = await app.inject({ method: 'DELETE', url: '/api/calendar/holidays/h-1' })
    expect(del.statusCode).toBe(200)

    const list = await app.inject({ method: 'GET', url: '/api/calendar/holidays' })
    expect(list.json()).toHaveLength(0)
  })
})

describe('API — Assignments', () => {
  it('POST assignment + verifica referential integrity', async () => {
    await createUser()
    await createTicketDirect('t-1', 'PROJ-1', 960)

    const res = await createAssignment('a-1', 't-1', 'user-1')
    expect(res.statusCode).toBe(201)
  })

  it('POST assignment con ticket inesistente → 400', async () => {
    await createUser()
    const res = await createAssignment('a-1', 'non-esiste', 'user-1')
    expect(res.statusCode).toBe(400)
  })
})

// T1-I01: Import Jira + auto-schedule → date coerenti
describe('T1-I01: Scheduling integrato', () => {
  it('crea utente + ticket + assignment → schedule → date coerenti', async () => {
    await createUser()
    await createTicketDirect('t-1', 'PROJ-1', 960) // 16h = 2 giorni a 100%

    await createAssignment('a-1', 't-1', 'user-1', 100)

    const schedRes = await app.inject({
      method: 'POST',
      url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })

    expect(schedRes.statusCode).toBe(200)
    const body = schedRes.json()
    expect(body.scheduledCount).toBe(1)

    // Verifica che l'assignment abbia ricevuto le date
    const aRes = await app.inject({ method: 'GET', url: '/api/assignments/a-1' })
    const assignment = aRes.json()
    expect(assignment.startDate).toBe('2026-04-06')
    expect(assignment.endDate).toBe('2026-04-07')
    expect(assignment.durationDays).toBe(2)
  })
})

// T1-I02: Override manuale → ricalcolo ticket successivi
describe('T1-I02: Override manuale', () => {
  it('assignment locked mantiene le date dopo rischeduling', async () => {
    await createUser()
    await createTicketDirect('t-1', 'PROJ-1', 480)
    await createTicketDirect('t-2', 'PROJ-2', 480)

    // Primo assignment: locked con date forzate
    const store = getStore()
    const now = new Date().toISOString()
    store.assignments.set('a-1', {
      id: 'a-1',
      ticketId: 't-1',
      userId: 'user-1',
      role: 'dev',
      allocationPercent: 100,
      startDate: '2026-04-10',
      endDate: '2026-04-10',
      durationDays: 1,
      locked: true,
      createdAt: now,
      updatedAt: now,
    })
    await createAssignment('a-2', 't-2', 'user-1', 100)

    const schedRes = await app.inject({
      method: 'POST',
      url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })

    const body = schedRes.json()

    // L'assignment locked mantiene le sue date
    const a1 = body.scheduled.find((s: any) => s.assignmentId === 'a-1')
    expect(a1.startDate).toBe('2026-04-10')
    expect(a1.endDate).toBe('2026-04-10')
  })
})

// T1-I04: Aggiunta festivo → ricalcolo
describe('T1-I04: Calendario + scheduling', () => {
  it('aggiunta festivo → ricalcolo date con giorno saltato', async () => {
    await createUser()
    await createTicketDirect('t-1', 'PROJ-1', 1440) // 24h = 3 giorni

    await createAssignment('a-1', 't-1', 'user-1', 100)

    // Aggiungi festivo martedì
    await app.inject({
      method: 'POST',
      url: '/api/calendar/holidays',
      payload: { id: 'h-1', date: '2026-04-07', name: 'Festivo', recurring: false, office: null },
    })

    const schedRes = await app.inject({
      method: 'POST',
      url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })

    const body = schedRes.json()
    const s = body.scheduled.find((s: any) => s.assignmentId === 'a-1')
    expect(s.startDate).toBe('2026-04-06') // Lunedì
    expect(s.endDate).toBe('2026-04-09')   // Giovedì (martedì saltato)
  })
})

