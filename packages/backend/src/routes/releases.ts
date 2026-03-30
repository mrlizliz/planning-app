// ============================================================
// Routes — Milestones, Releases, Deployment, Gates
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import {
  milestoneSchema,
  releaseSchema,
  deploymentDaySchema,
  deploymentWindowSchema,
  calculateMilestoneStatus,
  calculateReleaseForecast,
  canStartQA,
  isReadyForRelease,
  nextDeployDay,
  checkDeployWarning,
} from '@planning/shared'

export async function releaseRoutes(app: FastifyInstance) {

  // ---- Milestones ----

  app.get('/api/milestones', async () => {
    const store = getStore()
    const milestones = Array.from(store.milestones.values())
    // Arricchisci con stato calcolato
    return milestones.map((ms) => {
      const ticketEndDates = Array.from(store.tickets.values())
        .filter((t) => t.milestoneId === ms.id)
        .map((t) => {
          const assignment = Array.from(store.assignments.values())
            .find((a) => a.ticketId === t.id && a.endDate)
          return assignment?.endDate
        })
        .filter((d): d is string => d !== undefined && d !== null)

      return { ...ms, status: calculateMilestoneStatus(ms, ticketEndDates) }
    })
  })

  app.post('/api/milestones', async (request, reply) => {
    const parsed = milestoneSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    const store = getStore()
    store.milestones.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  app.put('/api/milestones/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const existing = store.milestones.get(id)
    if (!existing) return reply.status(404).send({ error: 'Milestone non trovata' })
    const updated = { ...existing, ...(request.body as object), id, updatedAt: new Date().toISOString() }
    store.milestones.set(id, updated)
    return updated
  })

  app.delete('/api/milestones/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.milestones.delete(id)) {
      return reply.status(404).send({ error: 'Milestone non trovata' })
    }
    return { ok: true }
  })

  // ---- Releases ----

  app.get('/api/releases', async () => {
    const store = getStore()
    const releases = Array.from(store.releases.values())
    return releases.map((rel) => {
      const ticketEndDates = Array.from(store.tickets.values())
        .filter((t) => t.releaseId === rel.id)
        .map((t) => {
          const assignment = Array.from(store.assignments.values())
            .find((a) => a.ticketId === t.id && a.endDate)
          return assignment?.endDate
        })
        .filter((d): d is string => d !== undefined && d !== null)

      return { ...rel, forecastDate: calculateReleaseForecast(ticketEndDates) }
    })
  })

  app.post('/api/releases', async (request, reply) => {
    const parsed = releaseSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    const store = getStore()
    store.releases.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  app.put('/api/releases/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const existing = store.releases.get(id)
    if (!existing) return reply.status(404).send({ error: 'Release non trovata' })
    const updated = { ...existing, ...(request.body as object), id, updatedAt: new Date().toISOString() }
    store.releases.set(id, updated)
    return updated
  })

  app.delete('/api/releases/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.releases.delete(id)) {
      return reply.status(404).send({ error: 'Release non trovata' })
    }
    return { ok: true }
  })

  // ---- Deployment Days ----

  app.get('/api/deploy/days', async () => {
    return Array.from(getStore().deployDays.values())
  })

  app.post('/api/deploy/days', async (request, reply) => {
    const parsed = deploymentDaySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    getStore().deployDays.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  app.delete('/api/deploy/days/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!getStore().deployDays.delete(id)) {
      return reply.status(404).send({ error: 'Deploy day non trovato' })
    }
    return { ok: true }
  })

  // ---- Deployment Windows ----

  app.get('/api/deploy/windows', async () => {
    return Array.from(getStore().deployWindows.values())
  })

  app.post('/api/deploy/windows', async (request, reply) => {
    const parsed = deploymentWindowSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    getStore().deployWindows.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  app.delete('/api/deploy/windows/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    if (!getStore().deployWindows.delete(id)) {
      return reply.status(404).send({ error: 'Deploy window non trovata' })
    }
    return { ok: true }
  })
}

