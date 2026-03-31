<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Ticket, User, Assignment, PlanningRole } from '@planning/shared'

const props = defineProps<{
  visible: boolean
  tickets: Ticket[]
  assignments: Assignment[]
  users: User[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', assignment: Assignment): void
}>()

const selectedTicketId = ref('')
const selectedUserId = ref('')
const role = ref<PlanningRole>('dev')
const allocationPercent = ref(100)
const saving = ref(false)
const errorMsg = ref('')
const ticketSearch = ref('')

function resetForm() {
  selectedTicketId.value = ''
  selectedUserId.value = ''
  role.value = 'dev'
  allocationPercent.value = 100
  errorMsg.value = ''
  saving.value = false
  ticketSearch.value = ''
}

watch(() => props.visible, (v) => { if (v) resetForm() })

// Ticket non ancora assegnati (o con meno assignment di quanti ruoli hanno)
const availableTickets = computed(() => {
  const q = ticketSearch.value.toLowerCase()
  return props.tickets
    .filter((t) => t.status !== 'done')
    .filter((t) =>
      !q ||
      t.jiraKey.toLowerCase().includes(q) ||
      t.summary.toLowerCase().includes(q),
    )
    .sort((a, b) => a.jiraKey.localeCompare(b.jiraKey))
})

// Utenti attivi con ruoli planning
const availableUsers = computed(() =>
  props.users.filter((u) => u.active && u.planningRoles.length > 0)
)

// Aggiorna i ruoli disponibili in base all'utente selezionato
const availableRoles = computed(() => {
  const user = props.users.find((u) => u.id === selectedUserId.value)
  return user?.planningRoles ?? ['dev', 'qa'] as PlanningRole[]
})

// Auto-seleziona il primo ruolo disponibile quando cambia l'utente
watch(selectedUserId, () => {
  if (availableRoles.value.length > 0 && !availableRoles.value.includes(role.value)) {
    role.value = availableRoles.value[0] ?? 'dev'
  }
})

// Info ticket selezionato
const selectedTicket = computed(() =>
  props.tickets.find((t) => t.id === selectedTicketId.value),
)

// Assignment esistenti per il ticket selezionato
const existingAssignments = computed(() =>
  props.assignments
    .filter((a) => a.ticketId === selectedTicketId.value)
    .map((a) => {
      const user = props.users.find((u) => u.id === a.userId)
      return { ...a, userName: user?.displayName ?? a.userId }
    }),
)

function submit() {
  errorMsg.value = ''

  if (!selectedTicketId.value) {
    errorMsg.value = 'Seleziona un ticket'
    return
  }
  if (!selectedUserId.value) {
    errorMsg.value = 'Seleziona un utente'
    return
  }

  // Verifica duplicato: stesso ticket + stesso utente + stesso ruolo
  const duplicate = props.assignments.find(
    (a) =>
      a.ticketId === selectedTicketId.value &&
      a.userId === selectedUserId.value &&
      a.role === role.value,
  )
  if (duplicate) {
    errorMsg.value = 'Questo utente è già assegnato a questo ticket con lo stesso ruolo'
    return
  }

  const now = new Date().toISOString()
  const assignment: Assignment = {
    id: crypto.randomUUID(),
    ticketId: selectedTicketId.value,
    userId: selectedUserId.value,
    role: role.value,
    allocationPercent: allocationPercent.value,
    startDate: null,
    endDate: null,
    durationDays: null,
    locked: false,
    createdAt: now,
    updatedAt: now,
  }

  saving.value = true
  emit('created', assignment)
}

function formatMinutes(min: number | null): string {
  if (min === null) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="emit('close')">
      <div class="dialog">
        <div class="dialog-header">
          <h3>➕ Assegna Ticket</h3>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <form class="dialog-body" @submit.prevent="submit">
          <!-- Ticket -->
          <div class="form-row">
            <label>Ticket *</label>
            <input
              v-model="ticketSearch"
              type="text"
              placeholder="🔍 Filtra per key o titolo..."
              class="form-input search-input"
            />
            <select v-model="selectedTicketId" class="form-input" size="5">
              <option value="" disabled>— Seleziona un ticket —</option>
              <option v-for="t in availableTickets" :key="t.id" :value="t.id">
                {{ t.jiraKey }} — {{ t.summary.substring(0, 60) }}{{ t.summary.length > 60 ? '...' : '' }}
              </option>
            </select>
          </div>

          <!-- Info ticket selezionato -->
          <div v-if="selectedTicket" class="ticket-info">
            <div class="info-row">
              <strong>{{ selectedTicket.jiraKey }}</strong> — {{ selectedTicket.summary }}
            </div>
            <div class="info-row info-meta">
              Priorità: {{ selectedTicket.jiraPriority }} · Stima: {{ formatMinutes(selectedTicket.estimateMinutes) }} · Fase: {{ selectedTicket.phase.toUpperCase() }}
            </div>
            <div v-if="existingAssignments.length > 0" class="info-row info-existing">
              Già assegnato a:
              <span v-for="a in existingAssignments" :key="a.id" class="existing-badge">
                {{ a.userName }} ({{ a.role }})
              </span>
            </div>
          </div>

          <!-- Utente -->
          <div class="form-row">
            <label>Assegna a *</label>
            <select v-model="selectedUserId" class="form-input">
              <option value="" disabled>— Seleziona un utente —</option>
              <option v-for="u in availableUsers" :key="u.id" :value="u.id">
                {{ u.displayName }} ({{ u.planningRoles.join(', ') }})
              </option>
            </select>
          </div>

          <!-- Ruolo e allocazione -->
          <div class="form-row-group">
            <div class="form-row">
              <label>Ruolo</label>
              <select v-model="role" class="form-input">
                <option v-for="r in availableRoles" :key="r" :value="r">{{ r.toUpperCase() }}</option>
              </select>
            </div>
            <div class="form-row">
              <label>Allocazione %</label>
              <input
                v-model.number="allocationPercent"
                type="number"
                min="1"
                max="100"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-hint">
            💡 Le date verranno calcolate automaticamente dall'Auto-Schedule.
          </div>

          <div v-if="errorMsg" class="error-msg">⚠️ {{ errorMsg }}</div>

          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" @click="emit('close')">Annulla</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving">Salvataggio...</span>
              <span v-else>Assegna</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: var(--bg-card, white); border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2);
  width: 560px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
}
.dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color, #e9ecef);
}
.dialog-header h3 { margin: 0; font-size: 1.1rem; }
.close-btn { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--text-muted, #999); }
.close-btn:hover { color: var(--text-primary, #333); }
.dialog-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; }
.form-row { display: flex; flex-direction: column; gap: 0.3rem; }
.form-row label { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary, #666); text-transform: uppercase; }
.form-input {
  padding: 0.45rem 0.6rem; border: 1px solid var(--border-color, #ddd); border-radius: 6px;
  font-size: 0.85rem; outline: none; background: var(--bg-input, white); color: var(--text-primary, #333);
  transition: border-color 0.15s;
}
.form-input:focus { border-color: #4361ee; }
.search-input { margin-bottom: 0.3rem; }
select[size] { height: auto; }
.ticket-info {
  background: var(--bg-secondary, #f8f9fa); border-radius: 6px;
  padding: 0.6rem 0.75rem; font-size: 0.82rem;
}
.info-row { margin-bottom: 0.25rem; }
.info-row:last-child { margin-bottom: 0; }
.info-meta { color: var(--text-muted, #888); font-size: 0.78rem; }
.info-existing { color: var(--text-secondary, #666); font-size: 0.78rem; display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
.existing-badge {
  background: #e3f2fd; color: #4361ee; padding: 0.1rem 0.4rem;
  border-radius: 4px; font-size: 0.7rem; font-weight: 600;
}
.form-row-group { display: flex; gap: 0.75rem; }
.form-row-group .form-row { flex: 1; }
.form-hint { font-size: 0.78rem; color: var(--text-muted, #888); padding: 0.2rem 0; }
.error-msg { color: #d00; font-size: 0.82rem; padding: 0.4rem 0; }
.dialog-actions { display: flex; justify-content: flex-end; gap: 0.5rem; padding-top: 0.5rem; }
.btn {
  padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer;
  font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; transition: all 0.15s;
}
.btn-primary { background: #4361ee; color: white; }
.btn-primary:hover { background: #3a56d4; }
.btn-primary:disabled { opacity: 0.5; cursor: default; }
.btn-secondary { background: var(--bg-secondary, #e9ecef); color: var(--text-primary, #333); }
.btn-secondary:hover { background: var(--bg-hover, #dee2e6); }
</style>


