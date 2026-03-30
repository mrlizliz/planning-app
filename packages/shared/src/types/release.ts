// ============================================================
// Release — Release con ticket associati
// ============================================================

export interface Release {
  id: string
  name: string
  description: string | null
  /** Data target di rilascio in formato ISO YYYY-MM-DD */
  targetDate: string
  /** Data prevista calcolata dallo scheduling (max end_date dei ticket) */
  forecastDate: string | null
  createdAt: string
  updatedAt: string
}

