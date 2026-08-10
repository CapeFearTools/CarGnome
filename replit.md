# Used-Car Marketplace

A consumer-facing web app for browsing used-car inventory. Shoppers can search and filter active listings, view vehicle detail pages with photo galleries, and submit inquiries or request pricing. Inventory is imported daily from a dealer CSV feed via SFTP.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from $PORT)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Required Environment Variables

### API server & ingestion worker
| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → `anon` / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → `service_role` key (**keep secret**) |

### Frontend (Vite)
| Variable | Value |
|---|---|
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` |

### Ingestion worker (SFTP)
| Variable | Description |
|---|---|
| `SFTP_HOST` | Hostname of the dealer's SFTP server |
| `SFTP_PORT` | SFTP port (default 22) |
| `SFTP_USER` | SFTP username |
| `SFTP_PASSWORD` | SFTP password |
| `SFTP_REMOTE_PATH` | Full path to the CSV file on the SFTP server |

## Database Setup

Run `migration.sql` (repo root) in the Supabase SQL editor to create all tables, indexes, and RLS policies. Open the SQL Editor in your Supabase dashboard, paste the file contents, and click Run. It is safe to run more than once.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL via Supabase (Drizzle ORM for schema + typed queries)
- Supabase: anon key (public reads) + service-role key (ingestion upserts)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite (react-vite artifact)
- Deployment: Vercel (frontend) + Vercel Cron or GitHub Actions (ingestion worker)

## Where things live

- `lib/db/src/schema/` — Drizzle table definitions (`dealers.ts`, `listings.ts`, `leads.ts`)
- `lib/supabase-client/src/index.ts` — shared Supabase client helpers (anon + service-role)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API hooks)
- `artifacts/api-server/` — Express API server
- `migration.sql` — one-shot SQL to paste into Supabase SQL editor

## Architecture decisions

- **Supabase RLS as the security layer** — anon key is safe to expose in the browser because RLS limits it to active listings (SELECT) and lead inserts only.
- **VIN as the natural key** — the ingestion worker upserts on `vin`; missing VINs become `status = 'inactive'` automatically.
- **`price = null` means "Call for Price"** — the frontend checks `price IS NULL` to switch between showing the price and the CTA button.
- **Hot-linked photos** — photo URLs from the CSV feed are stored as-is; no re-hosting in MVP.
- **Service-role client never reaches the browser** — only the ingestion worker and server-side API routes use it.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `migration.sql` in the Supabase SQL editor before starting the app — the tables must exist.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS; never expose it to the frontend or commit it.
- The ingestion worker marks VINs inactive only for dealer IDs present in the current file — safe for multi-dealer setups.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
