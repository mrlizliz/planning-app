// ============================================================
// Scenario — What-If scenario management (funzioni pure)
// ============================================================

import type { Assignment } from '../types/assignment.js'
import type { Scenario, ScenarioSnapshot, ScenarioAssignment } from '../types/scenario.js'

// ---- Helpers ----

function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

// ---- Scenario creation ----

/**
 * Crea uno snapshot dallo stato corrente degli assignment.
 */
export function createSnapshot(assignments: Assignment[]): ScenarioSnapshot {
  return {
    assignments: assignments.map((a) => ({
      assignmentId: a.id,
      ticketId: a.ticketId,
      userId: a.userId,
      role: a.role,
      allocationPercent: a.allocationPercent,
      startDate: a.startDate,
      endDate: a.endDate,
      durationDays: a.durationDays,
      locked: a.locked,
    })),
    ticketIds: [...new Set(assignments.map((a) => a.ticketId))],
  }
}

/**
 * Crea un nuovo scenario come copia dello stato corrente.
 */
export function createScenario(
  name: string,
  description: string | null,
  assignments: Assignment[],
): Scenario {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name,
    description,
    isCurrent: false,
    snapshot: createSnapshot(assignments),
    createdAt: now,
    updatedAt: now,
  }
}

// ---- Scenario modification ----

/**
 * Modifica un assignment all'interno di uno scenario snapshot.
 * Non modifica lo stato corrente.
 */
export function modifyScenarioAssignment(
  scenario: Scenario,
  assignmentId: string,
  changes: Partial<Pick<ScenarioAssignment, 'userId' | 'allocationPercent' | 'locked'>>,
): Scenario {
  const updatedAssignments = scenario.snapshot.assignments.map((a) => {
    if (a.assignmentId !== assignmentId) return a
    return {
      ...a,
      ...changes,
      // Reset date calcolate quando cambia assegnazione
      startDate: changes.userId !== undefined && changes.userId !== a.userId ? null : a.startDate,
      endDate: changes.userId !== undefined && changes.userId !== a.userId ? null : a.endDate,
      durationDays: changes.userId !== undefined && changes.userId !== a.userId ? null : a.durationDays,
    }
  })

  return {
    ...scenario,
    snapshot: { ...scenario.snapshot, assignments: updatedAssignments },
    updatedAt: new Date().toISOString(),
  }
}

// ---- Scenario promotion ----

/**
 * Promuove uno scenario: converte le sue assegnazioni nello stato che verrà applicato.
 * Restituisce gli assignment da aggiornare nello store principale.
 */
export function promoteScenario(
  scenario: Scenario,
  existingAssignments: Assignment[],
): Assignment[] {
  const existingMap = new Map(existingAssignments.map((a) => [a.id, a]))
  const now = new Date().toISOString()

  return scenario.snapshot.assignments.map((sa) => {
    const existing = existingMap.get(sa.assignmentId)
    if (!existing) {
      // Assignment potrebbe essere stato creato nello scenario
      return {
        id: sa.assignmentId,
        ticketId: sa.ticketId,
        userId: sa.userId,
        role: sa.role,
        allocationPercent: sa.allocationPercent,
        startDate: sa.startDate,
        endDate: sa.endDate,
        durationDays: sa.durationDays,
        locked: sa.locked,
        createdAt: now,
        updatedAt: now,
      }
    }

    return {
      ...existing,
      userId: sa.userId,
      allocationPercent: sa.allocationPercent,
      startDate: sa.startDate,
      endDate: sa.endDate,
      durationDays: sa.durationDays,
      locked: sa.locked,
      updatedAt: now,
    }
  })
}

// ---- Scenario comparison ----

export interface ScenarioComparisonItem {
  ticketId: string
  assignmentId: string
  field: string
  currentValue: string | number | null
  scenarioValue: string | number | null
  changed: boolean
}

/**
 * Confronta uno scenario con lo stato corrente.
 * Restituisce le differenze per ogni assignment.
 */
export function compareScenarios(
  currentAssignments: Assignment[],
  scenario: Scenario,
): ScenarioComparisonItem[] {
  const currentMap = new Map(currentAssignments.map((a) => [a.id, a]))
  const diffs: ScenarioComparisonItem[] = []

  for (const sa of scenario.snapshot.assignments) {
    const current = currentMap.get(sa.assignmentId)
    if (!current) continue

    const fields: Array<{ field: string; cur: string | number | null; scen: string | number | null }> = [
      { field: 'userId', cur: current.userId, scen: sa.userId },
      { field: 'allocationPercent', cur: current.allocationPercent, scen: sa.allocationPercent },
      { field: 'startDate', cur: current.startDate, scen: sa.startDate },
      { field: 'endDate', cur: current.endDate, scen: sa.endDate },
      { field: 'durationDays', cur: current.durationDays, scen: sa.durationDays },
    ]

    for (const f of fields) {
      diffs.push({
        ticketId: sa.ticketId,
        assignmentId: sa.assignmentId,
        field: f.field,
        currentValue: f.cur,
        scenarioValue: f.scen,
        changed: f.cur !== f.scen,
      })
    }
  }

  return diffs
}

