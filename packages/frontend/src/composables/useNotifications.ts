// ============================================================
// Composable — Toast notifications globali
// ============================================================

import { useToast } from 'primevue/usetoast'

export function useNotifications() {
  const toast = useToast()

  function showSuccess(summary: string, detail?: string) {
    toast.add({ severity: 'success', summary, detail, life: 3000 })
  }

  function showError(summary: string, detail?: string) {
    toast.add({ severity: 'error', summary, detail, life: 5000 })
  }

  function showWarn(summary: string, detail?: string) {
    toast.add({ severity: 'warn', summary, detail, life: 4000 })
  }

  function showInfo(summary: string, detail?: string) {
    toast.add({ severity: 'info', summary, detail, life: 3000 })
  }

  /** Gestisce un errore API mostrando un toast */
  function handleApiError(error: unknown, context?: string) {
    const message = error instanceof Error ? error.message : String(error)
    const summary = context ? `Errore: ${context}` : 'Errore API'
    showError(summary, message)
  }

  return { showSuccess, showError, showWarn, showInfo, handleApiError }
}

