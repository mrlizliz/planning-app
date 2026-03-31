# AI Context — Planning App

> ⚠️ **REGOLA FONDAMENTALE PER L'AI:**
> Dopo ogni release o batch di modifiche, SEMPRE aggiornare i file markdown
> nella root del progetto per mantenere il contesto aggiornato.
> **Questa regola è OBBLIGATORIA — non chiudere mai un task senza aver
> verificato che la documentazione sia allineata al codice.**
> Fare **sempre** riferimento a `jira-planning-roadmap.md` per la struttura
> dei file, delle cartelle e la pianificazione delle feature.
> Ogni decisione architetturale e ogni modifica strutturale devono essere
> riflesse in questi documenti.

Questo file è il punto di ingresso per qualsiasi AI che lavori su questo progetto.
Leggilo **prima** di qualsiasi modifica al codice.

## File di contesto

| File | Scopo |
|------|-------|
| `jira-planning-roadmap.md` | Roadmap completo: feature, release, test plan, stack tecnico |
| `AI_CONTEXT.md` | **Questo file** — entry point per l'AI |
| `docs/ARCHITECTURE.md` | Architettura, struttura cartelle, decisioni tecniche |
| `docs/DOMAIN_MODEL.md` | Entità, relazioni, glossario, regole di business |
| `docs/RELEASE_LOG.md` | Storico delle release completate, cosa è stato fatto |
| `docs/CONVENTIONS.md` | Convenzioni di codice, naming, pattern usati |
| `docs/NEXT_FEATURES.md` | Checklist feature future con priorità |

## Progetto

**Planning App** — Applicazione di capacity planning per Project Manager.
Integra ticket Jira e consente di pianificare attività DEV/QA con date realistiche,
tenendo conto di capacità reale, meeting, assenze, festivi, milestone e release.

## Stack

- **Frontend:** Vue 3 + TypeScript + Vite + PrimeVue + Pinia (dark mode, toast notifications)
- **Backend:** Fastify + TypeScript + JWT Auth + Swagger/OpenAPI (persistenza JSON + Prisma/SQLite pronto)
- **Shared:** Monorepo pnpm con pacchetto `@planning/shared` (tipi, scheduling, validatori)
- **Test:** Vitest (unit + integration) — 259 test (209 shared + 50 backend) + Playwright E2E
- **Infra:** pnpm workspaces + Turborepo + Docker Compose + GitHub Actions CI

## Stato attuale

- **Release completate:** Release 0–5 + Hotfix + Feature batch (HIGH+MEDIUM+LOW+Debito tecnico) + UX improvements
- **Ultimo aggiornamento:** 2026-03-31 — Gantt allocation %, drag&drop fix, Jira sync improvements, UI improvements
- **Prossima attività:** Vedere `docs/NEXT_FEATURES.md` per le feature rimanenti (non spuntate)

## Feature recenti implementate

### Alta priorità (completate)
- Prisma + SQLite (schema completo, client generato, switchable via env)
- JWT Auth (`/api/auth/login`, `/api/auth/me`, decorator authenticate/authorize)
- Playwright E2E test setup
- Validazione Zod nelle route PUT milestones/releases
- Error handling frontend con Toast notifications
- Drag & drop sulla timeline Gantt

### Media priorità (completate)
- Associazione ticket → milestone/release da UI (dropdown inline)
- Filtri avanzati ticket (status, priorità, ricerca testo)
- Scheduling scenario what-if (senza impattare stato corrente)
- Import dipendenze Jira nel flusso sync
- Paginazione Jira (fetchAll automatico)
- Bulk update ticket (`PUT /api/tickets/bulk`)

### Bassa priorità (completate)
- Dark mode con toggle persistente
- Docker Compose (PostgreSQL + backend + frontend)
- GitHub Actions CI (test + build)
- Swagger/OpenAPI UI su `/docs`

### Debito tecnico (risolto)
- Sovrallocazione precisa (day-by-day)
- 9 test edge case scheduler
- TypeScript strict mode frontend

### Miglioramenti post-batch (2026-03-31)
- **Gantt allocation %**: barre con altezza proporzionale, label "50%", bordo tratteggiato, tooltip con allocazione
- **Gantt drag & drop fix**: uso `event.currentTarget`, `isDragging` separato con `requestAnimationFrame`
- **Gantt navigation**: ◀ ▶ 1 settimana, Today, Adatta, zoom 2/4/8/12 settimane
- **Gantt festivi/assenze**: celle grigie per weekend/festivi/assenze, drop impedito su giorni non lavorativi
- **Jira sync migliorato**: cursor-based pagination (`nextPageToken`), deduplicazione, safety limit 200 pagine
- **jiraStatus**: campo `statusCategory` importato da Jira, usato per filtri e stats nella TicketTable
- **Creazione ticket manuale**: CreateTicketDialog per ticket non provenienti da Jira
- **Auto-schedule alla creazione assignment**: il backend schedula il nuovo assignment senza spostare gli esistenti
- **Sync Jira rimpiazza**: ticket rimossi da Jira vengono eliminati dallo store (con assignment e dipendenze orfane)
- **TicketTable paginazione**: 25/50/100/tutti, reset pagina su cambio filtri
- **AssignTicketDialog + AssignmentDetailDialog**: dialoghi integrati nella PlanningView
- **CI GitHub Actions**: rimosso pin versione pnpm (usa packageManager da package.json)

## Come orientarsi

1. Leggi `jira-planning-roadmap.md` per il quadro completo
2. Leggi `docs/ARCHITECTURE.md` per capire la struttura
3. Leggi `docs/DOMAIN_MODEL.md` per il modello dati
4. Leggi `docs/CONVENTIONS.md` per le regole di codice
5. Guarda `docs/RELEASE_LOG.md` per sapere cosa è stato già fatto
6. Guarda `docs/NEXT_FEATURES.md` per le prossime implementazioni
