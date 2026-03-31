// ============================================================
// Integration Test — New Features (Auth, Bulk, Scenario Schedule, PUT Validation)
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

function createUserPayload(id = 'user-1', email = 'mario@example.com') {
  return {
    id,
    displayName: 'Mario Rossi',
    email,
    appRole: 'dev',
    planningRoles: ['dev'],
    office: null,
    dailyWorkingMinutes: 480,
    dailyOverheadMinutes: 0,
    active: true,
  }
}

function createTicketPayload(id: string, jiraKey: string, estimateMinutes = 480) {
  const now = new Date().toISOString()
  return {
    id, jiraKey, summary: `Ticket ${jiraKey}`, description: null,
    estimateMinutes, jiraPriority: 'medium', priorityOverride: null,
    status: 'backlog' as const, phase: 'dev' as const,
    jiraAssigneeEmail: null, jiraAssigneeName: null, jiraStatus: null,
    parentKey: null, fixVersions: [],
    milestoneId: null, releaseId: null,
    locked: false, warnings: [] as string[],
    lastSyncedAt: now, createdAt: now, updatedAt: now,
  }
}

// ---- Auth ----

describe('Auth — JWT Login', () => {
  it('POST /api/auth/login con utente esistente → token JWT', async () => {
    // Crea utente nello store
    await app.inject({ method: 'POST', url: '/api/users', payload: createUserPayload() })

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'mario@example.com' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.token).toBeDefined()
    expect(body.user.email).toBe('mario@example.com')
  })

  it('POST /api/auth/login con email inesistente → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'non-esiste@example.com' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/auth/me senza token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
  })

  it('GET /api/auth/me con token valido → profilo utente', async () => {
    await app.inject({ method: 'POST', url: '/api/users', payload: createUserPayload() })
    const loginRes = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'mario@example.com' },
    })
    const { token } = JSON.parse(loginRes.payload)

    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.email).toBe('mario@example.com')
  })
})

// ---- PUT Validation ----

describe('PUT Validation — Milestones & Releases', () => {
  it('PUT /api/milestones/:id con dati invalidi → 400', async () => {
    const store = getStore()
    const now = new Date().toISOString()
    store.milestones.set('ms-1', {
      id: 'ms-1', name: 'Milestone 1', description: null,
      targetDate: '2026-06-01', status: 'on_track', createdAt: now, updatedAt: now,
    })

    const res = await app.inject({
      method: 'PUT', url: '/api/milestones/ms-1',
      payload: { name: '' }, // name min(1) → invalido
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /api/releases/:id con dati invalidi → 400', async () => {
    const store = getStore()
    const now = new Date().toISOString()
    store.releases.set('rel-1', {
      id: 'rel-1', name: 'Release 1', description: null,
      targetDate: '2026-07-01', forecastDate: null, createdAt: now, updatedAt: now,
    })

    const res = await app.inject({
      method: 'PUT', url: '/api/releases/rel-1',
      payload: { targetDate: 'invalid' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /api/milestones/:id con dati validi → 200', async () => {
    const store = getStore()
    const now = new Date().toISOString()
    store.milestones.set('ms-1', {
      id: 'ms-1', name: 'Milestone 1', description: null,
      targetDate: '2026-06-01', status: 'on_track', createdAt: now, updatedAt: now,
    })

    const res = await app.inject({
      method: 'PUT', url: '/api/milestones/ms-1',
      payload: { name: 'Milestone 1 Updated' },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.name).toBe('Milestone 1 Updated')
  })
})

// ---- Bulk Update ----

describe('Bulk Update — Ticket batch', () => {
  it('PUT /api/tickets/bulk aggiorna milestone di N ticket', async () => {
    const store = getStore()
    const t1 = createTicketPayload('t-1', 'LP-1')
    const t2 = createTicketPayload('t-2', 'LP-2')
    store.tickets.set('t-1', t1)
    store.tickets.set('t-2', t2)

    const res = await app.inject({
      method: 'PUT', url: '/api/tickets/bulk',
      payload: { ticketIds: ['t-1', 't-2'], changes: { milestoneId: 'ms-1' } },
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.payload)
    expect(body.updatedCount).toBe(2)

    expect(store.tickets.get('t-1')!.milestoneId).toBe('ms-1')
    expect(store.tickets.get('t-2')!.milestoneId).toBe('ms-1')
  })

  it('PUT /api/tickets/bulk senza ticketIds → 400', async () => {
    const res = await app.inject({
      method: 'PUT', url: '/api/tickets/bulk',
      payload: { ticketIds: [], changes: {} },
    })
    expect(res.statusCode).toBe(400)
  })
})

// ---- Scenario Schedule ----

describe('Scenario Schedule — Auto-schedule dentro scenario', () => {
  it('POST /api/scenarios/:id/schedule schedula gli assignment nello scenario', async () => {
    // Setup
    await app.inject({ method: 'POST', url: '/api/users', payload: createUserPayload() })
    const store = getStore()
    const t1 = createTicketPayload('t-1', 'LP-1', 480)
    store.tickets.set('t-1', t1)

    const now = new Date().toISOString()
    store.assignments.set('a-1', {
      id: 'a-1', ticketId: 't-1', userId: 'user-1', role: 'dev',
      allocationPercent: 100, startDate: null, endDate: null,
      durationDays: null, locked: false, createdAt: now, updatedAt: now,
    })

    // Crea scenario
    const createRes = await app.inject({
      method: 'POST', url: '/api/scenarios',
      payload: { name: 'Test scenario' },
    })
    const scenario = JSON.parse(createRes.payload)

    // Schedule dentro lo scenario
    const schedRes = await app.inject({
      method: 'POST', url: `/api/scenarios/${scenario.id}/schedule`,
    })
    expect(schedRes.statusCode).toBe(200)
    const schedBody = JSON.parse(schedRes.payload)
    expect(schedBody.scheduledCount).toBeGreaterThanOrEqual(1)

    // Verifica che lo scenario ha date aggiornate
    const updatedScenario = schedBody.scenario
    const sa = updatedScenario.snapshot.assignments.find((a: any) => a.assignmentId === 'a-1')
    expect(sa.startDate).toBeDefined()
    expect(sa.endDate).toBeDefined()

    // Verifica che lo stato corrente NON è stato modificato
    const originalAssignment = store.assignments.get('a-1')!
    expect(originalAssignment.startDate).toBeNull()
  })
})


