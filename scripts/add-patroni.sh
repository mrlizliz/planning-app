#!/bin/bash
BASE="http://localhost:3001/api"

echo "⛪ Aggiunta patroni per sede..."

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-patrono-milano","date":"2026-12-07","name":"Sant'\''Ambrogio (Patrono Milano)","recurring":true,"sede":"milano"}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-patrono-venezia","date":"2026-04-25","name":"San Marco (Patrono Venezia)","recurring":true,"sede":"venezia"}' > /dev/null

curl -s -X POST "$BASE/calendar/holidays" -H "Content-Type: application/json" \
  -d '{"id":"h-patrono-roma","date":"2026-06-29","name":"Santi Pietro e Paolo (Patrono Roma)","recurring":true,"sede":"roma"}' > /dev/null

echo ""
echo "Festivi con sede:"
curl -s "$BASE/calendar/holidays" | python3 -c "
import sys, json
data = sorted(json.load(sys.stdin), key=lambda x: x['date'])
for h in data:
    icon = '🔁' if h['recurring'] else '📌'
    sede = h.get('sede') or 'nazionale'
    scope = f'📍 {sede}' if h.get('sede') else '🇮🇹 nazionale'
    print(f'  {h[\"date\"]}  {icon}  {h[\"name\"]:45s}  {scope}')
"

