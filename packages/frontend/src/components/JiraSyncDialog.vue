<script setup lang="ts">
import { ref, watch } from 'vue'
import { useTicketsStore } from '../stores/tickets.js'
import { jiraApi } from '../api/client.js'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  synced: []
}>()

const ticketsStore = useTicketsStore()

const config = ref({
  baseUrl: '',
  email: '',
  apiToken: '',
  jql: 'project = PROJ ORDER BY priority DESC',
})

/** true se il token è configurato lato server (.env) */
const serverHasToken = ref(false)
const tokenHint = ref('')
const configLoaded = ref(false)

const result = ref<{ imported: number; total: number } | null>(null)
const error = ref<string | null>(null)
const syncing = ref(false)

// Carica config dal backend quando il dialog si apre
watch(() => props.visible, async (visible) => {
  if (visible && !configLoaded.value) {
    try {
      const jiraConfig = await jiraApi.getConfig()
      if (jiraConfig.baseUrl) config.value.baseUrl = jiraConfig.baseUrl
      if (jiraConfig.email) config.value.email = jiraConfig.email
      if (jiraConfig.defaultJql) config.value.jql = jiraConfig.defaultJql
      serverHasToken.value = jiraConfig.hasToken
      tokenHint.value = jiraConfig.tokenHint
      configLoaded.value = true
    } catch {
      // Ignora — l'utente compilerà manualmente
    }
  }
})

async function handleSync() {
  if (!config.value.baseUrl || !config.value.email) return
  if (!serverHasToken.value && !config.value.apiToken) return

  syncing.value = true
  error.value = null
  result.value = null

  try {
    // Se il token è nel server, non lo inviamo dal frontend
    const payload: Record<string, string> = { jql: config.value.jql }
    if (config.value.baseUrl) payload.baseUrl = config.value.baseUrl
    if (config.value.email) payload.email = config.value.email
    if (config.value.apiToken) payload.apiToken = config.value.apiToken

    const res = await ticketsStore.syncFromJira(payload as any)
    result.value = { imported: res!.imported, total: res!.total }
    emit('synced')
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    syncing.value = false
  }
}

function handleClose() {
  result.value = null
  error.value = null
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="dialog-overlay" @click.self="handleClose">
    <div class="dialog">
      <div class="dialog-header">
        <h3><i class="pi pi-cloud-download" /> Importa da Jira</h3>
        <button class="btn-icon" @click="handleClose">
          <i class="pi pi-times" />
        </button>
      </div>

      <div class="dialog-body">
        <div class="form-group">
          <label>URL Jira</label>
          <input
            v-model="config.baseUrl"
            placeholder="https://mycompany.atlassian.net"
            class="input"
          />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input
            v-model="config.email"
            placeholder="user@example.com"
            class="input"
            type="email"
          />
        </div>
        <div class="form-group">
          <label>API Token</label>
          <div v-if="serverHasToken && !config.apiToken" class="token-hint">
            🔑 Token configurato nel server ({{ tokenHint }})
          </div>
          <input
            v-model="config.apiToken"
            :placeholder="serverHasToken ? 'Lascia vuoto per usare il token del server' : 'Jira API Token'"
            class="input"
            type="password"
          />
        </div>
        <div class="form-group">
          <label>JQL Query</label>
          <input v-model="config.jql" placeholder="project = PROJ" class="input" />
        </div>

        <div v-if="result" class="success-msg">
          ✅ Importati {{ result.imported }} ticket su {{ result.total }} trovati
        </div>
        <div v-if="error" class="error-msg">
          ❌ {{ error }}
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" @click="handleClose">Chiudi</button>
        <button class="btn btn-primary" :disabled="syncing" @click="handleSync">
          <i class="pi pi-cloud-download" />
          {{ syncing ? 'Importazione...' : 'Importa' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4); display: flex; align-items: center;
  justify-content: center; z-index: 100;
}
.dialog {
  background: white; border-radius: 12px; width: 480px; max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 1rem 1.25rem; border-bottom: 1px solid #e9ecef;
}
.dialog-header h3 { font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; }
.dialog-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.dialog-footer { padding: 1rem 1.25rem; border-top: 1px solid #e9ecef; display: flex; justify-content: flex-end; gap: 0.5rem; }
.form-group { display: flex; flex-direction: column; gap: 0.25rem; }
.form-group label { font-size: 0.8rem; font-weight: 600; color: #555; }
.input { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.85rem; outline: none; }
.input:focus { border-color: #4361ee; }
.token-hint { font-size: 0.78rem; color: #06d6a0; padding: 0.3rem 0; }
.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: #4361ee; color: white; }
.btn-secondary { background: #e9ecef; color: #333; }
.btn-icon { background: none; border: none; cursor: pointer; color: #999; }
.success-msg { background: #e8f5e9; color: #2e7d32; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; }
.error-msg { background: #fde8e8; color: #d00000; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; word-break: break-word; }
</style>

