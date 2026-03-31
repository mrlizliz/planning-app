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

/** Risposta raw dall'endpoint GET /rest/api/3/search/jql */
interface JiraSearchPageResponse {
  issues: JiraIssue[]
  total?: number
  maxResults?: number
  /** Token per la pagina successiva. Assente/null = ultima pagina. */
  nextPageToken?: string | null
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
 * - Ricerca ticket con JQL (GET /rest/api/3/search/jql — cursor-based pagination)
 * - Paginazione automatica con nextPageToken
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
   * Cerca ticket Jira usando JQL con paginazione automatica.
   *
   * Usa GET /rest/api/3/search/jql con cursor-based pagination (nextPageToken).
   *
   * @param jql - Query JQL (es. "project = PROJ ORDER BY priority DESC")
   * @param maxResults - Numero massimo di risultati per pagina (default: 100)
   * @param fetchAll - Se true, pagina automaticamente per ottenere tutti i risultati
   */
  async searchIssues(jql: string, maxResults = 100, fetchAll = true): Promise<JiraSearchResult> {
    const fields = [
      'summary',
      'description',
      'timetracking',
      'timeoriginalestimate',
      'assignee',
      'priority',
      'status',
      'statuscategory',
      'parent',
      'issuelinks',
      'fixVersions',
    ]

    const MAX_PAGES = 200 // safety limit: 200 × 100 = 20 000 issues max

    let allIssues: JiraIssue[] = []
    const seenKeys = new Set<string>()
    let nextPageToken: string | null | undefined = undefined
    let serverTotal = 0
    let page = 0

    do {
      // Costruisci URL con query params — ogni field come parametro separato
      const params = new URLSearchParams()
      params.set('jql', jql)
      params.set('maxResults', String(maxResults))
      for (const f of fields) {
        params.append('fields', f)
      }
      if (nextPageToken) {
        params.set('nextPageToken', nextPageToken)
      }

      const url = `${this.baseUrl}/rest/api/3/search/jql?${params.toString()}`
      const response = await this.fetchWithRetry(url) as JiraSearchPageResponse

      if (response.total != null && response.total > 0) {
        serverTotal = response.total
      }

      // Deduplica per sicurezza
      let newCount = 0
      for (const issue of response.issues) {
        if (!seenKeys.has(issue.key)) {
          seenKeys.add(issue.key)
          allIssues.push(issue)
          newCount++
        }
      }

      nextPageToken = response.nextPageToken
      page++

      console.log(`📄 Jira page ${page}: fetched ${response.issues.length} (${newCount} new), total so far: ${allIssues.length}${serverTotal ? `, server total: ${serverTotal}` : ''}${nextPageToken ? ', has next page' : ', last page'}`)

      if (!fetchAll) break
      // Pagina vuota → fine
      if (response.issues.length === 0) break
      // Nessun issue nuovo nella pagina → stop
      if (newCount === 0) break
      // Nessun nextPageToken → ultima pagina
      if (!nextPageToken) break
      // Safety limit
      if (page >= MAX_PAGES) {
        console.warn(`⚠️ Jira pagination: raggiunto il limite di sicurezza di ${MAX_PAGES} pagine (${allIssues.length} issues). Interruzione.`)
        break
      }
    } while (true)

    console.log(`✅ Jira sync completato: ${allIssues.length} issues in ${page} pagine (server total: ${serverTotal})`)

    return {
      issues: allIssues,
      total: serverTotal || allIssues.length,
      maxResults,
      startAt: 0,
    }
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
      'issuelinks',
      'fixVersions',
    ].join(',')

    const url = `${this.baseUrl}/rest/api/3/issue/${issueKey}?fields=${fields}`

    const response = await this.fetchWithRetry(url)
    return response as JiraIssue
  }

  private async fetchWithRetry(url: string, retries = 1): Promise<unknown> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔗 Jira API GET [attempt ${attempt + 1}]: ${url.split('?')[0]}...`)
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          let jiraMessage = body
          try {
            const parsed = JSON.parse(body)
            if (parsed.errorMessages?.length) {
              jiraMessage = parsed.errorMessages.join('; ')
            } else if (parsed.message) {
              jiraMessage = parsed.message
            }
          } catch {
            // body non è JSON, usa il testo raw
          }
          console.error(`❌ Jira API ${response.status} ${response.statusText}: ${jiraMessage}`)
          throw new JiraClientError(
            `Jira API error: ${response.status} ${response.statusText}`,
            response.status,
            jiraMessage,
          )
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error
        if (error instanceof JiraClientError) {
          if (error.statusCode === 401 || error.statusCode === 403) {
            throw error
          }
        }
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    throw lastError ?? new Error('Jira API request failed')
  }
}

