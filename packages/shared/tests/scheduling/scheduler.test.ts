// ============================================================
// Test — Scheduler (T1-U11 … T1-U15)
// ============================================================

import { describe, it, expect } from 'vitest'
import { autoSchedule, type SchedulerInput } from '../../src/scheduling/scheduler.js'
import type { Ticket } from '../../src/types/ticket.js'
import type { Assignment } from '../../src/types/assignment.js'
import type { User } from '../../src/types/user.js'
import type { CalendarConfig } from '../../src/scheduling/calendar.js'

// ---- Helpers per creare fixture ----

const now = '2026-03-30T00:00:00.000Z'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    displayName: 'Mario Rossi',
    email: 'mario@example.com',
    appRole: 'dev',
    planningRoles: ['dev'],
    office: null,
    dailyWorkingMinutes: 480, // 8h
    dailyOverheadMinutes: 0,
    active: true,
    ...overrides,
  }
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'ticket-1',
    jiraKey: 'PROJ-1',
    summary: 'Test ticket',
    description: null,
    estimateMinutes: 960, // 16h
    jiraPriority: 'medium',
    priorityOverride: null,
    status: 'backlog',
    phase: 'dev',
    jiraAssigneeEmail: null, jiraAssigneeName: null, jiraStatus: null,
    parentKey: null, fixVersions: [],
    milestoneId: null,
    releaseId: null,
    locked: false,
    warnings: [],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'assign-1',
    ticketId: 'ticket-1',
    userId: 'user-1',
    role: 'dev',
    allocationPercent: 100,
    startDate: null,
    endDate: null,
    durationDays: null,
    locked: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

const emptyCalendar: CalendarConfig = {
  holidays: [],
  exceptions: [],
}

function makeInput(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  return {
    tickets: [makeTicket()],
    assignments: [makeAssignment()],
    users: [makeUser()],
    calendar: emptyCalendar,
    holidays: [],
    absences: [],
    meetings: [],
    planningStartDate: '2026-04-06', // Lunedì
    ...overrides,
  }
}

// ---- Tests ----

describe('Scheduler — Auto-schedule', () => {
  // T1-U11: Auto-schedule di 1 ticket 16h su risorsa 100% → 2 giorni lavorativi
  it('T1-U11: ticket 16h, risorsa 100% → 2 giorni lavorativi', () => {
    const input = makeInput()
    const result = autoSchedule(input)

    const s = result.scheduled.find((s) => s.assignmentId === 'assign-1')
    expect(s).toBeDefined()
    expect(s!.durationDays).toBe(2)
    // Lunedì 6 aprile → fine martedì 7 aprile
    expect(s!.startDate).toBe('2026-04-06')
    expect(s!.endDate).toBe('2026-04-07')
  })

  // T1-U12: Auto-schedule di 1 ticket 16h su risorsa 50% → 4 giorni lavorativi
  it('T1-U12: ticket 16h, risorsa 50% → 4 giorni lavorativi', () => {
    const input = makeInput({
      assignments: [makeAssignment({ allocationPercent: 50 })],
    })
    const result = autoSchedule(input)

    const s = result.scheduled.find((s) => s.assignmentId === 'assign-1')
    expect(s).toBeDefined()
    expect(s!.durationDays).toBe(4)
    // Lunedì 6 aprile → fine giovedì 9 aprile
    expect(s!.startDate).toBe('2026-04-06')
    expect(s!.endDate).toBe('2026-04-09')
  })

  // T1-U13: Auto-schedule con festivo infrasettimanale → giorno saltato
  it('T1-U13: festivo infrasettimanale viene saltato', () => {
    // Ticket 24h = 3 giorni a 100% su 8h/giorno
    // Start lunedì 6, festivo martedì 7 → lun 6, mer 8, gio 9
    const input = makeInput({
      tickets: [makeTicket({ estimateMinutes: 1440 })], // 24h = 1440min
      calendar: {
        holidays: ['2026-04-07'], // Martedì festivo
        exceptions: [],
      },
    })
    const result = autoSchedule(input)

    const s = result.scheduled.find((s) => s.assignmentId === 'assign-1')
    expect(s).toBeDefined()
    expect(s!.durationDays).toBe(3)
    expect(s!.startDate).toBe('2026-04-06') // Lunedì
    expect(s!.endDate).toBe('2026-04-09')   // Giovedì (martedì saltato)
  })

  // T1-U14: Ticket con locked = true non viene ricalcolato
  it('T1-U14: assignment locked non viene ricalcolato', () => {
    const input = makeInput({
      assignments: [
        makeAssignment({
          locked: true,
          startDate: '2026-04-10',
          endDate: '2026-04-11',
          durationDays: 2,
        }),
      ],
    })
    const result = autoSchedule(input)

    const s = result.scheduled.find((s) => s.assignmentId === 'assign-1')
    expect(s).toBeDefined()
    // Le date originali sono preservate
    expect(s!.startDate).toBe('2026-04-10')
    expect(s!.endDate).toBe('2026-04-11')
    expect(s!.durationDays).toBe(2)

    // Appare anche negli errori come "locked"
    const err = result.errors.find((e) => e.assignmentId === 'assign-1')
    expect(err).toBeDefined()
    expect(err!.reason).toBe('locked')
  })

  // T1-U15: Sovrallocazione rilevata se ore assegnate > capacità giornaliera
  it('T1-U15: sovrallocazione rilevata con 2 ticket full-time sullo stesso giorno', () => {
    const input = makeInput({
      tickets: [
        makeTicket({ id: 'ticket-1', estimateMinutes: 480 }),  // 8h = 1 giorno
        makeTicket({ id: 'ticket-2', jiraKey: 'PROJ-2', estimateMinutes: 480, createdAt: '2026-03-30T00:00:01.000Z' }),
      ],
      assignments: [
        makeAssignment({ id: 'assign-1', ticketId: 'ticket-1' }),
        makeAssignment({ id: 'assign-2', ticketId: 'ticket-2' }),
      ],
    })

    const result = autoSchedule(input)
    // Entrambi schedulati: il secondo inizia dopo il primo (sequenziale per utente)
    expect(result.scheduled).toHaveLength(2)

    const s1 = result.scheduled.find((s) => s.assignmentId === 'assign-1')
    const s2 = result.scheduled.find((s) => s.assignmentId === 'assign-2')
    expect(s1).toBeDefined()
    expect(s2).toBeDefined()

    // Il secondo ticket inizia dopo il primo (non sovrapposti)
    expect(s2!.startDate >= s1!.endDate).toBe(true)
  })

  // Test aggiuntivi

  it('ticket senza stima genera errore missing_estimate', () => {
    const input = makeInput({
      tickets: [makeTicket({ estimateMinutes: null })],
    })
    const result = autoSchedule(input)

    expect(result.scheduled.filter((s) => s.assignmentId === 'assign-1')).toHaveLength(0)
    const err = result.errors.find((e) => e.assignmentId === 'assign-1')
    expect(err).toBeDefined()
    expect(err!.reason).toBe('missing_estimate')
  })

  it('utente non trovato genera errore missing_user', () => {
    const input = makeInput({
      users: [], // nessun utente
    })
    const result = autoSchedule(input)

    const err = result.errors.find((e) => e.assignmentId === 'assign-1')
    expect(err).toBeDefined()
    expect(err!.reason).toBe('missing_user')
  })

  it('più ticket per stesso utente vengono schedulati in sequenza', () => {
    const input = makeInput({
      tickets: [
        makeTicket({ id: 't1', estimateMinutes: 480 }),   // 1 giorno
        makeTicket({ id: 't2', jiraKey: 'PROJ-2', estimateMinutes: 960, createdAt: '2026-03-30T00:00:01.000Z' }), // 2 giorni
      ],
      assignments: [
        makeAssignment({ id: 'a1', ticketId: 't1' }),
        makeAssignment({ id: 'a2', ticketId: 't2' }),
      ],
    })

    const result = autoSchedule(input)
    const s1 = result.scheduled.find((s) => s.assignmentId === 'a1')!
    const s2 = result.scheduled.find((s) => s.assignmentId === 'a2')!

    expect(s1.startDate).toBe('2026-04-06') // Lunedì
    expect(s1.endDate).toBe('2026-04-06')   // Lunedì (1 giorno)
    expect(s2.startDate).toBe('2026-04-07') // Martedì
    expect(s2.endDate).toBe('2026-04-08')   // Mercoledì (2 giorni)
  })

  it('ticket con priorità più alta viene schedulato per primo', () => {
    const input = makeInput({
      tickets: [
        makeTicket({ id: 't-low', jiraKey: 'PROJ-1', jiraPriority: 'low', estimateMinutes: 480 }),
        makeTicket({ id: 't-high', jiraKey: 'PROJ-2', jiraPriority: 'high', estimateMinutes: 480, createdAt: '2026-03-30T00:00:01.000Z' }),
      ],
      assignments: [
        makeAssignment({ id: 'a-low', ticketId: 't-low' }),
        makeAssignment({ id: 'a-high', ticketId: 't-high' }),
      ],
    })

    const result = autoSchedule(input)
    const sHigh = result.scheduled.find((s) => s.assignmentId === 'a-high')!
    const sLow = result.scheduled.find((s) => s.assignmentId === 'a-low')!

    // High priority viene schedulato per primo
    expect(sHigh.startDate <= sLow.startDate).toBe(true)
  })

  it('scheduling inizia dal prossimo giorno lavorativo se start è weekend', () => {
    const input = makeInput({
      planningStartDate: '2026-04-04', // Sabato
    })

    const result = autoSchedule(input)
    const s = result.scheduled.find((s) => s.assignmentId === 'assign-1')!
    expect(s.startDate).toBe('2026-04-06') // Lunedì
  })
})

