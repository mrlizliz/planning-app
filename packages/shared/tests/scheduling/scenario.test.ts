// ============================================================
// Test — Scenario (T5-U01 … T5-U03)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  createScenario,
  createSnapshot,
  modifyScenarioAssignment,
  promoteScenario,
  compareScenarios,
} from '../../src/scheduling/scenario.js'
import type { Assignment } from '../../src/types/assignment.js'

const now = '2026-03-30T00:00:00.000Z'

function makeAssignment(id: string, ticketId: string, userId: string, role: 'dev' | 'qa' = 'dev'): Assignment {
  return {
    id,
    ticketId,
    userId,
    role,
    allocationPercent: 100,
    startDate: '2026-04-06',
    endDate: '2026-04-07',
    durationDays: 2,
    locked: false,
    createdAt: now,
    updatedAt: now,
  }
}

describe('Scenario — Creation', () => {
  // T5-U01: Creazione scenario copia lo stato corrente senza modificarlo
  it('T5-U01: crea scenario come copia dello stato corrente', () => {
    const assignments = [
      makeAssignment('a1', 't1', 'u1'),
      makeAssignment('a2', 't2', 'u2'),
    ]

    const scenario = createScenario('What-If 1', 'Test scenario', assignments)

    expect(scenario.name).toBe('What-If 1')
    expect(scenario.description).toBe('Test scenario')
    expect(scenario.isCurrent).toBe(false)
    expect(scenario.snapshot.assignments).toHaveLength(2)
    expect(scenario.snapshot.ticketIds).toEqual(expect.arrayContaining(['t1', 't2']))

    // Verifica che lo snapshot è una copia (non reference)
    expect(scenario.snapshot.assignments[0].assignmentId).toBe('a1')
    expect(scenario.snapshot.assignments[0].userId).toBe('u1')
  })

  it('snapshot preserva i dati delle date', () => {
    const assignments = [makeAssignment('a1', 't1', 'u1')]
    const snapshot = createSnapshot(assignments)

    expect(snapshot.assignments[0].startDate).toBe('2026-04-06')
    expect(snapshot.assignments[0].endDate).toBe('2026-04-07')
    expect(snapshot.assignments[0].durationDays).toBe(2)
  })
})

describe('Scenario — Modification', () => {
  // T5-U02: Modifica scenario non impatta lo stato corrente
  it('T5-U02: modifica scenario non impatta lo stato corrente', () => {
    const assignments = [makeAssignment('a1', 't1', 'u1')]
    const scenario = createScenario('Test', null, assignments)

    const modified = modifyScenarioAssignment(scenario, 'a1', { userId: 'u2' })

    // Lo scenario originale non è stato modificato
    expect(scenario.snapshot.assignments[0].userId).toBe('u1')
    // Lo scenario modificato ha il nuovo valore
    expect(modified.snapshot.assignments[0].userId).toBe('u2')
    // Le date vengono resettate quando cambia userId
    expect(modified.snapshot.assignments[0].startDate).toBeNull()
    expect(modified.snapshot.assignments[0].endDate).toBeNull()
  })

  it('modifica allocation senza resettare le date', () => {
    const assignments = [makeAssignment('a1', 't1', 'u1')]
    const scenario = createScenario('Test', null, assignments)

    const modified = modifyScenarioAssignment(scenario, 'a1', { allocationPercent: 50 })

    expect(modified.snapshot.assignments[0].allocationPercent).toBe(50)
    // Le date non vengono resettate (stesso utente)
    expect(modified.snapshot.assignments[0].startDate).toBe('2026-04-06')
  })
})

describe('Scenario — Promote', () => {
  // T5-U03: Promote scenario → stato corrente viene sostituito
  it('T5-U03: promote scenario → assignment aggiornati', () => {
    const assignments = [makeAssignment('a1', 't1', 'u1')]
    const scenario = createScenario('Test', null, assignments)
    const modified = modifyScenarioAssignment(scenario, 'a1', { userId: 'u2' })

    const promoted = promoteScenario(modified, assignments)

    expect(promoted).toHaveLength(1)
    expect(promoted[0].userId).toBe('u2')
    expect(promoted[0].id).toBe('a1')
  })
})

describe('Scenario — Comparison', () => {
  it('confronta scenario con stato corrente', () => {
    const assignments = [makeAssignment('a1', 't1', 'u1')]
    const scenario = createScenario('Test', null, assignments)
    const modified = modifyScenarioAssignment(scenario, 'a1', { userId: 'u2' })

    const diffs = compareScenarios(assignments, modified)

    const userIdDiff = diffs.find((d) => d.field === 'userId')
    expect(userIdDiff).toBeDefined()
    expect(userIdDiff!.currentValue).toBe('u1')
    expect(userIdDiff!.scenarioValue).toBe('u2')
    expect(userIdDiff!.changed).toBe(true)

    const allocDiff = diffs.find((d) => d.field === 'allocationPercent')
    expect(allocDiff!.changed).toBe(false)
  })
})

