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

export {
  autoSchedule,
  type SchedulerInput,
  type SchedulerResult,
  type ScheduledAssignment,
  type SchedulerError,
  type OverallocationAlert,
  type HolidayEntry,
} from './scheduler.js'

export {
  mapJiraIssueToTicket,
  mapJiraIssuesToTickets,
  type JiraIssue,
  type JiraMappingResult,
} from './jira-mapper.js'

