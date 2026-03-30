#!/bin/bash
set -e

cd /Users/marcocastellani/WebstormProjects/planning-app

echo "📦 Installazione dipendenze..."
pnpm install

echo ""
echo "🧪 Esecuzione test @planning/shared..."
pnpm test:shared

echo ""
echo "✅ Fatto!"

# Auto-rimozione
rm -f /Users/marcocastellani/WebstormProjects/planning-app/run-tests.sh

