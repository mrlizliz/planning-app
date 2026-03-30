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
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f8f9fa;
  color: #1a1a2e;
}

.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background: #1a1a2e;
  color: white;
  padding: 0 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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

/* Dark mode */
:root.dark body {
  background: #121212;
  color: #e0e0e0;
}
:root.dark .app-header {
  background: #0d0d1a;
}
:root.dark .ticket-table-container,
:root.dark .gantt-container,
:root.dark .stats-bar {
  background: #1e1e2e;
  color: #e0e0e0;
}
:root.dark .ticket-table th {
  background: #252538;
  color: #aaa;
}
:root.dark .ticket-table td {
  border-bottom-color: #2a2a3e;
}
:root.dark .ticket-table tr:hover td {
  background: #2a2a3e;
}
</style>

