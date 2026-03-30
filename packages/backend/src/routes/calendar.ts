// ============================================================
// Routes — Calendar (holidays, exceptions, absences, meetings)
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import {
  holidaySchema,
  calendarExceptionSchema,
  absenceSchema,
  recurringMeetingSchema,
} from '@planning/shared'

export async function calendarRoutes(app: FastifyInstance) {
  // ---- Calendar ----
  app.get('/api/calendar', async () => {
    const store = getStore()
    return store.calendar
  })

  // ---- Holidays ----
  app.get('/api/calendar/holidays', async () => {
    return getStore().calendar.holidays
  })

  app.post('/api/calendar/holidays', async (request, reply) => {
    const parsed = holidaySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    const store = getStore()
    // Evita duplicati per data
    store.calendar.holidays = store.calendar.holidays.filter((h) => h.id !== parsed.data.id)
    store.calendar.holidays.push(parsed.data)
    return reply.status(201).send(parsed.data)
  })

  app.delete('/api/calendar/holidays/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const before = store.calendar.holidays.length
    store.calendar.holidays = store.calendar.holidays.filter((h) => h.id !== id)
    if (store.calendar.holidays.length === before) {
      return reply.status(404).send({ error: 'Festivo non trovato' })
    }
    return { ok: true }
  })

  // ---- Exceptions ----
  app.get('/api/calendar/exceptions', async () => {
    return getStore().calendar.exceptions
  })

  app.post('/api/calendar/exceptions', async (request, reply) => {
    const parsed = calendarExceptionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    const store = getStore()
    store.calendar.exceptions = store.calendar.exceptions.filter((e) => e.id !== parsed.data.id)
    store.calendar.exceptions.push(parsed.data)
    return reply.status(201).send(parsed.data)
  })

  app.delete('/api/calendar/exceptions/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    const before = store.calendar.exceptions.length
    store.calendar.exceptions = store.calendar.exceptions.filter((e) => e.id !== id)
    if (store.calendar.exceptions.length === before) {
      return reply.status(404).send({ error: 'Eccezione non trovata' })
    }
    return { ok: true }
  })

  // ---- Absences ----
  app.get('/api/absences', async (request) => {
    const store = getStore()
    const { userId } = request.query as { userId?: string }
    let absences = Array.from(store.absences.values())
    if (userId) {
      absences = absences.filter((a) => a.userId === userId)
    }
    return absences
  })

  app.post('/api/absences', async (request, reply) => {
    const parsed = absenceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    const store = getStore()
    store.absences.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  app.delete('/api/absences/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.absences.delete(id)) {
      return reply.status(404).send({ error: 'Assenza non trovata' })
    }
    return { ok: true }
  })

  // ---- Recurring Meetings ----
  app.get('/api/meetings', async (request) => {
    const store = getStore()
    const { userId } = request.query as { userId?: string }
    let meetings = Array.from(store.meetings.values())
    if (userId) {
      meetings = meetings.filter((m) => m.userId === userId || m.userId === null)
    }
    return meetings
  })

  app.post('/api/meetings', async (request, reply) => {
    const parsed = recurringMeetingSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Dati non validi', details: parsed.error.issues })
    }
    const store = getStore()
    store.meetings.set(parsed.data.id, parsed.data)
    return reply.status(201).send(parsed.data)
  })

  app.delete('/api/meetings/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const store = getStore()
    if (!store.meetings.delete(id)) {
      return reply.status(404).send({ error: 'Meeting non trovato' })
    }
    return { ok: true }
  })
}

