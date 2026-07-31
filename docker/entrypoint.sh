#!/bin/sh
set -e

# Apply pending schema changes (safe to run on every start)
npx prisma db push --skip-generate --accept-data-loss

if [ "$SEED_DB" = "true" ]; then
  npx tsx prisma/seed.ts
fi

# Scheduler loop (publishes due posts every 60s) runs alongside the web server
npx tsx scripts/worker.ts &

exec npm start
