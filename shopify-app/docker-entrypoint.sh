#!/bin/sh
set -eu

mkdir -p /data
export DATABASE_URL="${DATABASE_URL:-file:/data/dev.db}"
export PORT="${PORT:-8080}"

echo "Syndicate Fly boot: migrate → serve on :$PORT (DEMO_FIXTURE_SHOP=${DEMO_FIXTURE_SHOP:-0})"
npx prisma migrate deploy

# Fixture seed only in demo mode. Live Partner installs get data via OAuth + pipeline.
if [ "${DEMO_FIXTURE_SHOP:-0}" = "1" ]; then
  if [ ! -f /data/.seeded ] || [ "${SEED_ON_BOOT:-0}" = "1" ]; then
    echo "Seeding Harbour Run demo pipeline…"
    npx tsx scripts/pipeline-demo.ts
    touch /data/.seeded
  fi
fi

exec npx react-router-serve ./build/server/index.js
