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
  filterOutlookEvents,
  mapEventsToCapacityBlocks,
  aggregateCapacityByDay,
} from './outlook-mapper.js'

export {
  mapJiraIssueToTicket,
  mapJiraIssuesToTickets,
} from './jira-mapper.js'

export {
  calculateMilestoneStatus,
  calculateReleaseForecast,
  isDeployDay,
  nextDeployDay,
  checkDeployWarning,
  canStartQA,
  isReadyForRelease,
  type GateError,
} from './release-planning.js'
