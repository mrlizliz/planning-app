# Release Log — Planning App

> Riferimento: `jira-planning-roadmap.md` per roadmap e test plan completo

---

## Release 0 — Discovery & Foundation

**Data:** 2026-03-30
**Stato:** ✅ Completata

### Obiettivo

Definire il modello dati, le regole di pianificazione e le basi architetturali.

### Cosa è stato fatto

#### 1. Struttura monorepo

- Configurato monorepo pnpm con Turborepo
- Creati 3 pacchetti: `@planning/shared`, `@planning/backend`, `@planning/frontend`
- Configurazione TypeScript condivisa (`tsconfig.base.json`)
- `.gitignore` configurato

#### 2. Domain Model (`@planning/shared/src/types/`)

13 entità definite come TypeScript interfaces:

| File | Entità |
|------|--------|
| `user.ts` | `User`, `AppRole`, `PlanningRole` |
| `ticket.ts` | `Ticket`, `JiraPriority`, `TicketStatus`, `TicketPhase`, `TicketWarning` |
| `assignment.ts` | `Assignment` |
| `calendar.ts` | `Holiday`, `CalendarException`, `Absence`, `AbsenceType`, `RecurringMeeting`, `MeetingFrequency`, `MeetingType`, `WorkingCalendar` |
| `milestone.ts` | `Milestone`, `MilestoneStatus` |
| `release.ts` | `Release` |
| `dependency.ts` | `Dependency`, `DependencyType` |
| `deployment.ts` | `DeploymentDay`, `DeploymentWindow`, `DeployEnvironment` |

#### 3. Regole di scheduling (`@planning/shared/src/scheduling/`)

Funzioni pure implementate:

| Funzione | File | Descrizione |
|----------|------|-------------|
| `isWorkingDay(date, config)` | `calendar.ts` | Verifica se un giorno è lavorativo |
| `getWorkingDaysCount(start, end, config)` | `calendar.ts` | Conta giorni lavorativi in un intervallo |
| `getWorkingDays(start, end, config)` | `calendar.ts` | Lista di date lavorative in un intervallo |
| `addWorkingDays(start, days, config)` | `calendar.ts` | Aggiunge N giorni lavorativi a una data |
| `nextWorkingDay(date, config)` | `calendar.ts` | Trova il prossimo giorno lavorativo |
| `calculateDailyCapacity(input)` | `capacity.ts` | Calcola capacità netta giornaliera |
| `applyAllocation(netMinutes, percent)` | `capacity.ts` | Applica allocazione % alla capacità |
| `calculateDurationDays(estimate, capacity, alloc)` | `capacity.ts` | Calcola durata in giorni lavorativi |
| `getMeetingMinutesForDay(dayOfWeek, meetings)` | `capacity.ts` | Minuti di meeting per giorno |
| `isOverallocated(assigned, capacity)` | `capacity.ts` | Rileva sovrallocazione |

#### 4. Validatori Zod (`@planning/shared/src/validators/`)

Uno schema Zod per ogni entità del domain model, con validazione di:
- Campi obbligatori
- Tipi corretti
- Enum validi
- Formato date ISO YYYY-MM-DD
- Range valori (es. allocationPercent 1-100)

#### 5. Test automatici (`@planning/shared/tests/`)

| File | Test IDs | Casi di test |
|------|----------|-------------|
| `validators.test.ts` | T0-01, T0-02 | 30 test (validazione schema corretti + rifiuto campi mancanti/invalidi) |
| `scheduling/calendar.test.ts` | T0-05, T0-06 | 22 test (working days, weekend, festivi, eccezioni) |
| `scheduling/capacity.test.ts` | T0-03, T0-04 | 28 test (capacity, allocation, duration, meeting, sovrallocazione) |

**Totale: ~80 test cases**

#### 6. Documentazione AI

| File | Scopo |
|------|-------|
| `AI_CONTEXT.md` | Entry point per AI |
| `docs/ARCHITECTURE.md` | Struttura progetto e decisioni |
| `docs/DOMAIN_MODEL.md` | Entità, relazioni, formule |
| `docs/CONVENTIONS.md` | Convenzioni codice e naming |
| `docs/RELEASE_LOG.md` | Questo file |

### Decisioni chiave prese

1. **Minuti interi** come unità interna (evita problemi float JavaScript)
2. **Funzioni pure** per lo scheduling (testabili, condivisibili)
3. **Zod + TypeScript** per doppia validazione (compile-time + runtime)
4. **date-fns** per manipolazione date (tree-shakeable, funzionale)
5. **Monorepo pnpm** con pacchetto `@planning/shared` condiviso

### Non fatto (rimandato a Release 1)

- ❌ Wireframe interattivi (T0-07 — opzionale)
- ❌ OpenAPI spec (verrà creata con le route Fastify)
- ❌ Diagramma ER grafico (documentato in Markdown)

---

## Release 1 — MVP Planning Core

**Data:** 2026-03-30
**Stato:** ✅ Completata

### Obiettivo

Prima versione usabile: import Jira, assegnamento ticket, scheduling con date realistiche.

### Cosa è stato fatto

#### 1. Scheduler Engine (`@planning/shared/src/scheduling/scheduler.ts`)

Motore di auto-scheduling come funzione pura:

| Funzione | Descrizione |
|----------|-------------|
| `autoSchedule(input)` | Schedula tutti gli assignment non-locked in base a priorità e disponibilità |

Logica:
- Separa assignment `locked` (non toccati) da quelli da schedulare
- Ordina per priorità (jiraPriority + priorityOverride)
- Per ogni assignment: trova prossima data disponibile per l'utente, calcola durata, assegna date
- Rileva sovrallocazioni

#### 2. Jira Mapper (`@planning/shared/src/scheduling/jira-mapper.ts`)

| Funzione | Descrizione |
|----------|-------------|
| `mapJiraIssueToTicket(issue)` | Converte un issue Jira in un Ticket interno |
| `mapJiraIssuesToTickets(issues, existing)` | Mapping batch con preservazione override manuali |

Funzionalità:
- Converte `originalEstimateSeconds` → minuti
- Mappa priorità Jira con alias (Blocker → highest, Major → high, ecc.)
- Genera warning: `missing_estimate`, `missing_assignee`, `estimate_zero`
- Re-import preserva override PM (priorityOverride, locked, milestoneId, releaseId)

#### 3. Backend Fastify (`@planning/backend`)

Server Fastify con API REST complete:

| Route | Metodo | Descrizione |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/tickets` | GET, PUT, DELETE | CRUD ticket |
| `/api/tickets/sync-jira` | POST | Import da Jira (JQL) |
| `/api/users` | GET, POST, PUT, DELETE | CRUD utenti |
| `/api/assignments` | GET, POST, PUT, DELETE | CRUD assignment |
| `/api/calendar` | GET | Calendario lavorativo |
| `/api/calendar/holidays` | GET, POST, DELETE | Gestione festivi |
| `/api/calendar/exceptions` | GET, POST, DELETE | Gestione eccezioni |
| `/api/absences` | GET, POST, DELETE | Gestione assenze |
| `/api/meetings` | GET, POST, DELETE | Gestione meeting |
| `/api/scheduler/run` | POST | Esegue auto-scheduling |
| `/api/scheduler/status` | GET | Stato pianificazione |

Architettura:
- In-memory store (pre-database — verrà sostituito con Prisma + PostgreSQL)
- JiraClient con Basic Auth, retry automatico, gestione errori HTTP
- Validazione input con Zod schemas condivisi da `@planning/shared`

#### 4. Frontend Vue 3 (`@planning/frontend`)

Setup completo Vue 3 + Vite + PrimeVue + Pinia + Vue Router:

| Vista | Descrizione |
|-------|-------------|
| `PlanningView` | Timeline Gantt con auto-schedule e banner sovrallocazione |
| `TicketsView` | Lista ticket con tabella, stats, dialogo import Jira |
| `CapacityView` | Card per utente con carico e barra capacità |
| `SettingsView` | Gestione team (CRUD + edit inline utenti) e festivi con office |

Componenti:
- `GanttTimeline` — Timeline settimanale con barre colorate per priorità
- `TicketTable` — Tabella ticket ordinabile con badge priorità/stato
- `JiraSyncDialog` — Dialog per configurare e lanciare import Jira
- `OverallocationBanner` — Alert visivo sovrallocazioni

Stores Pinia:
- `useTicketsStore` — CRUD ticket + sync Jira
- `usePlanningStore` — Assignment + scheduler
- `useUsersStore` — CRUD + update utenti

API Client tipizzato (`src/api/client.ts`) — fetch wrapper con Content-Type condizionale (solo se body presente).

#### 5. Persistenza su file JSON (`@planning/backend`)

- Lo store in memoria viene serializzato su `packages/backend/data/store.json`
- Salvataggio automatico (debounce 200ms) dopo ogni POST/PUT/DELETE riuscita
- Al riavvio del backend i dati vengono ricaricati da disco
- `data/` è in `.gitignore` (dati locali, non committati)

#### 6. Office e festivi patronali

- Ogni utente ha un campo `office`: `'milano' | 'venezia' | 'roma' | null`
- Ogni festivo ha un campo `office`: `null` = nazionale, altrimenti vale solo per quella sede
- Lo scheduler filtra automaticamente i festivi in base all'office dell'utente
- Patroni configurati: Sant'Ambrogio (MI, 7/12), San Marco (VE, 25/4), Santi Pietro e Paolo (RM, 29/6)
- 12 festivi nazionali italiani pre-configurati (seed script)

#### 7. UX miglioramenti

- **Email autofill**: campo email precompilato come `nome.cognome@arsenalia.com` dal displayName
- **Edit inline utenti**: pulsante ✏️ per modificare nome, email, ruolo e office senza uscire dalla pagina
- **Submit con Invio**: form utenti e festivi submitabili premendo Enter
- **Date in italiano**: festivi visualizzati come `07/12/2026` invece di `2026-12-07`

#### 8. Test automatici

| File | Test IDs | Casi |
|------|----------|------|
| `shared/tests/scheduling/scheduler.test.ts` | T1-U11…U15 | 10 test (auto-schedule, locked, sovrallocazione, priorità) |
| `shared/tests/scheduling/jira-mapper.test.ts` | T1-U01…U03 | 10 test (mapping, warning, batch, override preservati) |
| `backend/tests/api.test.ts` | T1-I01…I04 | 13 test (CRUD, scheduling integrato, festivo + ricalcolo) |

**Totale test: 121** (108 shared + 13 backend)

### Decisioni chiave prese

1. **Persistenza JSON su disco** — sostituto leggero del DB per l'MVP, senza dipendenze extra
2. **Jira mapper nel pacchetto shared** — riutilizzabile sia dal backend (sync) sia dal frontend (preview)
3. **Scheduling sequenziale per utente** — nella v1, i ticket per lo stesso utente vengono schedulati uno dopo l'altro (no parallelismo)
4. **Vite proxy** per dev — il frontend su porta 5173 fa proxy delle API a backend su porta 3001
5. **Niente libreria Gantt esterna** — componente custom leggero, verrà evoluto in Release 4
6. **`office` (non `sede`)** — naming in inglese nel codice, anche se la UI è in italiano
7. **Content-Type condizionale** — il client API non manda Content-Type su DELETE/GET senza body

### Non fatto (rimandato)

- ❌ Prisma + PostgreSQL (verrà aggiunto quando necessario)
- ❌ Auth e ruoli (Release futura)
- ❌ Drag & drop su Gantt (Release 4)
- ❌ Dipendenze tra ticket (Release 4)
- ❌ Test E2E Playwright (verranno aggiunti con il frontend maturo)

---

## Release 2 — Real Capacity & Microsoft Calendar Integration

**Data:** 2026-03-30
**Stato:** ✅ Completata

### Obiettivo

Rendere la capacità giornaliera realistica, considerando meeting, assenze e impegni da Outlook.

### Cosa è stato fatto

#### 1. Scheduler con capacità reale giorno per giorno

Lo scheduler ora itera **giorno per giorno**, consumando i minuti di effort dalla capacità netta reale del giorno (non più una stima "piatta"). Considera:
- Meeting ricorrenti del giorno (daily, weekly, biweekly)
- Assenze (giornata intera → capacità 0, mezza giornata → capacità dimezzata)
- Overhead fisso
- Allocation %

Se un utente è in ferie, quel giorno viene saltato. Se ha 2h di meeting, la capacità si riduce di 2h e il ticket dura proporzionalmente di più.

Funzione chiave: `scheduleDayByDay()` in `scheduler.ts`.

#### 2. Backend — Route capacità

Nuovo endpoint `GET /api/capacity/:userId?from=...&to=...` che restituisce il breakdown giornaliero:
- `isWorkingDay`, `grossMinutes`, `netMinutes`, `meetingMinutes`, `overheadMinutes`, `absenceMinutes`
- `assignedMinutes` (carico effettivo)
- `alert` (true se capacità ≤ 0)
- `absenceType`, `meetingNames`

#### 3. Frontend — CapacityView riscritta

- **Heatmap capacità**: griglia colorata giorno per giorno (verde >70%, giallo 30-70%, rosso <30%)
- **Click su utente** → carica heatmap delle prossime 4 settimane
- **Sezione giorni critici**: lista dei giorni con alert (capacità 0)
- **Gestione assenze**: CRUD assenze con tipo (vacation, sick, permit, training, other) e half-day
- **Gestione meeting ricorrenti**: CRUD meeting con tipo, durata, frequenza, giorno, scope (team/persona)

#### 4. Outlook mapper (funzioni pure)

Tipi e funzioni pure per integrare Microsoft Graph Calendar (pronte per quando si collegherà OAuth2):

| Funzione | File | Descrizione |
|----------|------|-------------|
| `filterOutlookEvents` | `outlook-mapper.ts` | Filtra eventi per showAs, durata, opzionalità |
| `mapEventsToCapacityBlocks` | `outlook-mapper.ts` | Converte eventi in blocchi di capacità ridotta |
| `aggregateCapacityByDay` | `outlook-mapper.ts` | Aggrega blocchi per giorno |

Tipi: `OutlookEvent`, `OutlookCapacityBlock`, `OutlookFilterConfig` in `types/outlook.ts`.

Filtri configurabili:
- Solo eventi `busy`/`oof` (esclusi `tentative`, `free`)
- Soglia minima durata (default 15min)
- Esclusione eventi opzionali e cancellati

#### 5. Test automatici

| File | Test IDs | Casi |
|------|----------|------|
| `shared/tests/scheduling/capacity-real.test.ts` | T2-U01…U14 | 15 test (capacità reale, meeting, assenze, half-day, Outlook filtri) |
| `backend/tests/capacity.test.ts` | T2-I01…I04 | 4 test (meeting+scheduling, ferie+scheduling, capacity API, filtri) |

**Totale test: 140** (123 shared + 17 backend)

### Decisioni chiave

1. **Day-by-day scheduling** — Lo scheduler itera giorno per giorno con capacità reale, non usa più una stima piatta
2. **realStartDate** — Se un utente ha assenza il primo giorno, lo scheduler restituisce come `startDate` il primo giorno di lavoro effettivo
3. **Outlook mapper come funzioni pure** — Pronte per l'integrazione Microsoft Graph, testabili senza mock di rete
4. **Heatmap interattiva** — Click su utente → carica da API `/api/capacity` i dati reali

### Non fatto (rimandato)

- ❌ OAuth2 Microsoft Graph (richiede configurazione Azure AD)
- ❌ Sync automatico Outlook (previsto come pulsante in release futura)
- ❌ Test E2E Playwright

