// ============================================================
// T2-U01…U14 — Capacity reale, meeting, assenze, Outlook
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calculateDailyCapacity,
  getMeetingMinutesForDay,
  applyAllocation,
} from '../../src/scheduling/capacity.js'
import {
  filterOutlookEvents,
  mapEventsToCapacityBlocks,
  aggregateCapacityByDay,
} from '../../src/scheduling/outlook-mapper.js'
import { autoSchedule, type SchedulerInput } from '../../src/scheduling/scheduler.js'
import type { OutlookEvent, OutlookFilterConfig } from '../../src/types/outlook.js'
import { DEFAULT_OUTLOOK_FILTER } from '../../src/types/outlook.js'
import type { User } from '../../src/types/user.js'
import type { Ticket } from '../../src/types/ticket.js'
import type { Assignment } from '../../src/types/assignment.js'
import type { RecurringMeeting, Absence } from '../../src/types/calendar.js'

// ---- Fixtures ----

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    displayName: 'Mario Rossi',
    email: 'mario@example.com',
    appRole: 'dev',
    planningRoles: ['dev'],
    office: null,
    dailyWorkingMinutes: 480,
    dailyOverheadMinutes: 0,
    active: true,
    ...overrides,
  }
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  const now = new Date().toISOString()
  return {
    id: 't-1', jiraKey: 'PROJ-1', summary: 'Task',
    description: null, estimateMinutes: 480,
    jiraPriority: 'medium', priorityOverride: null,
    status: 'backlog', phase: 'dev',
    jiraAssigneeEmail: null, jiraAssigneeName: null, parentKey: null, fixVersions: [],
    milestoneId: null, releaseId: null,
    locked: false, warnings: [],
    lastSyncedAt: now, createdAt: now, updatedAt: now,
    ...overrides,
  }
}

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  const now = new Date().toISOString()
  return {
    id: 'a-1', ticketId: 't-1', userId: 'user-1',
    role: 'dev', allocationPercent: 100,
    startDate: null, endDate: null, durationDays: null,
    locked: false, createdAt: now, updatedAt: now,
    ...overrides,
  }
}

// ============================================================
// T2-U01: 8h/giorno, 1h meeting, 0.5h overhead → capacità netta = 6.5h (390min)
// ============================================================
describe('T2-U01: Capacità netta con meeting e overhead', () => {
  it('8h - 1h meeting - 0.5h overhead = 6.5h nette', () => {
    const result = calculateDailyCapacity({
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 30,
      meetingMinutes: 60,
      absent: false,
      halfDayAbsent: false,
    })
    expect(result.netMinutes).toBe(390) // 480 - 60 - 30
    expect(result.alert).toBe(false)
  })
})

// ============================================================
// T2-U02: Part-time 4h, nessun meeting → capacità netta = 4h
// ============================================================
describe('T2-U02: Persona part-time', () => {
  it('4h/giorno, 0 meeting, 0 overhead = 4h nette', () => {
    const result = calculateDailyCapacity({
      dailyWorkingMinutes: 240,
      dailyOverheadMinutes: 0,
      meetingMinutes: 0,
      absent: false,
      halfDayAbsent: false,
    })
    expect(result.netMinutes).toBe(240)
  })
})

// ============================================================
// T2-U03: Persona in ferie → capacità netta = 0h
// ============================================================
describe('T2-U03: Persona assente', () => {
  it('assenza giornata intera → 0', () => {
    const result = calculateDailyCapacity({
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 30,
      meetingMinutes: 60,
      absent: true,
      halfDayAbsent: false,
    })
    expect(result.netMinutes).toBe(0)
    expect(result.absenceMinutes).toBe(480)
    expect(result.alert).toBe(true)
  })
})

// ============================================================
// T2-U04: 3 meeting da 1h + 1h overhead = capacità netta ≤ 4h
// ============================================================
describe('T2-U04: Tanti meeting', () => {
  it('8h - 3h meeting - 1h overhead = 4h nette', () => {
    const result = calculateDailyCapacity({
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 60,
      meetingMinutes: 180,
      absent: false,
      halfDayAbsent: false,
    })
    expect(result.netMinutes).toBe(240) // 480 - 180 - 60
    expect(result.alert).toBe(false)
  })
})

// ============================================================
// T2-U05: Alert se capacità netta ≤ 0
// ============================================================
describe('T2-U05: Alert capacità zero', () => {
  it('meeting + overhead >= ore lavorative → alert', () => {
    const result = calculateDailyCapacity({
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 60,
      meetingMinutes: 480,
      absent: false,
      halfDayAbsent: false,
    })
    expect(result.netMinutes).toBe(0)
    expect(result.alert).toBe(true)
  })
})

// ============================================================
// T2-U06: Daily standup 15min × 5 giorni
// ============================================================
describe('T2-U06: Meeting ricorrente daily', () => {
  const meetings: RecurringMeeting[] = [{
    id: 'm-1', userId: null, name: 'Daily', type: 'standup',
    durationMinutes: 15, frequency: 'daily', dayOfWeek: null,
  }]

  it('15min ogni giorno lavorativo (lun-ven)', () => {
    for (let day = 1; day <= 5; day++) {
      expect(getMeetingMinutesForDay(day, meetings)).toBe(15)
    }
    // weekend: nessun meeting
    expect(getMeetingMinutesForDay(0, meetings)).toBe(0)
    expect(getMeetingMinutesForDay(6, meetings)).toBe(0)
  })
})

// ============================================================
// T2-U07: Meeting settimanale 1h → solo quel giorno
// ============================================================
describe('T2-U07: Meeting ricorrente settimanale', () => {
  const meetings: RecurringMeeting[] = [{
    id: 'm-2', userId: null, name: 'Refinement', type: 'refinement',
    durationMinutes: 60, frequency: 'weekly', dayOfWeek: 3, // mercoledì
  }]

  it('60min solo il mercoledì', () => {
    expect(getMeetingMinutesForDay(3, meetings)).toBe(60) // mercoledì
    expect(getMeetingMinutesForDay(1, meetings)).toBe(0)  // lunedì
    expect(getMeetingMinutesForDay(5, meetings)).toBe(0)  // venerdì
  })
})

// ============================================================
// T2-U08: Assenza half-day → capacità dimezzata
// ============================================================
describe('T2-U08: Half-day absence', () => {
  it('capacità dimezzata con halfDay', () => {
    const result = calculateDailyCapacity({
      dailyWorkingMinutes: 480,
      dailyOverheadMinutes: 30,
      meetingMinutes: 0,
      absent: false,
      halfDayAbsent: true,
    })
    // gross = 480, halfDay → absenceMinutes = 240, remainder = 240 - 0 - 30 = 210
    expect(result.absenceMinutes).toBe(240)
    expect(result.netMinutes).toBe(210)
  })
})

// ============================================================
// T2-U09: Outlook evento busy 2h → riduce capacità di 2h
// ============================================================
describe('T2-U09: Outlook evento busy', () => {
  const events: OutlookEvent[] = [{
    id: 'e-1', subject: 'Sprint Planning',
    start: '2026-04-06T10:00:00Z', end: '2026-04-06T12:00:00Z',
    showAs: 'busy', isAllDay: false, isOptional: false, isCancelled: false,
    organizerEmail: null,
  }]

  it('evento busy 2h → 120 minuti di blocco', () => {
    const filtered = filterOutlookEvents(events, DEFAULT_OUTLOOK_FILTER)
    expect(filtered).toHaveLength(1)

    const blocks = mapEventsToCapacityBlocks(filtered)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].minutes).toBe(120)
    expect(blocks[0].allDay).toBe(false)
  })
})

// ============================================================
// T2-U10: Evento free o tentative → non riduce capacità
// ============================================================
describe('T2-U10: Outlook eventi free/tentative ignorati', () => {
  const events: OutlookEvent[] = [
    {
      id: 'e-2', subject: 'Tentative',
      start: '2026-04-06T14:00:00Z', end: '2026-04-06T15:00:00Z',
      showAs: 'tentative', isAllDay: false, isOptional: false, isCancelled: false,
      organizerEmail: null,
    },
    {
      id: 'e-3', subject: 'Free Slot',
      start: '2026-04-06T16:00:00Z', end: '2026-04-06T17:00:00Z',
      showAs: 'free', isAllDay: false, isOptional: false, isCancelled: false,
      organizerEmail: null,
    },
  ]

  it('entrambi filtrati fuori', () => {
    const filtered = filterOutlookEvents(events, DEFAULT_OUTLOOK_FILTER)
    expect(filtered).toHaveLength(0)
  })
})

// ============================================================
// T2-U11: Evento all-day → capacità = 0
// ============================================================
describe('T2-U11: Outlook evento all-day', () => {
  const events: OutlookEvent[] = [{
    id: 'e-4', subject: 'Offsite',
    start: '2026-04-06T00:00:00Z', end: '2026-04-07T00:00:00Z',
    showAs: 'busy', isAllDay: true, isOptional: false, isCancelled: false,
    organizerEmail: null,
  }]

  it('all-day busy → allDay = true', () => {
    const filtered = filterOutlookEvents(events, DEFAULT_OUTLOOK_FILTER)
    const blocks = mapEventsToCapacityBlocks(filtered)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].allDay).toBe(true)
  })
})

// ============================================================
// T2-U12: Evento < soglia minima → ignorato
// ============================================================
describe('T2-U12: Outlook evento sotto soglia', () => {
  const events: OutlookEvent[] = [{
    id: 'e-5', subject: 'Quick sync',
    start: '2026-04-06T10:00:00Z', end: '2026-04-06T10:10:00Z', // 10 min
    showAs: 'busy', isAllDay: false, isOptional: false, isCancelled: false,
    organizerEmail: null,
  }]

  it('evento 10min < soglia 15min → filtrato', () => {
    const filtered = filterOutlookEvents(events, DEFAULT_OUTLOOK_FILTER)
    expect(filtered).toHaveLength(0)
  })
})

// ============================================================
// T2-U13: Evento isOptional → ignorato
// ============================================================
describe('T2-U13: Outlook evento opzionale', () => {
  const events: OutlookEvent[] = [{
    id: 'e-6', subject: 'Optional Brown Bag',
    start: '2026-04-06T12:00:00Z', end: '2026-04-06T13:00:00Z',
    showAs: 'busy', isAllDay: false, isOptional: true, isCancelled: false,
    organizerEmail: null,
  }]

  it('evento opzionale → filtrato', () => {
    const filtered = filterOutlookEvents(events, DEFAULT_OUTLOOK_FILTER)
    expect(filtered).toHaveLength(0)
  })
})

// ============================================================
// T2-U14: Ricalcolo durata ticket dopo riduzione capacità per meeting
// ============================================================
describe('T2-U14: Scheduler con meeting riduce capacità → durata aumenta', () => {
  it('ticket 8h con daily standup 1h → dura più di 1 giorno', () => {
    const meetings: RecurringMeeting[] = [{
      id: 'm-daily', userId: null, name: 'Daily',
      type: 'standup', durationMinutes: 60,
      frequency: 'daily', dayOfWeek: null,
    }]

    const input: SchedulerInput = {
      tickets: [makeTicket({ estimateMinutes: 480 })],
      assignments: [makeAssignment()],
      users: [makeUser({ dailyOverheadMinutes: 0 })],
      calendar: { holidays: [], exceptions: [] },
      holidays: [],
      absences: [],
      meetings,
      planningStartDate: '2026-04-06', // Lunedì
    }

    const result = autoSchedule(input)
    expect(result.scheduled).toHaveLength(1)

    const s = result.scheduled[0]
    // 480min / (480-60=420 min/giorno) = ~1.14 → 2 giorni
    expect(s.durationDays).toBe(2)
    expect(s.startDate).toBe('2026-04-06')
    expect(s.endDate).toBe('2026-04-07')
  })

  it('ticket 16h con persona in ferie lunedì → inizia martedì', () => {
    const absences: Absence[] = [{
      id: 'abs-1', userId: 'user-1', date: '2026-04-06',
      type: 'vacation', halfDay: false, notes: null,
    }]

    const input: SchedulerInput = {
      tickets: [makeTicket({ estimateMinutes: 960 })],
      assignments: [makeAssignment()],
      users: [makeUser()],
      calendar: { holidays: [], exceptions: [] },
      holidays: [],
      absences,
      meetings: [],
      planningStartDate: '2026-04-06',
    }

    const result = autoSchedule(input)
    const s = result.scheduled[0]
    // Lunedì in ferie → capacity 0 → salta a martedì
    // 960min / 480 = 2 giorni → mar+mer
    expect(s.startDate).toBe('2026-04-07') // Martedì
    expect(s.endDate).toBe('2026-04-08')
    expect(s.durationDays).toBe(2)
  })
})

