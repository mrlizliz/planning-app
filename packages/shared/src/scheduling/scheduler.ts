// ============================================================
// Scheduler — Motore di auto-scheduling
// ============================================================

import type { Ticket } from '../types/ticket.js'
import type { Assignment } from '../types/assignment.js'
import type { User } from '../types/user.js'
import type { Absence } from '../types/calendar.js'
import type { RecurringMeeting } from '../types/calendar.js'
import { addWorkingDays, nextWorkingDay, isWorkingDay, type CalendarConfig } from './calendar.js'
import {
  calculateDailyCapacity,
  applyAllocation,
  calculateDurationDays,
  getMeetingMinutesForDay,
  isOverallocated,
} from './capacity.js'
import { format, parseISO, getDay, addDays } from 'date-fns'

// ---- Types ----

/** Festivo con office opzionale (per il filtraggio per utente) */
export interface HolidayEntry {
  date: string
  office: string | null
}

/** Input completo per lo scheduler */
export interface SchedulerInput {
  tickets: Ticket[]
  assignments: Assignment[]
  users: User[]
  calendar: CalendarConfig
  /** Festivi strutturati con sede — usati per creare CalendarConfig per utente */
  holidays: HolidayEntry[]
  absences: Absence[]
  meetings: RecurringMeeting[]
  /** Data di inizio pianificazione (default: oggi) */
  planningStartDate: string
}

/**
 * Costruisce una CalendarConfig filtrata per la sede di un utente.
 * Include festivi nazionali (sede=null) + festivi della sede dell'utente.
 */
function buildCalendarForUser(
  baseCalendar: CalendarConfig,
  holidays: HolidayEntry[],
  userOffice: string | null,
): CalendarConfig {
  const filteredHolidays = holidays
    .filter((h) => h.office === null || h.office === userOffice)
    .map((h) => h.date)

  return {
    holidays: [...new Set([...baseCalendar.holidays, ...filteredHolidays])],
    exceptions: baseCalendar.exceptions,
  }
}

/** Risultato dello scheduling per un singolo assignment */
export interface ScheduledAssignment {
  assignmentId: string
  ticketId: string
  userId: string
  startDate: string
  endDate: string
  durationDays: number
}

/** Risultato completo dello scheduler */
export interface SchedulerResult {
  scheduled: ScheduledAssignment[]
  /** Assignment che non è stato possibile schedulare (e motivo) */
  errors: SchedulerError[]
  /** Alert di sovrallocazione */
  overallocations: OverallocationAlert[]
}

export interface SchedulerError {
  assignmentId: string
  ticketId: string
  reason: 'missing_estimate' | 'missing_user' | 'zero_capacity' | 'locked'
}

export interface OverallocationAlert {
  userId: string
  date: string
  assignedMinutes: number
  capacityMinutes: number
}

// ---- Helper functions ----

/**
 * Ordina i ticket per scheduling:
 * 1. priorityOverride (se presente, numerico ascendente = più prioritario)
 * 2. jiraPriority mappata a numerico
 * 3. ordine di creazione (stabilità sort)
 */
const JIRA_PRIORITY_MAP: Record<string, number> = {
  highest: 1,
  high: 2,
  medium: 3,
  low: 4,
  lowest: 5,
}

function getTicketPriority(ticket: Ticket): number {
  if (ticket.priorityOverride !== null) {
    return ticket.priorityOverride
  }
  return JIRA_PRIORITY_MAP[ticket.jiraPriority] ?? 3
}

function sortTicketsByPriority(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => {
    const pA = getTicketPriority(a)
    const pB = getTicketPriority(b)
    if (pA !== pB) return pA - pB
    // Stabilità: ordine di creazione
    return a.createdAt.localeCompare(b.createdAt)
  })
}

/**
 * Calcola la capacità netta di un utente in un giorno specifico.
 */
function getUserDailyCapacity(
  user: User,
  date: Date,
  absences: Absence[],
  meetings: RecurringMeeting[],
): number {
  const dateStr = format(date, 'yyyy-MM-dd')
  const dayOfWeek = getDay(date)

  // Controlla assenza
  const absence = absences.find(
    (a) => a.userId === user.id && a.date === dateStr,
  )
  const absent = absence ? !absence.halfDay : false
  const halfDayAbsent = absence?.halfDay ?? false

  // Calcola minuti meeting per quel giorno
  const userMeetings = meetings.filter(
    (m) => m.userId === null || m.userId === user.id,
  )
  const meetingMinutes = getMeetingMinutesForDay(dayOfWeek, userMeetings)

  const result = calculateDailyCapacity({
    dailyWorkingMinutes: user.dailyWorkingMinutes,
    dailyOverheadMinutes: user.dailyOverheadMinutes,
    meetingMinutes,
    absent,
    halfDayAbsent,
  })

  return result.netMinutes
}

/**
 * Trova la prossima data disponibile per un utente,
 * considerando i suoi assignment già schedulati.
 */
function getNextAvailableDate(
  userId: string,
  afterDate: Date,
  scheduledSoFar: ScheduledAssignment[],
  calendar: CalendarConfig,
): Date {
  // Trova l'ultima data di fine degli assignment già schedulati per questo utente
  const userScheduled = scheduledSoFar.filter((s) => s.userId === userId)

  let latestEnd = afterDate
  for (const s of userScheduled) {
    const end = parseISO(s.endDate)
    if (end >= latestEnd) {
      // L'utente è occupato fino a end, il prossimo giorno disponibile è end + 1 working day
      const dayAfter = new Date(end)
      dayAfter.setDate(dayAfter.getDate() + 1)
      if (dayAfter > latestEnd) {
        latestEnd = dayAfter
      }
    }
  }

  return nextWorkingDay(latestEnd, calendar)
}

// ---- Day-by-day scheduling ----

/**
 * Itera giorno per giorno a partire da startDate, consumando i minuti di effort
 * dalla capacità netta reale del giorno (meeting + assenze + overhead + allocation%).
 * Restituisce endDate e durationDays reali.
 *
 * Max 365 giorni safety limit.
 */
function scheduleDayByDay(
  startDate: Date,
  estimateMinutes: number,
  allocationPercent: number,
  user: User,
  absences: Absence[],
  meetings: RecurringMeeting[],
  calendar: CalendarConfig,
): { realStartDate: Date; endDate: Date; durationDays: number } | null {
  let remainingMinutes = estimateMinutes
  let currentDate = startDate
  let daysWorked = 0
  let firstWorkDate: Date | null = null
  let lastWorkDate = startDate
  const MAX_DAYS = 365

  for (let i = 0; i < MAX_DAYS && remainingMinutes > 0; i++) {
    if (!isWorkingDay(currentDate, calendar)) {
      currentDate = addDays(currentDate, 1)
      continue
    }

    const dailyNet = getUserDailyCapacity(user, currentDate, absences, meetings)
    const effectiveMinutes = applyAllocation(dailyNet, allocationPercent)

    if (effectiveMinutes > 0) {
      remainingMinutes -= effectiveMinutes
      daysWorked++
      if (!firstWorkDate) firstWorkDate = currentDate
      lastWorkDate = currentDate
    }

    currentDate = addDays(currentDate, 1)
  }

  if (remainingMinutes > 0 || daysWorked === 0 || !firstWorkDate) return null

  return { realStartDate: firstWorkDate, endDate: lastWorkDate, durationDays: daysWorked }
}

// ---- Main scheduler ----

/**
 * Auto-schedule: assegna date start/end a tutti gli assignment non bloccati.
 *
 * Algoritmo:
 * 1. Separa assignment locked (non toccare) da quelli da schedulare
 * 2. Ordina i ticket per priorità
 * 3. Per ogni ticket/assignment, trova la prossima data disponibile per l'utente
 * 4. Calcola la durata basata su effort / (capacity × allocation%)
 * 5. Calcola end_date con addWorkingDays
 * 6. Rileva sovrallocazioni
 */
export function autoSchedule(input: SchedulerInput): SchedulerResult {
  const {
    tickets,
    assignments,
    users,
    calendar,
    holidays = [],
    absences,
    meetings,
    planningStartDate,
  } = input

  const scheduled: ScheduledAssignment[] = []
  const errors: SchedulerError[] = []
  const overallocations: OverallocationAlert[] = []

  const startDate = parseISO(planningStartDate)

  // Mappa utenti per lookup veloce
  const userMap = new Map(users.map((u) => [u.id, u]))
  const ticketMap = new Map(tickets.map((t) => [t.id, t]))

  // Separa assignment locked (le loro date non vengono toccate)
  const lockedAssignments = assignments.filter((a) => a.locked)
  const unlockedAssignments = assignments.filter((a) => !a.locked)

  // I locked vengono preservati così come sono
  for (const locked of lockedAssignments) {
    if (locked.startDate && locked.endDate && locked.durationDays !== null) {
      scheduled.push({
        assignmentId: locked.id,
        ticketId: locked.ticketId,
        userId: locked.userId,
        startDate: locked.startDate,
        endDate: locked.endDate,
        durationDays: locked.durationDays,
      })
    }
    errors.push({
      assignmentId: locked.id,
      ticketId: locked.ticketId,
      reason: 'locked',
    })
  }

  // Ordina gli assignment in base alla priorità del ticket associato
  const sortedUnlocked = [...unlockedAssignments].sort((a, b) => {
    const ticketA = ticketMap.get(a.ticketId)
    const ticketB = ticketMap.get(b.ticketId)
    if (!ticketA || !ticketB) return 0
    return getTicketPriority(ticketA) - getTicketPriority(ticketB)
  })

  // Schedule di ogni assignment
  for (const assignment of sortedUnlocked) {
    const ticket = ticketMap.get(assignment.ticketId)
    const user = userMap.get(assignment.userId)

    // Validazioni
    if (!user) {
      errors.push({
        assignmentId: assignment.id,
        ticketId: assignment.ticketId,
        reason: 'missing_user',
      })
      continue
    }

    if (!ticket || ticket.estimateMinutes === null || ticket.estimateMinutes === 0) {
      errors.push({
        assignmentId: assignment.id,
        ticketId: assignment.ticketId,
        reason: 'missing_estimate',
      })
      continue
    }

    // Calcola capacità media per validazione (almeno un giorno deve avere capacità)
    const avgCapacity = user.dailyWorkingMinutes - user.dailyOverheadMinutes
    if (avgCapacity <= 0) {
      errors.push({
        assignmentId: assignment.id,
        ticketId: assignment.ticketId,
        reason: 'zero_capacity',
      })
      continue
    }

    // Trova la prossima data disponibile per l'utente
    const userCalendar = buildCalendarForUser(calendar, holidays, user.office)
    const assignmentStart = getNextAvailableDate(
      assignment.userId,
      startDate,
      scheduled,
      userCalendar,
    )

    // Calcola end date iterando giorno per giorno con capacità reale
    const scheduling = scheduleDayByDay(
      assignmentStart,
      ticket.estimateMinutes,
      assignment.allocationPercent,
      user,
      absences,
      meetings,
      userCalendar,
    )

    if (!scheduling) {
      errors.push({
        assignmentId: assignment.id,
        ticketId: assignment.ticketId,
        reason: 'zero_capacity',
      })
      continue
    }

    const result: ScheduledAssignment = {
      assignmentId: assignment.id,
      ticketId: assignment.ticketId,
      userId: assignment.userId,
      startDate: format(scheduling.realStartDate, 'yyyy-MM-dd'),
      endDate: format(scheduling.endDate, 'yyyy-MM-dd'),
      durationDays: scheduling.durationDays,
    }

    scheduled.push(result)
  }

  // Rileva sovrallocazioni
  detectOverallocations(
    scheduled,
    users,
    absences,
    meetings,
    calendar,
    overallocations,
  )

  return { scheduled, errors, overallocations }
}

/**
 * Rileva i giorni in cui un utente ha più minuti assegnati della sua capacità.
 */
function detectOverallocations(
  scheduled: ScheduledAssignment[],
  users: User[],
  absences: Absence[],
  meetings: RecurringMeeting[],
  calendar: CalendarConfig,
  overallocations: OverallocationAlert[],
): void {
  const userMap = new Map(users.map((u) => [u.id, u]))

  // Raggruppa scheduled per userId
  const byUser = new Map<string, ScheduledAssignment[]>()
  for (const s of scheduled) {
    const list = byUser.get(s.userId) ?? []
    list.push(s)
    byUser.set(s.userId, list)
  }

  for (const [userId, userAssignments] of byUser) {
    const user = userMap.get(userId)
    if (!user) continue

    // Raccogli tutte le date in cui l'utente ha assignment
    const dateSet = new Set<string>()
    for (const a of userAssignments) {
      // Per semplicità, controlliamo solo start e end
      dateSet.add(a.startDate)
      dateSet.add(a.endDate)
    }

    for (const dateStr of dateSet) {
      const date = parseISO(dateStr)
      const capacity = getUserDailyCapacity(user, date, absences, meetings)

      // Conta quanti assignment coprono questa data
      let assignedCount = 0
      for (const a of userAssignments) {
        if (a.startDate <= dateStr && a.endDate >= dateStr) {
          assignedCount++
        }
      }

      // Stima conservativa: ogni assignment usa la sua quota di capacità
      // (in questa versione semplificata, segnaliamo se ci sono >1 assignment full-day)
      const assignedMinutes = capacity * assignedCount
      if (assignedCount > 1 && isOverallocated(assignedMinutes, capacity)) {
        overallocations.push({
          userId,
          date: dateStr,
          assignedMinutes,
          capacityMinutes: capacity,
        })
      }
    }
  }
}

