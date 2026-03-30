// ============================================================
// Routes — Assignments CRUD
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import { assignmentSchema } from '@planning/shared'

export async function assignmentRoutes(app: FastifyInstance) {
  const prefix = '/api/assignments'

  // GET /api/assignments
  app.get(prefix, async (request) => {
    const store = getStore()
    const { ticketId, userId } = request.query as { ticketId?: string; userId?: string }
    let assignments = Array.from(store.assignments.values())

    if (ticketId) {
      assignments = assignments.filter((a) => a.ticketId === ticketId)
    }
    if (userId) {
      assignments = assignments.filter((a) => a.userId === userId)
    }

    return assignments
  })

  // GET /api/assignments/:id
  app.get(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const assignment = store.assignments.get(id)
    if (!assignment) {
      return reply.status(404).send({ error: 'Assignment non trovato' })
    }
    return assignment
  })

  // POST /api/assignments
  app.post(prefix, async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const parsed = assignmentSchema.safeParse(body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }

    const store = getStore()

    // Verifica che ticket e utente esistano
    if (!store.tickets.has(parsed.data.ticketId)) {
      return reply.status(400).send({ error: 'Ticket non trovato' })
    }
    if (!store.users.has(parsed.data.userId)) {
      return reply.status(400).send({ error: 'Utente non trovato' })
    }

    store.assignments.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  // PUT /api/assignments/:id — Override manuale (date, allocazione, locked)
  app.put(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const existing = store.assignments.get(id)
    if (!existing) {
      return reply.status(404).send({ error: 'Assignment non trovato' })
    }

    const body = request.body as Partial<typeof existing>
    const updated = {
      ...existing,
      ...body,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    }

    const parsed = assignmentSchema.safeParse(updated)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }

    store.assignments.set(id, parsed.data)
    return parsed.data
  })

  // DELETE /api/assignments/:id
  app.delete(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.assignments.delete(id)) {
      return reply.status(404).send({ error: 'Assignment non trovato' })
    }
    return { ok: true }
  })
}

