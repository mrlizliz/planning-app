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

---

## Release 3 — Milestone, Release & Deployment Calendar

**Data:** 2026-03-30
**Stato:** ✅ Completata

### Obiettivo

Gestire la pianificazione rispetto a milestone e finestre di rilascio (deploy DEV e PROD).

### Cosa è stato fatto

#### 1. Funzioni pure release-planning (`@planning/shared`)

| Funzione | Descrizione |
|----------|-------------|
| `calculateMilestoneStatus` | Calcola stato milestone: `on_track` / `at_risk` (entro 2gg) / `delayed` |
| `calculateReleaseForecast` | Forecast = `max(endDate)` dei ticket associati |
| `isDeployDay` | Verifica se una data è giorno di deploy (pattern + override) |
| `nextDeployDay` | Trova prossimo deploy disponibile (max 90gg) |
| `checkDeployWarning` | Warning se fine QA cade dopo ultimo deploy prima della release |
| `canStartQA` | Gate: DEV deve avere endDate prima che QA possa iniziare |
| `isReadyForRelease` | Gate: QA completato + buffer configurabile rispettato |

#### 2. Backend — Route Milestones, Releases, Deploy

Nuovi endpoint REST:

| Route | Metodo | Descrizione |
|-------|--------|-------------|
| `/api/milestones` | GET, POST, PUT, DELETE | CRUD milestone con stato calcolato automaticamente |
| `/api/releases` | GET, POST, PUT, DELETE | CRUD release con forecast calcolato |
| `/api/deploy/days` | GET, POST, DELETE | Giorni di deploy ricorrenti (DEV/PROD) |
| `/api/deploy/windows` | GET, POST, DELETE | Override puntuali (consentire/bloccare deploy) |

Store aggiornato con: `milestones`, `releases`, `deployDays`, `deployWindows` (persistiti su JSON).

#### 3. Frontend — ReleasesView

Nuova vista **🚀 Release** (`/releases`) con 4 sezioni:
- **🎯 Milestone**: CRUD con badge stato colorato (✅/⚠️/🔴)
- **📦 Release**: CRUD con forecast badge (verde se in tempo, rosso se in ritardo)
- **📅 Giorni di Deploy**: pattern ricorrenti per env (DEV/PROD) + giorno settimana
- **🪟 Finestre Deploy**: override puntuali (consentire/bloccare un giorno specifico)

Link "Release" aggiunto nella navigation bar.

#### 4. Test automatici

| File | Test IDs | Casi |
|------|----------|------|
| `shared/tests/scheduling/release-planning.test.ts` | T3-U01…U10 | 19 test (milestone status, forecast, deploy, gate, buffer) |
| `backend/tests/releases.test.ts` | T3-I01…I04 | 4 test (milestone+scheduling, release forecast, deploy CRUD, delayed) |

**Totale test: 163** (142 shared + 21 backend)

### Decisioni chiave

1. **Stato milestone calcolato a runtime** — Non salvato, ricalcolato ad ogni GET basandosi sulle endDate degli assignment
2. **Forecast release calcolato a runtime** — `max(endDate)` dei ticket associati via `releaseId`
3. **Deploy pattern + override** — Pattern ricorrenti (es. "ogni martedì DEV") con override puntuali per eccezioni
4. **Gate come funzioni pure** — `canStartQA` e `isReadyForRelease` sono verificabili senza DB
5. **Buffer configurabile** — Default 1 giorno lavorativo tra fine QA e deploy PROD

### Non fatto (rimandato)

- ❌ Vista Gantt raggruppata per milestone/release (evoluzione Release 4)
- ❌ Associazione ticket→milestone/release da UI ticket (serve UI ticket aggiornata)
- ❌ Test E2E Playwright

---

## Release 4 — Dependencies, Priorities & Advanced Scheduling

**Data:** 2026-03-30
**Stato:** ✅ Completata

### Obiettivo

Rendere il motore di pianificazione più affidabile e vicino alla realtà operativa del team, con supporto a dipendenze tra ticket, ordinamento topologico, alert intelligenti e impact analysis.

### Cosa è stato fatto

#### 1. Dependency Graph (`@planning/shared/src/scheduling/dependency-graph.ts`)

Nuovo modulo con funzioni pure per la gestione del grafo delle dipendenze:

| Funzione | Descrizione |
|----------|-------------|
| `buildAdjacencyList(deps)` | Costruisce mappa di adiacenza (esclude `parallel`) |
| `getImplicitDevQaDependencies(assignments)` | Genera dipendenze implicite DEV→QA per lo stesso ticket |
| `detectCycles(deps)` | Rileva cicli con DFS — restituisce i ticket nel ciclo |
| `topologicalSort(ticketIds, deps)` | Ordinamento topologico (Kahn's algorithm) — null se ciclo |
| `getImpactedTickets(ticketId, deps)` | Trova tutti i ticket a valle (transitivo) |
| `getPredecessors(ticketId, deps)` | Predecessori diretti di un ticket |
| `getSuccessors(ticketId, deps)` | Successori diretti di un ticket |

#### 2. Alert Engine (`@planning/shared/src/scheduling/alerts.ts`)

Nuovo modulo per la generazione di alert intelligenti:

| Alert Type | Severity | Trigger |
|-----------|----------|---------|
| `missing_estimate` | warning | Ticket senza stima o con stima zero |
| `dependency_cycle` | error | Ciclo di dipendenze rilevato nel grafo |
| `blocking_dependency` | error | Ticket bloccante non schedulato |
| `late_for_release` | warning | endDate ticket > targetDate release |
| `overallocation` | warning | Minuti assegnati > capacità netta giornaliera |

#### 3. Scheduler con dipendenze (`@planning/shared/src/scheduling/scheduler.ts`)

L'auto-scheduler ora supporta:
- **Ordinamento topologico**: i ticket vengono schedulati rispettando le dipendenze
- **Finish-to-start**: il successore inizia dopo la fine del predecessore
- **Blocking**: equivalente a finish_to_start con evidenza visiva negli alert
- **Parallel**: non crea vincoli di ordinamento (ticket possono sovrapporsi)
- **DEV→QA implicito**: se un ticket ha assignment DEV e QA, QA inizia dopo DEV
- **Priorità**: a parità di dipendenze, rispetta priorityOverride > jiraPriority
- **Locked invariato**: ticket con flag `locked` non vengono mai ricalcolati

#### 4. Jira Mapper — Import issuelinks (`@planning/shared/src/scheduling/jira-mapper.ts`)

Nuova funzione `mapJiraLinksToDependencies`:
- Mappa `issuelinks` Jira a `Dependency` interne
- Supporta link types: blocks, depends on, relates, clones
- Gestisce link inward/outward con direzione corretta
- Evita duplicati (set-based dedup)

#### 5. Backend — Route Dependencies + Store aggiornato

Nuovi endpoint REST:

| Route | Metodo | Descrizione |
|-------|--------|-------------|
| `/api/dependencies` | GET | Lista dipendenze (filtro opzionale per ticketId) |
| `/api/dependencies` | POST | Crea dipendenza (con validazione anti-ciclo) |
| `/api/dependencies/:id` | DELETE | Rimuovi dipendenza |
| `/api/dependencies/impact/:ticketId` | GET | Impact analysis: ticket a valle impattati |

Store aggiornato con `dependencies: Map<string, Dependency>`.
Lo scheduler route ora passa le dipendenze all'auto-scheduler e restituisce `alerts` nel risultato.

#### 6. Frontend — Alert e Dependencies

- **AlertsBanner component**: visualizza gli alert con icone per severity (🔴 error, ⚠️ warning, ℹ️ info) e label per tipo
- **PlanningView aggiornata**: mostra AlertsBanner dopo l'auto-schedule
- **Planning store**: gestione dipendenze (CRUD) + array `alerts` reattivo
- **API client**: endpoint per dependencies (list, create, delete, impact)

#### 7. Test automatici

| File | Test IDs | Casi |
|------|----------|------|
| `shared/tests/scheduling/dependency-graph.test.ts` | T4-U01…U10 | 23 test (cicli, topo sort, impact, predecessori, successori, DEV→QA implicito, scheduler con deps) |
| `shared/tests/scheduling/alerts.test.ts` | T4-U11…U13 | 11 test (missing_estimate, dependency_cycle, blocking, late_for_release, overallocation) |
| `backend/tests/dependencies.test.ts` | T4-I01…I04 | 8 test (CRUD deps, anti-ciclo, auto-plan con deps, override+ricalcolo, alerts, impact API) |

**Totale test: 205** (176 shared + 29 backend)

### Decisioni chiave

1. **Kahn's algorithm per topological sort** — BFS-based, naturale per rilevare cicli (nodi non processati = ciclo)
2. **Dipendenze `parallel` ignorate nell'ordinamento** — Non creano vincoli, i ticket possono sovrapporsi liberamente
3. **DEV→QA implicito nello scheduler** — Non serve creare una dipendenza esplicita: lo scheduler ordina DEV prima di QA per ogni ticket
4. **Validazione anti-ciclo nel backend** — Il POST `/api/dependencies` rifiuta dipendenze che creerebbero cicli
5. **Alert generati post-scheduling** — Gli alert vengono calcolati dopo l'auto-schedule per avere i dati aggiornati
6. **Impact analysis come funzione pura** — `getImpactedTickets` è testabile senza backend, usabile sia da frontend che da backend

### Non fatto (rimandato)

- ❌ Drag & drop su timeline (richiede libreria Gantt avanzata — Release futura)
- ❌ Impact analysis popup pre-conferma (UI complessa — Release futura)
- ❌ Ordinamento per release target / milestone / data target (già supportato come feature, UI da evolvere)
- ❌ Test E2E Playwright

---

## Release 5 — Scenario Planning, Forecast & Reporting

**Data:** 2026-03-30
**Stato:** ✅ Completata

### Obiettivo

Dare al PM strumenti previsionali e decisionali per ottimizzare il planning: scenari what-if, capacity forecast settimanale, KPI di planning e report esportabili.

### Cosa è stato fatto

#### 1. Scenario Engine (`@planning/shared/src/scheduling/scenario.ts`)

Funzioni pure per gestione scenari what-if:

| Funzione | Descrizione |
|----------|-------------|
| `createSnapshot(assignments)` | Crea snapshot dello stato corrente |
| `createScenario(name, desc, assignments)` | Crea scenario come copia dello stato corrente |
| `modifyScenarioAssignment(scenario, id, changes)` | Modifica assignment nello scenario (non impatta stato corrente) |
| `promoteScenario(scenario, assignments)` | Promuove scenario → genera assignment da applicare |
| `compareScenarios(current, scenario)` | Confronto side-by-side: differenze campo per campo |

Logica:
- Lo scenario contiene uno snapshot immutabile degli assignment
- Le modifiche creano un nuovo scenario (immutabilità)
- Il cambio userId resetta automaticamente le date calcolate
- Il promote sovrascrive gli assignment nello store principale

#### 2. Forecast Engine (`@planning/shared/src/scheduling/forecast.ts`)

| Funzione | Descrizione |
|----------|-------------|
| `calculateWeeklyForecast(input)` | Capacità disponibile vs pianificata per settimana, con rilevamento shortage |
| `calculateKPIs(input)` | KPI: saturazione, ratio ticket, sovrallocazione, stime mancanti |

KPI calcolati:

| KPI | Formula |
|-----|---------|
| `overallSaturation` | effort_pianificato / capacità_disponibile × 100 |
| `plannedTicketRatio` | ticket_pianificati / ticket_totali × 100 |
| `overallocationRate` | giorni_sovrallocati / giorni_schedulati × 100 |
| `ticketsWithoutEstimate` | count(ticket senza stima) |

#### 3. Reporting Engine (`@planning/shared/src/scheduling/reporting.ts`)

| Funzione | Descrizione |
|----------|-------------|
| `generatePlanningReport(...)` | Report planning: jiraKey, summary, assignee, date, effort, release, milestone |
| `generateReleaseReport(...)` | Report release: nome, targetDate, forecast, ticket, status |
| `toCSV(rows, columns?)` | Export generico in CSV con escape virgole e virgolette |

#### 4. Scenario type (`@planning/shared/src/types/scenario.ts`)

Nuove interfacce:
- `Scenario` — Scenario con snapshot, nome, descrizione
- `ScenarioSnapshot` — Snapshot degli assignment e ticket IDs
- `ScenarioAssignment` — Copia leggera di un assignment nello scenario

Validatore Zod: `scenarioSchema` con snapshot e assignment nested.

#### 5. Backend — Route Scenari, Forecast, KPI, Report

Nuovi endpoint REST:

| Route | Metodo | Descrizione |
|-------|--------|-------------|
| `/api/scenarios` | GET, POST, DELETE | CRUD scenari what-if |
| `/api/scenarios/:id/assignment/:assignmentId` | PUT | Modifica assignment nello scenario |
| `/api/scenarios/:id/promote` | POST | Promuove scenario a stato corrente |
| `/api/scenarios/:id/compare` | GET | Confronto con stato corrente |
| `/api/forecast/weekly` | GET | Capacity forecast settimanale (query: from, to) |
| `/api/kpis` | GET | KPI di planning |
| `/api/reports/planning` | GET | Report planning (JSON o CSV con `?format=csv`) |
| `/api/reports/releases` | GET | Report release (JSON o CSV) |

Store aggiornato con `scenarios: Map<string, Scenario>`.

#### 6. Frontend — ReportsView + Nav link

- **ReportsView** (`/reports`) con 4 sezioni:
  - 📈 **KPI Dashboard**: 6 card con saturazione, ticket pianificati, sovrallocazione, senza stima, completati, effort
  - 📅 **Capacity Forecast**: tabella settimanale con disponibili/pianificate/delta/saturazione, evidenza shortage
  - 🔮 **Scenari What-If**: creazione, lista, promozione, eliminazione
  - 📥 **Export**: download CSV planning report e release report
- **Nav link** "Report" aggiunto nella barra di navigazione
- **API client**: endpoint per scenarios, forecast, kpis, reports

#### 7. Test automatici

| File | Test IDs | Casi |
|------|----------|------|
| `shared/tests/scheduling/scenario.test.ts` | T5-U01…U03 | 6 test (crea, modifica, promuovi, confronta scenario) |
| `shared/tests/scheduling/forecast.test.ts` | T5-U04…U07 | 6 test (forecast shortage, KPI saturazione, sovrallocazione, ratio) |
| `shared/tests/scheduling/reporting.test.ts` | T5-U08 | 8 test (report planning, release report, CSV export, escape) |
| `backend/tests/scenarios.test.ts` | T5-I01…I03 | 7 test (what-if completo, CRUD, report JSON/CSV, KPI, forecast) |

**Totale test: 232** (196 shared + 36 backend)

### Decisioni chiave

1. **Scenari come snapshot immutabili** — Ogni modifica crea un nuovo oggetto scenario, lo stato corrente non viene mai toccato
2. **KPI calcolati on-demand** — Non persistiti, ricalcolati ad ogni GET per riflettere lo stato aggiornato
3. **CSV export come funzione pura** — `toCSV` è generica e riutilizzabile per qualsiasi array di oggetti
4. **Forecast basato su scheduling reale** — Il forecast settimanale esegue l'auto-scheduler per avere date aggiornate
5. **Promote come sovrascrittura** — Il promote di uno scenario sostituisce gli assignment nello store principale

### Non fatto (rimandato / evoluzioni future)

- ❌ Confronto side-by-side visuale nel frontend (UI avanzata)
- ❌ Scheduling dello scenario (eseguire auto-schedule dentro lo scenario)
- ❌ Storico modifiche / audit trail
- ❌ Export PDF
- ❌ Drag & drop su timeline
- ❌ Test E2E Playwright

---

## Hotfix — Miglioramenti Assenze e Meeting Ricorrenti

**Data:** 2026-03-30
**Stato:** ✅ Completata

### Cosa è stato fatto

#### 1. Assenze multi-giorno

- `Absence.date` → `Absence.startDate` + `Absence.endDate` (range di date)
- Le assenze possono ora coprire un intervallo (es. ferie dal 10 al 14 aprile)
- Per assenze di 1 giorno, `startDate === endDate`
- Aggiornati: tipo, validatore Zod, scheduler, forecast, capacity route, frontend form (Da — A)

#### 2. Meeting ricorrenti su più giorni

- `RecurringMeeting.dayOfWeek: number | null` → `RecurringMeeting.daysOfWeek: number[]`
- I meeting possono ora svolgersi su più giorni della settimana (es. Lun/Mer/Ven)
- Per frequency `daily` il campo è `[]` (ignorato, si applica a tutti i lun-ven)
- Frontend: sostituite le select con checkboxes (Lun/Mar/Mer/Gio/Ven)

#### 3. Prepopolamento form per persona selezionata

- Quando si seleziona un utente nella griglia capacità, i form assenze e meeting pre-compilano automaticamente il campo "Persona" con l'utente selezionato

#### 4. File aggiornati

| Area | File |
|------|------|
| **Tipo** | `shared/src/types/calendar.ts` |
| **Validatore** | `shared/src/validators/index.ts` |
| **Scheduling** | `shared/src/scheduling/capacity.ts`, `scheduler.ts`, `forecast.ts` |
| **Backend** | `backend/src/routes/capacity.ts` |
| **Frontend** | `frontend/src/views/CapacityView.vue` |
| **Test** | `shared/tests/validators.test.ts`, `shared/tests/scheduling/capacity-real.test.ts`, `backend/tests/capacity.test.ts` |
| **Docs** | `docs/DOMAIN_MODEL.md`, `docs/RELEASE_LOG.md` |
| **Data** | `backend/data/store.json` (migrato) |

**Totale test: 232** (196 shared + 36 backend) — tutti passano

---

## Refactoring — Code Quality & DRY

**Data:** 2026-03-30
**Stato:** ✅ Completato

### Cosa è stato fatto

#### 1. Estrazione `getUserDailyCapacity` in `capacity.ts`

La funzione era duplicata in `scheduler.ts` (come `getUserDailyCapacity`) e `forecast.ts` (come `getUserDayCapacity`) con logica identica. Ora è un singolo export in `shared/scheduling/capacity.ts`:
- Compone `getMeetingMinutesForDay` + `calculateDailyCapacity`
- Usata da scheduler, forecast e dalla route capacity del backend

#### 2. Estrazione `buildSchedulerInput()` in helper backend

La costruzione di `SchedulerInput` dallo store era ripetuta **4 volte** nelle route: `scheduler.ts`, `scenarios.ts` (forecast, KPI, report). Ora è un singolo helper in `backend/helpers/scheduler-input.ts`.

#### 3. Consolidamento import nello store

Gli import da `@planning/shared` nel file `store/index.ts` erano su 11 righe separate. Consolidati in un singolo `import type { ... }`.

#### 4. Pulizia import inutilizzati

Rimossi import non più utilizzati dopo l'estrazione delle funzioni (`calculateDailyCapacity`, `calculateDurationDays`, `getMeetingMinutesForDay` in scheduler.ts; `calculateDailyCapacity`, `applyAllocation`, `getMeetingMinutesForDay` in forecast.ts).

#### 5. Allineamento versioni pacchetti

`@planning/shared` da `0.0.0` a `0.1.0` per allinearsi con backend e frontend.

#### 6. Aggiornamento documentazione

- `README.md` aggiornato con stato reale (Release 5, stack corretto, 232 test)
- `AI_CONTEXT.md` aggiornato con stato e refactoring recenti
- `docs/ARCHITECTURE.md` aggiornato con cartella `helpers/` e funzioni estratte
- `docs/NEXT_FEATURES.md` creato con checklist feature future

**Totale test: 232** (196 shared + 36 backend) — tutti passano

---

## Feature Batch — Alta + Media + Bassa Priorità + Debito Tecnico

**Data:** 2026-03-30
**Stato:** ✅ Completato

### Obiettivo

Implementare tutte le feature della checklist `docs/NEXT_FEATURES.md`.

### Completate

- **6/6 Alta priorità**: Prisma+SQLite, JWT Auth, Playwright E2E, PUT validation, Toast error handling, Drag&Drop Gantt
- **6/9 Media priorità**: Ticket→milestone/release UI, Filtri avanzati, Scenario scheduling, Import deps Jira, Paginazione Jira, Bulk update
- **4/12 Bassa priorità**: Dark mode, Docker Compose, GitHub Actions CI, OpenAPI/Swagger
- **4/6 Debito tecnico**: Sovrallocazione precisa, Calendar per utente (verificato ok), TS strict frontend, 9 test edge case scheduler

### Test aggiunti

| File | Casi |
|------|------|
| `backend/tests/new-features.test.ts` | 10 test (auth JWT, PUT validation, bulk update, scenario schedule) |
| `shared/tests/scheduling/scheduler-edge-cases.test.ts` | 9 test (estimate 0/null, user mancante, capacity 0, locked, 2 assign, weekend, ferie, stima enorme) |

**Totale test: 251** (205 shared + 46 backend) — tutti passano

