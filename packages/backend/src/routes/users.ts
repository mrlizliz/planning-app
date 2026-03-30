// ============================================================
// Routes — Users CRUD
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import { userSchema } from '@planning/shared'

export async function userRoutes(app: FastifyInstance) {
  const prefix = '/api/users'

  // GET /api/users
  app.get(prefix, async () => {
    const store = getStore()
    return Array.from(store.users.values())
  })

  // GET /api/users/:id
  app.get(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const user = store.users.get(id)
    if (!user) {
      return reply.status(404).send({ error: 'Utente non trovato' })
    }
    return user
  })

  // POST /api/users
  app.post(prefix, async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const parsed = userSchema.safeParse(body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    const store = getStore()
    store.users.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  // PUT /api/users/:id
  app.put(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const existing = store.users.get(id)
    if (!existing) {
      return reply.status(404).send({ error: 'Utente non trovato' })
    }

    const body = request.body as Partial<typeof existing>
    const updated = { ...existing, ...body, id: existing.id }
    const parsed = userSchema.safeParse(updated)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    store.users.set(id, parsed.data)
    return parsed.data
  })

  // DELETE /api/users/:id
  app.delete(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.users.delete(id)) {
      return reply.status(404).send({ error: 'Utente non trovato' })
    }
    return { ok: true }
  })
}

