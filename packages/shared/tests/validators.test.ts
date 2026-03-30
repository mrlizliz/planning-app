// ============================================================
// T0-01 / T0-02 — Validazione domain model con Zod schemas
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  userSchema,
  ticketSchema,
  assignmentSchema,
  holidaySchema,
  calendarExceptionSchema,
  absenceSchema,
  recurringMeetingSchema,
  workingCalendarSchema,
  milestoneSchema,
  releaseSchema,
  dependencySchema,
  deploymentDaySchema,
  deploymentWindowSchema,
} from '../src/validators/index.js'

// ----- Helper: oggetti validi di esempio -----

const validUser = {
  id: 'u1',
  displayName: 'Marco Rossi',
  email: 'marco@example.com',
  appRole: 'pm',
  planningRoles: ['dev'],
  office: 'milano',
  dailyWorkingMinutes: 480,
  dailyOverheadMinutes: 30,
  active: true,
}

const validTicket = {
  id: 't1',
  jiraKey: 'PROJ-123',
  summary: 'Implementa feature X',
  description: null,
  estimateMinutes: 960,
  jiraPriority: 'medium',
  priorityOverride: null,
  status: 'backlog',
  phase: 'dev',
  jiraAssigneeEmail: 'dev@example.com',
  parentKey: null,
  milestoneId: null,
  releaseId: null,
  locked: false,
  warnings: [],
  lastSyncedAt: null,
  createdAt: '2026-03-30T10:00:00Z',
  updatedAt: '2026-03-30T10:00:00Z',
}

const validAssignment = {
  id: 'a1',
  ticketId: 't1',
  userId: 'u1',
  role: 'dev',
  allocationPercent: 100,
  startDate: '2026-04-01',
  endDate: '2026-04-02',
  durationDays: 2,
  locked: false,
  createdAt: '2026-03-30T10:00:00Z',
  updatedAt: '2026-03-30T10:00:00Z',
}

const validHoliday = {
  id: 'h1',
  date: '2026-04-25',
  name: 'Festa della Liberazione',
  recurring: true,
  office: null,
}

const validCalendarException = {
  id: 'ce1',
  date: '2026-04-11',
  description: 'Sabato lavorativo per recupero',
}

const validAbsence = {
  id: 'abs1',
  userId: 'u1',
  date: '2026-04-10',
  type: 'vacation',
  halfDay: false,
  notes: null,
}

const validMeeting = {
  id: 'm1',
  userId: null,
  name: 'Daily Standup',
  type: 'standup',
  durationMinutes: 15,
  frequency: 'daily',
  dayOfWeek: null,
}

const validCalendar = {
  id: 'cal1',
  name: 'Calendario Team Alpha',
  holidays: [validHoliday],
  exceptions: [validCalendarException],
}

const validMilestone = {
  id: 'ms1',
  name: 'MVP Ready',
  description: null,
  targetDate: '2026-06-30',
  status: 'on_track',
  createdAt: '2026-03-30T10:00:00Z',
  updatedAt: '2026-03-30T10:00:00Z',
}

const validRelease = {
  id: 'r1',
  name: 'Release 1.0',
  description: 'Prima release MVP',
  targetDate: '2026-07-15',
  forecastDate: null,
  createdAt: '2026-03-30T10:00:00Z',
  updatedAt: '2026-03-30T10:00:00Z',
}

const validDependency = {
  id: 'd1',
  fromTicketId: 't1',
  toTicketId: 't2',
  type: 'finish_to_start',
  importedFromJira: false,
  createdAt: '2026-03-30T10:00:00Z',
}

const validDeploymentDay = {
  id: 'dd1',
  environment: 'dev',
  dayOfWeek: 2, // martedì
  active: true,
}

const validDeploymentWindow = {
  id: 'dw1',
  environment: 'prod',
  date: '2026-07-15',
  allowed: true,
  notes: 'Deploy straordinario per hotfix',
}

// ============================================================
// T0-01 — Validare il JSON Schema / TypeScript types del domain model
// ============================================================

describe('T0-01: Zod schemas validano oggetti corretti', () => {
  it('User valido → passa', () => {
    expect(userSchema.safeParse(validUser).success).toBe(true)
  })

  it('Ticket valido → passa', () => {
    expect(ticketSchema.safeParse(validTicket).success).toBe(true)
  })

  it('Assignment valido → passa', () => {
    expect(assignmentSchema.safeParse(validAssignment).success).toBe(true)
  })

  it('Holiday valido → passa', () => {
    expect(holidaySchema.safeParse(validHoliday).success).toBe(true)
  })

  it('CalendarException valida → passa', () => {
    expect(calendarExceptionSchema.safeParse(validCalendarException).success).toBe(true)
  })

  it('Absence valida → passa', () => {
    expect(absenceSchema.safeParse(validAbsence).success).toBe(true)
  })

  it('RecurringMeeting valido → passa', () => {
    expect(recurringMeetingSchema.safeParse(validMeeting).success).toBe(true)
  })

  it('WorkingCalendar valido → passa', () => {
    expect(workingCalendarSchema.safeParse(validCalendar).success).toBe(true)
  })

  it('Milestone valida → passa', () => {
    expect(milestoneSchema.safeParse(validMilestone).success).toBe(true)
  })

  it('Release valida → passa', () => {
    expect(releaseSchema.safeParse(validRelease).success).toBe(true)
  })

  it('Dependency valida → passa', () => {
    expect(dependencySchema.safeParse(validDependency).success).toBe(true)
  })

  it('DeploymentDay valido → passa', () => {
    expect(deploymentDaySchema.safeParse(validDeploymentDay).success).toBe(true)
  })

  it('DeploymentWindow valida → passa', () => {
    expect(deploymentWindowSchema.safeParse(validDeploymentWindow).success).toBe(true)
  })
})

// ============================================================
// T0-02 — Verificare che ogni entità abbia i campi obbligatori
// ============================================================

describe('T0-02: Zod schemas rifiutano oggetti con campi mancanti', () => {
  it('User senza email → errore', () => {
    const { email, ...noEmail } = validUser
    expect(userSchema.safeParse(noEmail).success).toBe(false)
  })

  it('User senza id → errore', () => {
    const { id, ...noId } = validUser
    expect(userSchema.safeParse(noId).success).toBe(false)
  })

  it('Ticket senza jiraKey → errore', () => {
    const { jiraKey, ...noKey } = validTicket
    expect(ticketSchema.safeParse(noKey).success).toBe(false)
  })

  it('Ticket senza summary → errore', () => {
    const { summary, ...noSummary } = validTicket
    expect(ticketSchema.safeParse(noSummary).success).toBe(false)
  })

  it('Assignment senza ticketId → errore', () => {
    const { ticketId, ...noTicketId } = validAssignment
    expect(assignmentSchema.safeParse(noTicketId).success).toBe(false)
  })

  it('Assignment senza userId → errore', () => {
    const { userId, ...noUserId } = validAssignment
    expect(assignmentSchema.safeParse(noUserId).success).toBe(false)
  })

  it('Assignment con allocationPercent 0 → errore (min 1)', () => {
    expect(assignmentSchema.safeParse({ ...validAssignment, allocationPercent: 0 }).success).toBe(false)
  })

  it('Assignment con allocationPercent 101 → errore (max 100)', () => {
    expect(assignmentSchema.safeParse({ ...validAssignment, allocationPercent: 101 }).success).toBe(false)
  })

  it('Holiday senza date → errore', () => {
    const { date, ...noDate } = validHoliday
    expect(holidaySchema.safeParse(noDate).success).toBe(false)
  })

  it('Holiday con data formato sbagliato → errore', () => {
    expect(holidaySchema.safeParse({ ...validHoliday, date: '25/04/2026' }).success).toBe(false)
  })

  it('Milestone senza targetDate → errore', () => {
    const { targetDate, ...noTarget } = validMilestone
    expect(milestoneSchema.safeParse(noTarget).success).toBe(false)
  })

  it('Release senza name → errore', () => {
    const { name, ...noName } = validRelease
    expect(releaseSchema.safeParse(noName).success).toBe(false)
  })

  it('Dependency senza fromTicketId → errore', () => {
    const { fromTicketId, ...noFrom } = validDependency
    expect(dependencySchema.safeParse(noFrom).success).toBe(false)
  })

  it('Ticket con status invalido → errore', () => {
    expect(ticketSchema.safeParse({ ...validTicket, status: 'invalid' }).success).toBe(false)
  })

  it('User con appRole invalido → errore', () => {
    expect(userSchema.safeParse({ ...validUser, appRole: 'admin' }).success).toBe(false)
  })

  it('Oggetto vuoto rifiutato per ogni schema', () => {
    expect(userSchema.safeParse({}).success).toBe(false)
    expect(ticketSchema.safeParse({}).success).toBe(false)
    expect(assignmentSchema.safeParse({}).success).toBe(false)
    expect(holidaySchema.safeParse({}).success).toBe(false)
    expect(milestoneSchema.safeParse({}).success).toBe(false)
    expect(releaseSchema.safeParse({}).success).toBe(false)
    expect(dependencySchema.safeParse({}).success).toBe(false)
  })
})

