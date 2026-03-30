// ============================================================
// Jira Mapper — Mappatura risposte Jira → Ticket interni
// ============================================================

import type { Ticket, JiraPriority, TicketWarning } from '../types/ticket.js'

/** Genera un ID univoco semplice (senza dipendenza da crypto globale) */
function generateId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

/** Struttura di un issue Jira come arriva dall'API REST */
export interface JiraIssue {
  key: string
  fields: {
    summary: string
    description?: string | null
    timetracking?: {
      originalEstimateSeconds?: number | null
    } | null
    /** Campo legacy per la stima */
    timeoriginalestimate?: number | null
    assignee?: {
      emailAddress?: string | null
      displayName?: string | null
    } | null
    priority?: {
      name?: string | null
    } | null
    status?: {
      name?: string | null
    } | null
    parent?: {
      key?: string | null
    } | null
  }
}

/** Risultato del mapping di un issue Jira */
export interface JiraMappingResult {
  ticket: Ticket
  /** Warning rilevati durante il mapping */
  warnings: TicketWarning[]
}

const JIRA_PRIORITY_MAP: Record<string, JiraPriority> = {
  highest: 'highest',
  high: 'high',
  medium: 'medium',
  low: 'low',
  lowest: 'lowest',
  critical: 'highest',
  major: 'high',
  minor: 'low',
  trivial: 'lowest',
  blocker: 'highest',
}

/**
 * Mappa un issue Jira a un Ticket interno.
 *
 * - Converte originalEstimate da secondi a minuti
 * - Genera warning per ticket senza stima o senza assignee
 * - Mappa priorità Jira con fallback a 'medium'
 */
export function mapJiraIssueToTicket(
  issue: JiraIssue,
  existingId?: string,
): JiraMappingResult {
  const warnings: TicketWarning[] = []

  // Stima: prova timetracking.originalEstimateSeconds, poi timeoriginalestimate
  let estimateMinutes: number | null = null
  const seconds = issue.fields.timetracking?.originalEstimateSeconds
    ?? issue.fields.timeoriginalestimate
    ?? null

  if (seconds === null || seconds === undefined) {
    warnings.push('missing_estimate')
  } else if (seconds === 0) {
    estimateMinutes = 0
    warnings.push('estimate_zero')
  } else {
    estimateMinutes = Math.round(seconds / 60)
  }

  // Assignee
  const assigneeEmail = issue.fields.assignee?.emailAddress ?? null
  if (!assigneeEmail) {
    warnings.push('missing_assignee')
  }

  // Priorità
  const rawPriority = issue.fields.priority?.name?.toLowerCase() ?? 'medium'
  const jiraPriority: JiraPriority = JIRA_PRIORITY_MAP[rawPriority] ?? 'medium'

  const now = new Date().toISOString()
  const id = existingId ?? generateId()

  const ticket: Ticket = {
    id,
    jiraKey: issue.key,
    summary: issue.fields.summary,
    description: issue.fields.description ?? null,
    estimateMinutes,
    jiraPriority,
    priorityOverride: null,
    status: 'backlog',
    phase: 'dev',
    jiraAssigneeEmail: assigneeEmail,
    parentKey: issue.fields.parent?.key ?? null,
    milestoneId: null,
    releaseId: null,
    locked: false,
    warnings,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  }

  return { ticket, warnings }
}

/**
 * Mappa un array di issue Jira a ticket interni.
 * Ticket già esistenti (match per jiraKey) mantengono l'ID originale.
 */
export function mapJiraIssuesToTickets(
  issues: JiraIssue[],
  existingTickets: Ticket[] = [],
): JiraMappingResult[] {
  const existingMap = new Map(existingTickets.map((t) => [t.jiraKey, t]))

  return issues.map((issue) => {
    const existing = existingMap.get(issue.key)
    const result = mapJiraIssueToTicket(issue, existing?.id)

    // Se il ticket esisteva, preserva override manuali
    if (existing) {
      result.ticket.priorityOverride = existing.priorityOverride
      result.ticket.status = existing.status
      result.ticket.locked = existing.locked
      result.ticket.milestoneId = existing.milestoneId
      result.ticket.releaseId = existing.releaseId
      result.ticket.createdAt = existing.createdAt
    }

    return result
  })
}



