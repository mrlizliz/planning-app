# 📋 Planning App — Jira Capacity Planning

Applicazione di **capacity planning** per Project Manager che integra ticket Jira e consente di pianificare attività DEV/QA con date realistiche.

## Funzionalità chiave

- 📥 Import ticket da Jira con stime in ore
- 📅 Calendario lavorativo (weekend, festivi, assenze, meeting)
- ⚡ Traduzione effort → date realistiche (scheduling day-by-day)
- 👥 Allocazione % per risorsa (100%, 50%, 25%…)
- 🔒 Override manuale del PM con flag `locked`
- 🚨 Rilevamento sovrallocazioni e alert intelligenti
- 📊 Milestone, release e finestre di deploy (DEV/PROD)
- 🔗 Dipendenze tra ticket con ordinamento topologico
- 🔮 Scenari what-if con confronto side-by-side
- 📈 KPI, capacity forecast settimanale, report CSV

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| **Frontend** | Vue 3 + TypeScript + Vite + PrimeVue + Pinia |
| **Backend** | Fastify + TypeScript (persistenza JSON su file, Prisma + PostgreSQL previsti) |
| **Shared** | Monorepo pnpm — tipi, scheduling, validatori Zod |
| **Test** | Vitest (unit + integration) — 251 test |
| **Infra** | pnpm workspaces + Turborepo |

## Struttura progetto

```
planning-app/
├── packages/
│   ├── shared/        ← Tipi TS, regole scheduling, validatori Zod
│   ├── backend/       ← Fastify + persistenza JSON (pre-database)
│   └── frontend/      ← Vue 3 + Vite + PrimeVue
├── docs/              ← Documentazione architetturale
├── scripts/           ← Script di seed e configurazione
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Requisiti

- **Node.js** 20+ LTS
- **pnpm** 9+

## Setup

```bash
# Installa pnpm (se non presente)
npm install -g pnpm@9

# Installa dipendenze
pnpm install

# Esegui i test
pnpm test

# Dev mode (backend + frontend)
pnpm dev
```

## Documentazione

| File | Scopo |
|------|-------|
| [AI_CONTEXT.md](AI_CONTEXT.md) | Entry point per AI — stato del progetto |
| [jira-planning-roadmap.md](jira-planning-roadmap.md) | Roadmap completa con feature e test plan |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architettura e decisioni tecniche |
| [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md) | Entità, relazioni, formule |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Convenzioni di codice |
| [docs/RELEASE_LOG.md](docs/RELEASE_LOG.md) | Storico release completate |
| [docs/NEXT_FEATURES.md](docs/NEXT_FEATURES.md) | Checklist feature future |

## Release completate

- ✅ **Release 0** — Discovery & Foundation (domain model, scheduling rules, validatori, test)
- ✅ **Release 1** — MVP Planning Core (backend Fastify, frontend Vue 3, scheduler, Jira import)
- ✅ **Release 2** — Real Capacity & Microsoft Calendar Integration
- ✅ **Release 3** — Milestone, Release & Deployment Calendar
- ✅ **Release 4** — Dependencies, Priorities & Advanced Scheduling
- ✅ **Release 5** — Scenario Planning, Forecast & Reporting
- ✅ **Hotfix** — Assenze multi-giorno + meeting multi-giorno

## Licenza

Progetto privato.
