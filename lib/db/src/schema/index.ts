// TypeScript mirror of migration.sql (repo root), which is the source of truth
// for the database: change the SQL first, then update these tables to match.
// Don't run `drizzle-kit push` against Supabase — Drizzle doesn't know about
// the row-level security policies and trigger defined in migration.sql.
export * from "./dealers.js";
export * from "./listings.js";
export * from "./leads.js";
