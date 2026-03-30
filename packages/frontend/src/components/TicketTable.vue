<script setup lang="ts">
import { ref, computed, Teleport } from 'vue'
import type { Ticket } from '@planning/shared'

const props = defineProps<{
  tickets: Ticket[]
  loading: boolean
  jiraBaseUrl?: string
  fixVersionFilter?: string
}>()

// ---- Sorting ----

type SortKey = 'jiraKey' | 'summary' | 'jiraPriority' | 'estimateMinutes' | 'status' | 'phase' | 'jiraAssigneeName' | 'fixVersions' | 'warnings'
const sortKey = ref<SortKey>('jiraKey')
const sortAsc = ref(true)

const PRIORITY_ORDER: Record<string, number> = { highest: 1, high: 2, medium: 3, low: 4, lowest: 5 }

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return '↕'
  return sortAsc.value ? '↑' : '↓'
}

const sortedTickets = computed(() => {
  const list = [...props.tickets]
  const dir = sortAsc.value ? 1 : -1
  list.sort((a, b) => {
    let cmp = 0
    switch (sortKey.value) {
      case 'jiraKey': {
        // Ordina per prefisso, poi numerico
        const parseKey = (k: string) => { const m = k.match(/^(.+?)-(\d+)$/); return m ? [m[1], parseInt(m[2])] as const : [k, 0] as const }
        const [pa, na] = parseKey(a.jiraKey)
        const [pb, nb] = parseKey(b.jiraKey)
        cmp = pa.localeCompare(pb) || (na as number) - (nb as number)
        break
      }
      case 'summary': cmp = a.summary.localeCompare(b.summary); break
      case 'jiraPriority': cmp = (PRIORITY_ORDER[a.jiraPriority] ?? 3) - (PRIORITY_ORDER[b.jiraPriority] ?? 3); break
      case 'estimateMinutes': cmp = (a.estimateMinutes ?? -1) - (b.estimateMinutes ?? -1); break
      case 'status': cmp = a.status.localeCompare(b.status); break
      case 'phase': cmp = a.phase.localeCompare(b.phase); break
      case 'jiraAssigneeName': cmp = (a.jiraAssigneeName ?? '').localeCompare(b.jiraAssigneeName ?? ''); break
      case 'fixVersions': cmp = (a.fixVersions?.[0] ?? '').localeCompare(b.fixVersions?.[0] ?? ''); break
      case 'warnings': cmp = (a.warnings?.length ?? 0) - (b.warnings?.length ?? 0); break
    }
    return cmp * dir
  })
  return list
})

// ---- Warning popover ----

const warningPopover = ref<{ ticketId: string; x: number; y: number } | null>(null)

function warningLabel(w: string): string {
  switch (w) {
    case 'missing_estimate': return '⏱️ Stima mancante — il ticket non ha una stima di effort su Jira'
    case 'missing_assignee': return '👤 Assignee mancante — nessun assegnatario su Jira'
    case 'estimate_zero': return '0️⃣ Stima a zero — la stima su Jira è impostata a 0h'
    default: return w
  }
}

function showWarningPopover(ticketId: string, event: MouseEvent) {
  warningPopover.value = { ticketId, x: event.clientX, y: event.clientY }
}

function hideWarningPopover() {
  warningPopover.value = null
}

// ---- Jira link ----

function jiraUrl(key: string): string {
  const base = props.jiraBaseUrl?.replace(/\/$/, '') || ''
  return base ? `${base}/browse/${key}` : '#'
}

// ---- Helpers ----

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

    <table v-else-if="sortedTickets.length > 0" class="ticket-table">
      <thead>
        <tr>
          <th class="sortable" @click="toggleSort('jiraKey')">Key {{ sortIcon('jiraKey') }}</th>
          <th class="sortable" @click="toggleSort('summary')">Summary {{ sortIcon('summary') }}</th>
          <th class="sortable" @click="toggleSort('jiraAssigneeName')">Assignee {{ sortIcon('jiraAssigneeName') }}</th>
          <th class="sortable" @click="toggleSort('jiraPriority')">Priorità {{ sortIcon('jiraPriority') }}</th>
          <th class="sortable" @click="toggleSort('estimateMinutes')">Stima {{ sortIcon('estimateMinutes') }}</th>
          <th class="sortable" @click="toggleSort('status')">Stato {{ sortIcon('status') }}</th>
          <th class="sortable" @click="toggleSort('phase')">Fase {{ sortIcon('phase') }}</th>
          <th class="sortable" @click="toggleSort('fixVersions')">Fix Version {{ sortIcon('fixVersions') }}</th>
          <th class="sortable" @click="toggleSort('warnings')">Warning {{ sortIcon('warnings') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ticket in sortedTickets" :key="ticket.id">
          <td class="key-col">
            <a
              :href="jiraUrl(ticket.jiraKey)"
              target="_blank"
              rel="noopener"
              class="jira-link"
              :title="`Apri ${ticket.jiraKey} su Jira`"
            >
              <code>{{ ticket.jiraKey }}</code>
              <i class="pi pi-external-link ext-icon" />
            </a>
            <i v-if="ticket.locked" class="pi pi-lock lock-icon" title="Bloccato (override PM)" />
          </td>
          <td class="summary-col" :title="ticket.summary">{{ ticket.summary }}</td>
          <td class="assignee-col">
            <span v-if="ticket.jiraAssigneeName" class="assignee">{{ ticket.jiraAssigneeName }}</span>
            <span v-else class="text-muted">—</span>
          </td>
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
          <td class="fix-version-col">
            <span v-if="ticket.fixVersions?.length" class="fix-versions">
              <span v-for="v in ticket.fixVersions" :key="v" class="fv-badge">{{ v }}</span>
            </span>
            <span v-else class="text-muted">—</span>
          </td>
          <td>
            <span
              v-if="ticket.warnings?.length"
              class="warning-badge"
              @click="showWarningPopover(ticket.id, $event)"
            >
              ⚠️ {{ ticket.warnings.length }}
            </span>
            <span v-else class="text-muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty">
      Nessun ticket presente.
    </div>

    <!-- Warning Popover -->
    <Teleport to="body">
      <div
        v-if="warningPopover"
        class="warning-popover"
        :style="{ top: warningPopover.y + 10 + 'px', left: warningPopover.x + 'px' }"
        @mouseleave="hideWarningPopover"
      >
        <div class="popover-header">
          ⚠️ Warning
          <button class="popover-close" @click="hideWarningPopover">✕</button>
        </div>
        <ul class="popover-list">
          <li
            v-for="w in tickets.find(t => t.id === warningPopover!.ticketId)?.warnings ?? []"
            :key="w"
          >
            {{ warningLabel(w) }}
          </li>
        </ul>
      </div>
    </Teleport>
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
  text-transform: uppercase; color: #666; white-space: nowrap;
}
.ticket-table th.sortable { cursor: pointer; user-select: none; }
.ticket-table th.sortable:hover { color: #4361ee; }
.ticket-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f0f0f0; }
.ticket-table tr:hover td { background: #f8f9ff; }
.key-col { white-space: nowrap; }
.jira-link { display: inline-flex; align-items: center; gap: 0.25rem; text-decoration: none; }
.jira-link code { font-weight: 600; color: #4361ee; }
.jira-link:hover code { text-decoration: underline; }
.ext-icon { font-size: 0.6rem; color: #999; }
.lock-icon { font-size: 0.7rem; color: #ffd166; margin-left: 0.3rem; }
.summary-col { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.assignee-col { white-space: nowrap; font-size: 0.82rem; }
.assignee { color: #333; }
.estimate-col { text-align: right; font-variant-numeric: tabular-nums; }
.fix-version-col { white-space: nowrap; }
.fv-badge { background: #ede9fe; color: #6d28d9; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right: 0.2rem; }
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
.warning-badge { cursor: pointer; font-size: 0.85rem; }
.text-muted { color: #ccc; }
.empty { padding: 2rem; text-align: center; color: #999; }
</style>

<style>
/* Warning popover (non scoped perché usa Teleport) */
.warning-popover {
  position: fixed; z-index: 200; background: white; border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15); min-width: 280px; max-width: 400px;
  border: 1px solid #e9ecef;
}
.popover-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.5rem 0.75rem; font-weight: 600; font-size: 0.85rem;
  border-bottom: 1px solid #f0f0f0;
}
.popover-close { background: none; border: none; cursor: pointer; color: #999; font-size: 0.85rem; }
.popover-list { list-style: none; padding: 0.5rem 0.75rem; margin: 0; }
.popover-list li { padding: 0.35rem 0; font-size: 0.82rem; color: #555; border-bottom: 1px solid #f8f8f8; }
.popover-list li:last-child { border-bottom: none; }
</style>
