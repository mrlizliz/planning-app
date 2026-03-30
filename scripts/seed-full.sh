#!/bin/bash
BASE="http://localhost:3001/api"

echo "🌱 Seeding completo..."
echo ""

# ---- UTENTI ----
echo "👥 Creazione utenti..."

curl -s -X POST "$BASE/users" -H "Content-Type: application/json" -d '{
  "id": "dev-mario", "displayName": "Mario Rossi", "email": "mario.rossi@arsenalia.com",
  "appRole": "dev", "planningRoles": ["dev"], "office": "milano",
  "dailyWorkingMinutes": 480, "dailyOverheadMinutes": 30, "active": true
}' > /dev/null

curl -s -X POST "$BASE/users" -H "Content-Type: application/json" -d '{
  "id": "dev-lucia", "displayName": "Lucia Bianchi", "email": "lucia.bianchi@arsenalia.com",
  "appRole": "dev", "planningRoles": ["dev"], "office": "venezia",
  "dailyWorkingMinutes": 480, "dailyOverheadMinutes": 30, "active": true
}' > /dev/null

curl -s -X POST "$BASE/users" -H "Content-Type: application/json" -d '{
  "id": "qa-giovanni", "displayName": "Giovanni Verdi", "email": "giovanni.verdi@arsenalia.com",
  "appRole": "qa", "planningRoles": ["qa"], "office": "roma",
  "dailyWorkingMinutes": 480, "dailyOverheadMinutes": 30, "active": true
}' > /dev/null

echo "   ✅ 3 utenti (Mario MI, Lucia VE, Giovanni RM)"

# ---- FESTIVI NAZIONALI ----
echo "🇮🇹 Festivi nazionali..."

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-capodanno","date":"2026-01-01","name":"Capodanno","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-epifania","date":"2026-01-06","name":"Epifania","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-pasqua-2026","date":"2026-04-05","name":"Pasqua","recurring":false,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-pasquetta-2026","date":"2026-04-06","name":"Pasquetta","recurring":false,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-25apr","date":"2026-04-25","name":"Festa della Liberazione","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-1may","date":"2026-05-01","name":"Festa del Lavoro","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-repubblica","date":"2026-06-02","name":"Festa della Repubblica","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-ferragosto","date":"2026-08-15","name":"Ferragosto","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-santi","date":"2026-11-01","name":"Tutti i Santi","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-immacolata","date":"2026-12-08","name":"Immacolata Concezione","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-natale","date":"2026-12-25","name":"Natale","recurring":true,"office":null}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-stefano","date":"2026-12-26","name":"Santo Stefano","recurring":true,"office":null}' > /dev/null

echo "   ✅ 12 festivi nazionali"

# ---- PATRONI ----
echo "⛪ Patroni per sede..."

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-patrono-milano","date":"2026-12-07","name":"Sant'\''Ambrogio (Patrono Milano)","recurring":true,"office":"milano"}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-patrono-venezia","date":"2026-04-25","name":"San Marco (Patrono Venezia)","recurring":true,"office":"venezia"}' > /dev/null
curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" -d '{"id":"h-patrono-roma","date":"2026-06-29","name":"Santi Pietro e Paolo (Patrono Roma)","recurring":true,"office":"roma"}' > /dev/null

echo "   ✅ 3 patroni (MI, VE, RM)"

# ---- TICKET ----
echo "📋 Ticket..."

NOW=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{\"id\":\"t-login\",\"jiraKey\":\"PROJ-101\",\"summary\":\"Implementare pagina di login\",\"description\":\"Login con email e password\",\"estimateMinutes\":1440,\"jiraPriority\":\"high\",\"priorityOverride\":null,\"status\":\"backlog\",\"phase\":\"dev\",\"jiraAssigneeEmail\":\"mario.rossi@arsenalia.com\",\"parentKey\":\"PROJ-100\",\"milestoneId\":null,\"releaseId\":null,\"locked\":false,\"warnings\":[],\"lastSyncedAt\":\"$NOW\",\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{\"id\":\"t-dashboard\",\"jiraKey\":\"PROJ-102\",\"summary\":\"Dashboard utente con statistiche\",\"description\":\"KPI principali nella homepage\",\"estimateMinutes\":960,\"jiraPriority\":\"medium\",\"priorityOverride\":null,\"status\":\"backlog\",\"phase\":\"dev\",\"jiraAssigneeEmail\":\"mario.rossi@arsenalia.com\",\"parentKey\":\"PROJ-100\",\"milestoneId\":null,\"releaseId\":null,\"locked\":false,\"warnings\":[],\"lastSyncedAt\":\"$NOW\",\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{\"id\":\"t-api\",\"jiraKey\":\"PROJ-103\",\"summary\":\"API REST autenticazione e profilo\",\"description\":\"Endpoint auth\",\"estimateMinutes\":1920,\"jiraPriority\":\"high\",\"priorityOverride\":null,\"status\":\"backlog\",\"phase\":\"dev\",\"jiraAssigneeEmail\":\"lucia.bianchi@arsenalia.com\",\"parentKey\":\"PROJ-100\",\"milestoneId\":null,\"releaseId\":null,\"locked\":false,\"warnings\":[],\"lastSyncedAt\":\"$NOW\",\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{\"id\":\"t-docs\",\"jiraKey\":\"PROJ-104\",\"summary\":\"Documentazione API Swagger\",\"description\":\"OpenAPI spec\",\"estimateMinutes\":480,\"jiraPriority\":\"low\",\"priorityOverride\":null,\"status\":\"backlog\",\"phase\":\"dev\",\"jiraAssigneeEmail\":\"lucia.bianchi@arsenalia.com\",\"parentKey\":null,\"milestoneId\":null,\"releaseId\":null,\"locked\":false,\"warnings\":[],\"lastSyncedAt\":\"$NOW\",\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{\"id\":\"t-qa-login\",\"jiraKey\":\"PROJ-105\",\"summary\":\"Test funzionali pagina login\",\"description\":\"Test cases login\",\"estimateMinutes\":960,\"jiraPriority\":\"highest\",\"priorityOverride\":null,\"status\":\"backlog\",\"phase\":\"qa\",\"jiraAssigneeEmail\":\"giovanni.verdi@arsenalia.com\",\"parentKey\":null,\"milestoneId\":null,\"releaseId\":null,\"locked\":false,\"warnings\":[],\"lastSyncedAt\":\"$NOW\",\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/tickets" -H "Content-Type: application/json" -d "{\"id\":\"t-nostime\",\"jiraKey\":\"PROJ-106\",\"summary\":\"Refactor modulo notifiche\",\"description\":null,\"estimateMinutes\":null,\"jiraPriority\":\"medium\",\"priorityOverride\":null,\"status\":\"backlog\",\"phase\":\"dev\",\"jiraAssigneeEmail\":null,\"parentKey\":null,\"milestoneId\":null,\"releaseId\":null,\"locked\":false,\"warnings\":[\"missing_estimate\",\"missing_assignee\"],\"lastSyncedAt\":\"$NOW\",\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null

echo "   ✅ 6 ticket"

# ---- ASSIGNMENT ----
echo "📌 Assignment..."

curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{\"id\":\"a-mario-101\",\"ticketId\":\"t-login\",\"userId\":\"dev-mario\",\"role\":\"dev\",\"allocationPercent\":100,\"startDate\":null,\"endDate\":null,\"durationDays\":null,\"locked\":false,\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{\"id\":\"a-mario-102\",\"ticketId\":\"t-dashboard\",\"userId\":\"dev-mario\",\"role\":\"dev\",\"allocationPercent\":50,\"startDate\":null,\"endDate\":null,\"durationDays\":null,\"locked\":false,\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{\"id\":\"a-lucia-103\",\"ticketId\":\"t-api\",\"userId\":\"dev-lucia\",\"role\":\"dev\",\"allocationPercent\":100,\"startDate\":null,\"endDate\":null,\"durationDays\":null,\"locked\":false,\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{\"id\":\"a-lucia-104\",\"ticketId\":\"t-docs\",\"userId\":\"dev-lucia\",\"role\":\"dev\",\"allocationPercent\":100,\"startDate\":null,\"endDate\":null,\"durationDays\":null,\"locked\":false,\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null
curl -s -X POST "$BASE/assignments" -H "Content-Type: application/json" -d "{\"id\":\"a-giovanni-105\",\"ticketId\":\"t-qa-login\",\"userId\":\"qa-giovanni\",\"role\":\"qa\",\"allocationPercent\":100,\"startDate\":null,\"endDate\":null,\"durationDays\":null,\"locked\":false,\"createdAt\":\"$NOW\",\"updatedAt\":\"$NOW\"}" > /dev/null

echo "   ✅ 5 assignment"

# ---- SCHEDULING ----
echo ""
echo "🚀 Auto-scheduling..."

RESULT=$(curl -s -X POST "$BASE/scheduler/run" -H "Content-Type: application/json" -d '{"planningStartDate":"2026-03-31"}')
COUNT=$(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['scheduledCount'])" 2>/dev/null)

echo "   ✅ $COUNT ticket schedulati"
echo ""
echo "============================================"
echo "✅ SEED COMPLETO!"
echo "============================================"

