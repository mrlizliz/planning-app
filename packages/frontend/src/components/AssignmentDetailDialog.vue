<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Assignment, User, Ticket } from '@planning/shared'
import DatePicker from 'primevue/datepicker'
import { parseISO, format } from 'date-fns'

const props = defineProps<{
  visible: boolean
  assignment: Assignment | null
  ticket: Ticket | null
  users: User[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update', assignmentId: string, data: Partial<Assignment>): void
  (e: 'delete', assignmentId: string): void
}>()

const editUserId = ref('')
const editStartDate = ref<Date | null>(null)
const editAllocationPercent = ref(100)
const saving = ref(false)
const confirmDelete = ref(false)

function isoFromDate(d: Date | null): string {
  return d ? format(d, 'yyyy-MM-dd') : ''
}

watch(() => props.visible, (v) => {
  if (v && props.assignment) {
    editUserId.value = props.assignment.userId
    editStartDate.value = props.assignment.startDate ? parseISO(props.assignment.startDate) : null
    editAllocationPercent.value = props.assignment.allocationPercent
    confirmDelete.value = false
    saving.value = false
  }
})

const currentUser = computed(() =>
  props.users.find((u) => u.id === props.assignment?.userId),
)

const availableUsers = computed(() =>
  props.users.filter((u) => u.active && u.planningRoles.length > 0),
)

const hasChanges = computed(() => {
  if (!props.assignment) return false
  return editUserId.value !== props.assignment.userId ||
    isoFromDate(editStartDate.value) !== (props.assignment.startDate ?? '') ||
    editAllocationPercent.value !== props.assignment.allocationPercent
})

async function handleSave() {
  if (!props.assignment || !hasChanges.value) return
  saving.value = true

  const changes: Partial<Assignment> = {}
  if (editUserId.value !== props.assignment.userId) {
    changes.userId = editUserId.value
  }
  const newDateStr = isoFromDate(editStartDate.value)
  if (newDateStr !== (props.assignment.startDate ?? '')) {
    changes.startDate = newDateStr || null
  }
  if (editAllocationPercent.value !== props.assignment.allocationPercent) {
    changes.allocationPercent = editAllocationPercent.value
  }

  emit('update', props.assignment.id, changes)
}

function handleDelete() {
  if (!confirmDelete.value) {
    confirmDelete.value = true
    return
  }
  if (props.assignment) {
    emit('delete', props.assignment.id)
  }
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
    <div v-if="visible && assignment" class="dialog-overlay" @click.self="emit('close')">
      <div class="dialog">
        <div class="dialog-header">
          <h3>📋 Dettaglio Assignment</h3>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="dialog-body">
          <!-- Ticket info (read-only) -->
          <div class="detail-section">
            <div class="detail-row">
              <span class="detail-label">Ticket</span>
              <span class="detail-value">
                <code class="ticket-key">{{ ticket?.jiraKey ?? assignment.ticketId }}</code>
              </span>
            </div>
            <div v-if="ticket" class="detail-row">
              <span class="detail-label">Titolo</span>
              <span class="detail-value">{{ ticket.summary }}</span>
            </div>
            <div v-if="ticket" class="detail-row">
              <span class="detail-label">Priorità</span>
              <span class="detail-value">{{ ticket.jiraPriority }} · Stima: {{ formatMinutes(ticket.estimateMinutes) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Ruolo</span>
              <span class="detail-value">{{ assignment.role.toUpperCase() }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Fine</span>
              <span class="detail-value">{{ assignment.endDate ?? '—' }}{{ assignment.durationDays != null ? ` (${assignment.durationDays} gg lav.)` : '' }}</span>
            </div>
          </div>

          <hr class="divider" />

          <!-- Assignee (editable) -->
          <div class="edit-section">
            <div class="form-row">
              <label>Assignee</label>
              <select v-model="editUserId" class="form-input">
                <option v-for="u in availableUsers" :key="u.id" :value="u.id">
                  {{ u.displayName }} ({{ u.planningRoles.join(', ') }})
                </option>
              </select>
            </div>

            <!-- Start date (editable) -->
            <div class="form-row">
              <label>Data inizio</label>
              <DatePicker
                v-model="editStartDate"
                dateFormat="dd/mm/yy"
                showIcon
                showButtonBar
                :manualInput="true"
                placeholder="Seleziona data..."
                class="date-picker-input"
              />
            </div>

            <!-- Allocation (editable) -->
            <div class="form-row">
              <label>Allocazione %</label>
              <input
                v-model.number="editAllocationPercent"
                type="number"
                min="1"
                max="100"
                class="form-input"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="dialog-actions">
            <button
              class="btn btn-danger"
              @click="handleDelete"
            >
              <i class="pi pi-trash" />
              {{ confirmDelete ? 'Conferma eliminazione' : 'Rimuovi dal Gantt' }}
            </button>
            <div class="actions-right">
              <button class="btn btn-secondary" @click="emit('close')">Chiudi</button>
              <button
                class="btn btn-primary"
                :disabled="!hasChanges || saving"
                @click="handleSave"
              >
                {{ saving ? 'Salvataggio...' : 'Salva' }}
              </button>
            </div>
          </div>
        </div>
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
  width: 480px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
}
.dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color, #e9ecef);
}
.dialog-header h3 { margin: 0; font-size: 1.1rem; }
.close-btn { background: none; border: none; font-size: 1.1rem; cursor: pointer; color: var(--text-muted, #999); }
.close-btn:hover { color: var(--text-primary, #333); }
.dialog-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }

.detail-section { display: flex; flex-direction: column; gap: 0.5rem; }
.detail-row { display: flex; gap: 0.75rem; font-size: 0.85rem; }
.detail-label {
  min-width: 70px; font-weight: 600; color: var(--text-secondary, #666);
  font-size: 0.78rem; text-transform: uppercase; padding-top: 0.1rem;
}
.detail-value { color: var(--text-primary, #333); flex: 1; }
.ticket-key { font-weight: 700; color: #4361ee; font-size: 0.9rem; }

.divider { border: none; border-top: 1px solid var(--border-color, #e9ecef); margin: 0.25rem 0; }

.edit-section { display: flex; flex-direction: column; gap: 0.75rem; }
.form-row { display: flex; flex-direction: column; gap: 0.3rem; }
.form-row label { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary, #666); text-transform: uppercase; }
.form-input {
  padding: 0.45rem 0.6rem; border: 1px solid var(--border-color, #ddd); border-radius: 6px;
  font-size: 0.85rem; outline: none; background: var(--bg-input, white); color: var(--text-primary, #333);
  transition: border-color 0.15s;
}
.form-input:focus { border-color: #4361ee; }

.date-picker-input { width: 100%; }
.date-picker-input :deep(input) {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  font-size: 0.85rem;
  outline: none;
  width: 100%;
  background: var(--bg-input, white);
  color: var(--text-primary, #333);
}
.date-picker-input :deep(input:focus) { border-color: #4361ee; }

.dialog-actions {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 0.5rem; gap: 0.5rem;
}
.actions-right { display: flex; gap: 0.5rem; }
.btn {
  padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer;
  font-size: 0.82rem; display: flex; align-items: center; gap: 0.4rem; transition: all 0.15s;
}
.btn-primary { background: #4361ee; color: white; }
.btn-primary:hover { background: #3a56d4; }
.btn-primary:disabled { opacity: 0.4; cursor: default; }
.btn-secondary { background: var(--bg-secondary, #e9ecef); color: var(--text-primary, #333); }
.btn-secondary:hover { background: var(--bg-hover, #dee2e6); }
.btn-danger { background: #fde8e8; color: #d00000; }
.btn-danger:hover { background: #f8d0d0; }
</style>










