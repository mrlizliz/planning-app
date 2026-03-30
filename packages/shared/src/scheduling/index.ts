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
  mapJiraLinksToDependencies,
  type JiraIssue,
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

export {
  buildAdjacencyList,
  getImplicitDevQaDependencies,
  detectCycles,
  topologicalSort,
  getImpactedTickets,
  getPredecessors,
  getSuccessors,
  type DependencyEdge,
  type CycleDetectionResult,
  type ImpactAnalysisResult,
} from './dependency-graph.js'

export {
  generateAlerts,
  type AlertSeverity,
  type AlertType,
  type PlanningAlert,
  type AlertsInput,
} from './alerts.js'
