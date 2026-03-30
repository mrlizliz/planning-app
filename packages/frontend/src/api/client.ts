// ============================================================
// API Client — HTTP client tipizzato per il backend
// ============================================================

import type { Ticket, Assignment, User, Holiday, CalendarException, Absence, RecurringMeeting, WorkingCalendar } from '@planning/shared'
import type { SchedulerResult, Milestone, Release, Dependency, DeploymentDay, DeploymentWindow } from '@planning/shared'
import type { PlanningAlert } from '@planning/shared'

const BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  // Content-Type solo se c'è un body da inviare
  if (options?.body) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(`${BASE}${url}`, {
    headers,
    ...options,
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${response.status}`)
  }
  // Gestisci risposte vuote (204 No Content)
  const text = await response.text()
  if (!text) return {} as T
  return JSON.parse(text)
}

// ---- Tickets ----

export const ticketsApi = {
  list: () => request<Ticket[]>('/tickets'),
  get: (id: string) => request<Ticket>(`/tickets/${id}`),
  update: (id: string, data: Partial<Ticket>) =>
    request<Ticket>(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/tickets/${id}`, { method: 'DELETE' }),
  syncJira: (config: { baseUrl: string; email: string; apiToken: string; jql: string }) =>
    request<{ imported: number; total: number; tickets: Array<{ id: string; jiraKey: string; warnings: string[] }> }>(
      '/tickets/sync-jira',
      { method: 'POST', body: JSON.stringify(config) },
    ),
}

// ---- Users ----

export const usersApi = {
  list: () => request<User[]>('/users'),
  get: (id: string) => request<User>(`/users/${id}`),
  create: (user: User) =>
    request<User>('/users', { method: 'POST', body: JSON.stringify(user) }),
  update: (id: string, data: Partial<User>) =>
    request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
}

// ---- Assignments ----

export const assignmentsApi = {
  list: (filters?: { ticketId?: string; userId?: string }) => {
    const params = new URLSearchParams()
    if (filters?.ticketId) params.set('ticketId', filters.ticketId)
    if (filters?.userId) params.set('userId', filters.userId)
    const qs = params.toString()
    return request<Assignment[]>(`/assignments${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => request<Assignment>(`/assignments/${id}`),
  create: (assignment: Assignment) =>
    request<Assignment>('/assignments', { method: 'POST', body: JSON.stringify(assignment) }),
  update: (id: string, data: Partial<Assignment>) =>
    request<Assignment>(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/assignments/${id}`, { method: 'DELETE' }),
}

// ---- Calendar ----

export const calendarApi = {
  get: () => request<WorkingCalendar>('/calendar'),
  holidays: {
    list: () => request<Holiday[]>('/calendar/holidays'),
    create: (holiday: Holiday) =>
      request<Holiday>('/calendar/holidays', { method: 'POST', body: JSON.stringify(holiday) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/calendar/holidays/${id}`, { method: 'DELETE' }),
  },
  exceptions: {
    list: () => request<CalendarException[]>('/calendar/exceptions'),
    create: (exception: CalendarException) =>
      request<CalendarException>('/calendar/exceptions', { method: 'POST', body: JSON.stringify(exception) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/calendar/exceptions/${id}`, { method: 'DELETE' }),
  },
}

// ---- Absences ----

export const absencesApi = {
  list: (userId?: string) =>
    request<Absence[]>(`/absences${userId ? `?userId=${userId}` : ''}`),
  create: (absence: Absence) =>
    request<Absence>('/absences', { method: 'POST', body: JSON.stringify(absence) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/absences/${id}`, { method: 'DELETE' }),
}

// ---- Meetings ----

export const meetingsApi = {
  list: (userId?: string) =>
    request<RecurringMeeting[]>(`/meetings${userId ? `?userId=${userId}` : ''}`),
  create: (meeting: RecurringMeeting) =>
    request<RecurringMeeting>('/meetings', { method: 'POST', body: JSON.stringify(meeting) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/meetings/${id}`, { method: 'DELETE' }),
}

// ---- Scheduler ----

export const schedulerApi = {
  run: (planningStartDate?: string) =>
    request<SchedulerResult & { scheduledCount: number; errorsCount: number; alerts?: PlanningAlert[] }>('/scheduler/run', {
      method: 'POST',
      body: JSON.stringify({ planningStartDate }),
    }),
  status: () =>
    request<{
      totalTickets: number
      plannedTickets: number
      backlogTickets: number
      totalAssignments: number
      scheduledAssignments: number
      lockedAssignments: number
    }>('/scheduler/status'),
}

// ---- Milestones ----

export const milestonesApi = {
  list: () => request<Milestone[]>('/milestones'),
  create: (m: Milestone) =>
    request<Milestone>('/milestones', { method: 'POST', body: JSON.stringify(m) }),
  update: (id: string, data: Partial<Milestone>) =>
    request<Milestone>(`/milestones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/milestones/${id}`, { method: 'DELETE' }),
}

// ---- Releases ----

export const releasesApi = {
  list: () => request<Release[]>('/releases'),
  create: (r: Release) =>
    request<Release>('/releases', { method: 'POST', body: JSON.stringify(r) }),
  update: (id: string, data: Partial<Release>) =>
    request<Release>(`/releases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/releases/${id}`, { method: 'DELETE' }),
}

// ---- Deploy ----

export const deployApi = {
  days: {
    list: () => request<DeploymentDay[]>('/deploy/days'),
    create: (d: DeploymentDay) =>
      request<DeploymentDay>('/deploy/days', { method: 'POST', body: JSON.stringify(d) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/deploy/days/${id}`, { method: 'DELETE' }),
  },
  windows: {
    list: () => request<DeploymentWindow[]>('/deploy/windows'),
    create: (w: DeploymentWindow) =>
      request<DeploymentWindow>('/deploy/windows', { method: 'POST', body: JSON.stringify(w) }),
    delete: (id: string) =>
      request<{ ok: boolean }>(`/deploy/windows/${id}`, { method: 'DELETE' }),
  },
}

// ---- Dependencies ----

export const dependenciesApi = {
  list: (ticketId?: string) =>
    request<Dependency[]>(`/dependencies${ticketId ? `?ticketId=${ticketId}` : ''}`),
  create: (dep: Dependency) =>
    request<Dependency>('/dependencies', { method: 'POST', body: JSON.stringify(dep) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/dependencies/${id}`, { method: 'DELETE' }),
  impact: (ticketId: string) =>
    request<{ impactedTicketIds: string[]; impactedTickets: Ticket[]; chains: Array<{ ticketId: string; path: string[] }> }>(
      `/dependencies/impact/${ticketId}`,
    ),
}
