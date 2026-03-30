import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { User } from '@planning/shared'
import { usersApi } from '../api/client.js'

export const useUsersStore = defineStore('users', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchUsers() {
    loading.value = true
    error.value = null
    try {
      users.value = await usersApi.list()
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function createUser(user: User) {
    try {
      const created = await usersApi.create(user)
      users.value.push(created)
      return created
    } catch (e) {
      error.value = (e as Error).message
      throw e
    }
  }

  async function deleteUser(id: string) {
    try {
      await usersApi.delete(id)
      users.value = users.value.filter((u) => u.id !== id)
    } catch (e) {
      error.value = (e as Error).message
    }
  }

  async function updateUser(id: string, data: Partial<User>) {
    try {
      const updated = await usersApi.update(id, data)
      const idx = users.value.findIndex((u) => u.id === id)
      if (idx !== -1) users.value[idx] = updated
      return updated
    } catch (e) {
      error.value = (e as Error).message
      throw e
    }
  }

  function getUserById(id: string) {
    return users.value.find((u) => u.id === id)
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUserById,
  }
})

