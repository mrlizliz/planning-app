// ============================================================
// Release Planning — Milestone status, release forecast, deploy, gates
// ============================================================

import type { Milestone, MilestoneStatus } from '../types/milestone.js'
import type { DeploymentDay, DeploymentWindow, DeployEnvironment } from '../types/deployment.js'
import type { Assignment } from '../types/assignment.js'
import { parseISO, differenceInBusinessDays, getDay, addDays, format } from 'date-fns'

// ---- Milestone status ----

/**
 * Calcola lo stato di una milestone in base ai ticket associati.
 *
 * - on_track: tutti i ticket finiscono prima della targetDate
 * - at_risk: almeno un ticket finisce entro 2gg lavorativi dalla targetDate
 * - delayed: almeno un ticket finisce dopo la targetDate
 */
export function calculateMilestoneStatus(
  milestone: Milestone,
  ticketEndDates: string[], // ISO YYYY-MM-DD delle endDate dei ticket associati
): MilestoneStatus {
  if (ticketEndDates.length === 0) return 'on_track'

  const target = parseISO(milestone.targetDate)
  let status: MilestoneStatus = 'on_track'

  for (const endDateStr of ticketEndDates) {
    const endDate = parseISO(endDateStr)
    const diffDays = differenceInBusinessDays(target, endDate)

    if (diffDays < 0) {
      // endDate > targetDate → delayed
      return 'delayed'
    }
    if (diffDays <= 2) {
      // entro 2 giorni lavorativi → at_risk
      status = 'at_risk'
    }
  }

  return status
}

// ---- Release forecast ----

/**
 * Calcola la data prevista di completamento di una release.
 * = max(endDate) dei ticket associati.
 */
export function calculateReleaseForecast(
  ticketEndDates: string[],
): string | null {
  if (ticketEndDates.length === 0) return null

  let max = ticketEndDates[0]
  for (const d of ticketEndDates) {
    if (d > max) max = d
  }
  return max
}

// ---- Deploy days ----

/**
 * Verifica se una data è un giorno di deploy consentito per un dato environment.
 */
export function isDeployDay(
  date: Date,
  environment: DeployEnvironment,
  deployDays: DeploymentDay[],
  deployWindows: DeploymentWindow[],
): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayOfWeek = getDay(date)

  // Check override specifico per data
  const window = deployWindows.find(
    (w) => w.date === dateStr && w.environment === environment,
  )
  if (window) return window.allowed

  // Check pattern ricorrente
  return deployDays.some(
    (d) =>
      d.environment === environment &&
      d.dayOfWeek === dayOfWeek &&
      d.active,
  )
}

/**
 * Trova il prossimo giorno di deploy disponibile a partire da una data.
 * Max 90 giorni di ricerca.
 */
export function nextDeployDay(
  fromDate: Date,
  environment: DeployEnvironment,
  deployDays: DeploymentDay[],
  deployWindows: DeploymentWindow[],
): Date | null {
  let current = fromDate
  for (let i = 0; i < 90; i++) {
    if (isDeployDay(current, environment, deployDays, deployWindows)) {
      return current
    }
    current = addDays(current, 1)
  }
  return null
}

/**
 * Warning: la fine QA del ticket cade dopo l'ultimo deploy disponibile prima della release target.
 */
export function checkDeployWarning(
  qaEndDate: string,
  releaseTargetDate: string,
  environment: DeployEnvironment,
  deployDays: DeploymentDay[],
  deployWindows: DeploymentWindow[],
): { warning: boolean; lastDeployDate: string | null } {
  // Trova l'ultimo deploy disponibile tra qaEndDate e releaseTargetDate
  const qaEnd = parseISO(qaEndDate)
  const releaseTarget = parseISO(releaseTargetDate)

  let lastDeploy: Date | null = null
  let current = qaEnd
  while (current <= releaseTarget) {
    if (isDeployDay(current, environment, deployDays, deployWindows)) {
      lastDeploy = current
    }
    current = addDays(current, 1)
  }

  if (!lastDeploy) {
    return { warning: true, lastDeployDate: null }
  }

  // Warning se qaEndDate > lastDeploy
  const warning = qaEnd > lastDeploy
  return {
    warning,
    lastDeployDate: format(lastDeploy, 'yyyy-MM-dd'),
  }
}

// ---- Gate di processo ----

export type GateError =
  | 'dev_not_completed'
  | 'qa_not_completed'
  | 'buffer_not_met'

/**
 * Verifica se un ticket può passare alla fase QA.
 * Richiede che la fase DEV sia completata.
 */
export function canStartQA(
  devAssignment: Assignment | null,
): { ok: boolean; error?: GateError } {
  if (!devAssignment || !devAssignment.endDate) {
    return { ok: false, error: 'dev_not_completed' }
  }
  return { ok: true }
}

/**
 * Verifica se un ticket è ready_for_release.
 * Richiede QA completato + buffer opzionale rispettato.
 */
export function isReadyForRelease(
  qaAssignment: Assignment | null,
  deployDate: string | null,
  bufferDays: number = 1,
): { ok: boolean; error?: GateError } {
  if (!qaAssignment || !qaAssignment.endDate) {
    return { ok: false, error: 'qa_not_completed' }
  }

  if (deployDate && bufferDays > 0) {
    const qaEnd = parseISO(qaAssignment.endDate)
    const deploy = parseISO(deployDate)
    const diff = differenceInBusinessDays(deploy, qaEnd)
    if (diff < bufferDays) {
      return { ok: false, error: 'buffer_not_met' }
    }
  }

  return { ok: true }
}


