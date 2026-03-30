// ============================================================
// Reporting — Generazione report e export CSV
// ============================================================

import type { Ticket } from '../types/ticket.js'
import type { Assignment } from '../types/assignment.js'
import type { User } from '../types/user.js'
import type { Release } from '../types/release.js'
import type { Milestone } from '../types/milestone.js'
import type { ScheduledAssignment } from './scheduler.js'

// ---- Types ----

export interface ReportRow {
  jiraKey: string
  summary: string
  priority: string
  status: string
  phase: string
  assignee: string
  role: string
  allocationPercent: number
  startDate: string
  endDate: string
  durationDays: number
  estimateHours: number
  release: string
  milestone: string
  locked: boolean
}

export interface ReleaseReportRow {
  releaseName: string
  targetDate: string
  forecastDate: string
  totalTickets: number
  plannedTickets: number
  completedTickets: number
  status: 'on_track' | 'at_risk' | 'delayed' | 'unknown'
}

// ---- Report generation ----

/**
 * Genera le righe del report planning principale.
 */
export function generatePlanningReport(
  tickets: Ticket[],
  assignments: Assignment[],
  scheduledAssignments: ScheduledAssignment[],
  users: User[],
  releases: Release[],
  milestones: Milestone[],
): ReportRow[] {
  const userMap = new Map(users.map((u) => [u.id, u]))
  const releaseMap = new Map(releases.map((r) => [r.id, r]))
  const milestoneMap = new Map(milestones.map((m) => [m.id, m]))
  const scheduledMap = new Map(scheduledAssignments.map((s) => [s.assignmentId, s]))

  const rows: ReportRow[] = []

  for (const ticket of tickets) {
    const ticketAssignments = assignments.filter((a) => a.ticketId === ticket.id)

    if (ticketAssignments.length === 0) {
      // Ticket senza assignment
      rows.push({
        jiraKey: ticket.jiraKey,
        summary: ticket.summary,
        priority: ticket.priorityOverride !== null ? `P${ticket.priorityOverride}` : ticket.jiraPriority,
        status: ticket.status,
        phase: ticket.phase,
        assignee: '',
        role: '',
        allocationPercent: 0,
        startDate: '',
        endDate: '',
        durationDays: 0,
        estimateHours: ticket.estimateMinutes ? Math.round((ticket.estimateMinutes / 60) * 10) / 10 : 0,
        release: releaseMap.get(ticket.releaseId ?? '')?.name ?? '',
        milestone: milestoneMap.get(ticket.milestoneId ?? '')?.name ?? '',
        locked: ticket.locked,
      })
      continue
    }

    for (const assignment of ticketAssignments) {
      const user = userMap.get(assignment.userId)
      const scheduled = scheduledMap.get(assignment.id)

      rows.push({
        jiraKey: ticket.jiraKey,
        summary: ticket.summary,
        priority: ticket.priorityOverride !== null ? `P${ticket.priorityOverride}` : ticket.jiraPriority,
        status: ticket.status,
        phase: ticket.phase,
        assignee: user?.displayName ?? assignment.userId,
        role: assignment.role,
        allocationPercent: assignment.allocationPercent,
        startDate: scheduled?.startDate ?? assignment.startDate ?? '',
        endDate: scheduled?.endDate ?? assignment.endDate ?? '',
        durationDays: scheduled?.durationDays ?? assignment.durationDays ?? 0,
        estimateHours: ticket.estimateMinutes ? Math.round((ticket.estimateMinutes / 60) * 10) / 10 : 0,
        release: releaseMap.get(ticket.releaseId ?? '')?.name ?? '',
        milestone: milestoneMap.get(ticket.milestoneId ?? '')?.name ?? '',
        locked: assignment.locked,
      })
    }
  }

  return rows
}

/**
 * Genera report per release.
 */
export function generateReleaseReport(
  releases: Release[],
  tickets: Ticket[],
  assignments: Assignment[],
): ReleaseReportRow[] {
  return releases.map((release) => {
    const releaseTickets = tickets.filter((t) => t.releaseId === release.id)
    const plannedTickets = releaseTickets.filter(
      (t) => t.status === 'planned' || t.status === 'in_progress' || t.status === 'done',
    )
    const completedTickets = releaseTickets.filter((t) => t.status === 'done')

    // Forecast = max endDate degli assignment
    const endDates = assignments
      .filter((a) => releaseTickets.some((t) => t.id === a.ticketId) && a.endDate)
      .map((a) => a.endDate!)
      .sort()
    const forecastDate = endDates.length > 0 ? endDates[endDates.length - 1] : ''

    let status: ReleaseReportRow['status'] = 'unknown'
    if (forecastDate) {
      if (forecastDate <= release.targetDate) {
        status = 'on_track'
      } else {
        status = 'delayed'
      }
    }

    return {
      releaseName: release.name,
      targetDate: release.targetDate,
      forecastDate,
      totalTickets: releaseTickets.length,
      plannedTickets: plannedTickets.length,
      completedTickets: completedTickets.length,
      status,
    }
  })
}

// ---- CSV Export ----

/**
 * Esporta un array di righe in formato CSV.
 * Escape dei valori con virgolette se contengono virgole o newline.
 */
export function toCSV(rows: Array<Record<string, unknown> | object>, columns?: string[]): string {
  if (rows.length === 0) return ''

  const headers = columns ?? Object.keys(rows[0])
  const lines: string[] = []

  // Header
  lines.push(headers.join(','))

  // Righe
  for (const row of rows) {
    const obj = row as Record<string, unknown>
    const values = headers.map((h) => {
      const val = obj[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Escape se contiene virgola, newline o virgolette
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    lines.push(values.join(','))
  }

  return lines.join('\n')
}


