// ============================================================
// Jira Mapper — Mappatura risposte Jira → Ticket interni
// ============================================================

import type { Ticket, JiraPriority, TicketWarning } from '../types/ticket.js'
import type { Dependency, DependencyType } from '../types/dependency.js'

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
    issuelinks?: Array<{
      type: {
        name: string
        inward?: string
        outward?: string
      }
      inwardIssue?: { key: string } | null
      outwardIssue?: { key: string } | null
    }> | null
    fixVersions?: Array<{
      name: string
    }> | null
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
  const assigneeName = issue.fields.assignee?.displayName ?? null
  if (!assigneeEmail) {
    warnings.push('missing_assignee')
  }

  // Fix versions
  const fixVersions = (issue.fields.fixVersions ?? []).map((v) => v.name)

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
    jiraAssigneeName: assigneeName,
    parentKey: issue.fields.parent?.key ?? null,
    fixVersions,
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

// ---- Jira Issuelinks → Dependencies ----

/** Mappa dei tipi di link Jira comuni → tipo di dipendenza interno */
const JIRA_LINK_TYPE_MAP: Record<string, DependencyType> = {
  blocks: 'blocking',
  'is blocked by': 'blocking',
  'is depended on by': 'finish_to_start',
  'depends on': 'finish_to_start',
  clones: 'parallel',
  'is cloned by': 'parallel',
  relates: 'parallel',
  'is related to': 'parallel',
}

/**
 * Mappa issuelinks da Jira a Dependency interne.
 * Usa la mappa jiraKey→ticketId per risolvere i riferimenti.
 *
 * @param issues - Issue Jira con issuelinks
 * @param jiraKeyToTicketId - Mappa jiraKey → id ticket interno
 * @returns Array di Dependency create dalle issuelinks
 */
export function mapJiraLinksToDependencies(
  issues: JiraIssue[],
  jiraKeyToTicketId: Map<string, string>,
): Dependency[] {
  const dependencies: Dependency[] = []
  const seen = new Set<string>() // evita duplicati

  for (const issue of issues) {
    const fromId = jiraKeyToTicketId.get(issue.key)
    if (!fromId) continue

    for (const link of issue.fields.issuelinks ?? []) {
      // Outward: questo ticket → altro ticket
      if (link.outwardIssue) {
        const toKey = link.outwardIssue.key
        const toId = jiraKeyToTicketId.get(toKey)
        if (!toId) continue

        const linkName = link.type.outward?.toLowerCase() ?? link.type.name.toLowerCase()
        const type = JIRA_LINK_TYPE_MAP[linkName] ?? 'finish_to_start'
        const key = `${fromId}->${toId}`

        if (!seen.has(key)) {
          seen.add(key)
          dependencies.push({
            id: generateId(),
            fromTicketId: fromId,
            toTicketId: toId,
            type,
            importedFromJira: true,
            createdAt: new Date().toISOString(),
          })
        }
      }

      // Inward: altro ticket → questo ticket
      if (link.inwardIssue) {
        const otherKey = link.inwardIssue.key
        const otherId = jiraKeyToTicketId.get(otherKey)
        if (!otherId) continue

        const linkName = link.type.inward?.toLowerCase() ?? link.type.name.toLowerCase()
        const type = JIRA_LINK_TYPE_MAP[linkName] ?? 'finish_to_start'

        // Determina direzione: "is blocked by" → l'altro blocca questo
        const isInward = linkName.startsWith('is ')
        const [actualFrom, actualTo] = isInward
          ? [otherId, fromId]
          : [fromId, otherId]

        const key = `${actualFrom}->${actualTo}`

        if (!seen.has(key)) {
          seen.add(key)
          dependencies.push({
            id: generateId(),
            fromTicketId: actualFrom,
            toTicketId: actualTo,
            type,
            importedFromJira: true,
            createdAt: new Date().toISOString(),
          })
        }
      }
    }
  }

  return dependencies
}
