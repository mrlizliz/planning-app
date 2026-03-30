// ============================================================
// @planning/shared — Domain Model — Barrel exports
// ============================================================

// User & Roles
export type {
  AppRole,
  PlanningRole,
  Office,
  User,
} from './user.js'

// Ticket
export type {
  JiraPriority,
  TicketStatus,
  TicketPhase,
  Ticket,
  TicketWarning,
} from './ticket.js'

// Assignment
export type { Assignment } from './assignment.js'

// Calendar, Absences, Meetings
export type {
  Holiday,
  CalendarException,
  AbsenceType,
  Absence,
  MeetingFrequency,
  MeetingType,
  RecurringMeeting,
  WorkingCalendar,
} from './calendar.js'

// Milestone
export type { MilestoneStatus, Milestone } from './milestone.js'

// Release
export type { Release } from './release.js'

// Dependency
export type { DependencyType, Dependency } from './dependency.js'

// Deployment
export type {
  DeployEnvironment,
  DeploymentDay,
  DeploymentWindow,
} from './deployment.js'

// Outlook
export type {
  OutlookEvent,
  OutlookCapacityBlock,
  OutlookFilterConfig,
} from './outlook.js'
export { DEFAULT_OUTLOOK_FILTER } from './outlook.js'

// Scenario
export type {
  Scenario,
  ScenarioSnapshot,
  ScenarioAssignment,
} from './scenario.js'

