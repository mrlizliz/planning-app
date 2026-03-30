<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useUsersStore } from '../stores/users.js'
import { usePlanningStore } from '../stores/planning.js'
import type { User } from '@planning/shared'

const usersStore = useUsersStore()
const planningStore = usePlanningStore()

onMounted(async () => {
  await Promise.all([
    usersStore.fetchUsers(),
    planningStore.fetchAssignments(),
  ])
})

function getUserLoad(user: User) {
  const userAssignments = planningStore.getAssignmentsForUser(user.id)
  const scheduled = userAssignments.filter((a) => a.startDate && a.endDate)
  const totalDays = scheduled.reduce((sum, a) => sum + (a.durationDays ?? 0), 0)
  return { scheduled: scheduled.length, totalDays }
}

const usersWithLoad = computed(() =>
  usersStore.users.map((u) => ({
    ...u,
    load: getUserLoad(u),
  }))
)
</script>

<template>
  <div class="capacity-view">
    <div class="page-header">
      <h2>📊 Capacità Team</h2>
    </div>

    <div v-if="usersStore.users.length === 0" class="empty-state">
      <i class="pi pi-users" style="font-size: 3rem; color: #ccc" />
      <h3>Nessun utente configurato</h3>
      <p>Vai nelle <router-link to="/settings">Impostazioni</router-link> per aggiungere persone al team.</p>
    </div>

    <div v-else class="capacity-grid">
      <div
        v-for="user in usersWithLoad"
        :key="user.id"
        class="user-card"
      >
        <div class="user-info">
          <div class="user-name">{{ user.displayName }}</div>
          <div class="user-role">
            <span v-for="role in user.planningRoles" :key="role" class="role-badge">
              {{ role.toUpperCase() }}
            </span>
          </div>
        </div>
        <div class="user-stats">
          <div class="user-stat">
            <span class="stat-value">{{ user.load.scheduled }}</span>
            <span class="stat-label">Ticket</span>
          </div>
          <div class="user-stat">
            <span class="stat-value">{{ user.load.totalDays }}</span>
            <span class="stat-label">Giorni</span>
          </div>
          <div class="user-stat">
            <span class="stat-value">{{ Math.round(user.dailyWorkingMinutes / 60) }}h</span>
            <span class="stat-label">Cap./giorno</span>
          </div>
        </div>
        <div class="capacity-bar">
          <div
            class="capacity-fill"
            :style="{
              width: Math.min(100, (user.load.totalDays / 20) * 100) + '%',
              background: user.load.totalDays > 15 ? '#ef476f' : user.load.totalDays > 10 ? '#ffd166' : '#06d6a0'
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capacity-view { display: flex; flex-direction: column; gap: 1rem; }
.page-header h2 { font-size: 1.3rem; }
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 4rem 2rem; text-align: center; gap: 0.75rem;
}
.empty-state h3 { color: #666; }
.empty-state a { color: #4361ee; }
.capacity-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
.user-card {
  background: white; border-radius: 8px; padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.user-info { margin-bottom: 0.75rem; }
.user-name { font-weight: 600; font-size: 1rem; }
.user-role { margin-top: 0.25rem; }
.role-badge {
  background: #e9ecef; padding: 0.15rem 0.5rem; border-radius: 4px;
  font-size: 0.7rem; font-weight: 600; color: #555;
}
.user-stats { display: flex; gap: 1.5rem; margin-bottom: 0.75rem; }
.user-stat { display: flex; flex-direction: column; align-items: center; }
.stat-value { font-size: 1.1rem; font-weight: 700; color: #333; }
.stat-label { font-size: 0.65rem; color: #999; text-transform: uppercase; }
.capacity-bar {
  background: #e9ecef; border-radius: 4px; height: 8px; overflow: hidden;
}
.capacity-fill {
  height: 100%; border-radius: 4px; transition: width 0.3s;
}
</style>

