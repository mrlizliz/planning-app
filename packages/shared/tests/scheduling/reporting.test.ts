// ============================================================
// Test — Reporting & CSV (T5-U08)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  generatePlanningReport,
  generateReleaseReport,
  toCSV,
} from '../../src/scheduling/reporting.js'
import type { Ticket } from '../../src/types/ticket.js'
import type { Assignment } from '../../src/types/assignment.js'
import type { User } from '../../src/types/user.js'
import type { Release } from '../../src/types/release.js'
import type { Milestone } from '../../src/types/milestone.js'
import type { ScheduledAssignment } from '../../src/scheduling/scheduler.js'

const now = '2026-03-30T00:00:00.000Z'

function makeTicket(id: string, releaseId: string | null = null): Ticket {
  return {
    id,
    jiraKey: `PROJ-${id}`,
    summary: `Ticket ${id}`,
    description: null,
    estimateMinutes: 480,
    jiraPriority: 'medium',
    priorityOverride: null,
    status: 'planned',
    phase: 'dev',
    jiraAssigneeEmail: null,
    parentKey: null,
    milestoneId: null,
    releaseId,
    locked: false,
    warnings: [],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

function makeUser(id = 'u1'): User {
  return {
    id,
    displayName: 'Mario Rossi',
    email: 'mario@example.com',
    appRole: 'dev',
    planningRoles: ['dev'],
    office: null,
    dailyWorkingMinutes: 480,
    dailyOverheadMinutes: 0,
    active: true,
  }
}

function makeAssignment(id: string, ticketId: string, userId: string): Assignment {
  return {
    id,
    ticketId,
    userId,
    role: 'dev',
    allocationPercent: 100,
    startDate: '2026-04-06',
    endDate: '2026-04-07',
    durationDays: 2,
    locked: false,
    createdAt: now,
    updatedAt: now,
  }
}

function makeRelease(id: string, targetDate: string): Release {
  return {
    id,
    name: `Release ${id}`,
    description: null,
    targetDate,
    forecastDate: null,
    createdAt: now,
    updatedAt: now,
  }
}

describe('Reporting — Planning Report', () => {
  it('genera righe report con tutte le colonne attese', () => {
    const tickets = [makeTicket('t1')]
    const users = [makeUser()]
    const assignments = [makeAssignment('a1', 't1', 'u1')]
    const scheduled: ScheduledAssignment[] = [
      { assignmentId: 'a1', ticketId: 't1', userId: 'u1', startDate: '2026-04-06', endDate: '2026-04-07', durationDays: 2 },
    ]

    const rows = generatePlanningReport(tickets, assignments, scheduled, users, [], [])

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.jiraKey).toBe('PROJ-t1')
    expect(row.assignee).toBe('Mario Rossi')
    expect(row.startDate).toBe('2026-04-06')
    expect(row.endDate).toBe('2026-04-07')
    expect(row.durationDays).toBe(2)
    expect(row.estimateHours).toBe(8)
  })

  it('ticket senza assignment genera riga vuota', () => {
    const tickets = [makeTicket('t1')]
    const rows = generatePlanningReport(tickets, [], [], [makeUser()], [], [])

    expect(rows).toHaveLength(1)
    expect(rows[0].assignee).toBe('')
  })
})

describe('Reporting — Release Report', () => {
  it('genera report per release', () => {
    const releases = [makeRelease('r1', '2026-05-01')]
    const tickets = [
      { ...makeTicket('t1', 'r1'), status: 'planned' as const },
      { ...makeTicket('t2', 'r1'), status: 'done' as const },
    ]
    const assignments = [
      { ...makeAssignment('a1', 't1', 'u1'), endDate: '2026-04-20' },
      { ...makeAssignment('a2', 't2', 'u1'), endDate: '2026-04-15' },
    ]

    const report = generateReleaseReport(releases, tickets, assignments)

    expect(report).toHaveLength(1)
    expect(report[0].releaseName).toBe('Release r1')
    expect(report[0].totalTickets).toBe(2)
    expect(report[0].completedTickets).toBe(1)
    expect(report[0].forecastDate).toBe('2026-04-20')
    expect(report[0].status).toBe('on_track')
  })

  it('release in ritardo → status delayed', () => {
    const releases = [makeRelease('r1', '2026-04-10')]
    const tickets = [makeTicket('t1', 'r1')]
    const assignments = [
      { ...makeAssignment('a1', 't1', 'u1'), endDate: '2026-04-20' },
    ]

    const report = generateReleaseReport(releases, tickets, assignments)
    expect(report[0].status).toBe('delayed')
  })
})

describe('Reporting — CSV Export', () => {
  // T5-U08: Export CSV contiene tutte le colonne attese
  it('T5-U08: export CSV con colonne corrette', () => {
    const rows = [
      { jiraKey: 'PROJ-1', summary: 'Test ticket', priority: 'medium', startDate: '2026-04-06' },
      { jiraKey: 'PROJ-2', summary: 'Another ticket', priority: 'high', startDate: '2026-04-07' },
    ]

    const csv = toCSV(rows)
    const lines = csv.split('\n')

    expect(lines[0]).toBe('jiraKey,summary,priority,startDate')
    expect(lines[1]).toBe('PROJ-1,Test ticket,medium,2026-04-06')
    expect(lines[2]).toBe('PROJ-2,Another ticket,high,2026-04-07')
  })

  it('escape virgole e virgolette nel CSV', () => {
    const rows = [
      { name: 'Rossi, Mario', notes: 'Ha detto "ok"' },
    ]

    const csv = toCSV(rows)
    const lines = csv.split('\n')

    expect(lines[0]).toBe('name,notes')
    expect(lines[1]).toContain('"Rossi, Mario"')
    expect(lines[1]).toContain('"Ha detto ""ok"""')
  })

  it('CSV vuoto per array vuoto', () => {
    expect(toCSV([])).toBe('')
  })

  it('supporta colonne custom', () => {
    const rows = [{ a: 1, b: 2, c: 3 }]
    const csv = toCSV(rows, ['a', 'c'])
    expect(csv).toBe('a,c\n1,3')
  })
})

