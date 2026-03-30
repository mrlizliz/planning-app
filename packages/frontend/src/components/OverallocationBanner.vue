<script setup lang="ts">
import type { User } from '@planning/shared'

defineProps<{
  overallocations: Array<{ userId: string; date: string; assignedMinutes: number; capacityMinutes: number }>
  users: User[]
}>()

function getUserName(userId: string, users: User[]) {
  return users.find((u) => u.id === userId)?.displayName ?? userId
}
</script>

<template>
  <div class="banner banner-warning">
    <div class="banner-icon">🚨</div>
    <div class="banner-content">
      <strong>Sovrallocazione rilevata</strong>
      <ul class="overalloc-list">
        <li v-for="(o, i) in overallocations" :key="i">
          <strong>{{ getUserName(o.userId, users) }}</strong> il {{ o.date }}
          — {{ Math.round(o.assignedMinutes / 60) }}h assegnate su {{ Math.round(o.capacityMinutes / 60) }}h disponibili
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.banner {
  display: flex; gap: 0.75rem; padding: 0.75rem 1rem;
  border-radius: 8px; font-size: 0.85rem; transition: var(--transition-theme);
}
.banner-warning {
  background: #fff3e0; border: 1px solid #ffe0b2; color: #e65100;
}
:root.dark .banner-warning {
  background: #2a2218; border-color: #4a3818; color: #f0ad4e;
}
.banner-icon { font-size: 1.2rem; }
.overalloc-list { margin: 0.25rem 0 0 1rem; padding: 0; }
.overalloc-list li { margin: 0.15rem 0; }
</style>

