# Drive Cape Fear — Used-Car Marketplace

A consumer-facing web app for browsing used-car inventory from Cape Fear dealers. Shoppers can take a short quiz and swipe through matches (Discover), or search and filter every active listing (Browse), view vehicle detail pages with photo galleries, and send inquiries or request pricing. Inventory is imported daily from each dealer's CSV feed via SFTP.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from $PORT)
- `pnpm --filter @workspace/ingestion run import --dry-run` — check the SFTP feed without writing (see `artifacts/ingestion/README.md`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Required Environment Variables

### API server
| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → `anon` / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → `service_role` key (**keep secret**) |
| `CORS_ORIGINS` | Optional. Comma-separated site origins allowed to call the API; unset allows any origin |

### Frontend (Vite)
| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | Optional. The API's origin when it's hosted separately from the site (without `/api`) |

The site only talks to the API server, so it needs no Supabase keys.

### Ingestion worker
| Variable | Description |
|---|---|
| `SFTP_HOST` | Hostname of the dealer feed's SFTP server |
| `SFTP_PORT` | SFTP port (default 22) |
| `SFTP_USER` | SFTP username |
| `SFTP_PASSWORD` | SFTP password |
| `SFTP_REMOTE_PATH` | A CSV file, a folder of CSVs, or several of either separated by commas |
| `SUPABASE_URL` | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as above |

## Database Setup

Run `migration.sql` (repo root) in the Supabase SQL editor to create all tables, indexes, and RLS policies. Open the SQL Editor in your Supabase dashboard, paste the file contents, and click Run. It is safe to run more than once.

`migration.sql` is the source of truth for the schema. `lib/db` mirrors it in Drizzle for TypeScript types — update both together, and never run `drizzle-kit push` against Supabase.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL via Supabase (Drizzle table definitions for types)
- Supabase: anon key (public reads) + service-role key (lead inserts, ingestion upserts)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite (react-vite artifact)
- Ingestion: GitHub Actions daily schedule (`.github/workflows/daily-import.yml`)

## Where things live

- `lib/db/src/schema/` — Drizzle table definitions (`dealers.ts`, `listings.ts`, `leads.ts`)
- `lib/supabase-client/src/index.ts` — shared Supabase client helpers (anon + service-role)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth for API hooks)
- `artifacts/api-server/` — Express API server
- `artifacts/marketplace/` — the website; `src/pages/Discover.tsx` is the home page, `src/pages/Home.tsx` is Browse
- `artifacts/ingestion/` — daily SFTP → Supabase import (see its README)
- `migration.sql` — one-shot SQL to paste into Supabase SQL editor

## Architecture decisions

- **Supabase RLS as the security layer** — anon key is safe to expose in the browser because RLS limits it to active listings and dealers (SELECT) and lead inserts only.
- **VIN as the natural key** — the ingestion worker upserts on `vin`; VINs missing from a dealer's latest feed become `status = 'inactive'` automatically.
- **`price = null` means "Call for Price"** — the frontend checks `price IS NULL` to switch between showing the price and the CTA button.
- **Hot-linked photos** — photo URLs from the CSV feed are stored as-is; no re-hosting in MVP.
- **Service-role client never reaches the browser** — only the ingestion worker and server-side API routes use it.
- **Dealer details come from the `dealers` table** — `GET /api/listings/:vin` attaches the selling dealer's contact info.
- **Leads are checked server-side** — inquiries need a name, a valid email and a phone number; click-for-price leads carry no contact details. The server links leads to listings by VIN, rate-limits submissions per IP, and silently drops submissions that fill the form's hidden honeypot field.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `migration.sql` in the Supabase SQL editor before starting the app — the tables must exist.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS; never expose it to the frontend or commit it.
- The ingestion worker marks VINs inactive only for dealer IDs present in the current files — safe for multi-dealer setups.
- The import refuses to deactivate more than half of a dealer's listings in one run (an incomplete feed looks like that); see the ingestion README.
- GitHub runs the scheduled import from the repository's default branch.
- The generated files in `lib/api-zod` and `lib/api-client-react` come from `openapi.yaml`; change the spec and re-run codegen rather than editing them.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
