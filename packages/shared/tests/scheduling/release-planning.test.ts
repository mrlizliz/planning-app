// ============================================================
// T3-U01…U10 — Milestone, Release, Deploy, Gate
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  calculateMilestoneStatus,
  calculateReleaseForecast,
  isDeployDay,
  nextDeployDay,
  checkDeployWarning,
  canStartQA,
  isReadyForRelease,
} from '../../src/scheduling/release-planning.js'
import type { Milestone } from '../../src/types/milestone.js'
import type { Assignment } from '../../src/types/assignment.js'
import type { DeploymentDay, DeploymentWindow } from '../../src/types/deployment.js'

// ---- Fixtures ----

const milestone: Milestone = {
  id: 'ms-1', name: 'MVP', description: null,
  targetDate: '2026-04-30', status: 'on_track',
  createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z',
}

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  const now = new Date().toISOString()
  return {
    id: 'a-1', ticketId: 't-1', userId: 'u-1', role: 'dev',
    allocationPercent: 100, startDate: '2026-04-01', endDate: '2026-04-10',
    durationDays: 8, locked: false, createdAt: now, updatedAt: now,
    ...overrides,
  }
}

const deployDays: DeploymentDay[] = [
  { id: 'dd-1', environment: 'dev', dayOfWeek: 2, active: true },  // Martedì
  { id: 'dd-2', environment: 'dev', dayOfWeek: 4, active: true },  // Giovedì
  { id: 'dd-3', environment: 'prod', dayOfWeek: 3, active: true }, // Mercoledì
]

const deployWindows: DeploymentWindow[] = []

// ============================================================
// T3-U01: Milestone on_track
// ============================================================
describe('T3-U01: Milestone on_track', () => {
  it('tutti i ticket finiscono prima della targetDate → on_track', () => {
    const status = calculateMilestoneStatus(milestone, ['2026-04-20', '2026-04-25'])
    expect(status).toBe('on_track')
  })

  it('nessun ticket → on_track', () => {
    const status = calculateMilestoneStatus(milestone, [])
    expect(status).toBe('on_track')
  })
})

// ============================================================
// T3-U02: Milestone delayed
// ============================================================
describe('T3-U02: Milestone delayed', () => {
  it('1 ticket finisce dopo targetDate → delayed', () => {
    const status = calculateMilestoneStatus(milestone, ['2026-04-20', '2026-05-05'])
    expect(status).toBe('delayed')
  })
})

// ============================================================
// T3-U03: Milestone at_risk
// ============================================================
describe('T3-U03: Milestone at_risk', () => {
  it('1 ticket finisce entro 2gg dalla targetDate → at_risk', () => {
    // 30 aprile target, ticket finisce 29 aprile → 1 business day di margine → at_risk
    const status = calculateMilestoneStatus(milestone, ['2026-04-20', '2026-04-29'])
    expect(status).toBe('at_risk')
  })
})

// ============================================================
// T3-U04: Release forecast = max(end_date) dei ticket
// ============================================================
describe('T3-U04: Release forecast', () => {
  it('forecast = max endDate', () => {
    const forecast = calculateReleaseForecast(['2026-04-10', '2026-04-25', '2026-04-15'])
    expect(forecast).toBe('2026-04-25')
  })

  it('nessun ticket → null', () => {
    expect(calculateReleaseForecast([])).toBeNull()
  })
})

// ============================================================
// T3-U05: Prossimo deploy DEV calcolato correttamente
// ============================================================
describe('T3-U05: Deploy days', () => {
  it('prossimo deploy DEV da lunedì → martedì', () => {
    const monday = new Date('2026-04-06') // Lunedì
    const next = nextDeployDay(monday, 'dev', deployDays, deployWindows)
    expect(next).not.toBeNull()
    // Martedì 7 aprile
    expect(next!.getDay()).toBe(2) // Martedì
  })

  it('prossimo deploy PROD da lunedì → mercoledì', () => {
    const monday = new Date('2026-04-06')
    const next = nextDeployDay(monday, 'prod', deployDays, deployWindows)
    expect(next).not.toBeNull()
    expect(next!.getDay()).toBe(3) // Mercoledì
  })

  it('deploy window override blocca un giorno', () => {
    const windows: DeploymentWindow[] = [
      { id: 'dw-1', environment: 'dev', date: '2026-04-07', allowed: false, notes: 'Freeze' },
    ]
    const monday = new Date('2026-04-06')
    const next = nextDeployDay(monday, 'dev', deployDays, windows)
    // Martedì 7 bloccato → prossimo = Giovedì 9
    expect(next!.getDate()).toBe(9)
  })
})

// ============================================================
// T3-U06: Warning se fine QA > ultimo deploy disponibile
// ============================================================
describe('T3-U06: Deploy warning', () => {
  it('fine QA dopo ultimo deploy → warning', () => {
    // QA finisce venerdì 24/4, release target 25/4 (sabato)
    // Ultimo deploy PROD mercoledì 22/4
    // QA end 24 > last deploy 22 → warning
    const result = checkDeployWarning(
      '2026-04-24', '2026-04-25', 'prod', deployDays, deployWindows,
    )
    expect(result.warning).toBe(true)
  })

  it('fine QA prima di ultimo deploy → no warning', () => {
    const result = checkDeployWarning(
      '2026-04-20', '2026-04-30', 'prod', deployDays, deployWindows,
    )
    expect(result.warning).toBe(false)
    expect(result.lastDeployDate).not.toBeNull()
  })
})

// ============================================================
// T3-U07: Gate — ticket non può passare a QA se DEV non completato
// ============================================================
describe('T3-U07: Gate DEV → QA', () => {
  it('DEV non completato → errore', () => {
    const result = canStartQA(null)
    expect(result.ok).toBe(false)
    expect(result.error).toBe('dev_not_completed')
  })

  it('DEV senza endDate → errore', () => {
    const result = canStartQA(makeAssignment({ endDate: null }))
    expect(result.ok).toBe(false)
  })

  it('DEV completato → ok', () => {
    const result = canStartQA(makeAssignment({ endDate: '2026-04-10' }))
    expect(result.ok).toBe(true)
  })
})

// ============================================================
// T3-U08: Gate — ticket non può essere deployato PROD se QA non completato
// ============================================================
describe('T3-U08: Gate QA → Deploy', () => {
  it('QA non completato → errore', () => {
    const result = isReadyForRelease(null, '2026-04-30')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('qa_not_completed')
  })

  it('QA completato → ok', () => {
    const qa = makeAssignment({ role: 'qa', endDate: '2026-04-20' })
    const result = isReadyForRelease(qa, '2026-04-25')
    expect(result.ok).toBe(true)
  })
})

// ============================================================
// T3-U09: ready_for_release = true solo se QA + buffer
// ============================================================
describe('T3-U09: Ready for release con buffer', () => {
  it('QA completato + buffer sufficiente → ok', () => {
    const qa = makeAssignment({ role: 'qa', endDate: '2026-04-20' })
    const result = isReadyForRelease(qa, '2026-04-22', 1) // 1gg buffer, diff=2 → ok
    expect(result.ok).toBe(true)
  })

  it('QA completato ma buffer insufficiente → errore', () => {
    const qa = makeAssignment({ role: 'qa', endDate: '2026-04-21' })
    const result = isReadyForRelease(qa, '2026-04-22', 2) // 2gg buffer, diff=1 → errore
    expect(result.ok).toBe(false)
    expect(result.error).toBe('buffer_not_met')
  })
})

// ============================================================
// T3-U10: Buffer 1gg tra fine QA e deploy PROD
// ============================================================
describe('T3-U10: Buffer deploy PROD', () => {
  it('buffer 1gg rispettato → data deploy corretta', () => {
    const qa = makeAssignment({ role: 'qa', endDate: '2026-04-20' }) // Lunedì
    // Deploy mercoledì 22/4, buffer=1, diff=2 business days → ok
    const result = isReadyForRelease(qa, '2026-04-22', 1)
    expect(result.ok).toBe(true)
  })
})

