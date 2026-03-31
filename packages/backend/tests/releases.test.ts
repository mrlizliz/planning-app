// ============================================================
// T3-I01…I04 — Integration: Milestone, Release, Deploy
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

async function seedUser(id = 'user-1') {
  return app.inject({
    method: 'POST', url: '/api/users',
    payload: {
      id, displayName: 'Mario', email: 'mario@test.com',
      appRole: 'dev', planningRoles: ['dev'], office: null,
      dailyWorkingMinutes: 480, dailyOverheadMinutes: 0, active: true,
    },
  })
}

function seedTicket(id: string, estimate: number, milestoneId: string | null = null, releaseId: string | null = null) {
  const store = getStore()
  const now = new Date().toISOString()
  store.tickets.set(id, {
    id, jiraKey: `PROJ-${id}`, summary: `Ticket ${id}`, description: null,
    estimateMinutes: estimate, jiraPriority: 'medium', priorityOverride: null,
    status: 'backlog', phase: 'dev', jiraAssigneeEmail: null, jiraAssigneeName: null, jiraStatus: null, parentKey: null, fixVersions: [],
    milestoneId, releaseId, locked: false, warnings: [],
    lastSyncedAt: now, createdAt: now, updatedAt: now,
  })
}

async function seedAssignment(id: string, ticketId: string, userId: string, alloc = 100) {
  const now = new Date().toISOString()
  return app.inject({
    method: 'POST', url: '/api/assignments',
    payload: {
      id, ticketId, userId, role: 'dev', allocationPercent: alloc,
      startDate: null, endDate: null, durationDays: null,
      locked: false, createdAt: now, updatedAt: now,
    },
  })
}

// ============================================================
// T3-I01: Milestone + Scheduling → stato ricalcolato
// ============================================================
describe('T3-I01: Milestone + Scheduling', () => {
  it('crea milestone, associa ticket, schedule → stato calcolato', async () => {
    await seedUser()

    // Crea milestone target 30 aprile
    await app.inject({
      method: 'POST', url: '/api/milestones',
      payload: {
        id: 'ms-1', name: 'MVP', description: null,
        targetDate: '2026-04-30', status: 'on_track',
        createdAt: '2026-03-30T00:00:00Z', updatedAt: '2026-03-30T00:00:00Z',
      },
    })

    // Ticket con milestone, stima 8h = 1 giorno
    seedTicket('t1', 480, 'ms-1')
    await seedAssignment('a1', 't1', 'user-1')

    // Schedule
    await app.inject({
      method: 'POST', url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })

    // Verifica stato milestone
    const res = await app.inject({ method: 'GET', url: '/api/milestones' })
    const milestones = res.json()
    expect(milestones).toHaveLength(1)
    expect(milestones[0].status).toBe('on_track') // 6 aprile << 30 aprile
  })
})

// ============================================================
// T3-I02: Release forecast aggiornato dopo scheduling
// ============================================================
describe('T3-I02: Release forecast', () => {
  it('schedule → forecast release = max endDate ticket', async () => {
    await seedUser()

    await app.inject({
      method: 'POST', url: '/api/releases',
      payload: {
        id: 'r-1', name: 'v1.0', description: null,
        targetDate: '2026-05-15', forecastDate: null,
        createdAt: '2026-03-30T00:00:00Z', updatedAt: '2026-03-30T00:00:00Z',
      },
    })

    seedTicket('t1', 480, null, 'r-1')  // 8h = 1 giorno
    seedTicket('t2', 960, null, 'r-1')  // 16h = 2 giorni
    await seedAssignment('a1', 't1', 'user-1')
    await seedAssignment('a2', 't2', 'user-1')

    await app.inject({
      method: 'POST', url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })

    const res = await app.inject({ method: 'GET', url: '/api/releases' })
    const releases = res.json()
    expect(releases).toHaveLength(1)
    expect(releases[0].forecastDate).not.toBeNull()
  })
})

// ============================================================
// T3-I03: Deploy window → warning
// ============================================================
describe('T3-I03: Deploy days CRUD', () => {
  it('crea deploy day + verifica lista', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/deploy/days',
      payload: { id: 'dd-1', environment: 'dev', dayOfWeek: 2, active: true },
    })
    expect(res.statusCode).toBe(201)

    const list = await app.inject({ method: 'GET', url: '/api/deploy/days' })
    expect(list.json()).toHaveLength(1)
    expect(list.json()[0].environment).toBe('dev')
  })
})

// ============================================================
// T3-I04: Gate flow — verifica integrità
// ============================================================
describe('T3-I04: Full flow milestone + release + deploy', () => {
  it('milestone delayed se ticket supera target', async () => {
    await seedUser()

    await app.inject({
      method: 'POST', url: '/api/milestones',
      payload: {
        id: 'ms-1', name: 'Tight', description: null,
        targetDate: '2026-04-07', status: 'on_track',
        createdAt: '2026-03-30T00:00:00Z', updatedAt: '2026-03-30T00:00:00Z',
      },
    })

    // Ticket 16h = 2 giorni → finisce 7/4 (martedì) = targetDate → at_risk o on_track
    // Ticket 24h = 3 giorni → finisce 8/4 → delayed
    seedTicket('t1', 1440, 'ms-1')
    await seedAssignment('a1', 't1', 'user-1')

    await app.inject({
      method: 'POST', url: '/api/scheduler/run',
      payload: { planningStartDate: '2026-04-06' },
    })

    const res = await app.inject({ method: 'GET', url: '/api/milestones' })
    expect(res.json()[0].status).toBe('delayed')
  })
})

