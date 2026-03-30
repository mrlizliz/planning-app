# Domain Model — Planning App

> Riferimento: `jira-planning-roadmap.md` → Release 0 → Domain Modeling

## Glossario

| Termine | Definizione |
|---------|-------------|
| **Effort** | Ore di lavoro stimate per completare un ticket (espresso in minuti internamente) |
| **Capacity** | Ore disponibili effettive di una risorsa in un giorno |
| **Duration** | Numero di giorni lavorativi necessari: `effort / (capacity × allocation%)` |
| **Allocation** | Percentuale di tempo dedicato dalla risorsa a un ticket (1-100%) |
| **Net Capacity** | Capacità netta = ore teoriche − meeting − assenza − overhead |
| **Locked** | Flag che indica che il PM ha modificato manualmente un ticket/assignment: non deve essere ricalcolato |
| **Working Day** | Giorno lavorativo: esclude weekend, festivi, include eccezioni manuali |

## Entità e relazioni

```
User ──────────┐
  │             │
  │ 1:N         │ 1:N
  ▼             ▼
Assignment    Absence
  │
  │ N:1
  ▼
Ticket ──────── Dependency (self-referencing N:N)
  │
  │ N:1          N:1
  ▼              ▼
Milestone      Release
                 │
                 │ relates to
                 ▼
            DeploymentDay / DeploymentWindow

WorkingCalendar ──── Holiday
                ──── CalendarException

RecurringMeeting ──── User (nullable = team-wide)
```

## Entità dettagliate

### User

Utente del sistema. Può avere ruolo applicativo (PM, DEV, QA) e ruoli pianificabili.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | Identificatore univoco |
| `displayName` | string | Nome visualizzato |
| `email` | string | Email (usata per match con Jira/Outlook) |
| `appRole` | `'pm' \| 'dev' \| 'qa'` | Ruolo applicativo (permessi) |
| `planningRoles` | `PlanningRole[]` | Ruoli pianificabili (`'dev'`, `'qa'`) |
| `dailyWorkingMinutes` | number | Ore teoriche giornaliere in minuti (default: 480 = 8h) |
| `dailyOverheadMinutes` | number | Overhead fisso giornaliero in minuti |
| `active` | boolean | Attivo nel team |

### Ticket

Ticket importato da Jira con stime e metadati.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | ID interno |
| `jiraKey` | string | Key Jira (es. PROJ-123) |
| `summary` | string | Titolo |
| `description` | string \| null | Descrizione |
| `estimateMinutes` | number \| null | Stima in **minuti**. null = warning `missing_estimate` |
| `jiraPriority` | JiraPriority | `highest \| high \| medium \| low \| lowest` |
| `priorityOverride` | number \| null | Override PM sulla priorità di scheduling |
| `status` | TicketStatus | `backlog \| planned \| in_progress \| done` |
| `phase` | TicketPhase | `dev \| qa` |
| `jiraAssigneeEmail` | string \| null | Assignee originale da Jira |
| `parentKey` | string \| null | Epic o parent Jira |
| `milestoneId` | string \| null | FK → Milestone |
| `releaseId` | string \| null | FK → Release |
| `locked` | boolean | Se true, non viene ricalcolato |
| `warnings` | TicketWarning[] | `missing_estimate \| missing_assignee \| estimate_zero` |
| `lastSyncedAt` | string \| null | Timestamp ultimo sync Jira |

### Assignment

Assegnazione di un ticket a una persona con ruolo e allocazione.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `ticketId` | string | FK → Ticket |
| `userId` | string | FK → User |
| `role` | PlanningRole | `dev` o `qa` |
| `allocationPercent` | number | 1-100 |
| `startDate` | string \| null | ISO YYYY-MM-DD |
| `endDate` | string \| null | ISO YYYY-MM-DD |
| `durationDays` | number \| null | Giorni lavorativi calcolati |
| `locked` | boolean | Override manuale del PM |

### Holiday

Giorno festivo del team.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `date` | string | ISO YYYY-MM-DD |
| `name` | string | Es. "Festa della Liberazione" |
| `recurring` | boolean | Se true, ricorre ogni anno |

### CalendarException

Eccezione: giorno normalmente non lavorativo diventa lavorativo.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `date` | string | ISO YYYY-MM-DD |
| `description` | string | Es. "Sabato lavorativo per recupero" |

### Absence

Assenza individuale di una persona.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `userId` | string | FK → User |
| `date` | string | ISO YYYY-MM-DD |
| `type` | AbsenceType | `vacation \| sick \| permit \| training \| other` |
| `halfDay` | boolean | true = mezza giornata (capacità dimezzata) |
| `notes` | string \| null | |

### RecurringMeeting

Meeting ricorrente che riduce la capacità.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `userId` | string \| null | null = meeting di team (impatta tutti) |
| `name` | string | |
| `type` | MeetingType | `standup \| refinement \| sprint_planning \| retrospective \| one_on_one \| custom` |
| `durationMinutes` | number | 1-480 |
| `frequency` | MeetingFrequency | `daily \| weekly \| biweekly \| monthly` |
| `dayOfWeek` | number \| null | 0=dom, 1=lun, ..., 6=sab. null per daily |

### WorkingCalendar

Calendario lavorativo condiviso dal team.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `name` | string | |
| `holidays` | Holiday[] | Festivi |
| `exceptions` | CalendarException[] | Eccezioni (giorni extra lavorativi) |

### Milestone

Milestone di progetto con stato calcolato.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `name` | string | |
| `description` | string \| null | |
| `targetDate` | string | ISO YYYY-MM-DD |
| `status` | MilestoneStatus | `on_track \| at_risk \| delayed` — calcolato automaticamente |

**Regole di stato:**
- ✅ `on_track` — tutti i ticket finiscono prima della targetDate
- ⚠️ `at_risk` — almeno 1 ticket finisce entro 2gg dalla targetDate
- 🔴 `delayed` — almeno 1 ticket finisce dopo la targetDate

### Release

Release con ticket associati e forecast.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `name` | string | |
| `description` | string \| null | |
| `targetDate` | string | ISO YYYY-MM-DD |
| `forecastDate` | string \| null | Calcolata: max(endDate) dei ticket associati |

### Dependency

Relazione tra ticket.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `fromTicketId` | string | Ticket predecessore |
| `toTicketId` | string | Ticket successore |
| `type` | DependencyType | `finish_to_start \| parallel \| blocking` |
| `importedFromJira` | boolean | Importato da issuelinks |

### DeploymentDay

Giorno di deploy ricorrente.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `environment` | `'dev' \| 'prod'` | |
| `dayOfWeek` | number | 0-6 |
| `active` | boolean | |

### DeploymentWindow

Override puntuale sul calendario deploy.

| Campo | Tipo | Note |
|-------|------|------|
| `id` | string | |
| `environment` | `'dev' \| 'prod'` | |
| `date` | string | ISO YYYY-MM-DD |
| `allowed` | boolean | true = deploy extra, false = blocco |
| `notes` | string \| null | |

## Formule di scheduling

### Capacità netta giornaliera

```
net_capacity = daily_working_minutes
               - meeting_minutes
               - absence_minutes
               - overhead_minutes

Se net_capacity ≤ 0 → alert = true
```

### Capacità effettiva per ticket

```
effective_capacity = net_capacity × (allocation_percent / 100)
```

### Durata in giorni lavorativi

```
duration_days = ceil(estimate_minutes / effective_capacity)
```

### Data fine

```
end_date = addWorkingDays(start_date, duration_days, calendar_config)
```

Dove `addWorkingDays` salta weekend, festivi e rispetta eccezioni manuali.

## Convenzione unità di misura

| Concetto | Unità interna | Conversione UI |
|----------|---------------|----------------|
| Effort / Stima | minuti (int) | ÷ 60 = ore |
| Capacità giornaliera | minuti (int) | ÷ 60 = ore |
| Overhead | minuti (int) | ÷ 60 = ore |
| Meeting durata | minuti (int) | ÷ 60 = ore |
| Allocazione | percentuale intera (1-100) | come % |
| Date | stringa ISO YYYY-MM-DD | formattata locale in UI |

