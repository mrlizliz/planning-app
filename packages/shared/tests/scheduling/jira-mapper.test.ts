// ============================================================
// Test — Jira Mapper (T1-U01 … T1-U03)
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  mapJiraIssueToTicket,
  mapJiraIssuesToTickets,
  type JiraIssue,
} from '../../src/scheduling/jira-mapper.js'

// ---- Helpers ----

function makeJiraIssue(overrides: Partial<JiraIssue> = {}): JiraIssue {
  return {
    key: 'PROJ-123',
    fields: {
      summary: 'Implement login page',
      description: 'Detailed description here',
      timetracking: {
        originalEstimateSeconds: 28800, // 8h in secondi
      },
      assignee: {
        emailAddress: 'dev@example.com',
        displayName: 'Mario Rossi',
      },
      priority: {
        name: 'High',
      },
      status: {
        name: 'To Do',
      },
      parent: {
        key: 'PROJ-100',
      },
      ...overrides.fields,
    },
    ...overrides,
  }
}

// ---- Tests ----

describe('Jira Mapper', () => {
  // T1-U01: Import ticket restituisce oggetti con campi obbligatori mappati correttamente
  it('T1-U01: mappa correttamente un issue Jira completo', () => {
    const issue = makeJiraIssue()
    const result = mapJiraIssueToTicket(issue)

    expect(result.ticket.jiraKey).toBe('PROJ-123')
    expect(result.ticket.summary).toBe('Implement login page')
    expect(result.ticket.description).toBe('Detailed description here')
    // 28800 secondi = 480 minuti
    expect(result.ticket.estimateMinutes).toBe(480)
    expect(result.ticket.jiraPriority).toBe('high')
    expect(result.ticket.jiraAssigneeEmail).toBe('dev@example.com')
    expect(result.ticket.parentKey).toBe('PROJ-100')
    expect(result.ticket.status).toBe('backlog')
    expect(result.ticket.phase).toBe('dev')
    expect(result.ticket.locked).toBe(false)
    expect(result.ticket.lastSyncedAt).not.toBeNull()
    expect(result.warnings).toHaveLength(0)
  })

  it('T1-U01: mappa priorità Jira non standard (blocker → highest)', () => {
    const issue = makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        priority: { name: 'Blocker' },
      },
    })
    const result = mapJiraIssueToTicket(issue)
    expect(result.ticket.jiraPriority).toBe('highest')
  })

  it('T1-U01: priorità sconosciuta → fallback a medium', () => {
    const issue = makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        priority: { name: 'CustomPriority' },
      },
    })
    const result = mapJiraIssueToTicket(issue)
    expect(result.ticket.jiraPriority).toBe('medium')
  })

  // T1-U02: Gestione errore — campi mancanti non causano crash
  it('T1-U02: issue con campi opzionali mancanti non causa crash', () => {
    const issue: JiraIssue = {
      key: 'PROJ-456',
      fields: {
        summary: 'Minimal issue',
      },
    }
    const result = mapJiraIssueToTicket(issue)

    expect(result.ticket.jiraKey).toBe('PROJ-456')
    expect(result.ticket.summary).toBe('Minimal issue')
    expect(result.ticket.description).toBeNull()
    expect(result.ticket.estimateMinutes).toBeNull()
    expect(result.ticket.jiraAssigneeEmail).toBeNull()
    expect(result.ticket.jiraPriority).toBe('medium')
    expect(result.ticket.parentKey).toBeNull()
  })

  // T1-U03: Ticket senza stima viene importato con estimate = null e flag warning
  it('T1-U03: ticket senza stima → estimateMinutes null + warning missing_estimate', () => {
    const issue = makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        timetracking: null,
        timeoriginalestimate: null,
      },
    })
    const result = mapJiraIssueToTicket(issue)

    expect(result.ticket.estimateMinutes).toBeNull()
    expect(result.warnings).toContain('missing_estimate')
  })

  it('T1-U03: ticket con stima zero → warning estimate_zero', () => {
    const issue = makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        timetracking: { originalEstimateSeconds: 0 },
      },
    })
    const result = mapJiraIssueToTicket(issue)

    expect(result.ticket.estimateMinutes).toBe(0)
    expect(result.warnings).toContain('estimate_zero')
  })

  it('ticket senza assignee → warning missing_assignee', () => {
    const issue = makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        assignee: null,
      },
    })
    const result = mapJiraIssueToTicket(issue)

    expect(result.ticket.jiraAssigneeEmail).toBeNull()
    expect(result.warnings).toContain('missing_assignee')
  })

  it('usa campo legacy timeoriginalestimate se timetracking non presente', () => {
    const issue = makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        timetracking: undefined,
        timeoriginalestimate: 7200, // 2h in secondi
      },
    })
    const result = mapJiraIssueToTicket(issue)
    expect(result.ticket.estimateMinutes).toBe(120) // 2h = 120min
  })

  // ---- jiraStatus mapping ----

  it('mappa jiraStatus da status.statusCategory.name', () => {
    const issue = makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        status: {
          name: 'In Progress',
          statusCategory: { name: 'In Progress' },
        },
      },
    })
    const result = mapJiraIssueToTicket(issue)
    expect(result.ticket.jiraStatus).toBe('In Progress')
  })

  it('jiraStatus fallback a statuscategory top-level', () => {
    const issue: JiraIssue = {
      key: 'PROJ-789',
      fields: {
        summary: 'Fallback status',
        status: { name: 'Custom Status' },
        statuscategory: { name: 'Done' },
      },
    }
    const result = mapJiraIssueToTicket(issue)
    expect(result.ticket.jiraStatus).toBe('Done')
  })

  it('jiraStatus fallback a status.name se nessun statusCategory', () => {
    const issue = makeJiraIssue({
      fields: {
        ...makeJiraIssue().fields,
        status: { name: 'Review' },
      },
    })
    const result = mapJiraIssueToTicket(issue)
    expect(result.ticket.jiraStatus).toBe('Review')
  })

  it('jiraStatus null se nessuna info status', () => {
    const issue: JiraIssue = {
      key: 'PROJ-000',
      fields: {
        summary: 'No status',
      },
    }
    const result = mapJiraIssueToTicket(issue)
    expect(result.ticket.jiraStatus).toBeNull()
  })

  // Mapping batch con preservazione override
  describe('mapJiraIssuesToTickets (batch)', () => {
    it('mappa più issue in batch', () => {
      const issues = [
        makeJiraIssue({ key: 'PROJ-1' }),
        makeJiraIssue({ key: 'PROJ-2' }),
      ]
      const results = mapJiraIssuesToTickets(issues)
      expect(results).toHaveLength(2)
      expect(results[0].ticket.jiraKey).toBe('PROJ-1')
      expect(results[1].ticket.jiraKey).toBe('PROJ-2')
    })

    it('re-import preserva override manuali del ticket esistente', () => {
      const existingTicket = mapJiraIssueToTicket(makeJiraIssue()).ticket
      existingTicket.priorityOverride = 1
      existingTicket.locked = true
      existingTicket.milestoneId = 'ms-1'
      existingTicket.releaseId = 'rel-1'
      existingTicket.status = 'planned'

      const updatedIssue = makeJiraIssue({
        fields: {
          ...makeJiraIssue().fields,
          summary: 'Updated summary',
          timetracking: { originalEstimateSeconds: 14400 }, // 4h
        },
      })

      const results = mapJiraIssuesToTickets([updatedIssue], [existingTicket])
      const t = results[0].ticket

      // Dati aggiornati da Jira
      expect(t.summary).toBe('Updated summary')
      expect(t.estimateMinutes).toBe(240) // 4h
      // Override preservati
      expect(t.priorityOverride).toBe(1)
      expect(t.locked).toBe(true)
      expect(t.milestoneId).toBe('ms-1')
      expect(t.releaseId).toBe('rel-1')
      expect(t.status).toBe('planned')
      // Stesso ID
      expect(t.id).toBe(existingTicket.id)
    })
  })
})

