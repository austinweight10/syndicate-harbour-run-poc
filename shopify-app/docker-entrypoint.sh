#!/bin/sh
set -eu

mkdir -p /data
export DATABASE_URL="${DATABASE_URL:-file:/data/dev.db}"
export PORT="${PORT:-8080}"
export DEMO_FIXTURE_SHOP="${DEMO_FIXTURE_SHOP:-1}"

echo "Syndicate Fly boot: migrate → seed (if needed) → serve on :$PORT"
npx prisma migrate deploy

if [ ! -f /data/.seeded ] || [ "${SEED_ON_BOOT:-0}" = "1" ]; then
  echo "Seeding Harbour Run demo pipeline…"
  npx tsx scripts/pipeline-demo.ts
  touch /data/.seeded
fi

exec npx react-router-serve ./build/server/index.js
