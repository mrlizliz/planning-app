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

**Data:** TBD
**Stato:** 🔜 Prossima

### Obiettivo previsto

Prima versione usabile: import Jira, assegnamento ticket, scheduling con date realistiche.

Vedi `jira-planning-roadmap.md` → Release 1 per dettagli completi.

