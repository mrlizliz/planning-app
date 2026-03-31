// ============================================================
// Test — Scheduler edge cases (regression)
// ============================================================

import { describe, it, expect } from 'vitest'
import { autoSchedule, type SchedulerInput } from '../../src/index.js'
import type { Ticket, Assignment, User, Absence, RecurringMeeting } from '../../src/index.js'

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1', displayName: 'Test User', email: 'test@test.com',
    appRole: 'dev', planningRoles: ['dev'], office: null,
    dailyWorkingMinutes: 480, dailyOverheadMinutes: 0, active: true,
    ...overrides,
  }
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  const now = new Date().toISOString()
  return {
    id: 't1', jiraKey: 'TEST-1', summary: 'Test ticket', description: null,
    estimateMinutes: 480, jiraPriority: 'medium', priorityOverride: null,
    status: 'backlog', phase: 'dev',
    jiraAssigneeEmail: null, jiraAssigneeName: null, jiraStatus: null,
    parentKey: null, fixVersions: [],
    milestoneId: null, releaseId: null,
    locked: false, warnings: [],
    lastSyncedAt: null, createdAt: now, updatedAt: now,
    ...overrides,
  }
}

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  const now = new Date().toISOString()
  return {
    id: 'a1', ticketId: 't1', userId: 'u1', role: 'dev',
    allocationPercent: 100, startDate: null, endDate: null,
    durationDays: null, locked: false,
    createdAt: now, updatedAt: now,
    ...overrides,
  }
}

function makeInput(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  return {
    tickets: [makeTicket()],
    assignments: [makeAssignment()],
    users: [makeUser()],
    calendar: { holidays: [], exceptions: [] },
    holidays: [],
    absences: [],
    meetings: [],
    dependencies: [],
    planningStartDate: '2026-04-06', // Lunedì
    ...overrides,
  }
}

describe('Scheduler — Edge cases', () => {
  it('ticket con estimateMinutes = 0 → errore missing_estimate', () => {
    const input = makeInput({
      tickets: [makeTicket({ estimateMinutes: 0 })],
    })
    const result = autoSchedule(input)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].reason).toBe('missing_estimate')
    expect(result.scheduled.length).toBe(0)
  })

  it('ticket con estimateMinutes = null → errore missing_estimate', () => {
    const input = makeInput({
      tickets: [makeTicket({ estimateMinutes: null })],
    })
    const result = autoSchedule(input)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].reason).toBe('missing_estimate')
  })

  it('assignment con utente inesistente → errore missing_user', () => {
    const input = makeInput({
      users: [], // nessun utente
    })
    const result = autoSchedule(input)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].reason).toBe('missing_user')
  })

  it('utente con capacità 0 (overhead = working) → errore zero_capacity', () => {
    const input = makeInput({
      users: [makeUser({ dailyWorkingMinutes: 480, dailyOverheadMinutes: 480 })],
    })
    const result = autoSchedule(input)
    expect(result.errors.length).toBe(1)
    expect(result.errors[0].reason).toBe('zero_capacity')
  })

  it('assignment locked → non viene rischedulato', () => {
    const input = makeInput({
      assignments: [makeAssignment({
        locked: true,
        startDate: '2026-04-06',
        endDate: '2026-04-06',
        durationDays: 1,
      })],
    })
    const result = autoSchedule(input)
    // Il locked viene preservato nei scheduled
    const locked = result.scheduled.find(s => s.assignmentId === 'a1')
    expect(locked).toBeDefined()
    expect(locked!.startDate).toBe('2026-04-06')
  })

  it('2 assignment sullo stesso utente → nessun crash + rileva sovrallocazione', () => {
    const input = makeInput({
      tickets: [
        makeTicket({ id: 't1', jiraKey: 'TEST-1', estimateMinutes: 480 }),
        makeTicket({ id: 't2', jiraKey: 'TEST-2', estimateMinutes: 480 }),
      ],
      assignments: [
        makeAssignment({ id: 'a1', ticketId: 't1', userId: 'u1' }),
        makeAssignment({ id: 'a2', ticketId: 't2', userId: 'u1' }),
      ],
    })
    const result = autoSchedule(input)
    expect(result.scheduled.length).toBe(2)
    // I due assignment dovrebbero essere sequenziali (non sovrapposti)
    const s1 = result.scheduled.find(s => s.assignmentId === 'a1')!
    const s2 = result.scheduled.find(s => s.assignmentId === 'a2')!
    // Il secondo deve iniziare dopo il primo
    expect(s2.startDate >= s1.endDate).toBe(true)
  })

  it('planning start date nel weekend → inizia il lunedì successivo', () => {
    const input = makeInput({
      planningStartDate: '2026-04-04', // Sabato
    })
    const result = autoSchedule(input)
    expect(result.scheduled.length).toBe(1)
    expect(result.scheduled[0].startDate).toBe('2026-04-06') // Lunedì
  })

  it('utente in ferie il giorno di start → salta al primo giorno disponibile', () => {
    const absences: Absence[] = [{
      id: 'abs-1', userId: 'u1',
      startDate: '2026-04-06', endDate: '2026-04-07',
      type: 'vacation', halfDay: false, notes: null,
    }]
    const input = makeInput({ absences })
    const result = autoSchedule(input)
    expect(result.scheduled.length).toBe(1)
    // Dovrebbe iniziare dal mercoledì (primo giorno lavorativo dopo ferie)
    expect(result.scheduled[0].startDate).toBe('2026-04-08')
  })

  it('ticket con stima molto grande → non va in loop infinito (max 365gg)', () => {
    const input = makeInput({
      tickets: [makeTicket({ estimateMinutes: 999999 })],
    })
    const result = autoSchedule(input)
    // Potrebbe errare con zero_capacity (se non riesce in 365gg) o schedulare con data lontana
    expect(result.scheduled.length + result.errors.length).toBe(1)
  })
})

