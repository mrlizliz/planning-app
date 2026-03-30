<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useUsersStore } from '../stores/users.js'
import { calendarApi } from '../api/client.js'
import type { User, Holiday } from '@planning/shared'

const usersStore = useUsersStore()
const holidays = ref<Holiday[]>([])

// ---- Form nuova persona ----
const newUser = ref({
  displayName: '',
  email: '',
  appRole: 'dev' as const,
  office: '' as string,
  dailyWorkingMinutes: 480,
})

const emailAutoFill = ref(true)

function generateEmail(name: string): string {
  if (!name.trim()) return ''
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    + '@arsenalia.com'
}

watch(() => newUser.value.displayName, (name) => {
  if (emailAutoFill.value) {
    newUser.value.email = generateEmail(name)
  }
})

function onEmailManualEdit() {
  emailAutoFill.value = false
}

// ---- Edit utente ----
const editingUserId = ref<string | null>(null)
const editForm = ref({
  displayName: '',
  email: '',
  appRole: '' as string,
  office: '' as string,
})

function startEdit(user: User) {
  editingUserId.value = user.id
  editForm.value = {
    displayName: user.displayName,
    email: user.email,
    appRole: user.appRole,
    office: (user as any).office ?? '',
  }
}

function cancelEdit() {
  editingUserId.value = null
}

async function saveEdit() {
  if (!editingUserId.value || !editForm.value.displayName || !editForm.value.email) return
  const role = editForm.value.appRole as 'dev' | 'qa' | 'pm'
  const planningRoles: Array<'dev' | 'qa'> =
    role === 'dev' ? ['dev'] : role === 'qa' ? ['qa'] : []
  await usersStore.updateUser(editingUserId.value, {
    displayName: editForm.value.displayName,
    email: editForm.value.email,
    appRole: role,
    planningRoles,
    office: editForm.value.office || null,
  })
  editingUserId.value = null
}

// ---- Form nuovo festivo ----
const newHoliday = ref({
  date: '',
  name: '',
  recurring: false,
  office: '' as string,
})

onMounted(async () => {
  await usersStore.fetchUsers()
  holidays.value = await calendarApi.holidays.list()
})

async function addUser() {
  if (!newUser.value.displayName || !newUser.value.email) return
  const role = newUser.value.appRole
  const planningRoles: Array<'dev' | 'qa'> =
    role === 'dev' ? ['dev'] : role === 'qa' ? ['qa'] : []
  const user: User = {
    id: crypto.randomUUID(),
    displayName: newUser.value.displayName,
    email: newUser.value.email,
    appRole: role,
    planningRoles,
    office: newUser.value.office || null,
    dailyWorkingMinutes: newUser.value.dailyWorkingMinutes,
    dailyOverheadMinutes: 30,
    active: true,
  }
  await usersStore.createUser(user)
  newUser.value.displayName = ''
  newUser.value.email = ''
  newUser.value.appRole = 'dev'
  newUser.value.office = ''
  emailAutoFill.value = true
}

async function addHoliday() {
  if (!newHoliday.value.date || !newHoliday.value.name) return
  const holiday: Holiday = {
    id: crypto.randomUUID(),
    date: newHoliday.value.date,
    name: newHoliday.value.name,
    recurring: newHoliday.value.recurring,
    office: newHoliday.value.office || null,
  }
  await calendarApi.holidays.create(holiday)
  holidays.value = await calendarApi.holidays.list()
  newHoliday.value.date = ''
  newHoliday.value.name = ''
  newHoliday.value.recurring = false
  newHoliday.value.office = ''
}

async function removeHoliday(id: string) {
  await calendarApi.holidays.delete(id)
  holidays.value = holidays.value.filter((h) => h.id !== id)
}

async function removeUser(id: string) {
  await usersStore.deleteUser(id)
  if (editingUserId.value === id) editingUserId.value = null
}

/** Converte "2026-12-07" → "07/12/2026" */
function formatDateIT(isoDate: string): string {
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}
</script>

<template>
  <div class="settings-view">
    <h2>⚙️ Impostazioni</h2>

    <!-- Gestione Team -->
    <section class="section">
      <h3>👥 Team</h3>
      <form class="form-row" @submit.prevent="addUser">
        <input v-model="newUser.displayName" placeholder="Nome e Cognome" class="input" />
        <input v-model="newUser.email" placeholder="Email" class="input" type="email" @input="onEmailManualEdit" />
        <select v-model="newUser.appRole" class="input">
          <option value="dev">DEV</option>
          <option value="qa">QA</option>
          <option value="pm">PM</option>
        </select>
        <select v-model="newUser.office" class="input">
          <option value="">— Office —</option>
          <option value="milano">Milano</option>
          <option value="venezia">Venezia</option>
          <option value="roma">Roma</option>
        </select>
        <button class="btn btn-primary" type="submit">
          <i class="pi pi-plus" /> Aggiungi
        </button>
      </form>

      <div class="list">
        <div v-for="user in usersStore.users" :key="user.id" class="list-item">
          <!-- Modalità visualizzazione -->
          <template v-if="editingUserId !== user.id">
            <div class="user-info">
              <strong>{{ user.displayName }}</strong>
              <span class="text-muted"> — {{ user.email }}</span>
              <span class="role-badge" v-for="r in user.planningRoles" :key="r">{{ r }}</span>
              <span v-if="(user as any).office" class="office-badge">📍 {{ (user as any).office }}</span>
            </div>
            <div class="item-actions">
              <button class="btn-icon" @click="startEdit(user)" title="Modifica">
                <i class="pi pi-pencil" />
              </button>
              <button class="btn-icon btn-icon-danger" @click="removeUser(user.id)" title="Elimina">
                <i class="pi pi-trash" />
              </button>
            </div>
          </template>
          <!-- Modalità edit -->
          <template v-else>
            <form class="edit-form" @submit.prevent="saveEdit">
              <input v-model="editForm.displayName" class="input input-sm" placeholder="Nome" />
              <input v-model="editForm.email" class="input input-sm" type="email" placeholder="Email" />
              <select v-model="editForm.appRole" class="input input-sm">
                <option value="dev">DEV</option>
                <option value="qa">QA</option>
                <option value="pm">PM</option>
              </select>
              <select v-model="editForm.office" class="input input-sm">
                <option value="">— Office —</option>
                <option value="milano">Milano</option>
                <option value="venezia">Venezia</option>
                <option value="roma">Roma</option>
              </select>
              <button class="btn btn-save" type="submit">
                <i class="pi pi-check" />
              </button>
              <button class="btn btn-cancel" type="button" @click="cancelEdit">
                <i class="pi pi-times" />
              </button>
            </form>
          </template>
        </div>
        <div v-if="usersStore.users.length === 0" class="text-muted">Nessun utente configurato</div>
      </div>
    </section>

    <!-- Festivi -->
    <section class="section">
      <h3>🎉 Giorni festivi</h3>
      <form class="form-row" @submit.prevent="addHoliday">
        <input v-model="newHoliday.date" type="date" class="input" />
        <input v-model="newHoliday.name" placeholder="Nome festività" class="input" />
        <select v-model="newHoliday.office" class="input input-sm">
          <option value="">🇮🇹 Nazionale</option>
          <option value="milano">📍 Milano</option>
          <option value="venezia">📍 Venezia</option>
          <option value="roma">📍 Roma</option>
        </select>
        <label class="checkbox-label">
          <input v-model="newHoliday.recurring" type="checkbox" />
          Ricorrente
        </label>
        <button class="btn btn-primary" type="submit">
          <i class="pi pi-plus" /> Aggiungi
        </button>
      </form>

      <div class="list">
        <div v-for="h in holidays" :key="h.id" class="list-item">
          <div>
            <strong>{{ formatDateIT(h.date) }}</strong> — {{ h.name }}
            <span v-if="h.recurring" class="badge">🔁</span>
            <span v-if="(h as any).office" class="office-badge">📍 {{ (h as any).office }}</span>
            <span v-else class="national-badge">🇮🇹 nazionale</span>
          </div>
          <button class="btn-icon btn-icon-danger" @click="removeHoliday(h.id)">
            <i class="pi pi-trash" />
          </button>
        </div>
        <div v-if="holidays.length === 0" class="text-muted">Nessun festivo configurato</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-view { display: flex; flex-direction: column; gap: 1.5rem; }
.settings-view h2 { font-size: 1.3rem; }
.section {
  background: white; border-radius: 8px; padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.section h3 { font-size: 1rem; margin-bottom: 0.75rem; }
.form-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem; }
.input {
  padding: 0.45rem 0.75rem; border: 1px solid #ddd; border-radius: 6px;
  font-size: 0.85rem; outline: none;
}
.input:focus { border-color: #4361ee; }
.input-sm { max-width: 140px; }
.list { display: flex; flex-direction: column; gap: 0.5rem; }
.list-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.5rem 0.75rem; background: #f8f9fa; border-radius: 6px;
}
.user-info { display: flex; align-items: center; flex-wrap: wrap; gap: 0.2rem; }
.item-actions { display: flex; gap: 0.15rem; flex-shrink: 0; }
.edit-form { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; width: 100%; }
.edit-form .input-sm { flex: 1; min-width: 100px; }
.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; }
.btn-primary { background: #4361ee; color: white; }
.btn-primary:hover { background: #3a56d4; }
.btn-save { background: #06d6a0; color: white; padding: 0.4rem 0.6rem; border: none; border-radius: 6px; cursor: pointer; }
.btn-save:hover { background: #05b888; }
.btn-cancel { background: #e9ecef; color: #555; padding: 0.4rem 0.6rem; border: none; border-radius: 6px; cursor: pointer; }
.btn-cancel:hover { background: #dee2e6; }
.btn-icon { background: none; border: none; cursor: pointer; color: #999; padding: 0.5rem; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center; }
.btn-icon:hover { color: #4361ee; }
.btn-icon-danger:hover { color: #ef476f; }
.btn-icon i { pointer-events: none; }
.text-muted { color: #999; font-size: 0.85rem; }
.role-badge { background: #e9ecef; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; color: #555; margin-left: 0.25rem; }
.office-badge { background: #e3f2fd; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; color: #1565c0; margin-left: 0.25rem; text-transform: capitalize; }
.national-badge { background: #e8f5e9; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.7rem; color: #2e7d32; margin-left: 0.25rem; }
.badge { font-size: 0.75rem; margin-left: 0.5rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; }
</style>

