#!/bin/bash
# ============================================================
# Seed script — Popola il backend con dati di test realistici
# per testare manualmente i 4 criteri di successo della Release 1
# ============================================================

BASE="http://localhost:3001/api"

echo "🌱 Seeding dati di test..."
echo ""

# ---- 1. Crea utenti (2 DEV + 1 QA) ----
echo "👥 Creazione utenti..."

curl -s -X POST "$BASE/users" -H "Content-Type: application/json" -d '{
  "id": "dev-mario",
  "displayName": "Mario Rossi",
  "email": "mario@example.com",
  "appRole": "dev",
  "planningRoles": ["dev"],
  "dailyWorkingMinutes": 480,
  "dailyOverheadMinutes": 30,
  "active": true
}' > /dev/null

curl -s -X POST "$BASE/users" -H "Content-Type: application/json" -d '{
  "id": "dev-lucia",
  "displayName": "Lucia Bianchi",
  "email": "lucia@example.com",
  "appRole": "dev",
  "planningRoles": ["dev"],
  "dailyWorkingMinutes": 480,
  "dailyOverheadMinutes": 30,
  "active": true
}' > /dev/null

curl -s -X POST "$BASE/users" -H "Content-Type: application/json" -d '{
  "id": "qa-giovanni",
  "displayName": "Giovanni Verdi",
  "email": "giovanni@example.com",
  "appRole": "qa",
  "planningRoles": ["qa"],
  "dailyWorkingMinutes": 480,
  "dailyOverheadMinutes": 30,
  "active": true
}' > /dev/null

echo "   ✅ 3 utenti creati (Mario DEV, Lucia DEV, Giovanni QA)"

# ---- 2. Crea festivi (25 aprile, 1 maggio) ----
echo "🎉 Creazione festivi..."

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{
  "id": "h-25apr",
  "date": "2026-04-25",
  "name": "Festa della Liberazione",
  "recurring": true
}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{
  "id": "h-1may",
  "date": "2026-05-01",
  "name": "Festa del Lavoro",
  "recurring": true
}' > /dev/null

echo "   ✅ 2 festivi creati (25 aprile, 1 maggio)"

# ---- 3. Crea ticket (simulano import da Jira) ----
echo "📋 Creazione ticket (simulazione import Jira)..."

NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Ticket 1: alta priorità, 24h (3 giorni)
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{
  \"id\": \"t-login\",
  \"jiraKey\": \"PROJ-101\",
  \"summary\": \"Implementare pagina di login\",
  \"description\": \"Login con email e password, validazione form\",
  \"estimateMinutes\": 1440,
  \"jiraPriority\": \"high\",
  \"priorityOverride\": null,
  \"status\": \"backlog\",
  \"phase\": \"dev\",
  \"jiraAssigneeEmail\": \"mario@example.com\",
  \"parentKey\": \"PROJ-100\",
  \"milestoneId\": null,
  \"releaseId\": null,
  \"locked\": false,
  \"warnings\": [],
  \"lastSyncedAt\": \"$NOW\",
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

# Ticket 2: media priorità, 16h (2 giorni)
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{
  \"id\": \"t-dashboard\",
  \"jiraKey\": \"PROJ-102\",
  \"summary\": \"Dashboard utente con statistiche\",
  \"description\": \"Visualizzare KPI principali nella homepage\",
  \"estimateMinutes\": 960,
  \"jiraPriority\": \"medium\",
  \"priorityOverride\": null,
  \"status\": \"backlog\",
  \"phase\": \"dev\",
  \"jiraAssigneeEmail\": \"mario@example.com\",
  \"parentKey\": \"PROJ-100\",
  \"milestoneId\": null,
  \"releaseId\": null,
  \"locked\": false,
  \"warnings\": [],
  \"lastSyncedAt\": \"$NOW\",
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

# Ticket 3: alta priorità, 32h (4 giorni) — per Lucia
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{
  \"id\": \"t-api\",
  \"jiraKey\": \"PROJ-103\",
  \"summary\": \"API REST autenticazione e profilo\",
  \"description\": \"Endpoint /auth/login, /auth/register, /me\",
  \"estimateMinutes\": 1920,
  \"jiraPriority\": \"high\",
  \"priorityOverride\": null,
  \"status\": \"backlog\",
  \"phase\": \"dev\",
  \"jiraAssigneeEmail\": \"lucia@example.com\",
  \"parentKey\": \"PROJ-100\",
  \"milestoneId\": null,
  \"releaseId\": null,
  \"locked\": false,
  \"warnings\": [],
  \"lastSyncedAt\": \"$NOW\",
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

# Ticket 4: bassa priorità, 8h (1 giorno) — per Lucia
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{
  \"id\": \"t-docs\",
  \"jiraKey\": \"PROJ-104\",
  \"summary\": \"Documentazione API Swagger\",
  \"description\": \"Generare OpenAPI spec per tutti gli endpoint\",
  \"estimateMinutes\": 480,
  \"jiraPriority\": \"low\",
  \"priorityOverride\": null,
  \"status\": \"backlog\",
  \"phase\": \"dev\",
  \"jiraAssigneeEmail\": \"lucia@example.com\",
  \"parentKey\": null,
  \"milestoneId\": null,
  \"releaseId\": null,
  \"locked\": false,
  \"warnings\": [],
  \"lastSyncedAt\": \"$NOW\",
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

# Ticket 5: highest priorità, 16h — QA
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{
  \"id\": \"t-qa-login\",
  \"jiraKey\": \"PROJ-105\",
  \"summary\": \"Test funzionali pagina login\",
  \"description\": \"Test cases per login, validazione, errori\",
  \"estimateMinutes\": 960,
  \"jiraPriority\": \"highest\",
  \"priorityOverride\": null,
  \"status\": \"backlog\",
  \"phase\": \"qa\",
  \"jiraAssigneeEmail\": \"giovanni@example.com\",
  \"parentKey\": null,
  \"milestoneId\": null,
  \"releaseId\": null,
  \"locked\": false,
  \"warnings\": [],
  \"lastSyncedAt\": \"$NOW\",
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

# Ticket 6: senza stima (warning)
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{
  \"id\": \"t-nostime\",
  \"jiraKey\": \"PROJ-106\",
  \"summary\": \"Refactor modulo notifiche\",
  \"description\": null,
  \"estimateMinutes\": null,
  \"jiraPriority\": \"medium\",
  \"priorityOverride\": null,
  \"status\": \"backlog\",
  \"phase\": \"dev\",
  \"jiraAssigneeEmail\": null,
  \"parentKey\": null,
  \"milestoneId\": null,
  \"releaseId\": null,
  \"locked\": false,
  \"warnings\": [\"missing_estimate\", \"missing_assignee\"],
  \"lastSyncedAt\": \"$NOW\",
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

echo "   ✅ 6 ticket creati (5 con stima + 1 senza stima con warning)"

# ---- 4. Crea assignment ----
echo "📌 Creazione assignment..."

# Mario: PROJ-101 al 100%, PROJ-102 al 50%
curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{
  \"id\": \"a-mario-101\",
  \"ticketId\": \"t-login\",
  \"userId\": \"dev-mario\",
  \"role\": \"dev\",
  \"allocationPercent\": 100,
  \"startDate\": null,
  \"endDate\": null,
  \"durationDays\": null,
  \"locked\": false,
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{
  \"id\": \"a-mario-102\",
  \"ticketId\": \"t-dashboard\",
  \"userId\": \"dev-mario\",
  \"role\": \"dev\",
  \"allocationPercent\": 50,
  \"startDate\": null,
  \"endDate\": null,
  \"durationDays\": null,
  \"locked\": false,
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

# Lucia: PROJ-103 al 100%, PROJ-104 al 100%
curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{
  \"id\": \"a-lucia-103\",
  \"ticketId\": \"t-api\",
  \"userId\": \"dev-lucia\",
  \"role\": \"dev\",
  \"allocationPercent\": 100,
  \"startDate\": null,
  \"endDate\": null,
  \"durationDays\": null,
  \"locked\": false,
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{
  \"id\": \"a-lucia-104\",
  \"ticketId\": \"t-docs\",
  \"userId\": \"dev-lucia\",
  \"role\": \"dev\",
  \"allocationPercent\": 100,
  \"startDate\": null,
  \"endDate\": null,
  \"durationDays\": null,
  \"locked\": false,
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

# Giovanni QA: PROJ-105 al 100%
curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{
  \"id\": \"a-giovanni-105\",
  \"ticketId\": \"t-qa-login\",
  \"userId\": \"qa-giovanni\",
  \"role\": \"qa\",
  \"allocationPercent\": 100,
  \"startDate\": null,
  \"endDate\": null,
  \"durationDays\": null,
  \"locked\": false,
  \"createdAt\": \"$NOW\",
  \"updatedAt\": \"$NOW\"
}" > /dev/null

echo "   ✅ 5 assignment creati (Mario 2, Lucia 2, Giovanni 1)"

# ---- 5. Esegui auto-scheduling ----
echo ""
echo "🚀 Esecuzione auto-scheduling (start: 2026-03-31 = lunedì)..."
echo ""

RESULT=$(curl -s -X POST "$BASE/scheduler/run" -H "Content-Type: application/json" -d '{
  "planningStartDate": "2026-03-31"
}')

echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"

echo ""
echo "============================================"
echo "✅ SEED COMPLETATO!"
echo "============================================"
echo ""
echo "Apri il browser su: http://localhost:5173"
echo ""
echo "Cosa verificare:"
echo "  📅 Planning  → Gantt timeline con barre colorate per priorità"
echo "  📋 Ticket    → 6 ticket (5 pianificati + 1 con ⚠️ warning)"
echo "  📊 Capacità  → 3 card utenti con carico e barra"
echo "  ⚙️ Settings  → 3 utenti + 2 festivi configurati"
echo ""
echo "Date attese (start lunedì 31 marzo 2026):"
echo "  Mario:    PROJ-101 (24h, 100%) → 31 mar - 2 apr (3gg)"
echo "            PROJ-102 (16h, 50%)  → 3 apr - 10 apr (5gg)"
echo "  Lucia:    PROJ-103 (32h, 100%) → 31 mar - 3 apr (5gg)"
echo "            PROJ-104 (8h, 100%)  → 6 apr - 6 apr (1gg)"
echo "  Giovanni: PROJ-105 (16h, 100%) → 31 mar - 1 apr (3gg)"
echo ""







