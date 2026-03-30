// ============================================================
// Test — Dependency Graph (T4-U01 … T4-U05, T4-U08, T4-U10)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  detectCycles,
  topologicalSort,
  getImpactedTickets,
  getPredecessors,
  getSuccessors,
  getImplicitDevQaDependencies,
} from '../../src/scheduling/dependency-graph.js'
import { autoSchedule, type SchedulerInput } from '../../src/scheduling/scheduler.js'
import type { Dependency } from '../../src/types/dependency.js'
import type { Ticket } from '../../src/types/ticket.js'
import type { Assignment } from '../../src/types/assignment.js'
import type { User } from '../../src/types/user.js'
import type { CalendarConfig } from '../../src/scheduling/calendar.js'

// ---- Helpers ----

const now = '2026-03-30T00:00:00.000Z'

function makeDep(from: string, to: string, type: Dependency['type'] = 'finish_to_start'): Dependency {
  return {
    id: `dep-${from}-${to}`,
    fromTicketId: from,
    toTicketId: to,
    type,
    importedFromJira: false,
    createdAt: now,
  }
}

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

function makeTicket(id: string, priority: Ticket['jiraPriority'] = 'medium', estimate = 480): Ticket {
  return {
    id,
    jiraKey: `PROJ-${id}`,
    summary: `Ticket ${id}`,
    description: null,
    estimateMinutes: estimate,
    jiraPriority: priority,
    priorityOverride: null,
    status: 'backlog',
    phase: 'dev',
    jiraAssigneeEmail: null,
    parentKey: null,
    milestoneId: null,
    releaseId: null,
    locked: false,
    warnings: [],
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  }
}

function makeAssignment(id: string, ticketId: string, userId: string, role: 'dev' | 'qa' = 'dev'): Assignment {
  return {
    id,
    ticketId,
    userId,
    role,
    allocationPercent: 100,
    startDate: null,
    endDate: null,
    durationDays: null,
    locked: false,
    createdAt: now,
    updatedAt: now,
  }
}

const emptyCalendar: CalendarConfig = { holidays: [], exceptions: [] }

// ---- Cycle Detection Tests ----

describe('Dependency Graph — Cycle Detection', () => {
  // T4-U05: Rilevamento ciclo di dipendenze → errore
  it('T4-U05: rileva ciclo A→B→C→A', () => {
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'C'),
      makeDep('C', 'A'),
    ]
    const result = detectCycles(deps)
    expect(result.hasCycle).toBe(true)
    expect(result.cycle.length).toBeGreaterThan(0)
    // Il ciclo contiene almeno A, B, C
    expect(result.cycle).toContain('A')
    expect(result.cycle).toContain('B')
    expect(result.cycle).toContain('C')
  })

  it('nessun ciclo in dipendenze lineari A→B→C', () => {
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'C'),
    ]
    const result = detectCycles(deps)
    expect(result.hasCycle).toBe(false)
    expect(result.cycle).toEqual([])
  })

  it('rileva ciclo semplice A→B→A', () => {
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'A'),
    ]
    const result = detectCycles(deps)
    expect(result.hasCycle).toBe(true)
  })

  it('ignora dipendenze parallel per il ciclo', () => {
    const deps = [
      makeDep('A', 'B', 'parallel'),
      makeDep('B', 'A', 'parallel'),
    ]
    const result = detectCycles(deps)
    expect(result.hasCycle).toBe(false)
  })
})

// ---- Topological Sort Tests ----

describe('Dependency Graph — Topological Sort', () => {
  it('ordine topologico A→B→C', () => {
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'C'),
    ]
    const result = topologicalSort(['A', 'B', 'C'], deps)
    expect(result).not.toBeNull()
    expect(result!.indexOf('A')).toBeLessThan(result!.indexOf('B'))
    expect(result!.indexOf('B')).toBeLessThan(result!.indexOf('C'))
  })

  it('ritorna null se c\'è un ciclo', () => {
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'A'),
    ]
    const result = topologicalSort(['A', 'B'], deps)
    expect(result).toBeNull()
  })

  it('gestisce ticket senza dipendenze', () => {
    const result = topologicalSort(['A', 'B', 'C'], [])
    expect(result).not.toBeNull()
    expect(result).toHaveLength(3)
  })

  it('dipendenze parallel non influenzano l\'ordine', () => {
    const deps = [
      makeDep('A', 'B', 'parallel'),
    ]
    const result = topologicalSort(['A', 'B'], deps)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(2)
  })
})

// ---- Impact Analysis Tests ----

describe('Dependency Graph — Impact Analysis', () => {
  // T4-U10: Spostamento ticket A → mostra ticket B e C impattati
  it('T4-U10: impatto di A su B e C (A→B→C)', () => {
    const deps = [
      makeDep('A', 'B'),
      makeDep('B', 'C'),
    ]
    const result = getImpactedTickets('A', deps)
    expect(result.impactedTicketIds).toContain('B')
    expect(result.impactedTicketIds).toContain('C')
    expect(result.impactedTicketIds).toHaveLength(2)
  })

  it('nessun impatto se il ticket non ha successori', () => {
    const deps = [makeDep('A', 'B')]
    const result = getImpactedTickets('B', deps)
    expect(result.impactedTicketIds).toHaveLength(0)
  })

  it('impatto diramato: A→B, A→C', () => {
    const deps = [
      makeDep('A', 'B'),
      makeDep('A', 'C'),
    ]
    const result = getImpactedTickets('A', deps)
    expect(result.impactedTicketIds).toContain('B')
    expect(result.impactedTicketIds).toContain('C')
    expect(result.impactedTicketIds).toHaveLength(2)
  })
})

// ---- Predecessors / Successors ----

describe('Dependency Graph — Predecessors & Successors', () => {
  it('trova predecessori di C in A→C, B→C', () => {
    const deps = [makeDep('A', 'C'), makeDep('B', 'C')]
    expect(getPredecessors('C', deps)).toEqual(expect.arrayContaining(['A', 'B']))
  })

  it('trova successori di A in A→B, A→C', () => {
    const deps = [makeDep('A', 'B'), makeDep('A', 'C')]
    expect(getSuccessors('A', deps)).toEqual(expect.arrayContaining(['B', 'C']))
  })
})

// ---- DEV→QA implicit ----

describe('Dependency Graph — DEV→QA Implicit', () => {
  // T4-U04: DEV → QA implicito: QA.start ≥ DEV.end per lo stesso ticket
  it('T4-U04: genera dipendenza implicita DEV→QA', () => {
    const assignments = [
      makeAssignment('a1', 'ticket-1', 'user-1', 'dev'),
      makeAssignment('a2', 'ticket-1', 'user-2', 'qa'),
    ]
    const result = getImplicitDevQaDependencies(assignments)
    expect(result).toHaveLength(1)
    expect(result[0].fromTicketId).toBe('ticket-1')
    expect(result[0].toTicketId).toBe('ticket-1')
    expect(result[0].type).toBe('finish_to_start')
  })

  it('nessuna dipendenza implicita se solo DEV', () => {
    const assignments = [
      makeAssignment('a1', 'ticket-1', 'user-1', 'dev'),
    ]
    const result = getImplicitDevQaDependencies(assignments)
    expect(result).toHaveLength(0)
  })
})

// ---- Scheduler con dipendenze ----

describe('Scheduler — Con dipendenze', () => {
  // T4-U01: Finish-to-start: B.start ≥ A.end
  it('T4-U01: finish-to-start — B inizia dopo che A finisce', () => {
    const tickets = [makeTicket('A'), makeTicket('B')]
    const user = makeUser()
    const deps = [makeDep('A', 'B')]
    const assignments = [
      makeAssignment('a1', 'A', 'user-1'),
      makeAssignment('a2', 'B', 'user-1'),
    ]

    const input: SchedulerInput = {
      tickets,
      assignments,
      users: [user],
      calendar: emptyCalendar,
      holidays: [],
      absences: [],
      meetings: [],
      dependencies: deps,
      planningStartDate: '2026-04-06', // Lunedì
    }

    const result = autoSchedule(input)
    const schedA = result.scheduled.find((s) => s.ticketId === 'A')
    const schedB = result.scheduled.find((s) => s.ticketId === 'B')

    expect(schedA).toBeDefined()
    expect(schedB).toBeDefined()
    // B deve iniziare dopo la fine di A
    expect(schedB!.startDate >= schedA!.endDate).toBe(true)
  })

  // T4-U02: Ticket paralleli possono sovrapporsi
  it('T4-U02: ticket paralleli possono sovrapporsi', () => {
    const tickets = [makeTicket('A'), makeTicket('B')]
    const user1 = makeUser({ id: 'user-1' })
    const user2 = makeUser({ id: 'user-2', displayName: 'Luigi Verdi', email: 'luigi@example.com' })
    const deps = [makeDep('A', 'B', 'parallel')]
    const assignments = [
      makeAssignment('a1', 'A', 'user-1'),
      makeAssignment('a2', 'B', 'user-2'),
    ]

    const input: SchedulerInput = {
      tickets,
      assignments,
      users: [user1, user2],
      calendar: emptyCalendar,
      holidays: [],
      absences: [],
      meetings: [],
      dependencies: deps,
      planningStartDate: '2026-04-06',
    }

    const result = autoSchedule(input)
    const schedA = result.scheduled.find((s) => s.ticketId === 'A')
    const schedB = result.scheduled.find((s) => s.ticketId === 'B')

    expect(schedA).toBeDefined()
    expect(schedB).toBeDefined()
    // Entrambi iniziano lo stesso giorno (parallel)
    expect(schedA!.startDate).toBe(schedB!.startDate)
  })

  // T4-U06: Ticket con priorità più alta schedulato prima
  it('T4-U06: priorità più alta schedulato prima a parità di condizioni', () => {
    const tickets = [
      makeTicket('low-prio', 'low'),
      makeTicket('high-prio', 'high'),
    ]
    const user = makeUser()
    const assignments = [
      makeAssignment('a1', 'low-prio', 'user-1'),
      makeAssignment('a2', 'high-prio', 'user-1'),
    ]

    const input: SchedulerInput = {
      tickets,
      assignments,
      users: [user],
      calendar: emptyCalendar,
      holidays: [],
      absences: [],
      meetings: [],
      planningStartDate: '2026-04-06',
    }

    const result = autoSchedule(input)
    const schedHigh = result.scheduled.find((s) => s.ticketId === 'high-prio')
    const schedLow = result.scheduled.find((s) => s.ticketId === 'low-prio')

    expect(schedHigh).toBeDefined()
    expect(schedLow).toBeDefined()
    // High priority inizia prima
    expect(schedHigh!.startDate <= schedLow!.startDate).toBe(true)
  })

  // T4-U07: Override PM su priorità rispettato
  it('T4-U07: override PM su priorità rispettato', () => {
    const tickets = [
      makeTicket('A', 'low'),
      makeTicket('B', 'highest'),
    ]
    // A ha priorityOverride = 1 (massima), B no
    tickets[0].priorityOverride = 1
    const user = makeUser()
    const assignments = [
      makeAssignment('a1', 'A', 'user-1'),
      makeAssignment('a2', 'B', 'user-1'),
    ]

    const input: SchedulerInput = {
      tickets,
      assignments,
      users: [user],
      calendar: emptyCalendar,
      holidays: [],
      absences: [],
      meetings: [],
      planningStartDate: '2026-04-06',
    }

    const result = autoSchedule(input)
    const schedA = result.scheduled.find((s) => s.ticketId === 'A')
    const schedB = result.scheduled.find((s) => s.ticketId === 'B')

    expect(schedA).toBeDefined()
    expect(schedB).toBeDefined()
    // A (override 1) inizia prima di B (jira highest=1 ma senza override)
    expect(schedA!.startDate <= schedB!.startDate).toBe(true)
  })

  // T4-U08: Auto-plan con dipendenze — ordine topologico rispettato
  it('T4-U08: auto-plan con dipendenze — ordine topologico A→B→C', () => {
    const tickets = [makeTicket('A'), makeTicket('B'), makeTicket('C')]
    const user = makeUser()
    const deps = [makeDep('A', 'B'), makeDep('B', 'C')]
    const assignments = [
      makeAssignment('a1', 'A', 'user-1'),
      makeAssignment('a2', 'B', 'user-1'),
      makeAssignment('a3', 'C', 'user-1'),
    ]

    const input: SchedulerInput = {
      tickets,
      assignments,
      users: [user],
      calendar: emptyCalendar,
      holidays: [],
      absences: [],
      meetings: [],
      dependencies: deps,
      planningStartDate: '2026-04-06',
    }

    const result = autoSchedule(input)
    const schedA = result.scheduled.find((s) => s.ticketId === 'A')
    const schedB = result.scheduled.find((s) => s.ticketId === 'B')
    const schedC = result.scheduled.find((s) => s.ticketId === 'C')

    expect(schedA).toBeDefined()
    expect(schedB).toBeDefined()
    expect(schedC).toBeDefined()
    expect(schedA!.endDate <= schedB!.startDate).toBe(true)
    expect(schedB!.endDate <= schedC!.startDate).toBe(true)
  })

  // T4-U09: Ticket locked non viene spostato da auto-plan
  it('T4-U09: ticket locked non viene spostato', () => {
    const tickets = [makeTicket('A'), makeTicket('B')]
    const user = makeUser()
    const assignments = [
      { ...makeAssignment('a1', 'A', 'user-1'), locked: true, startDate: '2026-04-06', endDate: '2026-04-06', durationDays: 1 },
      makeAssignment('a2', 'B', 'user-1'),
    ]

    const input: SchedulerInput = {
      tickets,
      assignments,
      users: [user],
      calendar: emptyCalendar,
      holidays: [],
      absences: [],
      meetings: [],
      planningStartDate: '2026-04-06',
    }

    const result = autoSchedule(input)
    const schedA = result.scheduled.find((s) => s.ticketId === 'A')
    expect(schedA).toBeDefined()
    expect(schedA!.startDate).toBe('2026-04-06')
    expect(schedA!.endDate).toBe('2026-04-06')
  })

  // T4-U03: Ticket bloccante non completato → dipendente schedulato dopo
  it('T4-U03: blocking — dipendente schedulato dopo il bloccante', () => {
    const tickets = [makeTicket('blocker'), makeTicket('blocked')]
    const user = makeUser()
    const deps = [makeDep('blocker', 'blocked', 'blocking')]
    const assignments = [
      makeAssignment('a1', 'blocker', 'user-1'),
      makeAssignment('a2', 'blocked', 'user-1'),
    ]

    const input: SchedulerInput = {
      tickets,
      assignments,
      users: [user],
      calendar: emptyCalendar,
      holidays: [],
      absences: [],
      meetings: [],
      dependencies: deps,
      planningStartDate: '2026-04-06',
    }

    const result = autoSchedule(input)
    const schedBlocker = result.scheduled.find((s) => s.ticketId === 'blocker')
    const schedBlocked = result.scheduled.find((s) => s.ticketId === 'blocked')

    expect(schedBlocker).toBeDefined()
    expect(schedBlocked).toBeDefined()
    expect(schedBlocked!.startDate > schedBlocker!.endDate).toBe(true)
  })

  // DEV→QA implicit nello scheduler
  it('T4-U04 scheduler: QA inizia dopo DEV per lo stesso ticket', () => {
    const tickets = [makeTicket('T1')]
    const user1 = makeUser({ id: 'user-dev' })
    const user2 = makeUser({ id: 'user-qa', displayName: 'QA User', email: 'qa@example.com' })
    const assignments = [
      makeAssignment('a-dev', 'T1', 'user-dev', 'dev'),
      makeAssignment('a-qa', 'T1', 'user-qa', 'qa'),
    ]

    const input: SchedulerInput = {
      tickets,
      assignments,
      users: [user1, user2],
      calendar: emptyCalendar,
      holidays: [],
      absences: [],
      meetings: [],
      planningStartDate: '2026-04-06',
    }

    const result = autoSchedule(input)
    const schedDev = result.scheduled.find((s) => s.assignmentId === 'a-dev')
    const schedQa = result.scheduled.find((s) => s.assignmentId === 'a-qa')

    expect(schedDev).toBeDefined()
    expect(schedQa).toBeDefined()
    // QA deve iniziare dopo DEV
    expect(schedQa!.startDate > schedDev!.endDate).toBe(true)
  })
})

