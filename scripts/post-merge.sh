#!/bin/bash
set -e
pnpm install --frozen-lockfile
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 \
  --file lib/db/drizzle/0003_ensure_instagram_connections.sql
psql "$DATABASE_URL" --set ON_ERROR_STOP=1 \
  --file lib/db/drizzle/0004_add_image_generation_jobs.sql
