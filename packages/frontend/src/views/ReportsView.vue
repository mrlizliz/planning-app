<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { PlanningKPIs, WeeklyCapacityForecast } from '@planning/shared'
import { kpisApi, forecastApi, reportsApi, scenariosApi } from '../api/client.js'

const kpis = ref<PlanningKPIs | null>(null)
const forecast = ref<WeeklyCapacityForecast[]>([])
const scenarios = ref<any[]>([])
const loading = ref(false)
const newScenarioName = ref('')

onMounted(async () => {
  loading.value = true
  try {
    const [k, f, s] = await Promise.all([
      kpisApi.get(),
      forecastApi.weekly(),
      scenariosApi.list(),
    ])
    kpis.value = k
    forecast.value = f
    scenarios.value = s
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function createScenario() {
  if (!newScenarioName.value.trim()) return
  try {
    const created = await scenariosApi.create(newScenarioName.value)
    scenarios.value.push(created)
    newScenarioName.value = ''
  } catch (e) {
    console.error(e)
  }
}

async function deleteScenario(id: string) {
  try {
    await scenariosApi.delete(id)
    scenarios.value = scenarios.value.filter((s) => s.id !== id)
  } catch (e) {
    console.error(e)
  }
}

async function promoteScenario(id: string) {
  try {
    await scenariosApi.promote(id)
    alert('Scenario promosso! Ricarica la pagina Planning per vedere le modifiche.')
  } catch (e) {
    console.error(e)
  }
}

async function downloadCSV(type: 'planning' | 'releases') {
  try {
    const csv = type === 'planning'
      ? await reportsApi.planning('csv')
      : await reportsApi.releases('csv')
    const blob = new Blob([csv as string], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error(e)
  }
}

function formatMinutes(min: number): string {
  const h = Math.round(min / 60)
  return `${h}h`
}

function getSaturationClass(pct: number): string {
  if (pct > 100) return 'sat-danger'
  if (pct > 80) return 'sat-warning'
  return 'sat-ok'
}
</script>

<template>
  <div class="reports-view">
    <div class="page-header">
      <h2>📊 Report & Scenari</h2>
    </div>

    <div v-if="loading" class="loading">Caricamento...</div>

    <template v-else>
      <!-- KPI Dashboard -->
      <section class="section">
        <h3>📈 KPI Planning</h3>
        <div v-if="kpis" class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-value" :class="getSaturationClass(kpis.overallSaturation)">{{ kpis.overallSaturation }}%</div>
            <div class="kpi-label">Saturazione Team</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">{{ kpis.plannedTicketRatio }}%</div>
            <div class="kpi-label">Ticket Pianificati</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value" :class="kpis.overallocationRate > 0 ? 'sat-danger' : 'sat-ok'">
              {{ kpis.overallocationRate }}%
            </div>
            <div class="kpi-label">Tasso Sovrallocazione</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">{{ kpis.ticketsWithoutEstimate }}</div>
            <div class="kpi-label">Senza Stima</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">{{ kpis.completedTickets }}/{{ kpis.totalTickets }}</div>
            <div class="kpi-label">Completati</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-value">{{ formatMinutes(kpis.totalPlannedMinutes) }}</div>
            <div class="kpi-label">Effort Pianificato</div>
          </div>
        </div>
      </section>

      <!-- Capacity Forecast -->
      <section class="section">
        <h3>📅 Capacity Forecast Settimanale</h3>
        <div v-if="forecast.length > 0" class="forecast-table-wrap">
          <table class="forecast-table">
            <thead>
              <tr>
                <th>Settimana</th>
                <th>Disponibili</th>
                <th>Pianificate</th>
                <th>Delta</th>
                <th>Saturazione</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in forecast" :key="w.weekStart" :class="{ shortage: w.hasShortage }">
                <td>{{ w.weekStart }}</td>
                <td>{{ formatMinutes(w.availableMinutes) }}</td>
                <td>{{ formatMinutes(w.plannedMinutes) }}</td>
                <td :class="w.deltaMinutes < 0 ? 'text-danger' : 'text-ok'">
                  {{ w.deltaMinutes >= 0 ? '+' : '' }}{{ formatMinutes(w.deltaMinutes) }}
                </td>
                <td>
                  <span class="sat-badge" :class="getSaturationClass(w.saturationPercent)">
                    {{ w.saturationPercent }}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-msg">Nessun dato di forecast disponibile</p>
      </section>

      <!-- Scenarios -->
      <section class="section">
        <h3>🔮 Scenari What-If</h3>
        <div class="scenario-create">
          <input
            v-model="newScenarioName"
            placeholder="Nome scenario..."
            @keyup.enter="createScenario"
          />
          <button class="btn btn-primary" @click="createScenario">Crea Scenario</button>
        </div>
        <div v-if="scenarios.length > 0" class="scenario-list">
          <div v-for="s in scenarios" :key="s.id" class="scenario-card">
            <div class="scenario-info">
              <strong>{{ s.name }}</strong>
              <span class="scenario-meta">{{ s.snapshot.assignments.length }} assignment</span>
              <span v-if="s.description" class="scenario-desc">{{ s.description }}</span>
            </div>
            <div class="scenario-actions">
              <button class="btn btn-sm btn-success" @click="promoteScenario(s.id)">Promuovi</button>
              <button class="btn btn-sm btn-danger" @click="deleteScenario(s.id)">Elimina</button>
            </div>
          </div>
        </div>
        <p v-else class="empty-msg">Nessuno scenario creato</p>
      </section>

      <!-- Export -->
      <section class="section">
        <h3>📥 Export Report</h3>
        <div class="export-buttons">
          <button class="btn btn-outline" @click="downloadCSV('planning')">
            📋 Planning Report (CSV)
          </button>
          <button class="btn btn-outline" @click="downloadCSV('releases')">
            🚀 Release Report (CSV)
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.reports-view { display: flex; flex-direction: column; gap: 1.5rem; }
.page-header h2 { font-size: 1.3rem; }
.loading { text-align: center; padding: 3rem; color: #999; }
.section {
  background: white; border-radius: 8px; padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.section h3 { font-size: 1rem; margin-bottom: 1rem; }

.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
.kpi-card {
  background: #f8f9fa; border-radius: 8px; padding: 1rem; text-align: center;
}
.kpi-value { font-size: 1.6rem; font-weight: 700; }
.kpi-label { font-size: 0.75rem; color: #666; margin-top: 0.25rem; }
.sat-ok { color: #06d6a0; }
.sat-warning { color: #f59e0b; }
.sat-danger { color: #d00000; }

.forecast-table-wrap { overflow-x: auto; }
.forecast-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.forecast-table th { background: #f0f0f0; padding: 0.5rem; text-align: left; }
.forecast-table td { padding: 0.5rem; border-bottom: 1px solid #f0f0f0; }
.forecast-table tr.shortage { background: #fff5f5; }
.text-danger { color: #d00000; font-weight: 600; }
.text-ok { color: #06d6a0; }
.sat-badge {
  padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;
}

.scenario-create { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.scenario-create input {
  flex: 1; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.85rem;
}
.scenario-list { display: flex; flex-direction: column; gap: 0.5rem; }
.scenario-card {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem; background: #f8f9fa; border-radius: 6px;
}
.scenario-info { display: flex; flex-direction: column; gap: 0.15rem; }
.scenario-meta { font-size: 0.75rem; color: #999; }
.scenario-desc { font-size: 0.8rem; color: #666; }
.scenario-actions { display: flex; gap: 0.4rem; }

.export-buttons { display: flex; gap: 0.75rem; flex-wrap: wrap; }

.btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: all 0.15s; }
.btn-primary { background: #4361ee; color: white; }
.btn-primary:hover { background: #3a56d4; }
.btn-sm { padding: 0.3rem 0.6rem; font-size: 0.78rem; }
.btn-success { background: #06d6a0; color: white; }
.btn-danger { background: #d00000; color: white; }
.btn-outline { background: white; border: 1px solid #ddd; color: #333; }
.btn-outline:hover { background: #f0f0f0; }
.empty-msg { color: #999; font-size: 0.85rem; }
</style>

