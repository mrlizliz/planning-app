# Jira Planning App — Roadmap (PM / DEV / QA)

> ⚠️ **REGOLA AI — Documentazione obbligatoria post-release:**
> Dopo ogni release completata, l'AI **deve** creare o aggiornare i seguenti file markdown:
>
> | File | Scopo |
> |------|-------|
> | `AI_CONTEXT.md` | Entry point — stato attuale del progetto |
> | `docs/ARCHITECTURE.md` | Struttura cartelle, dipendenze, decisioni architetturali |
> | `docs/DOMAIN_MODEL.md` | Entità, relazioni, formule, glossario |
> | `docs/RELEASE_LOG.md` | Storico release: cosa è stato fatto, decisioni prese |
> | `docs/CONVENTIONS.md` | Convenzioni di codice, naming, pattern |
>
> Fare **sempre** riferimento a questo file (`jira-planning-roadmap.md`) per la
> struttura dei file, delle cartelle, la pianificazione delle feature e i test plan.
> Ogni modifica strutturale deve essere riflessa nei documenti di contesto.

---

## Obiettivo

Realizzare un'applicazione di capacity planning per Project Manager che integri i ticket Jira e consenta di pianificare le attività di **DEV** e **QA** in modo realistico, tenendo conto di:

- Giorni lavorativi effettivi (esclusione weekend e festivi)
- Allocazione per risorsa (100%, 50%, 25%, ecc.)
- Capacità reale giornaliera (meeting, assenze, overhead)
- Milestone, release e finestre di deploy (DEV / PROD)
- Pianificazione ibrida (automatica + override manuale del PM)

---

## Assunzioni iniziali

| Parametro              | Valore                                |
|------------------------|---------------------------------------|
| Ambito team            | Singolo team                          |
| Ruoli pianificabili    | DEV, QA                               |
| Unità di stima         | Ore                                   |
| Fonte ticket           | Jira (key, summary, estimate, ecc.)   |
| Uso Jira attuale       | Non viene usato per il planning       |
| Modalità di scheduling | Ibrida (auto + override manuale)      |

---

## Visione prodotto

L'app non è solo un calendario: è un **motore di capacity planning e scheduling** che trasforma effort in ore → date realistiche, basandosi sulla disponibilità reale del team.

### Obiettivi principali

1. Importare ticket da Jira con stime in ore
2. Tradurre le stime in date di start/end realistiche
3. Evidenziare sovrallocazioni e colli di bottiglia
4. Supportare milestone, release e giorni di deploy
5. Consentire aggiustamenti manuali da parte del PM

---

## Stack tecnico

### Frontend — Vue 3 + TypeScript

| Tecnologia                | Scopo                                                                  |
|---------------------------|------------------------------------------------------------------------|
| **Vue 3** (Composition API) | Framework UI reattivo, leggero, ottimo per UI data-driven complesse  |
| **TypeScript**            | Type safety su domain model condiviso con il backend                   |
| **Vite**                  | Dev server e bundler ultra-veloce, HMR istantaneo                      |
| **Pinia**                 | State management — store per ticket, calendar, capacity, scenarios      |
| **Vue Router**            | Routing SPA (planning, settings, reports, scenario comparison)         |
| **PrimeVue**              | Libreria componenti enterprise (DataTable, Calendar, Dialog, Charts)   |
| **@bryntum/gantt** _oppure_ **dhtmlxGantt** | Componente Gantt con drag & drop, dipendenze, zoom, critical path |
| **VueUse**                | Composables utility (debounce, infinite scroll, localStorage, ecc.)    |
| **Chart.js + vue-chartjs** | Heatmap capacità, grafici a barre impilate, KPI dashboard            |
| **date-fns**              | Manipolazione date (working days, holidays, range) — tree-shakeable    |

**Perché Vue 3 e non React/Angular:**

- **Composition API** → logica di scheduling riutilizzabile come composables (`useCapacity`, `useScheduler`, `useCalendar`)
- **Reattività granulare** → ricalcolo efficiente: solo i componenti impattati si aggiornano quando cambia un ticket
- **Curva di apprendimento bassa** → team produttivo in fretta
- **Ecosystem maturo** → PrimeVue ha componenti enterprise-grade (Gantt-like timeline, DataTable filtrabili, Calendar)
- **Bundle size ridotto** → ~33KB gzipped vs ~42KB React+ReactDOM
- **TypeScript first-class** → `<script setup lang="ts">` con inferenza automatica dei tipi

### Backend — Node.js + Fastify + TypeScript

| Tecnologia                | Scopo                                                                  |
|---------------------------|------------------------------------------------------------------------|
| **Node.js 20+ LTS**      | Runtime JavaScript — stessa lingua del frontend, modelli condivisi     |
| **Fastify**               | Framework HTTP ad alte prestazioni (~3× Express), schema validation    |
| **TypeScript**            | Type safety end-to-end, tipi condivisi con il frontend                 |
| **Prisma**                | ORM type-safe con migrations, supporto PostgreSQL                      |
| **PostgreSQL**            | DB relazionale — relazioni complesse (ticket→assignment→person), JSONB per config |
| **Zod**                   | Validazione runtime input API, generazione TypeScript types            |
| **bullmq + Redis**        | Job queue per sync Jira e Outlook (retry, rate limiting, scheduling)   |
| **@fastify/oauth2**       | OAuth2 flow per Microsoft Graph API                                    |
| **pino**                  | Logging strutturato (JSON) ad alte prestazioni                         |
| **node-cron**             | Scheduling sync periodiche (opzionale, alternativa a webhook)          |

**Perché Fastify e non Express/NestJS:**

- **Performance** → ricalcolo scheduling < 2s (RNF-02), Fastify è 3× più veloce di Express
- **JSON Schema validation** integrata → validazione automatica request/response
- **Plugin system** → modulare per design (plugin jira, plugin outlook, plugin scheduler)
- **TypeScript-first** → tipi auto-generati dagli schemi
- **Leggero** → meno overhead di NestJS, più controllo sull'architettura

**Perché PostgreSQL e non MongoDB:**

- Relazioni forti: `Ticket → Assignment → User`, `Ticket → Milestone`, `Ticket → Release`, `Dependency(A, B)`
- Query complesse: "tutti i ticket di una release il cui end_date supera la milestone"
- Transazioni ACID: ricalcolo scheduling atomico
- JSONB per dati flessibili (config team, filtri Outlook, override PM)

### Shared — Monorepo con tipi condivisi

| Tecnologia                | Scopo                                                                  |
|---------------------------|------------------------------------------------------------------------|
| **Turborepo** _oppure_ **pnpm workspaces** | Monorepo con 3 pacchetti: `@planning/frontend`, `@planning/backend`, `@planning/shared` |
| **@planning/shared**      | Tipi TypeScript, costanti, regole di scheduling, validatori Zod        |

```
planning-app/
├── packages/
│   ├── shared/          ← tipi TS, regole scheduling, validatori Zod
│   │   └── src/
│   │       ├── types/          (Ticket, Assignment, Calendar, Milestone…)
│   │       ├── scheduling/     (calcolo duration, working days, capacity)
│   │       └── validators/     (zod schemas)
│   ├── backend/         ← Fastify + Prisma + PostgreSQL
│   │   └── src/
│   │       ├── routes/         (tickets, calendar, capacity, releases…)
│   │       ├── services/       (scheduler, jira-sync, outlook-sync)
│   │       ├── plugins/        (auth, jira, microsoft-graph)
│   │       └── jobs/           (bullmq workers)
│   └── frontend/        ← Vue 3 + Vite + PrimeVue
│       └── src/
│           ├── views/          (PlanningView, CapacityView, ReportsView…)
│           ├── components/     (GanttChart, HeatmapGrid, TicketCard…)
│           ├── composables/    (useScheduler, useCapacity, useCalendar…)
│           ├── stores/         (Pinia: tickets, calendar, capacity…)
│           └── api/            (client HTTP tipizzato)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

**Vantaggio chiave:** la logica di scheduling (calcolo duration, working days, capacity netta) vive in `@planning/shared` e viene usata sia dal backend (ricalcolo) sia dal frontend (preview istantanea prima del salvataggio).

### Infrastruttura e deploy

| Tecnologia                | Scopo                                                                  |
|---------------------------|------------------------------------------------------------------------|
| **Docker + docker-compose** | Ambiente locale: backend + PostgreSQL + Redis                        |
| **GitHub Actions**        | CI/CD: lint, test, build, deploy                                       |
| **Fly.io** _oppure_ **Railway** | Deploy backend (alternativa: VPS con Docker)                    |
| **Vercel** _oppure_ **Netlify** | Deploy frontend statico (SPA Vue)                               |

### Stack test

| Strumento         | Scopo                                                |
|-------------------|------------------------------------------------------|
| **Vitest**        | Unit test e integration test (veloce, ESM-native)    |
| **Supertest**     | Test HTTP delle API REST Fastify                     |
| **Playwright**    | Test E2E dell'interfaccia Vue                        |
| **MSW**           | Mock delle API esterne (Jira, Microsoft 365)         |
| **@faker-js/faker** | Generazione dati di test realistici               |
| **@vue/test-utils** | Test componenti Vue in isolamento                  |
| **c8**            | Code coverage (nativo Vitest)                        |

---

# Release 0 — Discovery & Foundation

## Obiettivo

Definire il modello dati, le regole di pianificazione e le basi architetturali. Nessun codice di produzione — solo blueprint e prototipi.

## Deliverable

- [ ] Raccolta requisiti funzionali validata
- [ ] Domain model condiviso (diagramma entità-relazione)
- [ ] Regole di scheduling formalizzate (documento)
- [ ] Wireframe delle schermate principali
- [ ] Scelte stack tecnico documentate
- [ ] Piano integrazione Jira e Microsoft 365

## Feature / Attività

### 1. Domain Modeling

**Entità principali:**

| Entità              | Descrizione                                              |
|---------------------|----------------------------------------------------------|
| `User`              | Utente del sistema (PM, DEV, QA)                         |
| `Role`              | Ruolo pianificabile: DEV o QA                            |
| `Ticket`            | Ticket Jira importato con stime                          |
| `Assignment`        | Assegnazione di un ticket a una persona con allocazione  |
| `Allocation`        | % di tempo dedicato dalla risorsa a un ticket            |
| `WorkingCalendar`   | Calendario lavorativo di team                            |
| `Holiday`           | Giorno festivo                                           |
| `Absence`           | Assenza individuale (ferie, malattia, permesso, ecc.)    |
| `RecurringMeeting`  | Meeting ricorrente che riduce la capacità                |
| `Milestone`         | Milestone di progetto                                    |
| `Release`           | Release con ticket associati                             |
| `DeploymentDay`     | Giorno di deploy consentito (DEV o PROD)                 |
| `Dependency`        | Relazione tra ticket (finish-to-start, ecc.)             |

**Distinzioni chiave:**

- **Effort** = ore di lavoro stimate per completare un ticket
- **Capacity** = ore disponibili effettive di una risorsa in un giorno
- **Duration** = numero di giorni lavorativi necessari (effort / capacity giornaliera)
- **Calendario reale** = insieme di giorni lavorativi, escludendo weekend, festivi e assenze

### 2. Scheduling Rules

- Esclusione automatica di sabati e domeniche
- Esclusione dei giorni festivi configurati
- Allocazione percentuale per risorsa (es. 50% = metà della capacità giornaliera)
- Calcolo date start/end basato su: `ore residue ÷ capacità netta giornaliera`
- Override manuale del PM (con flag `locked`)
- Policy di priorità: priorità Jira come default, override PM possibile

### 3. UX Flows

- Import ticket da Jira → mapping automatico
- Vista planning per persona (timeline orizzontale)
- Vista planning per settimana (griglia team × giorni)
- Inserimento e gestione meeting ricorrenti
- Inserimento milestone e release
- Override manuale di date, assignee e allocazione

### 4. Technical Foundation

- Definizione API REST interne (OpenAPI spec)
- Strategia sync con Jira (polling manuale, poi webhook)
- Strategia integrazione Microsoft 365 calendar (Graph API)
- Auth e ruoli applicativi (PM = write, altri = read)

## Output atteso

Un **blueprint solido** che riduca il rischio di refactor pesanti nelle release successive.

## 🧪 Test — Release 0

> Poiché questa release non produce codice di produzione, i test riguardano la **validazione dei modelli e delle regole**.

| ID       | Tipo       | Descrizione                                                                 |
|----------|------------|-----------------------------------------------------------------------------|
| T0-01    | Schema     | Validare il JSON Schema / TypeScript types del domain model                |
| T0-02    | Schema     | Verificare che ogni entità abbia i campi obbligatori definiti nel ER        |
| T0-03    | Unit       | Test delle regole di scheduling come funzioni pure (input/output)          |
| T0-04    | Unit       | Test calcolo `duration = effort / (capacity × allocation%)`                |
| T0-05    | Unit       | Test esclusione weekend: data inizio lunedì, 5gg effort → fine venerdì    |
| T0-06    | Unit       | Test esclusione festivo infrasettimanale                                   |
| T0-07    | Prototype  | Smoke test dei wireframe interattivi (se presenti)                         |

---

# Release 1 — MVP Planning Core

## Obiettivo

Prima versione usabile: il PM può importare ticket Jira, assegnarli a DEV/QA e ottenere una pianificazione con date realistiche.

## Feature incluse

### 1. Integrazione Jira base

- Connessione a Jira tramite API REST (Basic Auth o API Token)
- Import ticket con i seguenti campi:
  - `key` (es. PROJ-123)
  - `summary`
  - `description`
  - `originalEstimate` (ore)
  - `assignee`
  - `priority`
  - `status`
  - `epic` / `parent` (se disponibile)
- Refresh manuale dei dati (pulsante "Sync from Jira")
- Gestione errori di connessione con retry e feedback utente

### 2. Calendario lavorativo base

- Esclusione automatica di sabati e domeniche
- Gestione festivi manuali (CRUD)
- Calendario unico di team (shared)
- Supporto eccezioni manuali (es. sabato lavorativo)

### 3. Capacity planning base

- Capacità giornaliera configurabile per persona (default: 8h)
- Allocazione percentuale per persona su ciascun ticket
- Conversione: `effort (ore) → durata effettiva (giorni lavorativi)`
- Formula: `durata = effort / (capacity_giornaliera × allocation%)`
- Supporto DEV e QA come ruoli pianificabili distinti

### 4. Scheduling ibrido v1

- Auto-scheduling iniziale: distribuzione ticket in base a priorità e disponibilità
- Override manuale possibile su:
  - Data inizio
  - Data fine
  - Assignee
  - Allocazione %
- Flag `locked` per ticket con override manuale (non vengono ricalcolati)
- Ricalcolo automatico dei ticket non bloccati dopo ogni modifica

### 5. UI MVP

- Vista timeline settimanale (Gantt semplificato)
- Vista per risorsa (carico giornaliero)
- Vista elenco ticket pianificati (tabella ordinabile)
- Indicatore visivo di sovrallocazione (es. barra rossa se ore assegnate > capacità)

## Non incluso in questa release

- ❌ Integrazione Outlook / Teams calendar
- ❌ Dipendenze avanzate tra ticket
- ❌ Milestone e release complete
- ❌ Scenari what-if

## Criteri di successo

- [ ] Il PM riesce a importare ≥1 progetto Jira con ticket e stime
- [ ] Il PM riesce a assegnare ticket a DEV e QA con allocazione %
- [ ] L'app produce date start/end che rispettano weekend, festivi e allocazione
- [ ] La sovrallocazione è visivamente evidente

## 🧪 Test — Release 1

### Unit Test

| ID       | Modulo               | Descrizione                                                                                |
|----------|----------------------|--------------------------------------------------------------------------------------------|
| T1-U01   | Jira Client          | Import ticket restituisce oggetti con campi obbligatori mappati correttamente              |
| T1-U02   | Jira Client          | Gestione errore HTTP 401/403/500 da Jira                                                   |
| T1-U03   | Jira Client          | Ticket senza stima viene importato con `estimate = null` e flag warning                   |
| T1-U04   | Calendar             | `isWorkingDay(date)` → `false` per sabato e domenica                                      |
| T1-U05   | Calendar             | `isWorkingDay(date)` → `false` per giorno festivo configurato                              |
| T1-U06   | Calendar             | `isWorkingDay(date)` → `true` per eccezione manuale (sabato lavorativo)                   |
| T1-U07   | Calendar             | `getWorkingDays(start, end)` → conteggio corretto escludendo weekend e festivi            |
| T1-U08   | Capacity             | Calcolo capacità giornaliera con allocazione 100% → 8h                                    |
| T1-U09   | Capacity             | Calcolo capacità giornaliera con allocazione 50% → 4h                                     |
| T1-U10   | Capacity             | Calcolo capacità giornaliera con allocazione 25% → 2h                                     |
| T1-U11   | Scheduler            | Auto-schedule di 1 ticket 16h su risorsa 100% → 2 giorni lavorativi                       |
| T1-U12   | Scheduler            | Auto-schedule di 1 ticket 16h su risorsa 50% → 4 giorni lavorativi                        |
| T1-U13   | Scheduler            | Auto-schedule con festivo infrasettimanale → giorno saltato                                |
| T1-U14   | Scheduler            | Ticket con `locked = true` non viene ricalcolato                                           |
| T1-U15   | Scheduler            | Sovrallocazione rilevata se ore assegnate > capacità giornaliera                           |

### Integration Test

| ID       | Scenario                        | Descrizione                                                                         |
|----------|---------------------------------|-------------------------------------------------------------------------------------|
| T1-I01   | Jira → Planning                 | Import da Jira + auto-schedule → date coerenti                                      |
| T1-I02   | Override manuale                | Modifica data inizio di un ticket → ricalcolo ticket successivi                     |
| T1-I03   | Refresh Jira                    | Re-import aggiorna stime senza perdere override manuali                             |
| T1-I04   | Calendario + scheduling         | Aggiunta festivo → ricalcolo date di tutti i ticket non bloccati                    |

### E2E Test

| ID       | Flusso                          | Descrizione                                                                         |
|----------|---------------------------------|-------------------------------------------------------------------------------------|
| T1-E01   | Import completo                 | Login → configura Jira → import ticket → verifica lista ticket                     |
| T1-E02   | Pianificazione base             | Assegna ticket a risorsa → verifica date nella timeline                            |
| T1-E03   | Override manuale                | Drag & drop data inizio → verifica che il ticket rimanga bloccato                  |
| T1-E04   | Sovrallocazione                 | Assegna 2 ticket full-time allo stesso giorno → verifica alert visivo             |

---

# Release 2 — Real Capacity & Microsoft Calendar Integration

## Obiettivo

Rendere la capacità giornaliera realistica, considerando meeting, assenze e impegni da Outlook.

## Feature incluse

### 1. Capacità reale per persona

- Ore lavorative giornaliere configurabili (default 8h, personalizzabile)
- Supporto part-time (es. 4h/giorno, 6h/giorno)
- Riduzione per overhead fisso configurabile (es. 30min/giorno per email, admin)
- Gestione assenze manuali con tipologia:
  - Ferie
  - Permesso
  - Malattia
  - Formazione
  - Altro

### 2. Meeting ricorrenti

- CRUD meeting ricorrenti per persona o team
- Tipologie:
  - Daily standup
  - Refinement
  - Sprint planning
  - Retrospettiva
  - 1:1
  - Custom
- Durata e frequenza configurabili
- Impatto automatico sulla capacità giornaliera

### 3. Integrazione Outlook / Teams Calendar (Microsoft Graph API)

- Autenticazione OAuth2 con Microsoft 365
- Import eventi di calendario per persona in una finestra temporale definita
- Classificazione automatica degli eventi che riducono la capacità:
  - Stato `busy` → riduce capacità
  - Evento `all-day` → capacità = 0
  - Meeting ricorrenti → riduzione periodica
- Filtri configurabili:
  - Solo eventi con stato `busy` (esclusi `tentative`, `free`)
  - Esclusione calendari personali / non rilevanti
  - Soglia minima durata evento (es. ≥15 min)
  - Esclusione eventi opzionali (`isOptional = true`)
- Sync manuale (pulsante) nella prima versione

### 4. Regole di capacità

Formula capacità netta giornaliera:

```
capacità_netta = ore_lavorative_teoriche
                 - ore_meeting
                 - ore_assenza
                 - overhead_fisso
```

- Alert automatico se `capacità_netta ≤ 0` in un giorno
- Capacità netta viene usata come input per il calcolo della durata dei ticket

### 5. UI Capacity

- **Heatmap capacità** per persona (verde = disponibile, rosso = saturo)
- Dettaglio giornaliero: ore totali, meeting, assenze, overhead, capacità netta
- Breakdown visivo della capacità persa (grafico a barre impilate)

## Criteri di successo

- [ ] La pianificazione considera la disponibilità reale, non solo l'allocazione %
- [ ] Il PM capisce perché una risorsa ha una certa capacità in un certo giorno
- [ ] Gli eventi Outlook riducono automaticamente la capacità

## 🧪 Test — Release 2

### Unit Test

| ID       | Modulo               | Descrizione                                                                                |
|----------|----------------------|--------------------------------------------------------------------------------------------|
| T2-U01   | Capacity             | Persona con 8h/giorno, 1h meeting, 0.5h overhead → capacità netta = 6.5h                 |
| T2-U02   | Capacity             | Persona part-time 4h/giorno, nessun meeting → capacità netta = 4h                         |
| T2-U03   | Capacity             | Persona in ferie → capacità netta = 0h                                                     |
| T2-U04   | Capacity             | Persona con 3 meeting da 1h + 1h overhead = capacità netta ≤ 4h                           |
| T2-U05   | Capacity             | Alert generato se capacità netta ≤ 0                                                       |
| T2-U06   | Meeting              | Meeting ricorrente daily 15min × 5 giorni = 1.25h/settimana                                |
| T2-U07   | Meeting              | Meeting ricorrente settimanale 1h → impatto solo su quel giorno                            |
| T2-U08   | Absence              | Assenza half-day → capacità dimezzata                                                      |
| T2-U09   | Outlook Sync         | Evento `busy` 2h → riduce capacità di 2h                                                  |
| T2-U10   | Outlook Sync         | Evento `free` o `tentative` → non riduce capacità                                          |
| T2-U11   | Outlook Sync         | Evento `all-day` → capacità = 0                                                            |
| T2-U12   | Outlook Sync         | Evento < soglia minima (es. 10min) → ignorato                                              |
| T2-U13   | Outlook Sync         | Evento `isOptional = true` → ignorato                                                      |
| T2-U14   | Scheduler            | Ricalcolo durata ticket dopo riduzione capacità per meeting                                |

### Integration Test

| ID       | Scenario                          | Descrizione                                                                       |
|----------|-----------------------------------|-----------------------------------------------------------------------------------|
| T2-I01   | Capacity + Scheduling             | Aggiunta meeting ricorrente → ricalcolo date ticket impattati                     |
| T2-I02   | Assenza + Scheduling              | Inserimento ferie 3 giorni → ticket spostati automaticamente                     |
| T2-I03   | Outlook → Capacity                | Mock Graph API → import eventi → verifica riduzione capacità corretta            |
| T2-I04   | Outlook filtri                    | Evento tentative + evento busy → solo busy riduce capacità                       |

### E2E Test

| ID       | Flusso                            | Descrizione                                                                       |
|----------|-----------------------------------|-----------------------------------------------------------------------------------|
| T2-E01   | Configurazione capacità           | Configura persona part-time → verifica heatmap aggiornata                        |
| T2-E02   | Meeting ricorrente                | Aggiungi daily standup → verifica riduzione capacità su tutti i giorni           |
| T2-E03   | Assenza                           | Inserisci ferie → verifica che ticket vengano spostati nella timeline            |
| T2-E04   | Outlook sync                      | Connetti Outlook → sync → verifica capacità ridotta per meeting importati        |

---

# Release 3 — Milestone, Release & Deployment Calendar

## Obiettivo

Gestire la pianificazione rispetto a milestone e finestre di rilascio (deploy DEV e PROD).

## Feature incluse

### 1. Milestone

- CRUD milestone di progetto
- Associazione ticket → milestone (many-to-one)
- Stato milestone calcolato automaticamente:
  - ✅ `on_track` — tutti i ticket finiscono prima della data milestone
  - ⚠️ `at_risk` — almeno un ticket finisce entro 2 giorni dalla data milestone
  - 🔴 `delayed` — almeno un ticket finisce dopo la data milestone

### 2. Release Planning

- CRUD release con data target e descrizione
- Associazione ticket → release (many-to-one)
- Vista filtrata per release
- **Forecast completamento release:** data prevista basata sullo scheduling corrente

### 3. Giorni di rilascio DEV e PROD

- Calendario giorni di deploy DEV (es. ogni martedì e giovedì)
- Calendario giorni di deploy PROD (es. ogni mercoledì)
- Configurazione finestre consentite di rilascio
- Warning per ticket la cui fine QA cade dopo l'ultimo deploy disponibile della release
- Blocco opzionale per deploy fuori finestra

### 4. Gate di processo

Flusso sequenziale obbligatorio:

```
DEV completato → QA completato → Deploy DEV → Deploy PROD
```

- Il ticket non può entrare in QA se DEV non è completato
- Il ticket non può essere deployato in PROD se QA non è completato
- Stato `ready_for_release` calcolato automaticamente
- Buffer configurabile pre-rilascio (es. 1 giorno tra fine QA e deploy PROD)

### 5. UI Release-Oriented

- Timeline per milestone/release (vista Gantt raggruppata)
- Evidenza ticket a rischio di non entrare nella release (badge ⚠️)
- Vista "prossimi deploy disponibili" con ticket idonei

## Criteri di successo

- [ ] Il PM collega la pianificazione del team a date effettive di rilascio
- [ ] L'app segnala in anticipo milestone a rischio
- [ ] I gate DEV → QA → deploy sono rispettati

## 🧪 Test — Release 3

### Unit Test

| ID       | Modulo               | Descrizione                                                                                |
|----------|----------------------|--------------------------------------------------------------------------------------------|
| T3-U01   | Milestone            | Milestone con tutti i ticket che finiscono prima → stato `on_track`                        |
| T3-U02   | Milestone            | Milestone con 1 ticket che finisce dopo → stato `delayed`                                  |
| T3-U03   | Milestone            | Milestone con 1 ticket che finisce entro 2gg → stato `at_risk`                             |
| T3-U04   | Release              | Forecast release = max(end_date) dei ticket associati                                      |
| T3-U05   | Deploy Days          | Prossimo deploy DEV disponibile calcolato correttamente                                    |
| T3-U06   | Deploy Days          | Warning se fine QA > ultimo deploy disponibile della release                               |
| T3-U07   | Gate                 | Ticket non può passare a QA se DEV non è completato → errore                              |
| T3-U08   | Gate                 | Ticket non può essere deployato PROD se QA non completato → errore                        |
| T3-U09   | Gate                 | `ready_for_release` = true solo se QA completato + buffer rispettato                      |
| T3-U10   | Buffer               | Buffer 1gg tra fine QA e deploy PROD → data deploy calcolata correttamente                |

### Integration Test

| ID       | Scenario                          | Descrizione                                                                       |
|----------|-----------------------------------|-----------------------------------------------------------------------------------|
| T3-I01   | Milestone + Scheduling            | Aggiunta ticket a milestone → stato milestone ricalcolato                        |
| T3-I02   | Release forecast                  | Scheduling cambia → forecast release aggiornato                                  |
| T3-I03   | Deploy window                     | Ticket finisce fuori finestra deploy → warning generato                          |
| T3-I04   | Gate flow                         | Ticket DEV completato → QA schedulato automaticamente                            |

### E2E Test

| ID       | Flusso                            | Descrizione                                                                       |
|----------|-----------------------------------|-----------------------------------------------------------------------------------|
| T3-E01   | Milestone                         | Crea milestone → associa ticket → verifica stato nella timeline                  |
| T3-E02   | Release                           | Crea release → associa ticket → verifica forecast                                |
| T3-E03   | Deploy calendar                   | Configura deploy days → verifica warning su ticket fuori finestra                |

---

# Release 4 — Dependencies, Priorities & Advanced Scheduling

## Obiettivo

Rendere il motore di pianificazione più affidabile e vicino alla realtà operativa del team.

## Feature incluse

### 1. Dipendenze tra ticket

- **Finish-to-start (FS):** B inizia dopo che A è finito
- **Parallelizzabile:** A e B possono procedere in parallelo
- **Bloccante:** A blocca l'inizio di B (con evidenza visiva)
- **DEV → QA:** dipendenza implicita tra fase DEV e fase QA dello stesso ticket
- Importazione dipendenze da Jira (`issuelinks`)

### 2. Priorità e regole di ordinamento

- Priorità Jira importata come default
- Override PM sulla priorità di scheduling
- Regole di ordinamento configurabili:
  - Per priorità
  - Per release target
  - Per milestone
  - Per data target

### 3. Scheduling ibrido avanzato

- Auto-plan con ricalcolo intelligente (rispetta dipendenze + priorità)
- Ticket con flag `locked` non vengono mai ricalcolati
- **Drag & drop** su timeline per spostare ticket
- Override manuale con **impact analysis:** mostra quali ticket a valle vengono impattati prima di confermare

### 4. Alert intelligenti

| Alert                           | Trigger                                                      |
|---------------------------------|--------------------------------------------------------------|
| Sovrallocazione risorsa         | Ore assegnate > capacità netta in un giorno                  |
| Ticket in ritardo su release    | Data fine ticket > data target release                       |
| Dipendenza bloccante            | Ticket bloccante non completato → ticket dipendente in stallo|
| Ticket senza stima              | `estimate = null`                                            |
| Capacity shortage               | Capacità netta insufficiente per completare ticket in tempo  |
| Ciclo di dipendenze             | Rilevamento loop nelle dipendenze (A→B→C→A)                 |

## Criteri di successo

- [ ] Le dipendenze vengono rispettate nell'auto-scheduling
- [ ] Il PM può combinare automazione e decisioni manuali senza perdere controllo
- [ ] L'impact analysis mostra chiaramente gli effetti di ogni modifica

## 🧪 Test — Release 4

### Unit Test

| ID       | Modulo               | Descrizione                                                                                |
|----------|----------------------|--------------------------------------------------------------------------------------------|
| T4-U01   | Dependency           | Finish-to-start: B.start ≥ A.end                                                          |
| T4-U02   | Dependency           | Ticket paralleli: A e B possono sovrapporsi                                                |
| T4-U03   | Dependency           | Ticket bloccante non completato → dipendente non schedulabile                              |
| T4-U04   | Dependency           | DEV → QA implicito: QA.start ≥ DEV.end per lo stesso ticket                               |
| T4-U05   | Dependency           | Rilevamento ciclo di dipendenze → errore                                                   |
| T4-U06   | Priority             | Ticket con priorità più alta schedulato prima a parità di condizioni                       |
| T4-U07   | Priority             | Override PM su priorità rispettato                                                         |
| T4-U08   | Scheduler            | Auto-plan con dipendenze: ordine topologico rispettato                                     |
| T4-U09   | Scheduler            | Ticket locked non viene spostato da auto-plan                                              |
| T4-U10   | Impact Analysis      | Spostamento ticket A → mostra ticket B e C impattati                                       |
| T4-U11   | Alert                | Sovrallocazione rilevata correttamente                                                     |
| T4-U12   | Alert                | Ticket senza stima → alert generato                                                        |
| T4-U13   | Alert                | Ciclo di dipendenze → alert specifico generato                                             |

### Integration Test

| ID       | Scenario                          | Descrizione                                                                       |
|----------|-----------------------------------|-----------------------------------------------------------------------------------|
| T4-I01   | Jira links → Dependencies        | Import issuelinks da Jira → dipendenze create correttamente                      |
| T4-I02   | Auto-plan con dipendenze          | Schedule di 5 ticket con dipendenze → ordine e date coerenti                     |
| T4-I03   | Override + ricalcolo              | Lock ticket + modifica → solo ticket non-locked ricalcolati                       |
| T4-I04   | Impact analysis flow              | Sposta ticket → preview impatti → conferma → ricalcolo                           |

### E2E Test

| ID       | Flusso                            | Descrizione                                                                       |
|----------|-----------------------------------|-----------------------------------------------------------------------------------|
| T4-E01   | Dipendenze                        | Crea dipendenza FS → verifica che il ticket dipendente si sposti                 |
| T4-E02   | Drag & drop                       | Sposta ticket con drag & drop → verifica impact analysis popup                   |
| T4-E03   | Alert dashboard                   | Crea scenario con alert multipli → verifica che tutti siano visibili             |

---

# Release 5 — Scenario Planning, Forecast & Reporting

## Obiettivo

Dare al PM strumenti previsionali e decisionali per ottimizzare il planning.

## Feature incluse

### 1. What-If Scenarios

- Creazione scenario alternativo (copia dello stato corrente)
- Simulazione di:
  - Cambio assignee
  - Cambio allocazione %
  - Inserimento assenza
  - Aumento/riduzione capacità
  - Spostamento ticket tra release
- Confronto side-by-side: scenario corrente vs scenario alternativo
- Possibilità di applicare uno scenario ("promote to current")

### 2. Forecast

- Data prevista di completamento per ciascuna milestone
- Data prevista di completamento per ciascuna release
- Capacity forecast per settimana (ore disponibili vs ore pianificate)
- Evidenza colli di bottiglia (settimane con capacity shortage)

### 3. Reporting

| Report                          | Descrizione                                                    |
|---------------------------------|----------------------------------------------------------------|
| Saturazione team                | % capacità usata per persona per settimana                     |
| Carico DEV vs QA                | Confronto ore pianificate DEV e QA                             |
| Report per release              | Stato ticket, forecast, rischi                                 |
| Storico modifiche               | Audit trail delle modifiche manuali del PM                     |

- Export in CSV e PDF
- Snapshot del planning (fotografia a un dato momento)

### 4. KPI di planning

| KPI                                    | Formula / Descrizione                                    |
|----------------------------------------|----------------------------------------------------------|
| Ore pianificate vs capacità disponibile| `Σ effort_assegnato / Σ capacità_netta`                  |
| Ticket pianificati vs completati       | `count(planned) / count(done)`                           |
| Tasso di sovrallocazione               | `giorni con sovrallocazione / giorni totali pianificati` |
| Accuratezza stime (futuro)             | `effort_stimato / effort_consuntivo`                     |

## Criteri di successo

- [ ] Il PM usa l'app per prendere decisioni, non solo per pianificare
- [ ] Le simulazioni what-if mostrano chiaramente l'impatto dei cambiamenti
- [ ] I report sono esportabili e utili per comunicare con gli stakeholder

## 🧪 Test — Release 5

### Unit Test

| ID       | Modulo               | Descrizione                                                                                |
|----------|----------------------|--------------------------------------------------------------------------------------------|
| T5-U01   | Scenario             | Creazione scenario copia lo stato corrente senza modificarlo                               |
| T5-U02   | Scenario             | Modifica scenario non impatta lo stato corrente                                            |
| T5-U03   | Scenario             | Promote scenario → stato corrente viene sostituito                                         |
| T5-U04   | Forecast             | Forecast milestone = max(end_date) dei ticket associati                                    |
| T5-U05   | Forecast             | Capacity forecast: settimana con 40h disponibili e 50h pianificate → shortage             |
| T5-U06   | KPI                  | Calcolo saturazione: 30h pianificate / 40h disponibili = 75%                               |
| T5-U07   | KPI                  | Tasso sovrallocazione calcolato correttamente                                              |
| T5-U08   | Report               | Export CSV contiene tutte le colonne attese                                                |

### Integration Test

| ID       | Scenario                          | Descrizione                                                                       |
|----------|-----------------------------------|-----------------------------------------------------------------------------------|
| T5-I01   | What-if completo                  | Crea scenario → modifica assignee → confronta date con stato corrente            |
| T5-I02   | Forecast + scheduling             | Modifica capacità → forecast milestone aggiornato                                |
| T5-I03   | Report generation                 | Genera report release → verifica contenuto coerente con planning                 |

### E2E Test

| ID       | Flusso                            | Descrizione                                                                       |
|----------|-----------------------------------|-----------------------------------------------------------------------------------|
| T5-E01   | Scenario what-if                  | Crea scenario → modifica → confronto side-by-side → promote                     |
| T5-E02   | Dashboard KPI                     | Verifica che i KPI mostrati siano coerenti con lo stato del planning             |
| T5-E03   | Export report                     | Genera report → download CSV → verifica contenuto file                           |

---

## Backlog post-release / Evoluzioni future

| Area                        | Descrizione                                                      |
|-----------------------------|------------------------------------------------------------------|
| Multi-team                  | Gestione di più team con risorse condivise                       |
| Multi-country calendars     | Festivi diversi per paese                                        |
| Portfolio / Programma       | Vista aggregata multi-progetto                                   |
| ML sulle stime              | Suggerimento stime basato su storico                             |
| Timesheet / consuntivi      | Integrazione con ore effettive lavorate                          |
| Notifiche Slack / Teams     | Alert in tempo reale sui canali del team                         |
| Workflow approval           | Approvazione release tramite l'app                               |
| Sprint planning avanzato    | Supporto pianificazione a sprint con velocity                    |
| Skill matrix                | Capacity planning per competenza, non solo per persona           |
| Environment constraints     | Gestione vincoli di ambiente (staging, produzione limitata)      |

---

## Priorità di implementazione

```
Release 0  →  Discovery & Foundation           (prerequisito)
Release 1  →  MVP Planning Core                (valore immediato)
Release 2  →  Real Capacity & Calendar          (precisione planning)
Release 3  →  Milestone / Release / Deploy      (allineamento business)
Release 4  →  Dependencies & Advanced Scheduling(affidabilità schedule)
Release 5  →  Scenario Planning & Reporting     (decisioni strategiche)
```

---

## Requisiti funzionali chiave

| ID     | Requisito                     | Descrizione                                                                      |
|--------|-------------------------------|----------------------------------------------------------------------------------|
| RF-01  | Import ticket Jira            | Importare ticket con stime in ore e metadati principali                          |
| RF-02  | Working calendar              | Escludere weekend e festivi dal calcolo della durata                              |
| RF-03  | Allocation                    | Supportare allocazione percentuale per persona                                   |
| RF-04  | Real capacity                 | Calcolare capacità netta considerando meeting, assenze e disponibilità           |
| RF-05  | Hybrid scheduling             | Supportare pianificazione automatica e override manuale del PM                   |
| RF-06  | Release planning              | Definire milestone, release e giorni di deploy DEV/PROD                          |
| RF-07  | Alerting                      | Segnalare sovrallocazioni, ritardi e conflitti                                   |
| RF-08  | Scenario planning             | Supportare simulazioni what-if con confronto                                     |
| RF-09  | Reporting                     | Generare report esportabili e KPI di planning                                    |

---

## Requisiti non funzionali

| ID     | Requisito                     | Descrizione                                                                      |
|--------|-------------------------------|----------------------------------------------------------------------------------|
| RNF-01 | Usabilità                     | UI chiara e orientata al PM, azioni ≤ 3 click                                   |
| RNF-02 | Performance                   | Ricalcolo scheduling < 2 secondi per team ≤ 50 ticket                            |
| RNF-03 | Audit trail                   | Log di tutte le modifiche manuali (chi, cosa, quando)                            |
| RNF-04 | Resilienza integrazioni       | Retry automatico e fallback per API Jira e Microsoft 365                         |
| RNF-05 | Sicurezza                     | Auth, ruoli applicativi (PM = write, altri = read-only)                          |
| RNF-06 | Estendibilità                 | Architettura modulare, pronta per multi-team                                     |
| RNF-07 | Testabilità                   | Code coverage ≥ 80% per logica di scheduling e capacity                          |

---

## Note di integrazione

### Jira

- Fonte primaria dei ticket e delle stime
- API REST v2/v3 con autenticazione Basic Auth o API Token
- Campi rilevanti: `key`, `summary`, `description`, `timeOriginalEstimate`, `assignee`, `priority`, `status`, `issuelinks`, `parent`
- Sync manuale iniziale, poi webhook per aggiornamenti in tempo reale

### Microsoft 365 / Outlook / Teams

- Fonte della disponibilità reale delle persone
- Microsoft Graph API con autenticazione OAuth2
- Endpoint: `/me/calendarView` per eventi in finestra temporale
- Campi rilevanti: `subject`, `start`, `end`, `showAs`, `isAllDay`, `isOrganizer`, `responseStatus`

### Filtri consigliati per eventi Outlook

Per evitare rumore nella capacità, applicare:

- ✅ Solo eventi con `showAs = busy`
- ❌ Escludere eventi `tentative`, `free`, `oof` (out-of-office va gestito come assenza)
- ❌ Escludere eventi opzionali (`responseStatus.response = tentativelyAccepted` e `isOptional`)
- ❌ Escludere calendari personali / non rilevanti
- ⏱️ Soglia minima durata evento: 15 minuti

---

## Suggerimento pratico per partire

Percorso consigliato per ridurre il rischio:

1. **Motore di planning** con calendari lavorativi e allocazione → logica solida prima di qualsiasi integrazione
2. **Capacità reale manuale** (meeting, assenze) → precisione del calcolo
3. **Integrazione Microsoft calendar** → automazione della disponibilità
4. **Release e deploy days** → allineamento con il processo di rilascio
5. **Dipendenze e scenari** → evoluzione del motore per casi avanzati

> ⚡ Non partire dalle integrazioni: prima costruisci una logica di scheduling che funziona con dati manuali, poi collegala ai sistemi esterni.
