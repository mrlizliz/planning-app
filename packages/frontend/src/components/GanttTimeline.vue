<script setup lang="ts">
import { computed } from 'vue'
import type { Ticket, Assignment, User } from '@planning/shared'
import { parseISO, format, differenceInCalendarDays, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'

const props = defineProps<{
  tickets: Ticket[]
  assignments: Assignment[]
  users: User[]
}>()

// Calcola la finestra temporale visualizzata
const scheduledAssignments = computed(() =>
  props.assignments.filter((a) => a.startDate && a.endDate)
)

const timeRange = computed(() => {
  if (scheduledAssignments.value.length === 0) {
    const today = new Date()
    return {
      start: startOfWeek(today, { weekStartsOn: 1 }),
      end: endOfWeek(addDays(today, 21), { weekStartsOn: 1 }),
    }
  }

  const dates = scheduledAssignments.value.flatMap((a) => [
    parseISO(a.startDate!),
    parseISO(a.endDate!),
  ])
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  return {
    start: startOfWeek(addDays(minDate, -2), { weekStartsOn: 1 }),
    end: endOfWeek(addDays(maxDate, 5), { weekStartsOn: 1 }),
  }
})

const totalDays = computed(() =>
  differenceInCalendarDays(timeRange.value.end, timeRange.value.start) + 1
)

const dayColumns = computed(() => {
  const days = []
  for (let i = 0; i < totalDays.value; i++) {
    const date = addDays(timeRange.value.start, i)
    days.push({
      date,
      label: format(date, 'd', { locale: it }),
      dayOfWeek: format(date, 'EEE', { locale: it }),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
    })
  }
  return days
})

const weekHeaders = computed(() => {
  const weeks: Array<{ label: string; span: number }> = []
  let currentWeek = ''
  let span = 0

  for (const day of dayColumns.value) {
    const weekLabel = format(day.date, "'Sett.' w", { locale: it })
    if (weekLabel !== currentWeek) {
      if (currentWeek) weeks.push({ label: currentWeek, span })
      currentWeek = weekLabel
      span = 1
    } else {
      span++
    }
  }
  if (currentWeek) weeks.push({ label: currentWeek, span })
  return weeks
})

// Righe per utente
const userRows = computed(() => {
  return props.users.map((user) => {
    const userAssignments = scheduledAssignments.value
      .filter((a) => a.userId === user.id)
      .map((a) => {
        const ticket = props.tickets.find((t) => t.id === a.ticketId)
        const startOffset = differenceInCalendarDays(parseISO(a.startDate!), timeRange.value.start)
        const duration = differenceInCalendarDays(parseISO(a.endDate!), parseISO(a.startDate!)) + 1

        return {
          ...a,
          ticket,
          startOffset: Math.max(0, startOffset),
          duration,
        }
      })
    return { user, assignments: userAssignments }
  })
})

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'highest': return '#d00000'
    case 'high': return '#e85d04'
    case 'medium': return '#4361ee'
    case 'low': return '#06d6a0'
    case 'lowest': return '#adb5bd'
    default: return '#6c757d'
  }
}
</script>

<template>
  <div class="gantt-container">
    <div class="gantt-scroll">
      <table class="gantt-table">
        <thead>
          <tr class="week-row">
            <th class="name-col">Risorsa</th>
            <th
              v-for="(week, i) in weekHeaders"
              :key="i"
              :colspan="week.span"
              class="week-header"
            >
              {{ week.label }}
            </th>
          </tr>
          <tr class="day-row">
            <th class="name-col"></th>
            <th
              v-for="(day, i) in dayColumns"
              :key="i"
              class="day-header"
              :class="{ weekend: day.isWeekend, today: day.isToday }"
            >
              <div class="day-name">{{ day.dayOfWeek }}</div>
              <div class="day-num">{{ day.label }}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in userRows" :key="row.user.id" class="user-row">
            <td class="name-col">
              <div class="user-name">{{ row.user.displayName }}</div>
              <div class="user-roles">
                <span v-for="r in row.user.planningRoles" :key="r" class="mini-badge">{{ r }}</span>
              </div>
            </td>
            <td
              v-for="(day, i) in dayColumns"
              :key="i"
              class="day-cell"
              :class="{ weekend: day.isWeekend, today: day.isToday }"
            >
              <div
                v-for="a in row.assignments.filter((a) => a.startOffset === i)"
                :key="a.id"
                class="gantt-bar"
                :style="{
                  width: `calc(${a.duration * 100}% + ${(a.duration - 1) * 1}px)`,
                  background: getPriorityColor(a.ticket?.jiraPriority ?? 'medium'),
                }"
                :title="`${a.ticket?.jiraKey} — ${a.ticket?.summary}\n${a.startDate} → ${a.endDate} (${a.durationDays}gg)`"
              >
                <span class="bar-label">{{ a.ticket?.jiraKey }}</span>
                <i v-if="a.locked" class="pi pi-lock bar-icon" />
              </div>
            </td>
          </tr>
          <tr v-if="userRows.length === 0">
            <td :colspan="totalDays + 1" class="empty-row">
              Nessun assignment schedulato
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.gantt-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}
.gantt-scroll { overflow-x: auto; }
.gantt-table { border-collapse: collapse; width: max-content; min-width: 100%; }
.name-col {
  position: sticky; left: 0; z-index: 2;
  background: white; min-width: 160px; padding: 0.5rem 0.75rem;
  border-right: 2px solid #e9ecef; text-align: left;
}
.week-header {
  background: #1a1a2e; color: white; padding: 0.3rem; text-align: center;
  font-size: 0.7rem; font-weight: 600; border-right: 1px solid #333;
}
.day-header {
  padding: 0.2rem 0.15rem; text-align: center; font-size: 0.65rem;
  min-width: 36px; border-right: 1px solid #f0f0f0; background: #fafafa;
}
.day-header.weekend { background: #f0f0f0; color: #aaa; }
.day-header.today { background: #e3f2fd; }
.day-name { font-weight: 600; text-transform: capitalize; }
.day-num { color: #888; }
.user-row { border-bottom: 1px solid #f0f0f0; }
.user-name { font-weight: 600; font-size: 0.85rem; }
.user-roles { display: flex; gap: 0.2rem; margin-top: 0.1rem; }
.mini-badge { font-size: 0.6rem; background: #e9ecef; padding: 0.05rem 0.3rem; border-radius: 3px; color: #666; }
.day-cell {
  position: relative; border-right: 1px solid #f0f0f0; height: 44px;
  padding: 0; vertical-align: middle;
}
.day-cell.weekend { background: #fafafa; }
.day-cell.today { background: #e3f2fd40; }
.gantt-bar {
  position: absolute; top: 6px; left: 1px; height: 32px;
  border-radius: 4px; color: white; font-size: 0.7rem;
  display: flex; align-items: center; padding: 0 0.4rem;
  gap: 0.3rem; z-index: 1; white-space: nowrap; overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.bar-label { font-weight: 600; }
.bar-icon { font-size: 0.6rem; }
.empty-row { text-align: center; padding: 2rem; color: #999; }
</style>

