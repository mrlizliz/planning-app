<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Ticket, Assignment, User, Holiday, Absence } from '@planning/shared'
import { parseISO, format, differenceInCalendarDays, addDays, addWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { it } from 'date-fns/locale'

const props = defineProps<{
  tickets: Ticket[]
  assignments: Assignment[]
  users: User[]
  holidays: Holiday[]
  absences: Absence[]
}>()

const emit = defineEmits<{
  (e: 'assignment-moved', payload: { assignmentId: string; newStartDate: string; daysDelta: number }): void
  (e: 'toggle-lock', assignmentId: string): void
  (e: 'open-detail', assignmentId: string): void
}>()

// --- Navigation state ---
const SPAN_OPTIONS = [2, 4, 8, 12] as const
const viewSpanWeeks = ref(4)
/** Offset in settimane rispetto a "oggi" */
const viewOffset = ref(0)

function goToday() { viewOffset.value = 0 }
function goPrev() { viewOffset.value -= 1 }
function goNext() { viewOffset.value += 1 }
function goFitAll() {
  if (scheduledAssignments.value.length === 0) { viewOffset.value = 0; return }
  const dates = scheduledAssignments.value.flatMap((a) => [
    parseISO(a.startDate!),
    parseISO(a.endDate!),
  ])
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))
  const totalWeeks = Math.ceil(differenceInCalendarDays(maxDate, minDate) / 7) + 2
  viewSpanWeeks.value = Math.max(4, totalWeeks)
  const midDate = addDays(minDate, Math.floor(differenceInCalendarDays(maxDate, minDate) / 2))
  viewOffset.value = Math.round(differenceInCalendarDays(midDate, new Date()) / 7)
}

function spanLabel(weeks: number): string {
  return weeks <= 4 ? `${weeks} sett.` : `${Math.round(weeks / 4)} mesi`
}

const viewRangeLabel = computed(() => {
  const s = format(timeRange.value.start, 'd MMM yyyy', { locale: it })
  const e = format(timeRange.value.end, 'd MMM yyyy', { locale: it })
  return `${s} — ${e}`
})

// --- Horizontal scroll with mouse wheel ---
const scrollContainer = ref<HTMLElement | null>(null)

function onWheel(e: WheelEvent) {
  const el = scrollContainer.value
  if (!el) return
  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  if (e.deltaY) {
    e.preventDefault()
    el.scrollLeft += e.deltaY
  }
}


// --- Holiday / Absence helpers ---

/** Set di date festive in formato YYYY-MM-DD */
const holidayDateSet = computed(() => {
  const set = new Set<string>()
  for (const h of props.holidays) {
    set.add(h.date)
  }
  return set
})

function isHolidayDate(date: Date): boolean {
  return holidayDateSet.value.has(format(date, 'yyyy-MM-dd'))
}

function isNonWorkingDay(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6 || isHolidayDate(date)
}

/** Controlla se un utente è in assenza in una data specifica */
function isUserAbsent(userId: string, date: Date): boolean {
  const dateStr = format(date, 'yyyy-MM-dd')
  return props.absences.some(
    (a) =>
      a.userId === userId &&
      dateStr >= a.startDate &&
      dateStr <= a.endDate,
  )
}

// --- Drag & Drop state ---
const dragState = ref<{
  assignmentId: string
  originalStartOffset: number
  grabOffsetInBar: number
} | null>(null)

/** Flag separato per il CSS pointer-events: none (ritardato di 1 frame) */
const isDragging = ref(false)

function onDragStart(event: DragEvent, assignmentId: string, startOffset: number, duration: number) {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', assignmentId)

  // Risali sempre alla .gantt-bar, anche se il click era su un figlio (label, lucchetto)
  const barEl = (event.currentTarget ?? (event.target as HTMLElement).closest('.gantt-bar')) as HTMLElement | null
  if (!barEl) return

  const barRect = barEl.getBoundingClientRect()
  const dayWidth = barRect.width / Math.max(1, duration)
  const grabOffsetInBar = Math.min(
    duration - 1,
    Math.max(0, Math.floor((event.clientX - barRect.left) / dayWidth)),
  )

  dragState.value = {
    assignmentId,
    originalStartOffset: startOffset,
    grabOffsetInBar,
  }

  // Ritarda pointer-events:none di 1 frame: il browser deve prima catturare il ghost image
  requestAnimationFrame(() => {
    isDragging.value = true
  })
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}

function onDrop(event: DragEvent, dayIndex: number) {
  event.preventDefault()
  if (!dragState.value) return

  const { assignmentId, grabOffsetInBar, originalStartOffset } = dragState.value

  const assignment = props.assignments.find((a) => a.id === assignmentId)
  if (!assignment || assignment.locked) {
    resetDrag()
    return
  }

  // Calcola il nuovo startOffset tenendo conto del punto di presa nella barra
  const newStartOffset = dayIndex - grabOffsetInBar
  const daysDelta = newStartOffset - originalStartOffset
  if (daysDelta === 0) {
    resetDrag()
    return
  }

  const newStartDate = addDays(timeRange.value.start, newStartOffset)

  // Non permettere di pianificare su weekend o festivi
  if (isNonWorkingDay(newStartDate)) {
    resetDrag()
    return
  }

  emit('assignment-moved', {
    assignmentId,
    newStartDate: format(newStartDate, 'yyyy-MM-dd'),
    daysDelta,
  })

  resetDrag()
}

function onDragEnd() {
  resetDrag()
}

function resetDrag() {
  dragState.value = null
  isDragging.value = false
}

// Calcola la finestra temporale visualizzata
const scheduledAssignments = computed(() =>
  props.assignments.filter((a) => a.startDate && a.endDate)
)

const timeRange = computed(() => {
  const today = new Date()
  const base = startOfWeek(addWeeks(today, viewOffset.value), { weekStartsOn: 1 })
  // Centra: metà span prima, metà span dopo
  const halfSpan = Math.floor(viewSpanWeeks.value / 2)
  const start = addWeeks(base, -halfSpan)
  const end = endOfWeek(addWeeks(base, viewSpanWeeks.value - halfSpan - 1), { weekStartsOn: 1 })
  return { start, end }
})

const totalDays = computed(() =>
  differenceInCalendarDays(timeRange.value.end, timeRange.value.start) + 1
)

const dayColumns = computed(() => {
  const days = []
  for (let i = 0; i < totalDays.value; i++) {
    const date = addDays(timeRange.value.start, i)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const holiday = isHolidayDate(date)
    days.push({
      date,
      label: format(date, 'd', { locale: it }),
      dayOfWeek: format(date, 'EEE', { locale: it }),
      isWeekend,
      isHoliday: holiday,
      isNonWorking: isWeekend || holiday,
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
  const visibleDays = totalDays.value
  return props.users.map((user) => {
    const userAssignments = scheduledAssignments.value
      .filter((a) => a.userId === user.id)
      .map((a) => {
        const ticket = props.tickets.find((t) => t.id === a.ticketId)
        const rawStart = differenceInCalendarDays(parseISO(a.startDate!), timeRange.value.start)
        const rawDuration = differenceInCalendarDays(parseISO(a.endDate!), parseISO(a.startDate!)) + 1

        // Barra che inizia prima del range: sposta a 0 e accorcia
        const clippedStart = Math.max(0, rawStart)
        const clippedDuration = rawDuration - (clippedStart - rawStart)

        return {
          ...a,
          ticket,
          startOffset: clippedStart,
          duration: clippedDuration,
          isClippedLeft: rawStart < 0,
          isClippedRight: rawStart + rawDuration > visibleDays,
        }
      })
      // Rimuovi barre completamente fuori dal range visibile
      .filter((a) => a.startOffset < visibleDays && a.duration > 0)
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
  <div class="gantt-container" :class="{ 'is-dragging': isDragging }">
    <!-- Navigation bar -->
    <div class="gantt-nav">
      <div class="nav-arrows">
        <button class="nav-btn" title="Indietro" @click="goPrev">◀</button>
        <button class="nav-btn nav-btn-today" title="Centra su oggi" @click="goToday">Oggi</button>
        <button class="nav-btn" title="Avanti" @click="goNext">▶</button>
      </div>
      <span class="nav-range">{{ viewRangeLabel }}</span>
      <div class="nav-zoom">
        <button class="nav-btn nav-btn-fit" title="Adatta a tutti gli assignment" @click="goFitAll">Adatta</button>
        <select v-model.number="viewSpanWeeks" class="nav-select" title="Zoom">
          <option v-for="s in SPAN_OPTIONS" :key="s" :value="s">{{ spanLabel(s) }}</option>
        </select>
      </div>
    </div>

    <div
      ref="scrollContainer"
      class="gantt-scroll"
      @wheel="onWheel"
    >
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
              :class="{ weekend: day.isWeekend, holiday: day.isHoliday, 'non-working': day.isNonWorking, today: day.isToday }"
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
              :class="{
                weekend: day.isWeekend,
                holiday: day.isHoliday,
                'non-working': day.isNonWorking,
                today: day.isToday,
                'user-absent': isUserAbsent(row.user.id, day.date),
              }"
              @dragover="onDragOver"
              @drop="onDrop($event, i)"
            >
              <div
                v-for="a in row.assignments.filter((a) => a.startOffset === i)"
                :key="a.id"
                class="gantt-bar"
                :class="{
                  'bar-draggable': !a.locked,
                  'bar-dragging': dragState?.assignmentId === a.id,
                  'bar-clipped-left': a.isClippedLeft,
                  'bar-clipped-right': a.isClippedRight,
                  'bar-partial': a.allocationPercent < 100,
                }"
                :draggable="!a.locked"
                :style="{
                  width: `calc(${a.duration * 100}% + ${(a.duration - 1)}px)`,
                  background: getPriorityColor(a.ticket?.jiraPriority ?? 'medium'),
                  height: `${Math.max(16, Math.round(32 * a.allocationPercent / 100))}px`,
                }"
                :title="`${a.ticket?.jiraKey} — ${a.ticket?.summary}\nAllocazione: ${a.allocationPercent}%\n${a.startDate} → ${a.endDate} (${a.durationDays}gg lav.)\n${a.locked ? '🔒 Bloccato (click lucchetto per sbloccare)' : '↔ Trascina per spostare'}`"
                @dragstart="onDragStart($event, a.id, a.startOffset, a.duration)"
                @dragend="onDragEnd"
                @dblclick.stop="emit('open-detail', a.id)"
              >
                <span class="bar-label">{{ a.ticket?.jiraKey }}<template v-if="a.allocationPercent < 100"> {{ a.allocationPercent }}%</template></span>
                <i
                  :class="a.locked ? 'pi pi-lock' : 'pi pi-lock-open'"
                  class="bar-lock-toggle"
                  :title="a.locked ? 'Sblocca — l\'Auto-Schedule potrà spostarlo' : 'Blocca — l\'Auto-Schedule non lo sposterà'"
                  @click.stop="emit('toggle-lock', a.id)"
                />
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
.gantt-scroll { overflow-x: auto; overflow-y: hidden; }
.gantt-table { border-collapse: collapse; width: max-content; min-width: 100%; overflow: hidden; }
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
.day-header.holiday { background: #f0f0f0; color: #aaa; }
.day-header.non-working { background: #e8e8e8; color: #aaa; }
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
.day-cell.holiday { background: #fafafa; }
.day-cell.non-working { background: #f0f0f0; }
.day-cell.user-absent { background: #f0f0f0; }
.day-cell.today { background: #e3f2fd40; }

/* Durante il drag, tutte le barre diventano trasparenti ai click/drop
   così gli eventi raggiungono le celle sottostanti */
.gantt-container.is-dragging .gantt-bar { pointer-events: none; }
.gantt-bar {
  position: absolute; top: 50%; transform: translateY(-50%); left: 1px; height: 32px;
  border-radius: 4px; color: white; font-size: 0.7rem;
  display: flex; align-items: center; padding: 0 0.4rem;
  gap: 0.3rem; z-index: 1; white-space: nowrap; overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
.bar-partial {
  border: 1.5px dashed rgba(255,255,255,0.5);
}
.bar-label { font-weight: 600; }
.bar-lock-toggle { font-size: 0.6rem; cursor: pointer; opacity: 0.7; margin-left: auto; }
.bar-lock-toggle:hover { opacity: 1; }
.bar-draggable { cursor: grab; }
.bar-draggable:active { cursor: grabbing; }
.bar-dragging { opacity: 0.5; }
.bar-clipped-left { border-top-left-radius: 0; border-bottom-left-radius: 0; }
.bar-clipped-right { border-top-right-radius: 0; border-bottom-right-radius: 0; }
.empty-row { text-align: center; padding: 2rem; color: #999; }

/* Navigation bar */
.gantt-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #e9ecef;
  gap: 0.75rem;
  flex-wrap: wrap;
  background: white;
}
.nav-arrows {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.nav-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
  font-size: 0.78rem;
  color: #333;
  transition: all 0.15s;
}
.nav-btn:hover { background: #f0f0f0; border-color: #4361ee; color: #4361ee; }
.nav-btn-today { font-weight: 600; }
.nav-btn-fit { font-size: 0.72rem; }
.nav-range {
  font-size: 0.8rem;
  font-weight: 600;
  color: #444;
  white-space: nowrap;
}
.nav-zoom {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.nav-select {
  padding: 0.25rem 0.4rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.78rem;
  background: white;
  color: #333;
  outline: none;
  cursor: pointer;
}
.nav-select:focus { border-color: #4361ee; }
</style>

