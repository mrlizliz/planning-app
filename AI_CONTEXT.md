# AI Context — Planning App

> ⚠️ **REGOLA FONDAMENTALE PER L'AI:**
> Dopo ogni release, creare o aggiornare i file markdown nella root del progetto
> per mantenere il contesto aggiornato. Fare **sempre** riferimento a
> `jira-planning-roadmap.md` per la struttura dei file, delle cartelle e la
> pianificazione delle feature. Ogni decisione architetturale e ogni modifica
> strutturale devono essere riflesse in questi documenti.

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

## Progetto

**Planning App** — Applicazione di capacity planning per Project Manager.
Integra ticket Jira e consente di pianificare attività DEV/QA con date realistiche,
tenendo conto di capacità reale, meeting, assenze, festivi, milestone e release.

## Stack

- **Frontend:** Vue 3 + TypeScript + Vite + PrimeVue + Pinia
- **Backend:** Fastify + TypeScript (persistenza su file JSON, Prisma + PostgreSQL previsti)
- **Shared:** Monorepo pnpm con pacchetto `@planning/shared` (tipi, scheduling, validatori)
- **Test:** Vitest (unit + integration)
- **Infra:** pnpm workspaces + Turborepo

## Stato attuale

- **Release completata:** Release 5 — Scenario Planning, Forecast & Reporting
- **Prossima release:** Backlog post-release / Evoluzioni future

## Come orientarsi

1. Leggi `jira-planning-roadmap.md` per il quadro completo
2. Leggi `docs/ARCHITECTURE.md` per capire la struttura
3. Leggi `docs/DOMAIN_MODEL.md` per il modello dati
4. Leggi `docs/CONVENTIONS.md` per le regole di codice
5. Guarda `docs/RELEASE_LOG.md` per sapere cosa è stato già fatto

