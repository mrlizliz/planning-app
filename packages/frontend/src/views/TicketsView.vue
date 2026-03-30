<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTicketsStore } from '../stores/tickets.js'
import { usePlanningStore } from '../stores/planning.js'
import { useUsersStore } from '../stores/users.js'
import { useNotifications } from '../composables/useNotifications.js'
import { jiraApi, milestonesApi, releasesApi } from '../api/client.js'
import TicketTable from '../components/TicketTable.vue'
import JiraSyncDialog from '../components/JiraSyncDialog.vue'
import type { Milestone, Release } from '@planning/shared'

const ticketsStore = useTicketsStore()
const planningStore = usePlanningStore()
const usersStore = useUsersStore()
const { showSuccess, handleApiError } = useNotifications()

const showSyncDialog = ref(false)
const jiraBaseUrl = ref('')
const fixVersionFilter = ref('')
const statusFilter = ref('')
const priorityFilter = ref('')
const searchQuery = ref('')

const milestones = ref<Milestone[]>([])
const releases = ref<Release[]>([])

// Calcola lista unica di fix versions
const allFixVersions = computed(() => {
  const set = new Set<string>()
  for (const t of ticketsStore.tickets) {
    for (const v of (t.fixVersions ?? [])) {
      set.add(v)
    }
  }
  return [...set].sort()
})

// Ticket filtrati con tutti i filtri
const filteredTickets = computed(() => {
  let result = ticketsStore.tickets

  if (fixVersionFilter.value) {
    result = result.filter((t) => (t.fixVersions ?? []).includes(fixVersionFilter.value))
  }
  if (statusFilter.value) {
    result = result.filter((t) => t.status === statusFilter.value)
  }
  if (priorityFilter.value) {
    result = result.filter((t) => t.jiraPriority === priorityFilter.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter((t) =>
      t.jiraKey.toLowerCase().includes(q) ||
      t.summary.toLowerCase().includes(q) ||
      (t.jiraAssigneeName ?? '').toLowerCase().includes(q),
    )
  }
  return result
})

async function updateTicketMilestone(ticketId: string, milestoneId: string | null) {
  try {
    await ticketsStore.updateTicket(ticketId, { milestoneId })
    showSuccess('Milestone aggiornata')
  } catch (e) {
    handleApiError(e, 'Aggiornamento milestone')
  }
}

async function updateTicketRelease(ticketId: string, releaseId: string | null) {
  try {
    await ticketsStore.updateTicket(ticketId, { releaseId })
    showSuccess('Release aggiornata')
  } catch (e) {
    handleApiError(e, 'Aggiornamento release')
  }
}

onMounted(async () => {
  await Promise.all([
    ticketsStore.fetchTickets(),
    planningStore.fetchAssignments(),
    usersStore.fetchUsers(),
  ])
  try {
    const config = await jiraApi.getConfig()
    if (config.baseUrl) jiraBaseUrl.value = config.baseUrl
  } catch { /* ignore */ }
  try {
    milestones.value = await milestonesApi.list()
    releases.value = await releasesApi.list()
  } catch { /* ignore */ }
})
</script>

<template>
  <div class="tickets-view">
    <div class="page-header">
      <h2>📋 Ticket</h2>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="ticketsStore.fetchTickets()">
          <i class="pi pi-refresh" /> Aggiorna
        </button>
        <button class="btn btn-primary" @click="showSyncDialog = true">
          <i class="pi pi-cloud-download" /> Importa da Jira
        </button>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat">
        <span class="stat-value">{{ ticketsStore.ticketCount }}</span>
        <span class="stat-label">Totali</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ ticketsStore.backlogTickets.length }}</span>
        <span class="stat-label">Backlog</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ ticketsStore.plannedTickets.length }}</span>
        <span class="stat-label">Pianificati</span>
      </div>
    </div>

    <div class="filters-bar">
      <input
        v-model="searchQuery"
        type="text"
        class="filter-input"
        placeholder="🔍 Cerca per key, titolo o assignee..."
      />
      <select v-model="statusFilter" class="filter-select">
        <option value="">Tutti gli stati</option>
        <option value="backlog">Backlog</option>
        <option value="planned">Pianificato</option>
        <option value="in_progress">In Corso</option>
        <option value="done">Completato</option>
      </select>
      <select v-model="priorityFilter" class="filter-select">
        <option value="">Tutte le priorità</option>
        <option value="highest">Highest</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="lowest">Lowest</option>
      </select>
      <select v-if="allFixVersions.length > 0" v-model="fixVersionFilter" class="filter-select">
        <option value="">Tutte le version</option>
        <option v-for="v in allFixVersions" :key="v" :value="v">{{ v }}</option>
      </select>
    </div>

    <TicketTable
      :tickets="filteredTickets"
      :loading="ticketsStore.loading"
      :jira-base-url="jiraBaseUrl"
      :fix-version-filter="fixVersionFilter"
      :milestones="milestones"
      :releases="releases"
      @update-milestone="updateTicketMilestone"
      @update-release="updateTicketRelease"
    />

    <JiraSyncDialog
      :visible="showSyncDialog"
      @close="showSyncDialog = false"
      @synced="ticketsStore.fetchTickets()"
    />
  </div>
</template>

<style scoped>
.tickets-view {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-header h2 { font-size: 1.3rem; }
.header-actions { display: flex; gap: 0.5rem; }
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
.btn-primary { background: #4361ee; color: white; }
.btn-primary:hover { background: #3a56d4; }
.btn-secondary { background: #e9ecef; color: #333; }
.btn-secondary:hover { background: #dee2e6; }
.stats-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  align-items: center;
  flex-wrap: wrap;
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-value { font-size: 1.5rem; font-weight: 700; color: #4361ee; }
.stat-label { font-size: 0.75rem; color: #888; text-transform: uppercase; }
.filters-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0;
  flex-wrap: wrap;
}
.filter-input {
  padding: 0.4rem 0.6rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.82rem;
  outline: none;
  flex: 1;
  min-width: 200px;
}
.filter-input:focus { border-color: #4361ee; }
.filter-select {
  padding: 0.35rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.82rem;
  background: white;
  outline: none;
  min-width: 140px;
}
.filter-select:focus { border-color: #4361ee; }
</style>

