// ============================================================
// Routes — Capacity (dettaglio giornaliero per utente)
// ============================================================

import type { FastifyInstance } from 'fastify'
import { getStore } from '../store/index.js'
import {
  calculateDailyCapacity,
  getMeetingMinutesForDay,
  isWorkingDay,
  type CalendarConfig,
} from '@planning/shared'
import { parseISO, addDays, format, getDay } from 'date-fns'

export async function capacityRoutes(app: FastifyInstance) {
  /**
   * GET /api/capacity/:userId?from=YYYY-MM-DD&to=YYYY-MM-DD
   *
   * Restituisce il dettaglio giornaliero della capacità per un utente
   * in un intervallo di date. Utile per heatmap e breakdown.
   */
  app.get('/api/capacity/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    const { from, to } = request.query as { from?: string; to?: string }
    const store = getStore()

    const user = store.users.get(userId)
    if (!user) {
      return reply.status(404).send({ error: 'Utente non trovato' })
    }

    // Default: prossime 4 settimane
    const startDate = from ? parseISO(from) : new Date()
    const endDate = to ? parseISO(to) : addDays(startDate, 27)

    // Calendar config (festivi filtrati per office utente)
    const calendarConfig: CalendarConfig = {
      holidays: store.calendar.holidays
        .filter((h) => h.office === null || h.office === user.office)
        .map((h) => h.date),
      exceptions: store.calendar.exceptions.map((e) => e.date),
    }

    // Meeting dell'utente (personali + team-wide)
    const userMeetings = Array.from(store.meetings.values())
      .filter((m) => m.userId === null || m.userId === userId)

    // Assenze dell'utente
    const userAbsences = Array.from(store.absences.values())
      .filter((a) => a.userId === userId)

    // Assignment dell'utente (per calcolo carico)
    const userAssignments = Array.from(store.assignments.values())
      .filter((a) => a.userId === userId && a.startDate && a.endDate)

    const days: Array<{
      date: string
      isWorkingDay: boolean
      grossMinutes: number
      netMinutes: number
      meetingMinutes: number
      overheadMinutes: number
      absenceMinutes: number
      assignedMinutes: number
      alert: boolean
      absenceType: string | null
      meetingNames: string[]
    }> = []

    let current = startDate
    while (current <= endDate) {
      const dateStr = format(current, 'yyyy-MM-dd')
      const dayOfWeek = getDay(current)
      const working = isWorkingDay(current, calendarConfig)

      if (!working) {
        days.push({
          date: dateStr,
          isWorkingDay: false,
          grossMinutes: 0,
          netMinutes: 0,
          meetingMinutes: 0,
          overheadMinutes: 0,
          absenceMinutes: 0,
          assignedMinutes: 0,
          alert: false,
          absenceType: null,
          meetingNames: [],
        })
        current = addDays(current, 1)
        continue
      }

      // Assenza
      const absence = userAbsences.find((a) => a.startDate <= dateStr && a.endDate >= dateStr)
      const absent = absence ? !absence.halfDay : false
      const halfDayAbsent = absence?.halfDay ?? false

      // Meeting
      const meetingMinutes = getMeetingMinutesForDay(dayOfWeek, userMeetings)
      const meetingNames = userMeetings
        .filter((m) => {
          if (m.frequency === 'daily') return dayOfWeek >= 1 && dayOfWeek <= 5
          if (m.frequency === 'weekly' || m.frequency === 'biweekly') return m.daysOfWeek.includes(dayOfWeek)
          return false
        })
        .map((m) => m.name)

      const capacity = calculateDailyCapacity({
        dailyWorkingMinutes: user.dailyWorkingMinutes,
        dailyOverheadMinutes: user.dailyOverheadMinutes,
        meetingMinutes,
        absent,
        halfDayAbsent,
      })

      // Assegnazioni che coprono questo giorno
      let assignedMinutes = 0
      for (const a of userAssignments) {
        if (a.startDate! <= dateStr && a.endDate! >= dateStr) {
          assignedMinutes += Math.floor(capacity.netMinutes * (a.allocationPercent / 100))
        }
      }

      days.push({
        date: dateStr,
        isWorkingDay: true,
        grossMinutes: capacity.grossMinutes,
        netMinutes: capacity.netMinutes,
        meetingMinutes: capacity.meetingMinutes,
        overheadMinutes: capacity.overheadMinutes,
        absenceMinutes: capacity.absenceMinutes,
        assignedMinutes,
        alert: capacity.alert,
        absenceType: absence?.type ?? null,
        meetingNames,
      })

      current = addDays(current, 1)
    }

    return {
      userId,
      displayName: user.displayName,
      from: format(startDate, 'yyyy-MM-dd'),
      to: format(endDate, 'yyyy-MM-dd'),
      days,
    }
  })
}

