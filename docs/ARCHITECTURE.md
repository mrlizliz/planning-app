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
│   │   ├── milestone.ts        ← Milestone, MilestoneStatus
│   │   ├── release.ts          ← Release con forecast
│   │   ├── dependency.ts       ← Dependency (finish_to_start, parallel, blocking)
│   │   └── deployment.ts       ← DeploymentDay, DeploymentWindow
│   ├── scheduling/             ← Funzioni pure di scheduling
│   │   ├── index.ts            ← Re-export
│   │   ├── calendar.ts         ← isWorkingDay, getWorkingDays, addWorkingDays, nextWorkingDay
│   │   └── capacity.ts         ← calculateDailyCapacity, applyAllocation, calculateDurationDays,
│   │                              getMeetingMinutesForDay, isOverallocated
│   └── validators/             ← Zod schemas per ogni entità
│       └── index.ts            ← Tutti i validatori (userSchema, ticketSchema, ecc.)
├── tests/
│   ├── validators.test.ts      ← Test T0-01, T0-02 (schema validation)
│   └── scheduling/
│       ├── calendar.test.ts    ← Test T0-05, T0-06 (working days, festivi)
│       └── capacity.test.ts    ← Test T0-03, T0-04 (capacity, duration)
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Pacchetto: @planning/backend (skeleton — Release 1)

```
packages/backend/
├── src/
│   └── index.ts          ← Placeholder
├── package.json
└── tsconfig.json
```

Sarà sviluppato nella Release 1 con:
- Fastify come framework HTTP
- Prisma come ORM (PostgreSQL)
- Route REST per ticket, calendar, capacity
- Job queue BullMQ per sync Jira e Outlook

## Pacchetto: @planning/frontend (skeleton — Release 1)

```
packages/frontend/
├── src/
│   └── main.ts           ← Placeholder
├── package.json
└── tsconfig.json
```

Sarà sviluppato nella Release 1 con:
- Vue 3 + Composition API
- Vite come bundler
- PrimeVue per componenti UI
- Pinia per state management
- Vue Router per routing SPA

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

# Test del pacchetto shared
pnpm test:shared
# oppure
pnpm --filter @planning/shared test

# Test con watch mode
pnpm --filter @planning/shared test:watch

# Build di tutto
pnpm build

# Dev mode (quando backend e frontend saranno pronti)
pnpm dev
```

## Dipendenze chiave (shared)

| Pacchetto | Versione | Uso |
|-----------|----------|-----|
| `date-fns` | ^4.1.0 | Manipolazione date, calcolo working days |
| `zod` | ^3.24.0 | Validazione runtime domain model |
| `vitest` | ^3.0.0 | Test runner (devDependency) |
| `typescript` | ^5.7.0 | Type checking (devDependency) |

