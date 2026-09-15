#!/bin/bash
set -e
pnpm install --frozen-lockfile
# Database schema changes are applied by running migration.sql in the Supabase
# SQL editor, not with drizzle-kit push (see lib/db/src/schema/index.ts).
