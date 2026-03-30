<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useUsersStore } from '../stores/users.js'
import { usePlanningStore } from '../stores/planning.js'
import { absencesApi, meetingsApi } from '../api/client.js'
import type { User, Absence, RecurringMeeting } from '@planning/shared'

const usersStore = useUsersStore()
const planningStore = usePlanningStore()

// Stato
const absences = ref<Absence[]>([])
const meetings = ref<RecurringMeeting[]>([])
const selectedUserId = ref<string | null>(null)
const capacityData = ref<any>(null)
const loadingCapacity = ref(false)

// Form assenza
const newAbsence = ref({ userId: '', startDate: '', endDate: '', type: 'vacation' as const, halfDay: false })
// Form meeting
const newMeeting = ref({
  userId: '' as string, name: '', type: 'standup' as const,
  durationMinutes: 15, frequency: 'daily' as const, daysOfWeek: [] as number[],
})

onMounted(async () => {
  await Promise.all([
    usersStore.fetchUsers(),
    planningStore.fetchAssignments(),
    loadAbsences(),
    loadMeetings(),
  ])
})

async function loadAbsences() { absences.value = await absencesApi.list() }
async function loadMeetings() { meetings.value = await meetingsApi.list() }

// ---- Carico capacità utente selezionato ----
watch(selectedUserId, async (uid) => {
  if (!uid) { capacityData.value = null; return }
  // Prepopola i form per la persona selezionata
  newAbsence.value.userId = uid
  newMeeting.value.userId = uid
  loadingCapacity.value = true
  try {
    const res = await fetch(`/api/capacity/${uid}?from=${getMonday()}&to=${getFriday4Weeks()}`)
    capacityData.value = await res.json()
  } catch { capacityData.value = null }
  loadingCapacity.value = false
})

function getMonday(): string {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}
function getFriday4Weeks(): string {
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 27)
  return d.toISOString().slice(0, 10)
}

function formatDateIT(iso: string) { const [y,m,d] = iso.split('-'); return `${d}/${m}` }
function dayName(iso: string) {
  const d = new Date(iso); return ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][d.getDay()]
}
function capacityColor(day: any): string {
  if (!day.isWorkingDay) return '#e9ecef'
  if (day.alert) return '#ef476f'
  const pct = day.netMinutes / 480
  if (pct > 0.7) return '#06d6a0'
  if (pct > 0.3) return '#ffd166'
  return '#ef476f'
}

function getUserLoad(user: User) {
  const ua = planningStore.getAssignmentsForUser(user.id)
  const scheduled = ua.filter(a => a.startDate && a.endDate)
  return { scheduled: scheduled.length, totalDays: scheduled.reduce((s,a) => s + (a.durationDays ?? 0), 0) }
}

function getUserAbsences(uid: string) { return absences.value.filter(a => a.userId === uid) }
function getUserMeetings(uid: string) { return meetings.value.filter(m => m.userId === uid || m.userId === null) }

const usersWithLoad = computed(() =>
  usersStore.users.map(u => ({ ...u, load: getUserLoad(u) }))
)

async function addAbsence() {
  if (!newAbsence.value.userId || !newAbsence.value.startDate) return
  const endDate = newAbsence.value.endDate || newAbsence.value.startDate
  await absencesApi.create({
    id: crypto.randomUUID(),
    userId: newAbsence.value.userId,
    startDate: newAbsence.value.startDate,
    endDate,
    type: newAbsence.value.type,
    halfDay: newAbsence.value.halfDay,
    notes: null,
  } as Absence)
  await loadAbsences()
  newAbsence.value.startDate = ''
  newAbsence.value.endDate = ''
}
async function removeAbsence(id: string) {
  await absencesApi.delete(id); await loadAbsences()
}
async function addMeeting() {
  if (!newMeeting.value.name) return
  await meetingsApi.create({
    id: crypto.randomUUID(),
    userId: newMeeting.value.userId || null,
    name: newMeeting.value.name,
    type: newMeeting.value.type,
    durationMinutes: newMeeting.value.durationMinutes,
    frequency: newMeeting.value.frequency,
    daysOfWeek: newMeeting.value.frequency === 'daily' ? [] : [...newMeeting.value.daysOfWeek],
  } as RecurringMeeting)
  await loadMeetings()
  newMeeting.value.name = ''
  newMeeting.value.daysOfWeek = []
}
async function removeMeeting(id: string) {
  await meetingsApi.delete(id); await loadMeetings()
}

const absenceTypes = ['vacation','sick','permit','training','other']
const meetingTypes = ['standup','refinement','sprint_planning','retrospective','one_on_one','custom']
const frequencies = ['daily','weekly','biweekly','monthly']
const dayCheckboxes = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Gio' },
  { value: 5, label: 'Ven' },
]
const weekdayNames: Record<number, string> = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Gio', 5: 'Ven', 6: 'Sab' }

function toggleDay(day: number) {
  const idx = newMeeting.value.daysOfWeek.indexOf(day)
  if (idx >= 0) newMeeting.value.daysOfWeek.splice(idx, 1)
  else newMeeting.value.daysOfWeek.push(day)
}
</script>

<template>
  <div class="capacity-view">
    <h2>📊 Capacità Team</h2>

    <!-- Griglia utenti con click per dettaglio -->
    <div v-if="usersStore.users.length === 0" class="empty-state">
      <p>Nessun utente. Vai in <router-link to="/settings">Impostazioni</router-link>.</p>
    </div>
    <div v-else class="capacity-grid">
      <div v-for="user in usersWithLoad" :key="user.id"
        class="user-card" :class="{ selected: selectedUserId === user.id }"
        @click="selectedUserId = selectedUserId === user.id ? null : user.id">
        <div class="user-name">{{ user.displayName }}
          <span class="role-badge" v-for="r in user.planningRoles" :key="r">{{ r }}</span>
        </div>
        <div class="user-stats">
          <span><strong>{{ user.load.scheduled }}</strong> ticket</span>
          <span><strong>{{ user.load.totalDays }}</strong> giorni</span>
          <span><strong>{{ Math.round(user.dailyWorkingMinutes/60) }}h</strong>/giorno</span>
        </div>
      </div>
    </div>

    <!-- Heatmap capacità per utente selezionato -->
    <section v-if="capacityData" class="section">
      <h3>🗓️ Heatmap — {{ capacityData.displayName }}</h3>
      <div class="heatmap">
        <div v-for="day in capacityData.days" :key="day.date"
          class="heatmap-cell" :style="{ background: capacityColor(day) }"
          :title="`${dayName(day.date)} ${formatDateIT(day.date)}: ${day.netMinutes}min netti`">
          <span class="heatmap-date">{{ formatDateIT(day.date) }}</span>
          <span class="heatmap-value" v-if="day.isWorkingDay">{{ Math.round(day.netMinutes/60) }}h</span>
          <span class="heatmap-value" v-else>—</span>
        </div>
      </div>

      <!-- Dettaglio legenda -->
      <div class="legend">
        <span class="legend-item"><span class="dot" style="background:#06d6a0" /> &gt;70% cap.</span>
        <span class="legend-item"><span class="dot" style="background:#ffd166" /> 30-70%</span>
        <span class="legend-item"><span class="dot" style="background:#ef476f" /> &lt;30% / alert</span>
        <span class="legend-item"><span class="dot" style="background:#e9ecef" /> Non lavorativo</span>
      </div>

      <!-- Dettaglio giorni alert -->
      <div v-if="capacityData.days.filter((d:any)=>d.alert).length > 0" class="alert-section">
        <h4>⚠️ Giorni critici</h4>
        <div v-for="day in capacityData.days.filter((d:any)=>d.alert && d.isWorkingDay)" :key="day.date" class="alert-row">
          <strong>{{ dayName(day.date) }} {{ formatDateIT(day.date) }}</strong>:
          capacità 0 — {{ day.absenceType ? `assenza (${day.absenceType})` : 'meeting saturano la giornata' }}
        </div>
      </div>
    </section>

    <!-- Gestione Assenze -->
    <section class="section">
      <h3>🏖️ Assenze</h3>
      <form class="form-row" @submit.prevent="addAbsence">
        <select v-model="newAbsence.userId" class="input">
          <option value="">— Persona —</option>
          <option v-for="u in usersStore.users" :key="u.id" :value="u.id">{{ u.displayName }}</option>
        </select>
        <label class="input-label">Da</label>
        <input v-model="newAbsence.startDate" type="date" class="input" />
        <label class="input-label">A</label>
        <input v-model="newAbsence.endDate" type="date" class="input" />
        <select v-model="newAbsence.type" class="input input-sm">
          <option v-for="t in absenceTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <label class="checkbox-label"><input type="checkbox" v-model="newAbsence.halfDay" /> ½ giorno</label>
        <button class="btn btn-primary" type="submit">Aggiungi</button>
      </form>
      <div class="list">
        <div v-for="a in absences" :key="a.id" class="list-item">
          <span>
            <strong>{{ formatDateIT(a.startDate) }}<template v-if="a.startDate !== a.endDate"> — {{ formatDateIT(a.endDate) }}</template></strong>
            — {{ usersStore.users.find(u=>u.id===a.userId)?.displayName ?? a.userId }}
            <span class="badge">{{ a.type }}{{ a.halfDay ? ' (½)' : '' }}</span>
          </span>
          <button class="btn-icon btn-icon-danger" @click="removeAbsence(a.id)"><i class="pi pi-trash" /></button>
        </div>
        <div v-if="absences.length===0" class="text-muted">Nessuna assenza</div>
      </div>
    </section>

    <!-- Gestione Meeting Ricorrenti -->
    <section class="section">
      <h3>📅 Meeting Ricorrenti</h3>
      <form class="form-row" @submit.prevent="addMeeting">
        <input v-model="newMeeting.name" placeholder="Nome meeting" class="input" />
        <select v-model="newMeeting.type" class="input input-sm">
          <option v-for="t in meetingTypes" :key="t" :value="t">{{ t }}</option>
        </select>
        <input v-model.number="newMeeting.durationMinutes" type="number" min="5" max="480" class="input input-xs" placeholder="min" />
        <span class="text-muted">min</span>
        <select v-model="newMeeting.frequency" class="input input-sm">
          <option v-for="f in frequencies" :key="f" :value="f">{{ f }}</option>
        </select>
        <div v-if="newMeeting.frequency !== 'daily'" class="day-checkboxes">
          <label v-for="dc in dayCheckboxes" :key="dc.value" class="checkbox-label">
            <input type="checkbox" :checked="newMeeting.daysOfWeek.includes(dc.value)" @change="toggleDay(dc.value)" />
            {{ dc.label }}
          </label>
        </div>
        <select v-model="newMeeting.userId" class="input input-sm">
          <option value="">👥 Team</option>
          <option v-for="u in usersStore.users" :key="u.id" :value="u.id">{{ u.displayName }}</option>
        </select>
        <button class="btn btn-primary" type="submit">Aggiungi</button>
      </form>
      <div class="list">
        <div v-for="m in meetings" :key="m.id" class="list-item">
          <span>
            <strong>{{ m.name }}</strong> — {{ m.durationMinutes }}min {{ m.frequency }}
            <span v-if="m.daysOfWeek && m.daysOfWeek.length > 0" class="badge">{{ m.daysOfWeek.map(d => weekdayNames[d] || '?').join(', ') }}</span>
            <span class="badge">{{ m.userId ? (usersStore.users.find(u=>u.id===m.userId)?.displayName ?? m.userId) : '👥 Team' }}</span>
          </span>
          <button class="btn-icon btn-icon-danger" @click="removeMeeting(m.id)"><i class="pi pi-trash" /></button>
        </div>
        <div v-if="meetings.length===0" class="text-muted">Nessun meeting ricorrente</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.capacity-view { display: flex; flex-direction: column; gap: 1.25rem; }
.capacity-view h2 { font-size: 1.3rem; }
.empty-state { text-align: center; padding: 2rem; color: #999; }
.empty-state a { color: #4361ee; }
.capacity-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; }
.user-card {
  background: white; border-radius: 8px; padding: 0.85rem; cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08); border: 2px solid transparent; transition: border-color .2s;
}
.user-card:hover { border-color: #4361ee33; }
.user-card.selected { border-color: #4361ee; }
.user-name { font-weight: 600; font-size: 0.95rem; margin-bottom: 0.35rem; }
.user-stats { display: flex; gap: 1rem; font-size: 0.8rem; color: #666; }
.role-badge { background: #e9ecef; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 600; color: #555; margin-left: 0.35rem; }

.section { background: white; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.section h3 { font-size: 1rem; margin-bottom: 0.75rem; }

.heatmap { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 0.75rem; }
.heatmap-cell {
  width: 52px; height: 44px; border-radius: 4px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; font-size: 0.6rem; color: white; cursor: default;
}
.heatmap-date { font-weight: 600; }
.heatmap-value { font-size: 0.7rem; }
.legend { display: flex; gap: 1rem; font-size: 0.75rem; color: #666; }
.legend-item { display: flex; align-items: center; gap: 0.3rem; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

.alert-section { margin-top: 0.75rem; background: #fff3e0; border-radius: 6px; padding: 0.75rem; }
.alert-section h4 { font-size: 0.85rem; margin-bottom: 0.5rem; }
.alert-row { font-size: 0.8rem; margin-bottom: 0.25rem; }

.form-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; align-items: center; }
.input { padding: 0.4rem 0.7rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.82rem; outline: none; }
.input:focus { border-color: #4361ee; }
.input-sm { max-width: 130px; }
.input-xs { max-width: 65px; }
.list { display: flex; flex-direction: column; gap: 0.4rem; }
.list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.7rem; background: #f8f9fa; border-radius: 6px; font-size: 0.82rem; }
.btn { padding: 0.45rem 0.9rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.82rem; }
.btn-primary { background: #4361ee; color: white; }
.btn-primary:hover { background: #3a56d4; }
.btn-icon { background: none; border: none; cursor: pointer; color: #999; padding: 0.4rem; min-width: 28px; min-height: 28px; display: flex; align-items: center; justify-content: center; }
.btn-icon-danger:hover { color: #ef476f; }
.btn-icon i { pointer-events: none; }
.badge { background: #e9ecef; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.68rem; color: #555; margin-left: 0.25rem; }
.text-muted { color: #999; font-size: 0.82rem; }
.checkbox-label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.82rem; }
.day-checkboxes { display: flex; gap: 0.5rem; align-items: center; }
.input-label { font-size: 0.82rem; color: #666; white-space: nowrap; }
</style>

