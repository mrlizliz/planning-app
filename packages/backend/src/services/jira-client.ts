// ============================================================
// Jira Client — HTTP client per Jira REST API
// ============================================================

import type { JiraIssue } from '@planning/shared'

export interface JiraConfig {
  /** URL base dell'istanza Jira (es. https://mycompany.atlassian.net) */
  baseUrl: string
  /** Email dell'utente Jira */
  email: string
  /** API Token Jira */
  apiToken: string
}

export interface JiraSearchResult {
  issues: JiraIssue[]
  total: number
  maxResults: number
  startAt: number
}

export class JiraClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public jiraMessage?: string,
  ) {
    super(message)
    this.name = 'JiraClientError'
  }
}

/**
 * Client per le API REST di Jira.
 *
 * Supporta:
 * - Ricerca ticket con JQL
 * - Retry automatico (1 tentativo)
 * - Gestione errori HTTP (401, 403, 500)
 */
export class JiraClient {
  private baseUrl: string
  private authHeader: string

  constructor(config: JiraConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.authHeader = 'Basic ' + Buffer.from(`${config.email}:${config.apiToken}`).toString('base64')
  }

  /**
   * Cerca ticket Jira usando JQL.
   *
   * @param jql - Query JQL (es. "project = PROJ ORDER BY priority DESC")
   * @param maxResults - Numero massimo di risultati (default: 100)
   */
  async searchIssues(jql: string, maxResults = 100): Promise<JiraSearchResult> {
    const fields = [
      'summary',
      'description',
      'timetracking',
      'timeoriginalestimate',
      'assignee',
      'priority',
      'status',
      'parent',
    ].join(',')

    const url = `${this.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=${fields}`

    const response = await this.fetchWithRetry(url)
    return response as JiraSearchResult
  }

  /**
   * Recupera un singolo issue Jira per key.
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    const fields = [
      'summary',
      'description',
      'timetracking',
      'timeoriginalestimate',
      'assignee',
      'priority',
      'status',
      'parent',
    ].join(',')

    const url = `${this.baseUrl}/rest/api/3/issue/${issueKey}?fields=${fields}`

    const response = await this.fetchWithRetry(url)
    return response as JiraIssue
  }

  private async fetchWithRetry(url: string, retries = 1): Promise<unknown> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          throw new JiraClientError(
            `Jira API error: ${response.status} ${response.statusText}`,
            response.status,
            body,
          )
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error
        if (error instanceof JiraClientError) {
          // Non fare retry per errori di autenticazione
          if (error.statusCode === 401 || error.statusCode === 403) {
            throw error
          }
        }
        // Aspetta prima del retry
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    throw lastError ?? new Error('Jira API request failed')
  }
}

