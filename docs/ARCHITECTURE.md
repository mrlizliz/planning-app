# Architettura — Planning App

> Riferimento: `jira-planning-roadmap.md` → sezione "Stack tecnico"

## Tipo di progetto

Monorepo pnpm con 3 pacchetti:

```
planning-app/
├── packages/
│   ├── shared/          ← @planning/shared — tipi, scheduling, validatori
│   ├── backend/         ← @planning/backend — API Fastify + Prisma + PostgreSQL
│   └── frontend/        ← @planning/frontend — Vue 3 + Vite + PrimeVue
├── docs/                ← Documentazione AI e progetto
├── package.json         ← Root monorepo
├── pnpm-workspace.yaml  ← Config workspace pnpm
├── turbo.json           ← Config Turborepo (build, test, dev)
└── tsconfig.base.json   ← Config TypeScript condivisa
```

## Pacchetto: @planning/shared

Il cuore logico dell'app. Contiene tutto ciò che è condiviso tra frontend e backend.

```
packages/shared/
├── src/
│   ├── index.ts                ← Barrel export principale
│   ├── types/                  ← Domain Model (TypeScript interfaces)
│   │   ├── index.ts            ← Re-export di tutti i tipi
│   │   ├── user.ts             ← User, AppRole, PlanningRole
│   │   ├── ticket.ts           ← Ticket, JiraPriority, TicketStatus, TicketPhase, TicketWarning
│   │   ├── assignment.ts       ← Assignment (ticket → persona con allocazione %)
│   │   ├── calendar.ts         ← Holiday, CalendarException, Absence, RecurringMeeting, WorkingCalendar
│   │   ├── outlook.ts          ← OutlookEvent, OutlookCapacityBlock, OutlookFilterConfig
│   │   ├── milestone.ts        ← Milestone, MilestoneStatus
│   │   ├── release.ts          ← Release con forecast
│   │   ├── dependency.ts       ← Dependency (finish_to_start, parallel, blocking)
│   │   └── deployment.ts       ← DeploymentDay, DeploymentWindow
│   ├── scheduling/             ← Funzioni pure di scheduling
│   │   ├── index.ts            ← Re-export
│   │   ├── calendar.ts         ← isWorkingDay, getWorkingDays, addWorkingDays, nextWorkingDay
│   │   ├── capacity.ts         ← calculateDailyCapacity, applyAllocation, calculateDurationDays,
│   │   │                          getMeetingMinutesForDay, isOverallocated
│   │   ├── scheduler.ts        ← autoSchedule, scheduleDayByDay (day-by-day con capacità reale)
│   │   ├── jira-mapper.ts      ← mapJiraIssueToTicket, mapJiraIssuesToTickets
│   │   └── outlook-mapper.ts   ← filterOutlookEvents, mapEventsToCapacityBlocks, aggregateCapacityByDay
│   └── validators/             ← Zod schemas per ogni entità
│       └── index.ts            ← Tutti i validatori (userSchema, ticketSchema, ecc.)
├── tests/
│   ├── validators.test.ts      ← Test T0-01, T0-02 (schema validation)
│   └── scheduling/
│       ├── calendar.test.ts    ← Test T0-05, T0-06 (working days, festivi)
│       ├── capacity.test.ts    ← Test T0-03, T0-04 (capacity, duration)
│       ├── scheduler.test.ts   ← Test T1-U11…U15 (auto-schedule, locked, priority)
│       ├── jira-mapper.test.ts ← Test T1-U01…U03 (mapping, warning, batch)
│       └── capacity-real.test.ts ← Test T2-U01…U14 (capacità reale, Outlook filtri)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Funzioni scheduling aggiunte in Release 1

| Funzione | File | Descrizione |
|----------|------|-------------|
| `autoSchedule(input)` | `scheduler.ts` | Auto-scheduling completo: priorità, locked, sovrallocazione |
| `mapJiraIssueToTicket(issue)` | `jira-mapper.ts` | Converte issue Jira → Ticket interno |
| `mapJiraIssuesToTickets(issues, existing)` | `jira-mapper.ts` | Mapping batch con preservazione override |

### Funzioni scheduling aggiunte in Release 2

| Funzione | File | Descrizione |
|----------|------|-------------|
| `scheduleDayByDay(...)` | `scheduler.ts` | Scheduling giorno per giorno con capacità reale |
| `filterOutlookEvents(events, config)` | `outlook-mapper.ts` | Filtra eventi Outlook per showAs, durata, opzionalità |
| `mapEventsToCapacityBlocks(events)` | `outlook-mapper.ts` | Converte eventi → blocchi di capacità ridotta |
| `aggregateCapacityByDay(blocks)` | `outlook-mapper.ts` | Aggrega blocchi per giorno |

## Pacchetto: @planning/backend

```
packages/backend/
├── src/
│   ├── index.ts              ← Server Fastify + buildApp() + hook auto-save
│   ├── store/
│   │   └── index.ts          ← In-memory store + persistenza JSON su disco
│   ├── services/
│   │   └── jira-client.ts    ← HTTP client per Jira REST API
│   └── routes/
│       ├── tickets.ts        ← CRUD ticket + sync Jira
│       ├── users.ts          ← CRUD utenti
│       ├── assignments.ts    ← CRUD assignment
│       ├── calendar.ts       ← Holidays, exceptions, absences, meetings
│       ├── scheduler.ts      ← Trigger auto-scheduling
│       └── capacity.ts       ← GET breakdown giornaliero per utente
├── data/
│   └── store.json            ← 💾 Dati persistenti (in .gitignore)
├── tests/
│   ├── api.test.ts           ← Integration test API (T1-I01…I04)
│   └── capacity.test.ts      ← Integration test capacità (T2-I01…I04)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Persistenza:** I dati vengono salvati su `data/store.json` (debounce 200ms) dopo ogni scrittura riuscita. Al riavvio, il file viene ricaricato. In futuro verrà sostituito con Prisma + PostgreSQL.

**JiraClient:** HTTP client con Basic Auth, retry automatico (1 tentativo), gestione errori (401/403 non retryabili).

## Pacchetto: @planning/frontend

```
packages/frontend/
├── index.html                  ← Entry point HTML
├── src/
│   ├── main.ts                ← Bootstrap Vue 3 + Pinia + PrimeVue + Router
│   ├── App.vue                ← Layout principale con header + nav
│   ├── router/
│   │   └── index.ts           ← 4 route: /, /tickets, /capacity, /settings
│   ├── stores/
│   │   ├── tickets.ts         ← Pinia store ticket + sync Jira
│   │   ├── planning.ts        ← Pinia store assignment + scheduler
│   │   └── users.ts           ← Pinia store utenti
│   ├── api/
│   │   └── client.ts          ← HTTP client tipizzato (fetch wrapper)
│   ├── views/
│   │   ├── PlanningView.vue   ← Timeline Gantt + auto-schedule
│   │   ├── TicketsView.vue    ← Lista ticket + import Jira
│   │   ├── CapacityView.vue   ← Heatmap capacità + CRUD assenze + CRUD meeting
│   │   └── SettingsView.vue   ← Gestione team + festivi
│   └── components/
│       ├── GanttTimeline.vue       ← Timeline settimanale
│       ├── TicketTable.vue         ← Tabella ticket con badge
│       ├── JiraSyncDialog.vue      ← Dialog import Jira
│       └── OverallocationBanner.vue← Alert sovrallocazione
├── env.d.ts
├── package.json
├── tsconfig.json
└── vite.config.ts             ← Vite + proxy API verso backend
```

## Decisioni architetturali

### 1. Monorepo con pnpm workspaces + Turborepo

**Motivazione:** Un singolo repository con 3 pacchetti permette di:
- Condividere tipi TypeScript senza pubblicare su npm
- Avere un unico `pnpm install` per tutto
- Build e test orchestrati da Turborepo

**Alternativa scartata:** Repository separati → troppo overhead di sync per un team piccolo.

### 2. Minuti interi (non ore decimali)

**Motivazione:** JavaScript ha solo `number` (float64). `8 * 0.33 = 2.6400000000000001`.
Lavorando in **minuti interi** (480 = 8h, 240 = 4h) eliminiamo i problemi di precisione.

**Conversione:** Solo la UI converte minuti → ore per la visualizzazione.

### 3. Funzioni pure per lo scheduling

**Motivazione:** Le funzioni di scheduling (`isWorkingDay`, `calculateDurationDays`, ecc.)
sono pure: nessun side effect, nessun accesso a DB o API. Questo le rende:
- Facilmente testabili (input → output)
- Usabili sia nel backend (ricalcolo autoritativo) sia nel frontend (preview istantanea)
- Riutilizzabili nel pacchetto `@planning/shared`

### 4. Zod + TypeScript (doppia validazione)

**Motivazione:**
- **TypeScript** → sicurezza a compile-time (errori nell'IDE)
- **Zod** → sicurezza a runtime (validazione dati da API, form utente, import Jira)

I Zod schema sono definiti in `validators/` e possono generare TypeScript types
con `z.infer<typeof schema>` se necessario.

### 5. date-fns (non dayjs, non moment)

**Motivazione:**
- Tree-shakeable (importi solo le funzioni che usi)
- Funzioni pure (non muta le date)
- API intuitiva per i calcoli di working days

## Comandi principali

```bash
# Installazione dipendenze
pnpm install

# Test pacchetto shared
pnpm test:shared

# Test pacchetto backend
pnpm test:backend

# Test tutto
pnpm test

# Dev mode (backend + frontend)
pnpm dev

# Build di tutto
pnpm build
```

## Dipendenze chiave

### @planning/shared

| Pacchetto | Versione | Uso |
|-----------|----------|-----|
| `date-fns` | ^4.1.0 | Manipolazione date, calcolo working days |
| `zod` | ^3.24.0 | Validazione runtime domain model |
| `vitest` | ^3.0.0 | Test runner (devDep) |

### @planning/backend

| Pacchetto | Versione | Uso |
|-----------|----------|-----|
| `fastify` | ^5.2.0 | Framework HTTP |
| `@fastify/cors` | ^10.0.0 | CORS per dev frontend |
| `pino` | ^9.6.0 | Logging strutturato |

### @planning/frontend

| Pacchetto | Versione | Uso |
|-----------|----------|-----|
| `vue` | ^3.5.0 | Framework UI |
| `pinia` | ^2.3.0 | State management |
| `vue-router` | ^4.5.0 | Routing SPA |
| `primevue` | ^4.3.0 | Componenti UI enterprise |
| `vite` | ^6.1.0 | Build tool + dev server |

