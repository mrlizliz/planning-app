<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Ticket, JiraPriority, TicketPhase } from '@planning/shared'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', ticket: Ticket): void
}>()

const jiraKey = ref('')
const summary = ref('')
const description = ref('')
const estimateHours = ref<number | null>(null)
const jiraPriority = ref<JiraPriority>('medium')
const phase = ref<TicketPhase>('dev')
const saving = ref(false)
const errorMsg = ref('')

function resetForm() {
  jiraKey.value = ''
  summary.value = ''
  description.value = ''
  estimateHours.value = null
  jiraPriority.value = 'medium'
  phase.value = 'dev'
  errorMsg.value = ''
  saving.value = false
}

watch(() => props.visible, (v) => { if (v) resetForm() })

function generateId(): string {
  return crypto.randomUUID()
}

async function submit() {
  errorMsg.value = ''

  if (!jiraKey.value.trim()) {
    errorMsg.value = 'La Key è obbligatoria (es. LP-999 o MANUAL-1)'
    return
  }
  if (!summary.value.trim()) {
    errorMsg.value = 'Il titolo è obbligatorio'
    return
  }

  const now = new Date().toISOString()
  const estimateMinutes = estimateHours.value != null ? Math.round(estimateHours.value * 60) : null

  const warnings: Ticket['warnings'] = []
  if (estimateMinutes === null) warnings.push('missing_estimate')
  else if (estimateMinutes === 0) warnings.push('estimate_zero')

  const ticket: Ticket = {
    id: generateId(),
    jiraKey: jiraKey.value.trim().toUpperCase(),
    summary: summary.value.trim(),
    description: description.value.trim() || null,
    estimateMinutes,
    jiraPriority: jiraPriority.value,
    priorityOverride: null,
    status: 'backlog',
    phase: phase.value,
    jiraAssigneeEmail: null,
    jiraAssigneeName: null,
    jiraStatus: null,
    parentKey: null,
    fixVersions: [],
    milestoneId: null,
    releaseId: null,
    locked: false,
    warnings,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  saving.value = true
  try {
    emit('created', ticket)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-overlay" @click.self="emit('close')">
      <div class="dialog">
        <div class="dialog-header">
          <h3>➕ Nuovo Ticket</h3>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <form class="dialog-body" @submit.prevent="submit">
          <div class="form-row">
            <label>Key *</label>
            <input
              v-model="jiraKey"
              type="text"
              placeholder="es. LP-999 o MANUAL-1"
              class="form-input"
              autofocus
            />
          </div>

          <div class="form-row">
            <label>Titolo *</label>
            <input
              v-model="summary"
              type="text"
              placeholder="Descrizione breve del ticket"
              class="form-input"
            />
          </div>

          <div class="form-row">
            <label>Descrizione</label>
            <textarea
              v-model="description"
              rows="3"
              placeholder="Dettagli (opzionale)"
              class="form-input"
            />
          </div>

          <div class="form-row-group">
            <div class="form-row">
              <label>Stima (ore)</label>
              <input
                v-model.number="estimateHours"
                type="number"
                min="0"
                step="0.5"
                placeholder="es. 8"
                class="form-input"
              />
            </div>
            <div class="form-row">
              <label>Priorità</label>
              <select v-model="jiraPriority" class="form-input">
                <option value="highest">🔴 Highest</option>
                <option value="high">🟠 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">🟢 Low</option>
                <option value="lowest">⚪ Lowest</option>
              </select>
            </div>
            <div class="form-row">
              <label>Fase</label>
              <select v-model="phase" class="form-input">
                <option value="dev">DEV</option>
                <option value="qa">QA</option>
              </select>
            </div>
          </div>

          <div v-if="errorMsg" class="error-msg">⚠️ {{ errorMsg }}</div>

          <div class="dialog-actions">
            <button type="button" class="btn btn-secondary" @click="emit('close')">Annulla</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving">Salvataggio...</span>
              <span v-else>Crea Ticket</span>
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
  width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto;
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
textarea.form-input { resize: vertical; font-family: inherit; }
.form-row-group { display: flex; gap: 0.75rem; }
.form-row-group .form-row { flex: 1; }
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


