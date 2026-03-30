<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useTicketsStore } from '../stores/tickets.js'
import { usePlanningStore } from '../stores/planning.js'
import { useUsersStore } from '../stores/users.js'
import GanttTimeline from '../components/GanttTimeline.vue'
import OverallocationBanner from '../components/OverallocationBanner.vue'

const ticketsStore = useTicketsStore()
const planningStore = usePlanningStore()
const usersStore = useUsersStore()

onMounted(async () => {
  await Promise.all([
    ticketsStore.fetchTickets(),
    planningStore.fetchAssignments(),
    usersStore.fetchUsers(),
  ])
})

const hasData = computed(() => ticketsStore.tickets.length > 0)

async function handleRunScheduler() {
  try {
    await planningStore.runScheduler()
    await ticketsStore.fetchTickets()
  } catch (e) {
    // L'errore è già nello store
  }
}
</script>

<template>
  <div class="planning-view">
    <div class="page-header">
      <h2>📅 Planning</h2>
      <div class="header-actions">
        <button
          class="btn btn-primary"
          :disabled="planningStore.loading || !hasData"
          @click="handleRunScheduler"
        >
          <i class="pi pi-refresh" />
          {{ planningStore.loading ? 'Scheduling...' : 'Auto-Schedule' }}
        </button>
      </div>
    </div>

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

