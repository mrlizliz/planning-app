import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ticket } from '@planning/shared'
import { ticketsApi } from '../api/client.js'

export const useTicketsStore = defineStore('tickets', () => {
  const tickets = ref<Ticket[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const backlogTickets = computed(() => tickets.value.filter((t) => t.status === 'backlog'))
  const plannedTickets = computed(() => tickets.value.filter((t) => t.status === 'planned'))
  const ticketCount = computed(() => tickets.value.length)

  async function fetchTickets() {
    loading.value = true
    error.value = null
    try {
      tickets.value = await ticketsApi.list()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function updateTicket(id: string, data: Partial<Ticket>) {
    try {
      const updated = await ticketsApi.update(id, data)
      const idx = tickets.value.findIndex((t) => t.id === id)
      if (idx !== -1) tickets.value[idx] = updated
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  async function deleteTicket(id: string) {
    try {
      await ticketsApi.delete(id)
      tickets.value = tickets.value.filter((t) => t.id !== id)
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  async function syncFromJira(config: { baseUrl: string; email: string; apiToken: string; jql: string }) {
    loading.value = true
    error.value = null
    try {
      const result = await ticketsApi.syncJira(config)
      await fetchTickets() // Ricarica la lista completa
      return result
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    tickets,
    loading,
    error,
    backlogTickets,
    plannedTickets,
    ticketCount,
    fetchTickets,
    updateTicket,
    deleteTicket,
    syncFromJira,
  }
})

