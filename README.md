# 📋 Planning App — Jira Capacity Planning

Applicazione di **capacity planning** per Project Manager che integra ticket Jira e consente di pianificare attività DEV/QA con date realistiche.

## Funzionalità chiave

- 📥 Import ticket da Jira con stime in ore
- 📅 Calendario lavorativo (weekend, festivi, assenze)
- ⚡ Traduzione effort → date realistiche
- 👥 Allocazione % per risorsa (100%, 50%, 25%…)
- 🔒 Override manuale del PM con flag `locked`
- 🚨 Rilevamento sovrallocazioni
- 📊 Milestone, release e finestre di deploy

## Stack tecnico

| Layer | Tecnologia |
|-------|-----------|
| **Frontend** | Vue 3 + TypeScript + Vite + PrimeVue + Pinia |
| **Backend** | Fastify + TypeScript + Prisma + PostgreSQL |
| **Shared** | Monorepo pnpm — tipi, scheduling, validatori Zod |
| **Test** | Vitest + Supertest + Playwright |
| **Infra** | Docker Compose (dev), GitHub Actions (CI/CD) |

## Struttura progetto

```
planning-app/
├── packages/
│   ├── shared/        ← Tipi TS, regole scheduling, validatori Zod
│   ├── backend/       ← Fastify + Prisma + PostgreSQL
│   └── frontend/      ← Vue 3 + Vite + PrimeVue
├── docs/              ← Documentazione architetturale
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
pnpm test:shared

# Dev mode
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

## Release attuali

- ✅ **Release 0** — Discovery & Foundation (domain model, scheduling rules, validatori, test)
- ⏳ **Release 1** — MVP Planning Core (prossima)

## Licenza

Progetto privato.

