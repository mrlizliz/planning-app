#!/bin/bash
BASE="http://localhost:3001/api"

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-capodanno","date":"2026-01-01","name":"Capodanno","recurring":true}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-epifania","date":"2026-01-06","name":"Epifania","recurring":true}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-pasqua-2026","date":"2026-04-05","name":"Pasqua","recurring":false}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-pasquetta-2026","date":"2026-04-06","name":"Pasquetta","recurring":false}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-repubblica","date":"2026-06-02","name":"Festa della Repubblica","recurring":true}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-ferragosto","date":"2026-08-15","name":"Ferragosto","recurring":true}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-santi","date":"2026-11-01","name":"Tutti i Santi","recurring":true}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-immacolata","date":"2026-12-08","name":"Immacolata Concezione","recurring":true}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-natale","date":"2026-12-25","name":"Natale","recurring":true}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-stefano","date":"2026-12-26","name":"Santo Stefano","recurring":true}' > /dev/null

echo ""
echo "Festivi inseriti:"
curl -s "$BASE/calendar/holidays" | python3 -c "
import sys, json
data = sorted(json.load(sys.stdin), key=lambda x: x['date'])
for h in data:
    icon = '🔁' if h['recurring'] else '📌'
    print(f'  {h[\"date\"]}  {icon}  {h[\"name\"]}')
"

