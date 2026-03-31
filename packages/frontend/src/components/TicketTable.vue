<script setup lang="ts">
import { ref, computed, watch, Teleport } from 'vue'
import type { Ticket, Milestone, Release } from '@planning/shared'

const props = defineProps<{
  tickets: Ticket[]
  loading: boolean
  jiraBaseUrl?: string
  fixVersionFilter?: string
  milestones?: Milestone[]
  releases?: Release[]
}>()

const emit = defineEmits<{
  (e: 'update-milestone', ticketId: string, milestoneId: string | null): void
  (e: 'update-release', ticketId: string, releaseId: string | null): void
}>()

// ---- Pagination ----

const PAGE_SIZE_OPTIONS = [25, 50, 100, 0] as const  // 0 = tutti
const pageSize = ref(25)
const currentPage = ref(1)

// Reset alla pagina 1 quando cambiano i ticket (filtri) o il pageSize
watch(() => props.tickets.length, () => { currentPage.value = 1 })
watch(pageSize, () => { currentPage.value = 1 })

// ---- Sorting ----

type SortKey = 'jiraKey' | 'summary' | 'jiraAssigneeName' | 'estimateMinutes' | 'status' | 'fixVersions' | 'warnings'
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
      case 'estimateMinutes': cmp = (a.estimateMinutes ?? -1) - (b.estimateMinutes ?? -1); break
      case 'status': cmp = (a.jiraStatus ?? '').localeCompare(b.jiraStatus ?? ''); break
      case 'jiraAssigneeName': cmp = (a.jiraAssigneeName ?? '').localeCompare(b.jiraAssigneeName ?? ''); break
      case 'fixVersions': cmp = (a.fixVersions?.[0] ?? '').localeCompare(b.fixVersions?.[0] ?? ''); break
      case 'warnings': cmp = (a.warnings?.length ?? 0) - (b.warnings?.length ?? 0); break
    }
    return cmp * dir
  })
  return list
})

const totalPages = computed(() => {
  if (pageSize.value === 0) return 1
  return Math.max(1, Math.ceil(sortedTickets.value.length / pageSize.value))
})

const paginatedTickets = computed(() => {
  if (pageSize.value === 0) return sortedTickets.value
  const start = (currentPage.value - 1) * pageSize.value
  return sortedTickets.value.slice(start, start + pageSize.value)
})

const paginationFrom = computed(() => {
  if (sortedTickets.value.length === 0) return 0
  if (pageSize.value === 0) return 1
  return (currentPage.value - 1) * pageSize.value + 1
})

const paginationTo = computed(() => {
  if (pageSize.value === 0) return sortedTickets.value.length
  return Math.min(currentPage.value * pageSize.value, sortedTickets.value.length)
})

function goToPage(page: number) {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value))
}

function pageSizeLabel(size: number): string {
  return size === 0 ? 'Tutti' : String(size)
}

// ---- Warning popover ----

const warningPopover = ref<{ ticketId: string; x: number; y: number; right: number } | null>(null)

function warningLabel(w: string): string {
  switch (w) {
    case 'missing_estimate': return '⏱️ Stima mancante — il ticket non ha una stima di effort su Jira'
    case 'missing_assignee': return '👤 Assignee mancante — nessun assegnatario su Jira'
    case 'estimate_zero': return '0️⃣ Stima a zero — la stima su Jira è impostata a 0h'
    default: return w
  }
}

function showWarningPopover(ticketId: string, event: MouseEvent) {
  warningPopover.value = {
    ticketId,
    x: event.clientX,
    y: event.clientY,
    right: document.documentElement.clientWidth - event.clientX,
  }
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
          <th class="sortable" @click="toggleSort('estimateMinutes')">Stima {{ sortIcon('estimateMinutes') }}</th>
          <th class="sortable" @click="toggleSort('status')">Stato {{ sortIcon('status') }}</th>
          <th class="sortable" @click="toggleSort('fixVersions')">Fix Version {{ sortIcon('fixVersions') }}</th>
          <th v-if="milestones?.length">Milestone</th>
          <th v-if="releases?.length">Release</th>
          <th class="sortable" @click="toggleSort('warnings')">Warning {{ sortIcon('warnings') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="ticket in paginatedTickets" :key="ticket.id">
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
          <td class="estimate-col">{{ formatMinutes(ticket.estimateMinutes) }}</td>
          <td>
            <span class="badge status-badge">
              {{ ticket.jiraStatus ?? '—' }}
            </span>
          </td>
          <td class="fix-version-col">
            <span v-if="ticket.fixVersions?.length" class="fix-versions">
              <span v-for="v in ticket.fixVersions" :key="v" class="fv-badge">{{ v }}</span>
            </span>
            <span v-else class="text-muted">—</span>
          </td>
          <td v-if="milestones?.length" class="milestone-col">
            <select
              class="inline-select"
              :value="ticket.milestoneId ?? ''"
              @change="emit('update-milestone', ticket.id, ($event.target as HTMLSelectElement).value || null)"
            >
              <option value="">—</option>
              <option v-for="m in milestones" :key="m.id" :value="m.id">{{ m.name }}</option>
            </select>
          </td>
          <td v-if="releases?.length" class="release-col">
            <select
              class="inline-select"
              :value="ticket.releaseId ?? ''"
              @change="emit('update-release', ticket.id, ($event.target as HTMLSelectElement).value || null)"
            >
              <option value="">—</option>
              <option v-for="r in releases" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
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

    <!-- Pagination bar -->
    <div v-if="!loading && sortedTickets.length > 0" class="pagination-bar">
      <div class="pagination-size">
        <span class="pagination-label">Righe per pagina:</span>
        <select v-model.number="pageSize" class="pagination-select">
          <option v-for="size in PAGE_SIZE_OPTIONS" :key="size" :value="size">
            {{ pageSizeLabel(size) }}
          </option>
        </select>
      </div>
      <span class="pagination-info">
        {{ paginationFrom }}–{{ paginationTo }} di {{ sortedTickets.length }}
      </span>
      <div class="pagination-nav">
        <button class="pagination-btn" :disabled="currentPage <= 1" @click="goToPage(1)" title="Prima pagina">«</button>
        <button class="pagination-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)" title="Pagina precedente">‹</button>
        <span class="pagination-pages">{{ currentPage }} / {{ totalPages }}</span>
        <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)" title="Pagina successiva">›</button>
        <button class="pagination-btn" :disabled="currentPage >= totalPages" @click="goToPage(totalPages)" title="Ultima pagina">»</button>
      </div>
    </div>

    <div v-else-if="!loading" class="empty">
      Nessun ticket presente.
    </div>

    <!-- Warning Popover -->
    <Teleport to="body">
      <div
        v-if="warningPopover"
        class="warning-popover"
        :style="{ top: warningPopover.y + 10 + 'px', right: warningPopover.right + 'px' }"
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
.estimate-col { font-variant-numeric: tabular-nums; }
.fix-version-col { white-space: nowrap; }
.milestone-col, .release-col { white-space: nowrap; }
.inline-select { padding: 0.2rem 0.3rem; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.75rem; background: var(--bg-input); color: var(--text-primary); outline: none; max-width: 120px; transition: var(--transition-theme); }
.inline-select:focus { border-color: var(--accent); }
.fv-badge { background: #ede9fe; color: #6d28d9; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-right: 0.2rem; }
:root.dark .fv-badge { background: #2a2044; color: #a78bfa; }
.badge { padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
.status-badge { background: #e9ecef; color: #555; }
.badge-red { background: #fde8e8; color: #d00000; }
.badge-orange { background: #fff3e0; color: #e85d04; }
.badge-blue { background: #e3f2fd; color: #4361ee; }
.badge-green { background: #e8f5e9; color: #06d6a0; }
.badge-gray { background: #f5f5f5; color: #888; }
:root.dark .badge-red { background: #3a1a1a; color: #ef6b6b; }
:root.dark .badge-orange { background: #3a2a18; color: #f0ad4e; }
:root.dark .badge-blue { background: #1a2244; color: #7b93ee; }
:root.dark .badge-green { background: #1a3a2a; color: #5cb85c; }
:root.dark .badge-gray { background: #2a2a44; color: #8888aa; }
.status-backlog { background: #f5f5f5; color: #888; }
.status-planned { background: #e3f2fd; color: #4361ee; }
.status-progress { background: #fff3e0; color: #e85d04; }
.status-done { background: #e8f5e9; color: #2e7d32; }
:root.dark .status-backlog { background: #2a2a44; color: #8888aa; }
:root.dark .status-planned { background: #1a2244; color: #7b93ee; }
:root.dark .status-progress { background: #3a2a18; color: #f0ad4e; }
:root.dark .status-done { background: #1a3a2a; color: #5cb85c; }
.phase-badge { background: var(--badge-bg); padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; color: var(--badge-text); }
.warning-badge { cursor: pointer; font-size: 0.85rem; }
.text-muted { color: var(--text-muted); }
.empty { padding: 2rem; text-align: center; color: var(--text-muted); }

/* Pagination */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1.25rem;
  padding: 0.6rem 0.75rem;
  border-top: 1px solid #e9ecef;
  font-size: 0.8rem;
  color: var(--text-secondary, #666);
  flex-wrap: wrap;
}
.pagination-size {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.pagination-label { white-space: nowrap; }
.pagination-select {
  padding: 0.2rem 0.35rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--bg-input, white);
  color: var(--text-primary, #333);
  outline: none;
}
.pagination-select:focus { border-color: #4361ee; }
.pagination-info { white-space: nowrap; font-variant-numeric: tabular-nums; }
.pagination-nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.pagination-pages {
  min-width: 3.5rem;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.pagination-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  font-size: 0.85rem;
  line-height: 1;
  color: var(--text-primary, #333);
  transition: all 0.15s;
}
.pagination-btn:hover:not(:disabled) { background: #f0f0f0; border-color: #4361ee; color: #4361ee; }
.pagination-btn:disabled { opacity: 0.35; cursor: default; }
:root.dark .pagination-bar { border-top-color: var(--border-color, #333); }
:root.dark .pagination-select { background: var(--bg-input, #1e1e2e); border-color: var(--border-color, #444); }
:root.dark .pagination-btn { border-color: var(--border-color, #444); color: var(--text-primary, #ccc); }
:root.dark .pagination-btn:hover:not(:disabled) { background: #2a2a44; }
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
