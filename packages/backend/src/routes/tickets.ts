// ============================================================
// Routes — Tickets CRUD + Jira Sync
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import { ticketSchema } from '@planning/shared'
import {
  mapJiraIssuesToTickets,
  type JiraIssue,
} from '@planning/shared'
import { JiraClient, JiraClientError } from '../services/jira-client.js'

export async function ticketRoutes(app: FastifyInstance) {
  const prefix = '/api/tickets'

  // GET /api/tickets — Lista tutti i ticket
  app.get(prefix, async () => {
    const store = getStore()
    return Array.from(store.tickets.values())
  })

  // GET /api/tickets/:id
  app.get(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const ticket = store.tickets.get(id)
    if (!ticket) {
      return reply.status(404).send({ error: 'Ticket non trovato' })
    }
    return ticket
  })

  // POST /api/tickets — Crea ticket
  app.post(prefix, async (request, reply) => {
    const body = request.body as Record<string, unknown>
    const parsed = ticketSchema.safeParse(body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    const store = getStore()
    store.tickets.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  // PUT /api/tickets/:id — Aggiorna ticket (override manuale PM)
  app.put(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const existing = store.tickets.get(id)
    if (!existing) {
      return reply.status(404).send({ error: 'Ticket non trovato' })
    }

    const body = request.body as Partial<typeof existing>
    const updated = {
      ...existing,
      ...body,
      id: existing.id,
      jiraKey: existing.jiraKey,
      updatedAt: new Date().toISOString(),
    }

    const parsed = ticketSchema.safeParse(updated)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }

    store.tickets.set(id, parsed.data)
    return parsed.data
  })

  // DELETE /api/tickets/:id
  app.delete(`${prefix}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.tickets.delete(id)) {
      return reply.status(404).send({ error: 'Ticket non trovato' })
    }
    // Rimuovi anche gli assignment collegati
    for (const [aId, a] of store.assignments) {
      if (a.ticketId === id) store.assignments.delete(aId)
    }
    return { ok: true }
  })

  // POST /api/tickets/sync-jira — Import da Jira
  app.post(`${prefix}/sync-jira`, async (request, reply) => {
    const body = request.body as {
      baseUrl: string
      email: string
      apiToken: string
      jql: string
    }

    if (!body.baseUrl || !body.email || !body.apiToken || !body.jql) {
      return reply.status(400).send({ error: 'Campi obbligatori: baseUrl, email, apiToken, jql' })
    }

    try {
      const client = new JiraClient({
        baseUrl: body.baseUrl,
        email: body.email,
        apiToken: body.apiToken,
      })

      const searchResult = await client.searchIssues(body.jql)
      const store = getStore()
      const existingTickets = Array.from(store.tickets.values())

      const mappingResults = mapJiraIssuesToTickets(searchResult.issues, existingTickets)

      // Salva i ticket nello store
      for (const result of mappingResults) {
        store.tickets.set(result.ticket.id, result.ticket)
      }

      return {
        imported: mappingResults.length,
        total: searchResult.total,
        tickets: mappingResults.map((r) => ({
          id: r.ticket.id,
          jiraKey: r.ticket.jiraKey,
          summary: r.ticket.summary,
          warnings: r.warnings,
        })),
      }
    } catch (error) {
      if (error instanceof JiraClientError) {
        return reply.status(error.statusCode >= 500 ? 502 : error.statusCode).send({
          error: 'Errore Jira',
          statusCode: error.statusCode,
          message: error.jiraMessage,
        })
      }
      throw error
    }
  })
}

