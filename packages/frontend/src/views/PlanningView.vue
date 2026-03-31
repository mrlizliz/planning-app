<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useTicketsStore } from '../stores/tickets.js'
import { usePlanningStore } from '../stores/planning.js'
import { useUsersStore } from '../stores/users.js'
import { useNotifications } from '../composables/useNotifications.js'
import GanttTimeline from '../components/GanttTimeline.vue'
import OverallocationBanner from '../components/OverallocationBanner.vue'
import AlertsBanner from '../components/AlertsBanner.vue'
import AssignTicketDialog from '../components/AssignTicketDialog.vue'
import AssignmentDetailDialog from '../components/AssignmentDetailDialog.vue'
import type { Assignment, Holiday, Absence } from '@planning/shared'
import { addDays, format, parseISO } from 'date-fns'
import { calendarApi, absencesApi } from '../api/client.js'

const ticketsStore = useTicketsStore()
const planningStore = usePlanningStore()
const usersStore = useUsersStore()
const { showSuccess, showError, handleApiError } = useNotifications()

const holidays = ref<Holiday[]>([])
const absences = ref<Absence[]>([])

const showAssignDialog = ref(false)
const showDetailDialog = ref(false)
const detailAssignmentId = ref<string | null>(null)

const detailAssignment = computed(() =>
  detailAssignmentId.value
    ? planningStore.assignments.find((a) => a.id === detailAssignmentId.value) ?? null
    : null,
)
const detailTicket = computed(() =>
  detailAssignment.value
    ? ticketsStore.tickets.find((t) => t.id === detailAssignment.value!.ticketId) ?? null
    : null,
)

onMounted(async () => {
  await Promise.all([
    ticketsStore.fetchTickets(),
    planningStore.fetchAssignments(),
    planningStore.fetchDependencies(),
    usersStore.fetchUsers(),
    calendarApi.holidays.list().then((h) => (holidays.value = h)),
    absencesApi.list().then((a) => (absences.value = a)),
  ])
})

const hasData = computed(() => ticketsStore.tickets.length > 0)

async function handleRunScheduler() {
  try {
    const result = await planningStore.runScheduler()
    await ticketsStore.fetchTickets()
    showSuccess('Scheduling completato', `${result.scheduledCount} assignment schedulati`)
  } catch (e) {
    handleApiError(e, 'Auto-Schedule')
  }
}

async function handleAssignmentMoved(payload: { assignmentId: string; newStartDate: string; daysDelta: number }) {
  try {
    const assignment = planningStore.assignments.find((a) => a.id === payload.assignmentId)
    if (!assignment) return

    // Calcola nuova endDate spostando dello stesso delta
    const newEndDate = assignment.endDate
      ? format(addDays(parseISO(assignment.endDate), payload.daysDelta), 'yyyy-MM-dd')
      : null

    await planningStore.updateAssignment(payload.assignmentId, {
      startDate: payload.newStartDate,
      endDate: newEndDate,
    })
    showSuccess('Assignment spostato', `Nuova data: ${payload.newStartDate}`)
  } catch (e) {
    handleApiError(e, 'Spostamento assignment')
  }
}

async function handleAssignTicket(assignment: Assignment) {
  try {
    await planningStore.createAssignment(assignment)
    await ticketsStore.fetchTickets()
    showAssignDialog.value = false
    showSuccess('Ticket assegnato e schedulato')
  } catch (e) {
    handleApiError(e, 'Assegnazione ticket')
  }
}

async function handleToggleLock(assignmentId: string) {
  try {
    const assignment = planningStore.assignments.find((a) => a.id === assignmentId)
    if (!assignment) return
    const newLocked = !assignment.locked
    await planningStore.updateAssignment(assignmentId, { locked: newLocked })
    showSuccess(newLocked ? 'Assignment bloccato' : 'Assignment sbloccato')
  } catch (e) {
    handleApiError(e, 'Toggle lock')
  }
}

function handleOpenDetail(assignmentId: string) {
  detailAssignmentId.value = assignmentId
  showDetailDialog.value = true
}

async function handleUpdateAssignment(assignmentId: string, data: Partial<Assignment>) {
  try {
    await planningStore.updateAssignment(assignmentId, data)
    showDetailDialog.value = false
    showSuccess('Assignment aggiornato')
  } catch (e) {
    handleApiError(e, 'Aggiornamento assignment')
  }
}

async function handleDeleteAssignment(assignmentId: string) {
  try {
    await planningStore.deleteAssignment(assignmentId)
    showDetailDialog.value = false
    showSuccess('Assignment rimosso dal Gantt')
  } catch (e) {
    handleApiError(e, 'Eliminazione assignment')
  }
}
</script>

<template>
  <div class="planning-view">
    <div class="page-header">
      <h2>📅 Planning</h2>
      <div class="header-actions">
        <button
          class="btn btn-secondary"
          :disabled="!hasData"
          @click="showAssignDialog = true"
        >
          <i class="pi pi-user-plus" />
          Assegna Ticket
        </button>
      </div>
    </div>

    <AlertsBanner
      v-if="planningStore.alerts.length > 0"
      :alerts="planningStore.alerts"
    />

    <OverallocationBanner
      v-if="planningStore.lastScheduleResult?.overallocations?.length"
      :overallocations="planningStore.lastScheduleResult.overallocations"
      :users="usersStore.users"
    />

    <div v-if="!hasData" class="empty-state">
      <i class="pi pi-inbox" style="font-size: 3rem; color: #ccc" />
      <h3>Nessun ticket importato</h3>
      <p>Vai nella sezione <router-link to="/tickets">Ticket</router-link> per importare da Jira o aggiungere ticket manualmente.</p>
    </div>

    <GanttTimeline
      v-else
      :tickets="ticketsStore.tickets"
      :assignments="planningStore.assignments"
      :users="usersStore.users"
      :holidays="holidays"
      :absences="absences"
      @assignment-moved="handleAssignmentMoved"
      @toggle-lock="handleToggleLock"
      @open-detail="handleOpenDetail"
    />

    <AssignTicketDialog
      :visible="showAssignDialog"
      :tickets="ticketsStore.tickets"
      :assignments="planningStore.assignments"
      :users="usersStore.users"
      @close="showAssignDialog = false"
      @created="handleAssignTicket"
    />

    <AssignmentDetailDialog
      :visible="showDetailDialog"
      :assignment="detailAssignment"
      :ticket="detailTicket"
      :users="usersStore.users"
      @close="showDetailDialog = false"
      @update="handleUpdateAssignment"
      @delete="handleDeleteAssignment"
    />
  </div>
</template>

<style scoped>
.planning-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-header h2 {
  font-size: 1.3rem;
}
.header-actions {
  display: flex;
  gap: 0.5rem;
}
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: #4361ee;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background: #3a56d4;
}
.btn-secondary {
  background: #e9ecef;
  color: #333;
}
.btn-secondary:hover:not(:disabled) {
  background: #dee2e6;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  gap: 0.75rem;
}
.empty-state h3 {
  color: #666;
}
.empty-state p {
  color: #999;
}
.empty-state a {
  color: #4361ee;
}
</style>
