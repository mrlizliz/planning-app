<script setup lang="ts">
import type { Ticket } from '@planning/shared'

defineProps<{
  tickets: Ticket[]
  loading: boolean
}>()

function priorityBadge(priority: string) {
  const map: Record<string, { label: string; class: string }> = {
    highest: { label: '🔴 Highest', class: 'badge-red' },
    high: { label: '🟠 High', class: 'badge-orange' },
    medium: { label: '🔵 Medium', class: 'badge-blue' },
    low: { label: '🟢 Low', class: 'badge-green' },
    lowest: { label: '⚪ Lowest', class: 'badge-gray' },
  }
  return map[priority] ?? { label: priority, class: 'badge-gray' }
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; class: string }> = {
    backlog: { label: 'Backlog', class: 'status-backlog' },
    planned: { label: 'Pianificato', class: 'status-planned' },
    in_progress: { label: 'In corso', class: 'status-progress' },
    done: { label: 'Completato', class: 'status-done' },
  }
  return map[status] ?? { label: status, class: 'status-backlog' }
}

function formatMinutes(min: number | null): string {
  if (min === null) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
</script>

<template>
  <div class="ticket-table-container">
    <div v-if="loading" class="loading">
      <i class="pi pi-spin pi-spinner" /> Caricamento...
    </div>

    <table v-else-if="tickets.length > 0" class="ticket-table">
      <thead>
        <tr>
          <th>Key</th>
          <th>Summary</th>
          <th>Priorità</th>
          <th>Stima</th>
          <th>Stato</th>
          <th>Fase</th>
          <th>Warning</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ticket in tickets" :key="ticket.id">
          <td class="key-col">
            <code>{{ ticket.jiraKey }}</code>
            <i v-if="ticket.locked" class="pi pi-lock lock-icon" title="Bloccato (override PM)" />
          </td>
          <td class="summary-col">{{ ticket.summary }}</td>
          <td>
            <span :class="['badge', priorityBadge(ticket.jiraPriority).class]">
              {{ priorityBadge(ticket.jiraPriority).label }}
            </span>
          </td>
          <td class="estimate-col">{{ formatMinutes(ticket.estimateMinutes) }}</td>
          <td>
            <span :class="['badge', statusBadge(ticket.status).class]">
              {{ statusBadge(ticket.status).label }}
            </span>
          </td>
          <td>
            <span class="phase-badge">{{ ticket.phase.toUpperCase() }}</span>
          </td>
          <td>
            <span v-for="w in ticket.warnings" :key="w" class="warning-badge" :title="w">
              ⚠️
            </span>
            <span v-if="ticket.warnings.length === 0" class="text-muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty">
      Nessun ticket presente.
    </div>
  </div>
</template>

<style scoped>
.ticket-table-container {
  background: white; border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow-x: auto;
}
.loading { padding: 2rem; text-align: center; color: #999; }
.ticket-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.ticket-table th {
  text-align: left; padding: 0.6rem 0.75rem; background: #fafafa;
  border-bottom: 2px solid #e9ecef; font-weight: 600; font-size: 0.75rem;
  text-transform: uppercase; color: #666;
}
.ticket-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f0f0f0; }
.ticket-table tr:hover td { background: #f8f9ff; }
.key-col { white-space: nowrap; display: flex; align-items: center; gap: 0.3rem; }
.key-col code { font-weight: 600; color: #4361ee; }
.lock-icon { font-size: 0.7rem; color: #ffd166; }
.summary-col { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.estimate-col { text-align: right; font-variant-numeric: tabular-nums; }
.badge { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
.badge-red { background: #fde8e8; color: #d00000; }
.badge-orange { background: #fff3e0; color: #e85d04; }
.badge-blue { background: #e3f2fd; color: #4361ee; }
.badge-green { background: #e8f5e9; color: #06d6a0; }
.badge-gray { background: #f5f5f5; color: #888; }
.status-backlog { background: #f5f5f5; color: #888; }
.status-planned { background: #e3f2fd; color: #4361ee; }
.status-progress { background: #fff3e0; color: #e85d04; }
.status-done { background: #e8f5e9; color: #2e7d32; }
.phase-badge { background: #e9ecef; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
.warning-badge { cursor: help; }
.text-muted { color: #ccc; }
.empty { padding: 2rem; text-align: center; color: #999; }
</style>

