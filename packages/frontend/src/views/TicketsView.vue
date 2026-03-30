<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTicketsStore } from '../stores/tickets.js'
import { jiraApi } from '../api/client.js'
import TicketTable from '../components/TicketTable.vue'
import JiraSyncDialog from '../components/JiraSyncDialog.vue'

const ticketsStore = useTicketsStore()
const showSyncDialog = ref(false)
const jiraBaseUrl = ref('')
const fixVersionFilter = ref('')

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

// Ticket filtrati
const filteredTickets = computed(() => {
  if (!fixVersionFilter.value) return ticketsStore.tickets
  return ticketsStore.tickets.filter((t) =>
    (t.fixVersions ?? []).includes(fixVersionFilter.value),
  )
})

onMounted(async () => {
  ticketsStore.fetchTickets()
  try {
    const config = await jiraApi.getConfig()
    if (config.baseUrl) jiraBaseUrl.value = config.baseUrl
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
      <div class="stat filter-stat" v-if="allFixVersions.length > 0">
        <label class="filter-label">Fix Version:</label>
        <select v-model="fixVersionFilter" class="filter-select">
          <option value="">Tutte ({{ ticketsStore.ticketCount }})</option>
          <option v-for="v in allFixVersions" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>
    </div>

    <TicketTable
      :tickets="filteredTickets"
      :loading="ticketsStore.loading"
      :jira-base-url="jiraBaseUrl"
      :fix-version-filter="fixVersionFilter"
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
.filter-stat {
  margin-left: auto;
  flex-direction: row;
  gap: 0.5rem;
}
.filter-label { font-size: 0.8rem; font-weight: 600; color: #555; white-space: nowrap; }
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

