// ============================================================
// Scheduling — Barrel exports
// ============================================================

export {
  isWorkingDay,
  getWorkingDaysCount,
  getWorkingDays,
  addWorkingDays,
  nextWorkingDay,
  type CalendarConfig,
} from './calendar.js'

export {
  calculateDailyCapacity,
  applyAllocation,
  calculateDurationDays,
  getMeetingMinutesForDay,
  isOverallocated,
  type DailyCapacityInput,
  type DailyCapacityResult,
} from './capacity.js'

