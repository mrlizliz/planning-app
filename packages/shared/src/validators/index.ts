// ============================================================
// Validators — Zod schemas per validazione runtime
// ============================================================

import { z } from 'zod'

// ---- Enums ----

export const appRoleSchema = z.enum(['pm', 'dev', 'qa'])
export const planningRoleSchema = z.enum(['dev', 'qa'])
export const officeSchema = z.enum(['milano', 'venezia', 'roma'])
export const jiraPrioritySchema = z.enum(['highest', 'high', 'medium', 'low', 'lowest'])
export const ticketStatusSchema = z.enum(['backlog', 'planned', 'in_progress', 'done'])
export const ticketPhaseSchema = z.enum(['dev', 'qa'])
export const ticketWarningSchema = z.enum(['missing_estimate', 'missing_assignee', 'estimate_zero'])
export const absenceTypeSchema = z.enum(['vacation', 'sick', 'permit', 'training', 'other'])
export const meetingFrequencySchema = z.enum(['daily', 'weekly', 'biweekly', 'monthly'])
export const meetingTypeSchema = z.enum(['standup', 'refinement', 'sprint_planning', 'retrospective', 'one_on_one', 'custom'])
export const dependencyTypeSchema = z.enum(['finish_to_start', 'parallel', 'blocking'])
export const deployEnvironmentSchema = z.enum(['dev', 'prod'])
export const milestoneStatusSchema = z.enum(['on_track', 'at_risk', 'delayed'])

// ---- Formato data ISO YYYY-MM-DD ----

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato data: YYYY-MM-DD')

// ---- User ----

export const userSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email(),
  appRole: appRoleSchema,
  planningRoles: z.array(planningRoleSchema).min(0),
  office: officeSchema.nullable(),
  dailyWorkingMinutes: z.number().int().min(0).max(1440),
  dailyOverheadMinutes: z.number().int().min(0).max(1440),
  active: z.boolean(),
})

// ---- Ticket ----

export const ticketSchema = z.object({
  id: z.string().min(1),
  jiraKey: z.string().min(1),
  summary: z.string().min(1),
  description: z.string().nullable(),
  estimateMinutes: z.number().int().min(0).nullable(),
  jiraPriority: jiraPrioritySchema,
  priorityOverride: z.number().int().nullable(),
  status: ticketStatusSchema,
  phase: ticketPhaseSchema,
  jiraAssigneeEmail: z.string().email().nullable(),
  jiraAssigneeName: z.string().nullable(),
  jiraStatus: z.string().nullable().default(null),
  parentKey: z.string().nullable(),
  fixVersions: z.array(z.string()).default([]),
  milestoneId: z.string().nullable(),
  releaseId: z.string().nullable(),
  locked: z.boolean(),
  warnings: z.array(ticketWarningSchema),
  lastSyncedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// ---- Assignment ----

export const assignmentSchema = z.object({
  id: z.string().min(1),
  ticketId: z.string().min(1),
  userId: z.string().min(1),
  role: planningRoleSchema,
  allocationPercent: z.number().int().min(1).max(100),
  startDate: isoDateString.nullable(),
  endDate: isoDateString.nullable(),
  durationDays: z.number().int().min(0).nullable(),
  locked: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// ---- Calendar ----

export const holidaySchema = z.object({
  id: z.string().min(1),
  date: isoDateString,
  name: z.string().min(1),
  recurring: z.boolean(),
  office: z.string().nullable(),
})

export const calendarExceptionSchema = z.object({
  id: z.string().min(1),
  date: isoDateString,
  description: z.string().min(1),
})

export const absenceSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  startDate: isoDateString,
  endDate: isoDateString,
  type: absenceTypeSchema,
  halfDay: z.boolean(),
  notes: z.string().nullable(),
})

export const recurringMeetingSchema = z.object({
  id: z.string().min(1),
  userId: z.string().nullable(),
  name: z.string().min(1),
  type: meetingTypeSchema,
  durationMinutes: z.number().int().min(1).max(480),
  frequency: meetingFrequencySchema,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
})

export const workingCalendarSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  holidays: z.array(holidaySchema),
  exceptions: z.array(calendarExceptionSchema),
})

// ---- Milestone ----

export const milestoneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  targetDate: isoDateString,
  status: milestoneStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

// ---- Release ----

export const releaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  targetDate: isoDateString,
  forecastDate: isoDateString.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// ---- Dependency ----

export const dependencySchema = z.object({
  id: z.string().min(1),
  fromTicketId: z.string().min(1),
  toTicketId: z.string().min(1),
  type: dependencyTypeSchema,
  importedFromJira: z.boolean(),
  createdAt: z.string(),
})

// ---- Deployment ----

export const deploymentDaySchema = z.object({
  id: z.string().min(1),
  environment: deployEnvironmentSchema,
  dayOfWeek: z.number().int().min(0).max(6),
  active: z.boolean(),
})

export const deploymentWindowSchema = z.object({
  id: z.string().min(1),
  environment: deployEnvironmentSchema,
  date: isoDateString,
  allowed: z.boolean(),
  notes: z.string().nullable(),
})

// ---- Scenario ----

export const scenarioAssignmentSchema = z.object({
  assignmentId: z.string().min(1),
  ticketId: z.string().min(1),
  userId: z.string().min(1),
  role: planningRoleSchema,
  allocationPercent: z.number().int().min(1).max(100),
  startDate: isoDateString.nullable(),
  endDate: isoDateString.nullable(),
  durationDays: z.number().int().min(0).nullable(),
  locked: z.boolean(),
})

export const scenarioSnapshotSchema = z.object({
  assignments: z.array(scenarioAssignmentSchema),
  ticketIds: z.array(z.string().min(1)),
})

export const scenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  isCurrent: z.boolean(),
  snapshot: scenarioSnapshotSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

