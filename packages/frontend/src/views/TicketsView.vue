<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTicketsStore } from '../stores/tickets.js'
import TicketTable from '../components/TicketTable.vue'
import JiraSyncDialog from '../components/JiraSyncDialog.vue'

const ticketsStore = useTicketsStore()
const showSyncDialog = ref(false)

onMounted(() => {
  ticketsStore.fetchTickets()
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

    <TicketTable :tickets="ticketsStore.tickets" :loading="ticketsStore.loading" />

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
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-value { font-size: 1.5rem; font-weight: 700; color: #4361ee; }
.stat-label { font-size: 0.75rem; color: #888; text-transform: uppercase; }
</style>

