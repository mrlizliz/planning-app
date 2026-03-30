<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref, onMounted, watch } from 'vue'
import Toast from 'primevue/toast'

const isDark = ref(false)

onMounted(() => {
  isDark.value = localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  applyTheme()
})

watch(isDark, () => {
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  applyTheme()
})

function applyTheme() {
  document.documentElement.classList.toggle('dark', isDark.value)
}

function toggleDark() {
  isDark.value = !isDark.value
}
</script>

<template>
  <div class="app-layout">
    <Toast position="top-right" />
    <header class="app-header">
      <div class="header-left">
        <h1>📋 Planning App</h1>
      </div>
      <nav class="header-nav">
        <router-link to="/" class="nav-link">
          <i class="pi pi-calendar" /> Planning
        </router-link>
        <router-link to="/tickets" class="nav-link">
          <i class="pi pi-list" /> Ticket
        </router-link>
        <router-link to="/capacity" class="nav-link">
          <i class="pi pi-chart-bar" /> Capacità
        </router-link>
        <router-link to="/releases" class="nav-link">
          <i class="pi pi-flag" /> Release
        </router-link>
        <router-link to="/reports" class="nav-link">
          <i class="pi pi-chart-line" /> Report
        </router-link>
        <router-link to="/settings" class="nav-link">
          <i class="pi pi-cog" /> Impostazioni
        </router-link>
      </nav>
      <button class="theme-toggle" @click="toggleDark" :title="isDark ? 'Tema chiaro' : 'Tema scuro'">
        <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" />
      </button>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* ============================================================
   CSS Custom Properties — Design Tokens
   ============================================================ */
:root {
  /* Superfici */
  --bg-body: #f8f9fa;
  --bg-card: #ffffff;
  --bg-card-alt: #f8f9fa;
  --bg-header: #1a1a2e;
  --bg-input: #ffffff;
  --bg-hover: #f0f0f0;

  /* Bordi */
  --border-color: #e0e0e0;
  --border-light: #f0f0f0;

  /* Testo */
  --text-primary: #1a1a2e;
  --text-secondary: #666666;
  --text-muted: #999999;
  --text-on-dark: #ffffff;

  /* Badge / chip */
  --badge-bg: #e9ecef;
  --badge-text: #555555;

  /* Accento */
  --accent: #4361ee;
  --accent-hover: #3a56d4;

  /* Gantt */
  --gantt-day-bg: #fafafa;
  --gantt-weekend-bg: #f0f0f0;
  --gantt-today-bg: #e3f2fd;
  --gantt-border: #f0f0f0;

  /* Ombra */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.15);

  /* Transizione tema */
  --transition-theme: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

:root.dark {
  --bg-body: #0f0f17;
  --bg-card: #1a1a2e;
  --bg-card-alt: #22223a;
  --bg-header: #0d0d1a;
  --bg-input: #22223a;
  --bg-hover: #2a2a44;

  --border-color: #2e2e4a;
  --border-light: #252540;

  --text-primary: #e4e4ef;
  --text-secondary: #a0a0b8;
  --text-muted: #6a6a88;

  --badge-bg: #2a2a44;
  --badge-text: #b0b0c8;

  --gantt-day-bg: #1e1e32;
  --gantt-weekend-bg: #181828;
  --gantt-today-bg: #1a2744;
  --gantt-border: #252540;

  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.4);
}

/* ============================================================
   Global reset + base
   ============================================================ */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-body);
  color: var(--text-primary);
  transition: var(--transition-theme);
}

/* ============================================================
   Layout
   ============================================================ */
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: var(--bg-header);
  color: var(--text-on-dark);
  padding: 0 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: var(--shadow-md);
  transition: var(--transition-theme);
}

.header-left h1 {
  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
}

.header-nav {
  display: flex;
  gap: 0.25rem;
}

.nav-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s;
}
.nav-link:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}
.nav-link.router-link-active {
  color: white;
  background: rgba(255, 255, 255, 0.15);
}

.app-main {
  flex: 1;
  padding: 1.5rem;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
}

.theme-toggle {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.7);
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  margin-left: auto;
  transition: all 0.15s;
}
.theme-toggle:hover {
  color: white;
  background: rgba(255, 255, 255, 0.2);
}

/* ============================================================
   Global dark-mode overrides for all views/components
   Usa le CSS variables — tutti i componenti che usano
   white / #f8f9fa / #e9ecef / #ddd ecc. vengono coperti.
   ============================================================ */

/* --- Section card (usato in Capacity, Releases, Reports, Settings) --- */
.section {
  background: var(--bg-card) !important;
  box-shadow: var(--shadow-sm) !important;
  transition: var(--transition-theme);
}

/* --- Stats bar (TicketsView) --- */
.stats-bar {
  background: var(--bg-card) !important;
  box-shadow: var(--shadow-sm) !important;
  transition: var(--transition-theme);
}

/* --- User cards (CapacityView) --- */
.user-card {
  background: var(--bg-card) !important;
  box-shadow: var(--shadow-sm) !important;
  transition: var(--transition-theme);
}

/* --- List items --- */
.list-item {
  background: var(--bg-card-alt) !important;
  transition: var(--transition-theme);
}

/* --- KPI cards (ReportsView) --- */
.kpi-card {
  background: var(--bg-card-alt) !important;
  transition: var(--transition-theme);
}

/* --- Scenario cards --- */
.scenario-card {
  background: var(--bg-card-alt) !important;
  transition: var(--transition-theme);
}

/* --- Inputs & selects --- */
.input, .filter-input, .filter-select, .inline-select,
.scenario-create input {
  background: var(--bg-input) !important;
  color: var(--text-primary) !important;
  border-color: var(--border-color) !important;
  transition: var(--transition-theme);
}
.input:focus, .filter-input:focus, .filter-select:focus {
  border-color: var(--accent) !important;
}

/* --- Badges --- */
.badge, .role-badge, .mini-badge, .fv-badge, .phase-badge {
  background: var(--badge-bg) !important;
  color: var(--badge-text) !important;
  transition: var(--transition-theme);
}
/* Colored badges mantengono i colori in entrambi i temi */
.badge-on_track { background: #d4edda !important; color: #155724 !important; }
.badge-at_risk { background: #fff3cd !important; color: #856404 !important; }
.badge-delayed { background: #f8d7da !important; color: #721c24 !important; }
:root.dark .badge-on_track { background: #1a3a2a !important; color: #5cb85c !important; }
:root.dark .badge-at_risk { background: #3a3020 !important; color: #f0ad4e !important; }
:root.dark .badge-delayed { background: #3a1a1a !important; color: #d9534f !important; }

/* --- Text colors --- */
.text-muted { color: var(--text-muted) !important; }
.stat-label { color: var(--text-muted) !important; }
.user-stats { color: var(--text-secondary) !important; }
.kpi-label { color: var(--text-secondary) !important; }
.scenario-meta { color: var(--text-muted) !important; }
.scenario-desc { color: var(--text-secondary) !important; }
.empty-msg { color: var(--text-muted) !important; }

/* Page headers */
.page-header h2 { color: var(--text-primary); }
.section h3 { color: var(--text-primary); }
.input-label { color: var(--text-secondary) !important; }

/* --- Buttons secondari --- */
.btn-secondary, .btn-cancel {
  background: var(--badge-bg) !important;
  color: var(--text-primary) !important;
  transition: var(--transition-theme);
}
.btn-secondary:hover, .btn-cancel:hover {
  background: var(--bg-hover) !important;
}
.btn-outline {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
  transition: var(--transition-theme);
}
.btn-outline:hover {
  background: var(--bg-hover) !important;
}
.btn-icon { color: var(--text-muted) !important; }

/* --- Ticket table --- */
.ticket-table-container {
  background: var(--bg-card) !important;
  transition: var(--transition-theme);
}
.ticket-table th {
  background: var(--bg-card-alt) !important;
  color: var(--text-secondary) !important;
  border-bottom-color: var(--border-color) !important;
  transition: var(--transition-theme);
}
.ticket-table td {
  border-bottom-color: var(--border-light) !important;
  transition: var(--transition-theme);
}
.ticket-table tr:hover td {
  background: var(--bg-hover) !important;
}
.jira-link code { color: var(--accent) !important; }
.assignee { color: var(--text-primary) !important; }

/* --- Forecast table --- */
.forecast-table th {
  background: var(--bg-card-alt) !important;
  color: var(--text-secondary) !important;
}
.forecast-table td {
  border-bottom-color: var(--border-light) !important;
}
:root.dark .forecast-table tr.shortage {
  background: #2a1a1a !important;
}

/* --- Gantt --- */
.gantt-container {
  background: var(--bg-card) !important;
  box-shadow: var(--shadow-sm) !important;
  transition: var(--transition-theme);
}
.name-col {
  background: var(--bg-card) !important;
  border-right-color: var(--border-color) !important;
  transition: var(--transition-theme);
}
.day-header {
  background: var(--gantt-day-bg) !important;
  border-right-color: var(--gantt-border) !important;
  color: var(--text-secondary) !important;
  transition: var(--transition-theme);
}
.day-header.weekend {
  background: var(--gantt-weekend-bg) !important;
  color: var(--text-muted) !important;
}
.day-header.today {
  background: var(--gantt-today-bg) !important;
}
.day-num { color: var(--text-muted) !important; }
.user-row {
  border-bottom-color: var(--border-light) !important;
}
.user-name { color: var(--text-primary) !important; }
.day-cell {
  border-right-color: var(--gantt-border) !important;
  transition: var(--transition-theme);
}
.day-cell.weekend {
  background: var(--gantt-weekend-bg) !important;
}
.day-cell.today {
  background: color-mix(in srgb, var(--gantt-today-bg) 40%, transparent) !important;
}
.empty-row { color: var(--text-muted) !important; }

/* --- Alerts banner --- */
:root.dark .alerts-banner {
  background: #1e1e32;
  border-color: #2e2e4a;
}
:root.dark .alert-item {
  background: #22223a;
}

/* --- Heatmap (CapacityView) --- */
:root.dark .alert-section {
  background: #2a2218 !important;
}

/* --- JiraSyncDialog backdrop --- */
:root.dark .dialog-overlay {
  background: rgba(0, 0, 0, 0.7);
}
:root.dark .dialog {
  background: var(--bg-card);
  color: var(--text-primary);
}
:root.dark .dialog-header {
  border-bottom-color: var(--border-color);
}

/* --- Empty states --- */
.empty-state h3 { color: var(--text-secondary) !important; }
.empty-state p { color: var(--text-muted) !important; }
.empty-state a { color: var(--accent) !important; }

/* --- Scrollbar dark --- */
:root.dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
:root.dark ::-webkit-scrollbar-track {
  background: var(--bg-body);
}
:root.dark ::-webkit-scrollbar-thumb {
  background: #3a3a5a;
  border-radius: 4px;
}
:root.dark ::-webkit-scrollbar-thumb:hover {
  background: #4a4a6a;
}

/* --- Warning popover (TicketTable Teleport) --- */
:root.dark .warning-popover {
  background: var(--bg-card);
  border-color: var(--border-color);
  color: var(--text-primary);
}
:root.dark .popover-header {
  border-bottom-color: var(--border-light);
}
:root.dark .popover-list li {
  color: var(--text-secondary);
  border-bottom-color: var(--border-light);
}

/* --- OverallocationBanner --- */
:root.dark .overallocation-banner {
  background: #2a1a1a;
  border-color: #4a2020;
}
</style>

