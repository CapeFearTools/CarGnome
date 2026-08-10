# @workspace/ingestion — Inventory Import Worker

Pulls the daily inventory CSV from an SFTP endpoint, filters to used retail vehicles, and upserts into the Supabase `listings` table. VINs absent from the feed are automatically marked inactive so sold cars drop off the site.

---

## Quick start

```bash
# 1. Copy the env template and fill in your credentials
cp .env.example .env

# 2. Run against the live SFTP feed
pnpm --filter @workspace/ingestion run import

# 3. Or run against the local fixture (no SFTP connection)
pnpm --filter @workspace/ingestion run import:local
```

---

## Environment variables

| Variable | Description |
|---|---|
| `SFTP_HOST` | SFTP hostname (e.g. `sftp.vendor.com`) |
| `SFTP_PORT` | SFTP port (default `22`) |
| `SFTP_USER` | SFTP username |
| `SFTP_PASSWORD` | SFTP password |
| `SFTP_REMOTE_PATH` | Full path to the CSV file on the SFTP server |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service-role** key — bypasses RLS; never expose to browsers |

See `.env.example` for the full template.

---

## What the script does

1. **Connects to SFTP** and downloads the latest inventory CSV into memory.
2. **Filters rows** — keeps only `New/Used === 'Used'` and `Disposition` contains `'Retail'` (case-insensitive). All new vehicles and non-retail dispositions are skipped.
3. **Upserts dealers** — one row per unique `DealerId`, on conflict `dealer_id`.
4. **Upserts listings** — all filtered rows, on conflict `vin`, setting `status = 'active'` and `updated_at = now()`.
5. **Inactive sweep** — sets `status = 'inactive'` on any listing for these dealers whose VIN was not in today's feed (sold or removed vehicles).
6. **Prints a summary** — total rows, filtered rows, upserted, deactivated.

### Filtering notes

The `Disposition` filter matches `'Retail'` case-insensitively, so `"Retail"`, `"Retail Certified"`, `"Pre-Retail"`, etc. are all accepted. Confirm the exact values with your dealer feed vendor and adjust the `parseCsv` filter in `src/parse.ts` if needed.

---

## Scheduling

### Option A — GitHub Actions (recommended)

Add the workflow below to `.github/workflows/daily-import.yml` (already included in this repo):

```yaml
name: Daily Inventory Import

on:
  schedule:
    - cron: '0 6 * * *'   # 06:00 UTC every day
  workflow_dispatch:       # allow manual trigger from GitHub UI

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @workspace/ingestion run import
        env:
          SFTP_HOST: ${{ secrets.SFTP_HOST }}
          SFTP_PORT: ${{ secrets.SFTP_PORT }}
          SFTP_USER: ${{ secrets.SFTP_USER }}
          SFTP_PASSWORD: ${{ secrets.SFTP_PASSWORD }}
          SFTP_REMOTE_PATH: ${{ secrets.SFTP_REMOTE_PATH }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Set the environment variables as **encrypted repository secrets** in GitHub → Settings → Secrets and variables → Actions.

### Option B — Vercel Cron

If the project is deployed on Vercel, you can trigger the import via a cron-called HTTP endpoint.

1. Add a `/api/import` route to `artifacts/api-server` that calls the `runImport()` function from this package and returns `{ ok: true }`.
2. Add `@workspace/ingestion` as a dependency of `api-server`.
3. Add a `vercel.json` at the repository root:

```json
{
  "crons": [
    {
      "path": "/api/import",
      "schedule": "0 6 * * *"
    }
  ]
}
```

4. Set all environment variables (SFTP + Supabase) in the Vercel project dashboard → Settings → Environment Variables.

> **Note:** Vercel Cron is available on Pro and Enterprise plans. The GitHub Actions approach is free and simpler for most deployments.

---

## Local development with the fixture CSV

`fixtures/sample.csv` contains a small representative dataset with:

- 5 valid used retail listings (imported)
- 1 new vehicle row (filtered out — `New/Used = New`)
- 1 used fleet row (filtered out — `Disposition = Fleet`)

Running `pnpm --filter @workspace/ingestion run import:local` processes this file without any SFTP connection. You still need `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to write to the database, or you can add a dry-run flag to `src/index.ts` if you want fully offline testing.
