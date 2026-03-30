// ============================================================
// In-Memory Store — Con persistenza su file JSON
// ============================================================

import type { Ticket } from '@planning/shared'
import type { Assignment } from '@planning/shared'
import type { User } from '@planning/shared'
import type {
  Holiday,
  CalendarException,
  Absence,
  RecurringMeeting,
  WorkingCalendar,
} from '@planning/shared'
import type { Milestone } from '@planning/shared'
import type { Release } from '@planning/shared'
import type { Dependency } from '@planning/shared'
import type { DeploymentDay, DeploymentWindow } from '@planning/shared'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

// ---- Path del file di persistenza ----

const DATA_DIR = resolve(process.cwd(), 'data')
const DATA_FILE = resolve(DATA_DIR, 'store.json')

// ---- Store interface ----

export interface Store {
  tickets: Map<string, Ticket>
  assignments: Map<string, Assignment>
  users: Map<string, User>
  absences: Map<string, Absence>
  meetings: Map<string, RecurringMeeting>
  milestones: Map<string, Milestone>
  releases: Map<string, Release>
  dependencies: Map<string, Dependency>
  deployDays: Map<string, DeploymentDay>
  deployWindows: Map<string, DeploymentWindow>
  calendar: WorkingCalendar
}

// ---- Serializzazione Map ↔ JSON ----

interface StoreJSON {
  tickets: Record<string, Ticket>
  assignments: Record<string, Assignment>
  users: Record<string, User>
  absences: Record<string, Absence>
  meetings: Record<string, RecurringMeeting>
  milestones: Record<string, Milestone>
  releases: Record<string, Release>
  dependencies: Record<string, Dependency>
  deployDays: Record<string, DeploymentDay>
  deployWindows: Record<string, DeploymentWindow>
  calendar: WorkingCalendar
}

function storeToJSON(store: Store): StoreJSON {
  return {
    tickets: Object.fromEntries(store.tickets),
    assignments: Object.fromEntries(store.assignments),
    users: Object.fromEntries(store.users),
    absences: Object.fromEntries(store.absences),
    meetings: Object.fromEntries(store.meetings),
    milestones: Object.fromEntries(store.milestones),
    releases: Object.fromEntries(store.releases),
    dependencies: Object.fromEntries(store.dependencies),
    deployDays: Object.fromEntries(store.deployDays),
    deployWindows: Object.fromEntries(store.deployWindows),
    calendar: store.calendar,
  }
}

function jsonToStore(json: StoreJSON): Store {
  return {
    tickets: new Map(Object.entries(json.tickets ?? {})),
    assignments: new Map(Object.entries(json.assignments ?? {})),
    users: new Map(Object.entries(json.users ?? {})),
    absences: new Map(Object.entries(json.absences ?? {})),
    meetings: new Map(Object.entries(json.meetings ?? {})),
    milestones: new Map(Object.entries(json.milestones ?? {})),
    releases: new Map(Object.entries(json.releases ?? {})),
    dependencies: new Map(Object.entries(json.dependencies ?? {})),
    deployDays: new Map(Object.entries(json.deployDays ?? {})),
    deployWindows: new Map(Object.entries(json.deployWindows ?? {})),
    calendar: json.calendar ?? {
      id: 'default',
      name: 'Team Calendar',
      holidays: [],
      exceptions: [],
    },
  }
}

// ---- Persistenza ----

function loadFromDisk(): Store | null {
  try {
    if (existsSync(DATA_FILE)) {
      const raw = readFileSync(DATA_FILE, 'utf-8')
      const json = JSON.parse(raw) as StoreJSON
      console.log(`💾 Store caricato da ${DATA_FILE}`)
      return jsonToStore(json)
    }
  } catch (err) {
    console.error('⚠️ Errore caricamento store da disco:', err)
  }
  return null
}

/** Timer per debounce del salvataggio (evita scritture troppo frequenti) */
let _saveTimer: ReturnType<typeof setTimeout> | null = null

export function saveToDisk(): void {
  if (!_store) return
  // Debounce: salva dopo 200ms dall'ultima modifica
  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true })
      }
      const json = storeToJSON(_store!)
      writeFileSync(DATA_FILE, JSON.stringify(json, null, 2), 'utf-8')
    } catch (err) {
      console.error('⚠️ Errore salvataggio store su disco:', err)
    }
  }, 200)
}

// ---- Singleton ----

export function createStore(): Store {
  return {
    tickets: new Map(),
    assignments: new Map(),
    users: new Map(),
    absences: new Map(),
    meetings: new Map(),
    milestones: new Map(),
    releases: new Map(),
    dependencies: new Map(),
    deployDays: new Map(),
    deployWindows: new Map(),
    calendar: {
      id: 'default',
      name: 'Team Calendar',
      holidays: [],
      exceptions: [],
    },
  }
}

let _store: Store | null = null

export function getStore(): Store {
  if (!_store) {
    _store = loadFromDisk() ?? createStore()
  }
  return _store
}

export function resetStore(): void {
  _store = createStore()
}

