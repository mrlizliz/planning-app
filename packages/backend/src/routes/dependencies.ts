// ============================================================
// Routes — Dependencies CRUD
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import { dependencySchema, detectCycles, getImpactedTickets } from '@planning/shared'
import type { Dependency } from '@planning/shared'

export async function dependencyRoutes(app: FastifyInstance) {
  const prefix = '/api/dependencies'

  // GET /api/dependencies — Lista tutte le dipendenze
  app.get(prefix, async (request) => {
    const store = getStore()
    const query = request.query as { ticketId?: string }

    let deps = Array.from(store.dependencies.values())

    if (query.ticketId) {
      deps = deps.filter(
        (d) => d.fromTicketId === query.ticketId || d.toTicketId === query.ticketId,
      )
    }

    return deps
  })

  // POST /api/dependencies — Crea dipendenza
  app.post(prefix, async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const parsed = dependencySchema.safeParse(body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }

    const dep = parsed.data as Dependency
    const store = getStore()

    // Verifica che entrambi i ticket esistano
    if (!store.tickets.has(dep.fromTicketId)) {
      return reply.status(400).send({ error: `Ticket sorgente ${dep.fromTicketId} non trovato` })
    }
    if (!store.tickets.has(dep.toTicketId)) {
      return reply.status(400).send({ error: `Ticket destinazione ${dep.toTicketId} non trovato` })
    }

    // Verifica che non crei un ciclo
    const allDeps = [...Array.from(store.dependencies.values()), dep]
    const cycleCheck = detectCycles(allDeps)
    if (cycleCheck.hasCycle) {
      return reply.status(400).send({
        error: 'La dipendenza creerebbe un ciclo',
        cycle: cycleCheck.cycle,
      })
    }

    // Verifica duplicato
    const exists = Array.from(store.dependencies.values()).some(
      (d) => d.fromTicketId === dep.fromTicketId && d.toTicketId === dep.toTicketId,
    )
    if (exists) {
      return reply.status(409).send({ error: 'Dipendenza già esistente' })
    }

    store.dependencies.set(dep.id, dep)
    return reply.status(201).send(dep)
  })

  // DELETE /api/dependencies/:id
  app.delete(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.dependencies.delete(id)) {
      return reply.status(404).send({ error: 'Dipendenza non trovata' })
    }
    return { ok: true }
  })

  // GET /api/dependencies/impact/:ticketId — Impact analysis
  app.get(`${prefix}/impact/:ticketId`, async (request) => {
    const { ticketId } = request.params as { ticketId: string }
    const store = getStore()

    const deps = Array.from(store.dependencies.values())
    const result = getImpactedTickets(ticketId, deps)

    // Arricchisci con info ticket
    const impactedTickets = result.impactedTicketIds
      .map((id: string) => store.tickets.get(id))
      .filter(Boolean)

    return {
      ...result,
      impactedTickets,
    }
  })
}



