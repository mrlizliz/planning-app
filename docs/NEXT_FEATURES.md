# Prossime Feature — Planning App

> Checklist delle implementazioni future.
> Aggiornata il 2026-03-30 — Post implementazione completa.

---

## 🔴 Alta priorità — Produzione e usabilità

- [x] **Prisma + PostgreSQL** — Schema Prisma completo con SQLite per dev, client generato, migration pronta. Switchable via `USE_DATABASE=true`.
- [x] **Autenticazione e ruoli** — JWT auth con `@fastify/jwt`, login via email, decorator `authenticate` e `authorize`, route `/api/auth/login` e `/api/auth/me`.
- [x] **Test E2E con Playwright** — Setup completo: `playwright.config.ts`, test navigazione, health check API, gestione utenti.
- [x] **Validazione input nelle route PUT** — Milestones e releases PUT ora validano con Zod prima del merge.
- [x] **Error handling globale nel frontend** — PrimeVue ToastService + composable `useNotifications` per gestire errori API con toast.
- [x] **Drag & drop sulla timeline Gantt** — HTML5 drag & drop sulle barre Gantt, con auto-lock e ricalcolo date dopo lo spostamento.

---

## 🟡 Media priorità — Feature di valore per il PM

- [x] **Associazione ticket → milestone/release da UI ticket** — Dropdown inline nella TicketTable per assegnare milestone e release.
- [x] **Filtri e ricerca avanzata nei ticket** — Filtro per status, priorità, fix version + ricerca testo su key/summary/assignee.
- [ ] **Confronto scenari side-by-side nel frontend** — API pronta (`/api/scenarios/:id/compare`), UI visuale da completare.
- [x] **Scheduling dello scenario** — Nuova route `POST /api/scenarios/:id/schedule` per auto-schedule dentro uno scenario senza impattare lo stato corrente.
- [ ] **Vista Gantt raggruppata** — Raggruppare la timeline per milestone, release o utente (richiede refactoring GanttTimeline).
- [ ] **Notifiche e alert persistenti** — API `alertsApi.fetch()` pronta, dashboard permanente da completare nel frontend.
- [x] **Import dipendenze da Jira** — Integrato `mapJiraLinksToDependencies` nel flusso sync Jira del backend.
- [x] **Paginazione sync Jira** — JiraClient ora pagina automaticamente (`fetchAll = true`) per gestire progetti grandi.
- [x] **Bulk actions sui ticket** — Nuova route `PUT /api/tickets/bulk` per aggiornamenti batch + endpoint nel client API.

---

## 🟢 Bassa priorità — Nice-to-have e evoluzioni future

- [ ] **OAuth2 Microsoft Graph** — Integrazione reale con Outlook (richiede Azure AD config).
- [ ] **Sync automatico Jira (webhook o polling)** — Aggiornamento periodico dei ticket.
- [ ] **Export PDF dei report** — Generare PDF oltre al CSV.
- [ ] **Storico modifiche / audit trail** — Log di chi ha cambiato cosa e quando.
- [x] **Dark mode** — Toggle chiaro/scuro con persistenza in localStorage, stili CSS dark.
- [ ] **i18n / Localizzazione** — Interfaccia multilingua.
- [ ] **Impact analysis popup** — Mostrare impatto a cascata prima di confermare modifiche.
- [ ] **Gantt con libreria avanzata** — Valutare Bryntum o dhtmlxGantt.
- [ ] **BullMQ + Redis per job asincroni** — Job queue per sync pesanti.
- [x] **Docker Compose per dev** — `docker-compose.yml` con PostgreSQL, backend, frontend.
- [x] **CI/CD con GitHub Actions** — Workflow `.github/workflows/ci.yml` con test e build.
- [x] **OpenAPI / Swagger spec** — `@fastify/swagger` + UI disponibile su `/docs`.

---

## 🔧 Debito tecnico

- [x] **Rilevamento sovrallocazione più preciso** — Ora itera giorno per giorno tra start/end con capacity reale.
- [ ] **Biweekly meeting** — Il calcolo attuale usa `durationMinutes / 2` come media.
- [x] **Calendar config per utente nello scheduler** — Verificato: la route capacity filtra già correttamente per office.
- [ ] **Cleanup cicli circolari di import** — Monitorare (attualmente ok).
- [x] **TypeScript strict mode nel frontend** — Aggiunto `noUncheckedIndexedAccess` al tsconfig frontend.
- [x] **Test di regressione per edge case dello scheduler** — 9 nuovi test: estimate 0/null, utente mancante, capacity 0, locked, 2 assignment stesso utente, start weekend, ferie primo giorno, stima enorme.

---

## Come usare questa checklist

1. **Discutiamo** quali feature affrontare prima
2. **Spuntiamo** `[x]` quando una feature è completata
3. **Aggiungiamo** nuove idee man mano che emergono
4. Ogni feature completata va documentata in `docs/RELEASE_LOG.md`
