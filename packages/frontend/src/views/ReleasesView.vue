<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { milestonesApi, releasesApi, deployApi } from '../api/client.js'
import type { Milestone, Release, DeploymentDay, DeploymentWindow } from '@planning/shared'

const milestones = ref<any[]>([])
const releases = ref<any[]>([])
const deployDays = ref<DeploymentDay[]>([])
const deployWindows = ref<DeploymentWindow[]>([])

// Forms
const newMs = ref({ name: '', targetDate: '', description: '' })
const newRel = ref({ name: '', targetDate: '', description: '' })
const newDeploy = ref({ environment: 'dev' as const, dayOfWeek: 2 })
const newWindow = ref({ environment: 'prod' as const, date: '', allowed: true, notes: '' })

onMounted(async () => {
  await Promise.all([loadMilestones(), loadReleases(), loadDeploy()])
})

async function loadMilestones() { milestones.value = await milestonesApi.list() }
async function loadReleases() { releases.value = await releasesApi.list() }
async function loadDeploy() {
  deployDays.value = await deployApi.days.list()
  deployWindows.value = await deployApi.windows.list()
}

async function addMilestone() {
  if (!newMs.value.name || !newMs.value.targetDate) return
  const now = new Date().toISOString()
  await milestonesApi.create({
    id: crypto.randomUUID(), name: newMs.value.name,
    description: newMs.value.description || null,
    targetDate: newMs.value.targetDate, status: 'on_track',
    createdAt: now, updatedAt: now,
  })
  newMs.value = { name: '', targetDate: '', description: '' }
  await loadMilestones()
}

async function removeMilestone(id: string) { await milestonesApi.delete(id); await loadMilestones() }

async function addRelease() {
  if (!newRel.value.name || !newRel.value.targetDate) return
  const now = new Date().toISOString()
  await releasesApi.create({
    id: crypto.randomUUID(), name: newRel.value.name,
    description: newRel.value.description || null,
    targetDate: newRel.value.targetDate, forecastDate: null,
    createdAt: now, updatedAt: now,
  })
  newRel.value = { name: '', targetDate: '', description: '' }
  await loadReleases()
}

async function removeRelease(id: string) { await releasesApi.delete(id); await loadReleases() }

async function addDeployDay() {
  await deployApi.days.create({
    id: crypto.randomUUID(),
    environment: newDeploy.value.environment,
    dayOfWeek: newDeploy.value.dayOfWeek,
    active: true,
  })
  await loadDeploy()
}

async function removeDeployDay(id: string) { await deployApi.days.delete(id); await loadDeploy() }

async function addDeployWindow() {
  if (!newWindow.value.date) return
  await deployApi.windows.create({
    id: crypto.randomUUID(),
    environment: newWindow.value.environment,
    date: newWindow.value.date,
    allowed: newWindow.value.allowed,
    notes: newWindow.value.notes || null,
  })
  newWindow.value = { environment: 'prod', date: '', allowed: true, notes: '' }
  await loadDeploy()
}

async function removeDeployWindow(id: string) { await deployApi.windows.delete(id); await loadDeploy() }

function formatDateIT(iso: string) { const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}` }
function statusIcon(s: string) { return s === 'on_track' ? '✅' : s === 'at_risk' ? '⚠️' : '🔴' }
const weekdays = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']
</script>

<template>
  <div class="releases-view">
    <h2>🚀 Release & Milestone</h2>

    <!-- Milestones -->
    <section class="section">
      <h3>🎯 Milestone</h3>
      <form class="form-row" @submit.prevent="addMilestone">
        <input v-model="newMs.name" placeholder="Nome milestone" class="input" />
        <input v-model="newMs.targetDate" type="date" class="input" />
        <input v-model="newMs.description" placeholder="Descrizione (opz.)" class="input" />
        <button class="btn btn-primary" type="submit">Aggiungi</button>
      </form>
      <div class="list">
        <div v-for="ms in milestones" :key="ms.id" class="list-item">
          <div>
            <span class="status-icon">{{ statusIcon(ms.status) }}</span>
            <strong>{{ ms.name }}</strong>
            <span class="text-muted"> — target {{ formatDateIT(ms.targetDate) }}</span>
            <span class="badge" :class="'badge-' + ms.status">{{ ms.status }}</span>
          </div>
          <button class="btn-icon btn-icon-danger" @click="removeMilestone(ms.id)"><i class="pi pi-trash" /></button>
        </div>
        <div v-if="milestones.length===0" class="text-muted">Nessuna milestone</div>
      </div>
    </section>

    <!-- Releases -->
    <section class="section">
      <h3>📦 Release</h3>
      <form class="form-row" @submit.prevent="addRelease">
        <input v-model="newRel.name" placeholder="Nome release" class="input" />
        <input v-model="newRel.targetDate" type="date" class="input" />
        <input v-model="newRel.description" placeholder="Descrizione (opz.)" class="input" />
        <button class="btn btn-primary" type="submit">Aggiungi</button>
      </form>
      <div class="list">
        <div v-for="rel in releases" :key="rel.id" class="list-item">
          <div>
            <strong>{{ rel.name }}</strong>
            <span class="text-muted"> — target {{ formatDateIT(rel.targetDate) }}</span>
            <span v-if="rel.forecastDate" class="badge"
              :class="rel.forecastDate > rel.targetDate ? 'badge-delayed' : 'badge-on_track'">
              forecast {{ formatDateIT(rel.forecastDate) }}
            </span>
            <span v-else class="badge">nessun ticket</span>
          </div>
          <button class="btn-icon btn-icon-danger" @click="removeRelease(rel.id)"><i class="pi pi-trash" /></button>
        </div>
        <div v-if="releases.length===0" class="text-muted">Nessuna release</div>
      </div>
    </section>

    <!-- Deploy Days -->
    <section class="section">
      <h3>📅 Giorni di Deploy</h3>
      <form class="form-row" @submit.prevent="addDeployDay">
        <select v-model="newDeploy.environment" class="input input-sm">
          <option value="dev">DEV</option>
          <option value="prod">PROD</option>
        </select>
        <select v-model.number="newDeploy.dayOfWeek" class="input input-sm">
          <option v-for="(name, i) in weekdays" :key="i" :value="i">{{ name }}</option>
        </select>
        <button class="btn btn-primary" type="submit">Aggiungi</button>
      </form>
      <div class="list">
        <div v-for="dd in deployDays" :key="dd.id" class="list-item">
          <div>
            <span class="badge" :class="dd.environment === 'prod' ? 'badge-delayed' : 'badge-on_track'">
              {{ dd.environment.toUpperCase() }}
            </span>
            <strong>{{ weekdays[dd.dayOfWeek] }}</strong>
            <span v-if="!dd.active" class="text-muted"> (disabilitato)</span>
          </div>
          <button class="btn-icon btn-icon-danger" @click="removeDeployDay(dd.id)"><i class="pi pi-trash" /></button>
        </div>
        <div v-if="deployDays.length===0" class="text-muted">Nessun giorno di deploy configurato</div>
      </div>
    </section>

    <!-- Deploy Windows -->
    <section class="section">
      <h3>🪟 Finestre Deploy (override)</h3>
      <form class="form-row" @submit.prevent="addDeployWindow">
        <select v-model="newWindow.environment" class="input input-sm">
          <option value="dev">DEV</option>
          <option value="prod">PROD</option>
        </select>
        <input v-model="newWindow.date" type="date" class="input" />
        <select v-model="newWindow.allowed" class="input input-sm">
          <option :value="true">✅ Consentito</option>
          <option :value="false">🚫 Bloccato</option>
        </select>
        <input v-model="newWindow.notes" placeholder="Note (opz.)" class="input" />
        <button class="btn btn-primary" type="submit">Aggiungi</button>
      </form>
      <div class="list">
        <div v-for="dw in deployWindows" :key="dw.id" class="list-item">
          <div>
            <span class="badge" :class="dw.environment === 'prod' ? 'badge-delayed' : 'badge-on_track'">
              {{ dw.environment.toUpperCase() }}
            </span>
            <strong>{{ formatDateIT(dw.date) }}</strong>
            <span>{{ dw.allowed ? '✅' : '🚫' }}</span>
            <span v-if="dw.notes" class="text-muted"> — {{ dw.notes }}</span>
          </div>
          <button class="btn-icon btn-icon-danger" @click="removeDeployWindow(dw.id)"><i class="pi pi-trash" /></button>
        </div>
        <div v-if="deployWindows.length===0" class="text-muted">Nessuna finestra override</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.releases-view { display: flex; flex-direction: column; gap: 1.25rem; }
.releases-view h2 { font-size: 1.3rem; }
.section { background: white; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
.section h3 { font-size: 1rem; margin-bottom: 0.75rem; }
.form-row { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; align-items: center; }
.input { padding: 0.4rem 0.7rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.82rem; outline: none; }
.input:focus { border-color: #4361ee; }
.input-sm { max-width: 120px; }
.list { display: flex; flex-direction: column; gap: 0.4rem; }
.list-item { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.7rem; background: #f8f9fa; border-radius: 6px; font-size: 0.82rem; }
.btn { padding: 0.45rem 0.9rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.82rem; }
.btn-primary { background: #4361ee; color: white; }
.btn-primary:hover { background: #3a56d4; }
.btn-icon { background: none; border: none; cursor: pointer; color: #999; padding: 0.4rem; min-width: 28px; min-height: 28px; display: flex; align-items: center; justify-content: center; }
.btn-icon-danger:hover { color: #ef476f; }
.btn-icon i { pointer-events: none; }
.badge { background: #e9ecef; padding: 0.1rem 0.5rem; border-radius: 4px; font-size: 0.7rem; color: #555; margin-left: 0.35rem; }
.badge-on_track { background: #d4edda; color: #155724; }
.badge-at_risk { background: #fff3cd; color: #856404; }
.badge-delayed { background: #f8d7da; color: #721c24; }
.text-muted { color: #999; font-size: 0.82rem; }
.status-icon { margin-right: 0.3rem; }
</style>

