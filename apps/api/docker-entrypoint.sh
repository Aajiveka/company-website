#!/bin/sh
set -e

# Apply pending migrations before serving. `migrate deploy` only replays committed
# migrations — it never generates or resets, so it is safe to run on every container start
# and on every replica (Prisma takes an advisory lock).
echo "==> applying database migrations"
npx prisma migrate deploy

echo "==> starting api"
exec node dist/main.js
