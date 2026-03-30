#!/bin/bash
set -e

cd /Users/marcocastellani/WebstormProjects/planning-app

echo "🧹 Pulizia file temporanei..."
rm -f setup.sh setup2.sh setup-log.txt

echo "📦 Inizializzazione git..."
git init

echo "📝 Aggiunta file..."
git add .

echo "📋 Stato:"
git status

echo ""
echo "💾 Commit..."
git commit -m "feat: Release 0 — Discovery & Foundation

- Domain model: 13 entità TypeScript (User, Ticket, Assignment, Calendar, etc.)
- Scheduling rules: funzioni pure (isWorkingDay, calculateDailyCapacity, etc.)
- Zod validators: schema validation per ogni entità
- Test suite: ~80 test cases (validators, calendar, capacity)
- Monorepo pnpm + Turborepo con @planning/shared
- Documentazione AI: ARCHITECTURE, DOMAIN_MODEL, CONVENTIONS, RELEASE_LOG"

echo "🔀 Branch main..."
git branch -M main

echo "🔗 Remote origin..."
git remote add origin git@github.com:mrlizliz/planning-app.git

echo "🚀 Push..."
git push -u origin main

echo ""
echo "✅ Fatto! Vai su https://github.com/mrlizliz/planning-app"

# Auto-rimozione di questo script
rm -f /Users/marcocastellani/WebstormProjects/planning-app/git-push.sh

