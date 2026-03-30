<script setup lang="ts">
import type { PlanningAlert } from '@planning/shared'

defineProps<{
  alerts: PlanningAlert[]
}>()

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error': return '🔴'
    case 'warning': return '⚠️'
    case 'info': return 'ℹ️'
    default: return '📌'
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'overallocation': return 'Sovrallocazione'
    case 'late_for_release': return 'Ritardo Release'
    case 'blocking_dependency': return 'Dipendenza Bloccante'
    case 'missing_estimate': return 'Stima Mancante'
    case 'capacity_shortage': return 'Capacità Insufficiente'
    case 'dependency_cycle': return 'Ciclo Dipendenze'
    default: return type
  }
}
</script>

<template>
  <div v-if="alerts.length > 0" class="alerts-banner">
    <div class="alerts-header">
      <h3>🔔 Alert ({{ alerts.length }})</h3>
    </div>
    <div class="alerts-list">
      <div
        v-for="alert in alerts"
        :key="alert.id"
        class="alert-item"
        :class="`alert-${alert.severity}`"
      >
        <span class="alert-icon">{{ getSeverityIcon(alert.severity) }}</span>
        <span class="alert-type">{{ getTypeLabel(alert.type) }}</span>
        <span class="alert-message">{{ alert.message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alerts-banner {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}
.alerts-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
}
.alerts-header h3 {
  font-size: 0.95rem;
  margin: 0;
}
.alerts-list {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  max-height: 300px;
  overflow-y: auto;
}
.alert-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.82rem;
}
.alert-error {
  background: #fff5f5;
  border-left: 3px solid #d00000;
}
.alert-warning {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
}
.alert-info {
  background: #f0f9ff;
  border-left: 3px solid #4361ee;
}
.alert-icon {
  font-size: 1rem;
  flex-shrink: 0;
}
.alert-type {
  font-weight: 600;
  white-space: nowrap;
  color: #555;
}
.alert-message {
  color: #333;
}
</style>

