# Convenzioni — Planning App

> Riferimento: `jira-planning-roadmap.md` per la struttura prevista

## Regola AI

> ⚠️ **Dopo ogni release o batch di modifiche, SEMPRE aggiornare i file markdown di contesto:**
> - `AI_CONTEXT.md` — stato attuale del progetto
> - `docs/ARCHITECTURE.md` — struttura e decisioni tecniche
> - `docs/DOMAIN_MODEL.md` — entità e regole di business
> - `docs/RELEASE_LOG.md` — storico delle release
> - `docs/NEXT_FEATURES.md` — checklist feature (spuntare completate, aggiungere nuove)
> - `docs/CONVENTIONS.md` — questo file
>
> **Questa regola è OBBLIGATORIA.** Non chiudere mai un task senza aver verificato
> che la documentazione sia allineata al codice. Fare **sempre** riferimento a
> `jira-planning-roadmap.md` per la struttura dei file, delle cartelle, le feature
> previste e i test plan.

## Linguaggi e formattazione

- **TypeScript** per tutto il codice (frontend, backend, shared)
- Strict mode abilitato (`"strict": true` nel tsconfig)
- File con estensione `.ts` (no `.js` nel codice sorgente)
- Import con estensione `.js` nei file sorgente (ESM compliance): `import { foo } from './bar.js'`
- Indentazione: **2 spazi**
- Virgolette: **singole** (`'stringa'`)
- Punto e virgola: **no** (stile senza semicolons)
- Trailing comma: **sì** negli oggetti e array multilinea

## Naming conventions

| Cosa | Convenzione | Esempio |
|------|-------------|---------|
| File TypeScript | kebab-case | `calendar-utils.ts` |
| File test | `*.test.ts` | `calendar.test.ts` |
| Interfacce | PascalCase | `interface Ticket {}` |
| Type alias | PascalCase | `type TicketStatus = ...` |
| Funzioni | camelCase | `function isWorkingDay()` |
| Costanti | camelCase o UPPER_SNAKE_CASE | `const defaultCapacity = 480` |
| Variabili | camelCase | `let currentDate` |
| Enum-like types | snake_case nei valori | `'finish_to_start' \| 'parallel'` |
| Zod schemas | camelCase + `Schema` suffix | `ticketSchema` |
| Cartelle | kebab-case | `scheduling/`, `types/` |

## Convenzioni di dominio

### Email utenti

- Default: `nome.cognome@arsenalia.com` (precompilata nel frontend dal campo Nome)
- Il campo resta editabile (l'utente può modificarla)
- Accenti e caratteri speciali vengono rimossi: `José García` → `jose.garcia@arsenalia.com`

### Sedi e festivi patronali

- Ogni utente ha un campo `office` opzionale: `'milano'`, `'venezia'`, `'roma'` (o `null`)
- I festivi hanno un campo `office`: se `null` = festivo nazionale; se valorizzato = vale solo per gli utenti di quella sede
- Lo scheduler filtra automaticamente i festivi in base all'`office` dell'utente
- I patroni (Sant'Ambrogio, San Marco, Santi Pietro e Paolo) sono festivi con `office` specifica
- Nel codice il campo si chiama sempre `office` (non `sede`)

## Struttura dei pacchetti

### @planning/shared

```
src/
├── types/          ← Solo interface e type (no logica)
├── scheduling/     ← Funzioni pure (no side effects, no I/O)
└── validators/     ← Zod schemas
```

- Ogni entità ha il suo file in `types/`
- Ogni area funzionale ha il suo file in `scheduling/`
- Ogni modulo ha un `index.ts` barrel export
- I test vanno in `tests/` con struttura speculare a `src/`

### @planning/backend (dalla Release 1)

```
src/
├── routes/         ← Route Fastify (una per area: tickets, calendar, ecc.)
├── services/       ← Business logic (scheduler, jira-sync, ecc.)
├── plugins/        ← Plugin Fastify (auth, jira, microsoft-graph)
└── jobs/           ← BullMQ workers per task async
```

### @planning/frontend (dalla Release 1)

```
src/
├── views/          ← Pagine (PlanningView, CapacityView, ecc.)
├── components/     ← Componenti riutilizzabili
├── composables/    ← Logica riutilizzabile Vue (useScheduler, useCapacity, ecc.)
├── stores/         ← Pinia stores (tickets, calendar, capacity)
└── api/            ← Client HTTP tipizzato per le API backend
```

## Pattern di codice

### Funzioni pure (scheduling)

Le funzioni in `@planning/shared/scheduling` devono essere **pure**:
- Nessun accesso a database, file system, rete
- Nessun stato globale
- Stesso input → stesso output
- Nessun side effect

```typescript
// ✅ Corretto — funzione pura
export function calculateDurationDays(
  estimateMinutes: number,
  dailyCapacityMinutes: number,
  allocationPercent: number,
): number {
  // ...calcolo...
  return result
}

// ❌ Sbagliato — side effect
export function calculateDurationDays(ticket: Ticket) {
  const result = /* ... */
  ticket.durationDays = result  // MUTAZIONE!
  await db.save(ticket)         // I/O!
  return result
}
```

### Unità interne: minuti interi

```typescript
// ✅ Corretto — minuti interi
const estimate = 960 // 16 ore = 960 minuti
const capacity = 480 // 8 ore = 480 minuti

// ❌ Sbagliato — ore decimali
const estimate = 16.5  // problemi di precisione float
```

### Validazione Zod

```typescript
// Validazione di input non fidato (API, import Jira, form)
const result = ticketSchema.safeParse(rawData)
if (!result.success) {
  // Gestisci errore con result.error
}
const ticket = result.data // tipo TypeScript inferito
```

## Test

### Struttura test

```
tests/
├── validators.test.ts         ← Test di validazione schema
└── scheduling/
    ├── calendar.test.ts       ← Test working days
    └── capacity.test.ts       ← Test capacity e duration
```

### Convenzioni test

- Un `describe` per funzione o modulo
- Un `it` per caso di test
- Nome test descrittivo: `'lunedì + 5 giorni lavorativi = venerdì stessa settimana'`
- Riferimento al test ID del roadmap nel nome se applicabile: `'T0-05: lunedì + 5gg = venerdì'`
- Test di edge case espliciti: `0`, `null`, valori limite

### Comandi test

```bash
pnpm test:shared          # Run tutti i test shared
pnpm --filter @planning/shared test:watch    # Watch mode
pnpm --filter @planning/shared test:coverage # Con coverage
```

## Date

- Formato interno: `YYYY-MM-DD` (stringa ISO)
- Oggetti `Date` solo nelle funzioni di calcolo scheduling
- Mese in `Date` è 0-based: `new Date(2026, 3, 6)` = 6 aprile (non marzo!)
- Giorno della settimana: 0=domenica, 1=lunedì, ..., 6=sabato

## Git

- Branch naming: `release/N-nome` (es. `release/1-mvp-planning-core`)
- Commit messages: `[RN] descrizione` (es. `[R0] add domain model types`)

