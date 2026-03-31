// ============================================================
// Test — Alerts (T4-U11 … T4-U13)
// ============================================================

import { describe, it, expect } from 'vitest'
import { generateAlerts, type AlertsInput } from '../../src/scheduling/alerts.js'
import type { Ticket } from '../../src/types/ticket.js'
import type { Assignment } from '../../src/types/assignment.js'
import type { Dependency } from '../../src/types/dependency.js'
import type { Release } from '../../src/types/release.js'

const now = '2026-03-30T00:00:00.000Z'

function makeTicket(id: string, estimate: number | null = 480): Ticket {
  return {
    id,
    jiraKey: `PROJ-${id}`,
    summary: `Ticket ${id}`,
    description: null,
    estimateMinutes: estimate,
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
  }
}

function makeAssignment(id: string, ticketId: string, userId: string, endDate: string | null = null): Assignment {
  return {
    id,
    ticketId,
    userId,
    role: 'dev',
    allocationPercent: 100,
    startDate: endDate ? '2026-04-06' : null,
    endDate,
    durationDays: endDate ? 1 : null,
    locked: false,
    createdAt: now,
    updatedAt: now,
  }
}

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

describe('Alerts — Missing Estimate', () => {
  // T4-U12: Ticket senza stima → alert generato
  it('T4-U12: ticket senza stima → alert missing_estimate', () => {
    const input: AlertsInput = {
      tickets: [makeTicket('T1', null)],
      assignments: [],
      dependencies: [],
      releases: [],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'missing_estimate')).toBe(true)
    expect(alerts.find((a) => a.type === 'missing_estimate')?.ticketIds).toContain('T1')
  })

  it('ticket con stima zero → alert missing_estimate', () => {
    const input: AlertsInput = {
      tickets: [makeTicket('T1', 0)],
      assignments: [],
      dependencies: [],
      releases: [],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'missing_estimate')).toBe(true)
  })

  it('ticket con stima valida → nessun alert missing_estimate', () => {
    const input: AlertsInput = {
      tickets: [makeTicket('T1', 480)],
      assignments: [],
      dependencies: [],
      releases: [],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'missing_estimate')).toBe(false)
  })
})

describe('Alerts — Dependency Cycle', () => {
  // T4-U13: Ciclo di dipendenze → alert specifico generato
  it('T4-U13: ciclo A→B→A → alert dependency_cycle', () => {
    const input: AlertsInput = {
      tickets: [makeTicket('A'), makeTicket('B')],
      assignments: [],
      dependencies: [makeDep('A', 'B'), makeDep('B', 'A')],
      releases: [],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'dependency_cycle')).toBe(true)
    const cycleAlert = alerts.find((a) => a.type === 'dependency_cycle')
    expect(cycleAlert?.severity).toBe('error')
  })

  it('nessun ciclo → nessun alert dependency_cycle', () => {
    const input: AlertsInput = {
      tickets: [makeTicket('A'), makeTicket('B')],
      assignments: [],
      dependencies: [makeDep('A', 'B')],
      releases: [],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'dependency_cycle')).toBe(false)
  })
})

describe('Alerts — Blocking Dependency', () => {
  it('ticket bloccante non schedulato → alert blocking_dependency', () => {
    const input: AlertsInput = {
      tickets: [makeTicket('A'), makeTicket('B')],
      assignments: [makeAssignment('a1', 'A', 'u1', null)],
      dependencies: [makeDep('A', 'B', 'blocking')],
      releases: [],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'blocking_dependency')).toBe(true)
  })

  it('ticket bloccante schedulato → nessun alert blocking_dependency', () => {
    const input: AlertsInput = {
      tickets: [{ ...makeTicket('A'), status: 'planned' as const }, makeTicket('B')],
      assignments: [makeAssignment('a1', 'A', 'u1', '2026-04-07')],
      dependencies: [makeDep('A', 'B', 'blocking')],
      releases: [],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'blocking_dependency')).toBe(false)
  })
})

describe('Alerts — Late for Release', () => {
  it('ticket finisce dopo la release → alert late_for_release', () => {
    const ticket = { ...makeTicket('T1'), releaseId: 'rel-1' }
    const input: AlertsInput = {
      tickets: [ticket],
      assignments: [makeAssignment('a1', 'T1', 'u1', '2026-05-15')],
      dependencies: [],
      releases: [makeRelease('rel-1', '2026-05-01')],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'late_for_release')).toBe(true)
  })

  it('ticket finisce prima della release → nessun alert', () => {
    const ticket = { ...makeTicket('T1'), releaseId: 'rel-1' }
    const input: AlertsInput = {
      tickets: [ticket],
      assignments: [makeAssignment('a1', 'T1', 'u1', '2026-04-15')],
      dependencies: [],
      releases: [makeRelease('rel-1', '2026-05-01')],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'late_for_release')).toBe(false)
  })
})

describe('Alerts — Overallocation', () => {
  // T4-U11: Sovrallocazione rilevata correttamente
  it('T4-U11: sovrallocazione → alert overallocation', () => {
    const input: AlertsInput = {
      tickets: [],
      assignments: [],
      dependencies: [],
      releases: [],
      overallocations: [
        { userId: 'u1', date: '2026-04-06', assignedMinutes: 960, capacityMinutes: 480 },
      ],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'overallocation')).toBe(true)
  })

  it('nessuna sovrallocazione → nessun alert', () => {
    const input: AlertsInput = {
      tickets: [],
      assignments: [],
      dependencies: [],
      releases: [],
      overallocations: [],
    }
    const alerts = generateAlerts(input)
    expect(alerts.some((a) => a.type === 'overallocation')).toBe(false)
  })
})

