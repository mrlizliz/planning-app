// ============================================================
// Alerts — Generazione alert intelligenti per la pianificazione
// ============================================================

import type { Ticket } from '../types/ticket.js'
import type { Assignment } from '../types/assignment.js'
import type { Dependency } from '../types/dependency.js'
import type { Release } from '../types/release.js'
import { detectCycles } from './dependency-graph.js'

// ---- Alert types ----

export type AlertSeverity = 'error' | 'warning' | 'info'

export type AlertType =
  | 'overallocation'
  | 'late_for_release'
  | 'blocking_dependency'
  | 'missing_estimate'
  | 'capacity_shortage'
  | 'dependency_cycle'

export interface PlanningAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  /** Ticket IDs coinvolti */
  ticketIds: string[]
  /** User IDs coinvolti (se rilevante) */
  userIds: string[]
  /** Dettagli aggiuntivi */
  details?: Record<string, unknown>
}

// ---- Alert input ----

export interface AlertsInput {
  tickets: Ticket[]
  assignments: Assignment[]
  dependencies: Dependency[]
  releases: Release[]
  /** Risultato overallocation dallo scheduler (opzionale — se già calcolato) */
  overallocations?: Array<{
    userId: string
    date: string
    assignedMinutes: number
    capacityMinutes: number
  }>
}

// ---- Generator ----

let _alertCounter = 0

function alertId(): string {
  return `alert-${++_alertCounter}`
}

/**
 * Genera tutti gli alert per lo stato corrente della pianificazione.
 */
export function generateAlerts(input: AlertsInput): PlanningAlert[] {
  _alertCounter = 0
  const alerts: PlanningAlert[] = []

  // 1. Ticket senza stima
  checkMissingEstimates(input, alerts)

  // 2. Ciclo di dipendenze
  checkDependencyCycles(input, alerts)

  // 3. Dipendenza bloccante (ticket predecessore non completato)
  checkBlockingDependencies(input, alerts)

  // 4. Ticket in ritardo su release
  checkLateForRelease(input, alerts)

  // 5. Sovrallocazione
  checkOverallocations(input, alerts)

  return alerts
}

// ---- Individual checks ----

function checkMissingEstimates(input: AlertsInput, alerts: PlanningAlert[]): void {
  for (const ticket of input.tickets) {
    if (ticket.estimateMinutes === null || ticket.estimateMinutes === 0) {
      alerts.push({
        id: alertId(),
        type: 'missing_estimate',
        severity: 'warning',
        message: `Ticket ${ticket.jiraKey} non ha una stima — non può essere schedulato`,
        ticketIds: [ticket.id],
        userIds: [],
      })
    }
  }
}

function checkDependencyCycles(input: AlertsInput, alerts: PlanningAlert[]): void {
  if (input.dependencies.length === 0) return

  const result = detectCycles(input.dependencies)
  if (result.hasCycle) {
    alerts.push({
      id: alertId(),
      type: 'dependency_cycle',
      severity: 'error',
      message: `Ciclo di dipendenze rilevato: ${result.cycle.join(' → ')}`,
      ticketIds: result.cycle.filter((id, i) => result.cycle.indexOf(id) === i), // unique
      userIds: [],
      details: { cycle: result.cycle },
    })
  }
}

function checkBlockingDependencies(input: AlertsInput, alerts: PlanningAlert[]): void {
  const ticketMap = new Map(input.tickets.map((t) => [t.id, t]))
  const assignmentsByTicket = new Map<string, Assignment[]>()
  for (const a of input.assignments) {
    const list = assignmentsByTicket.get(a.ticketId) ?? []
    list.push(a)
    assignmentsByTicket.set(a.ticketId, list)
  }

  for (const dep of input.dependencies) {
    if (dep.type !== 'blocking') continue

    const fromTicket = ticketMap.get(dep.fromTicketId)
    const toTicket = ticketMap.get(dep.toTicketId)
    if (!fromTicket || !toTicket) continue

    // Ticket bloccante non completato
    if (fromTicket.status !== 'done') {
      const fromAssignments = assignmentsByTicket.get(dep.fromTicketId) ?? []
      const hasEndDate = fromAssignments.some((a) => a.endDate !== null)

      if (!hasEndDate) {
        alerts.push({
          id: alertId(),
          type: 'blocking_dependency',
          severity: 'error',
          message: `${fromTicket.jiraKey} blocca ${toTicket.jiraKey} ma non è ancora schedulato`,
          ticketIds: [dep.fromTicketId, dep.toTicketId],
          userIds: [],
          details: {
            blockingTicketKey: fromTicket.jiraKey,
            blockedTicketKey: toTicket.jiraKey,
          },
        })
      }
    }
  }
}

function checkLateForRelease(input: AlertsInput, alerts: PlanningAlert[]): void {
  const releaseMap = new Map(input.releases.map((r) => [r.id, r]))

  for (const ticket of input.tickets) {
    if (!ticket.releaseId) continue
    const release = releaseMap.get(ticket.releaseId)
    if (!release) continue

    // Trova l'ultima endDate degli assignment di questo ticket
    const ticketAssignments = input.assignments.filter((a) => a.ticketId === ticket.id)
    const endDates = ticketAssignments
      .map((a) => a.endDate)
      .filter((d): d is string => d !== null)

    if (endDates.length === 0) continue

    const maxEndDate = endDates.sort().pop()!
    if (maxEndDate > release.targetDate) {
      alerts.push({
        id: alertId(),
        type: 'late_for_release',
        severity: 'warning',
        message: `${ticket.jiraKey} finisce il ${maxEndDate}, dopo la release ${release.name} (${release.targetDate})`,
        ticketIds: [ticket.id],
        userIds: [],
        details: {
          ticketEndDate: maxEndDate,
          releaseTargetDate: release.targetDate,
          releaseName: release.name,
        },
      })
    }
  }
}

function checkOverallocations(input: AlertsInput, alerts: PlanningAlert[]): void {
  if (!input.overallocations || input.overallocations.length === 0) return

  // Raggruppa per userId
  const byUser = new Map<string, typeof input.overallocations>()
  for (const o of input.overallocations) {
    const list = byUser.get(o.userId) ?? []
    list.push(o)
    byUser.set(o.userId, list)
  }

  for (const [userId, userOverallocations] of byUser) {
    const dates = userOverallocations.map((o) => o.date).sort()
    alerts.push({
      id: alertId(),
      type: 'overallocation',
      severity: 'warning',
      message: `Sovrallocazione per utente ${userId} in ${dates.length} giorn${dates.length === 1 ? 'o' : 'i'}`,
      ticketIds: [],
      userIds: [userId],
      details: { dates, overallocations: userOverallocations },
    })
  }
}

