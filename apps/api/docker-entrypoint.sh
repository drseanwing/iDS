#!/bin/sh
set -e

if [ "${PRISMA_MIGRATE_ON_START:-true}" = "true" ]; then
  npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
fi

exec "$@"
