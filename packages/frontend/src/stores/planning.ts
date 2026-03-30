import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Assignment } from '@planning/shared'
import { assignmentsApi, schedulerApi } from '../api/client.js'

export const usePlanningStore = defineStore('planning', () => {
  const assignments = ref<Assignment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastScheduleResult = ref<any>(null)

  async function fetchAssignments() {
    loading.value = true
    error.value = null
    try {
      assignments.value = await assignmentsApi.list()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createAssignment(assignment: Assignment) {
    try {
      const created = await assignmentsApi.create(assignment)
      assignments.value.push(created)
      return created
    } catch (e) {
      error.value = (e as Error).message
      throw e
    }
  }

  async function updateAssignment(id: string, data: Partial<Assignment>) {
    try {
      const updated = await assignmentsApi.update(id, data)
      const idx = assignments.value.findIndex((a) => a.id === id)
      if (idx !== -1) assignments.value[idx] = updated
      return updated
    } catch (e) {
      error.value = (e as Error).message
      throw e
    }
  }

  async function runScheduler(planningStartDate?: string) {
    loading.value = true
    error.value = null
    try {
      const result = await schedulerApi.run(planningStartDate)
      lastScheduleResult.value = result
      await fetchAssignments() // Ricarica con date aggiornate
      return result
    } catch (e) {
      error.value = (e as Error).message
      throw e
    } finally {
      loading.value = false
    }
  }

  function getAssignmentsForTicket(ticketId: string) {
    return assignments.value.filter((a) => a.ticketId === ticketId)
  }

  function getAssignmentsForUser(userId: string) {
    return assignments.value.filter((a) => a.userId === userId)
  }

  return {
    assignments,
    loading,
    error,
    lastScheduleResult,
    fetchAssignments,
    createAssignment,
    updateAssignment,
    runScheduler,
    getAssignmentsForTicket,
    getAssignmentsForUser,
  }
})

