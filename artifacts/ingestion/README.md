# @workspace/ingestion — Inventory Import Worker

Pulls each dealer's daily inventory CSV from SFTP, keeps the used retail vehicles, and upserts them into the Supabase `listings` table. Listings missing from a dealer's latest file are marked inactive, so sold cars drop off the site.

---

## Quick start

```bash
# 1. Copy the env template and fill in your credentials (the script reads .env automatically)
cp .env.example .env

# 2. Check the live SFTP feed without writing anything
pnpm --filter @workspace/ingestion run import --dry-run

# 3. Run the real import
pnpm --filter @workspace/ingestion run import
```

To work offline, `import:local` reads the dealer snapshots in `fixtures/` instead of SFTP. Pair it with `--dry-run` unless you mean to load that snapshot into the database your credentials point at:

```bash
pnpm --filter @workspace/ingestion run import:local --dry-run
```

---

## Environment variables

| Variable | Description |
|---|---|
| `SFTP_HOST` | SFTP hostname (e.g. `sftp.vendor.com`) |
| `SFTP_PORT` | SFTP port (default `22`) |
| `SFTP_USER` | SFTP username |
| `SFTP_PASSWORD` | SFTP password |
| `SFTP_REMOTE_PATH` | A CSV file, a folder (every `.csv` inside is imported), or several of either separated by commas |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **service-role** key — bypasses RLS; never expose to browsers |

Point `SFTP_REMOTE_PATH` at the current files only. If the vendor keeps dated copies in the same folder, list the current files explicitly, or old copies will be imported too.

## Flags

| Flag | Effect |
|---|---|
| `--dry-run` | Download, parse and compare with the database, then report what would change without writing. Without Supabase credentials it stops after parsing. |
| `--allow-mass-deactivation` | Skip the safety check described below, for when a dealer really did remove most of its inventory. |

---

## What the script does

1. **Downloads the CSVs** from SFTP (one per store), or reads `fixtures/*.csv` with `import:local`.
2. **Filters rows** to used retail vehicles (see below) and merges the files. A VIN that appears twice is kept once, with a warning.
3. **Compares with the database** — which listings are new, updated, back in stock, or gone from the feed.
4. **Upserts dealers**, one row per `DealerId`, on conflict `dealer_id`.
5. **Upserts listings** on conflict `vin`, setting `status = 'active'` and `updated_at = now()`.
6. **Marks listings inactive** when they belong to a dealer in today's files but are missing from its feed. A dealer with no file today keeps its listings.
7. **Prints a summary**, and in GitHub Actions also writes it to the run's summary page.

### Filtering

A row is imported when `New/Used` is `Used` or `U`, **and** `Disposition` is `R` or contains `Retail` (case-insensitive). New vehicles and fleet (`F`) or wholesale (`W`) dispositions are skipped. Adjust `isUsedRetail` in `src/parse.ts` if a vendor sends different codes.

A zero or blank price is stored as `null`, which the site shows as "Call for Price".

### Safety checks

The run finishes but **exits with an error** (a red run in GitHub Actions) when something needs a person to look:

- **Mass deactivation** — if a dealer would lose more than half of its active listings (and more than 10 cars) in one run, those deactivations are held back. A truncated or half-exported file looks exactly like that. The dealer's other updates still go through. If the cars really are gone, re-run with `--allow-mass-deactivation`.
- **Stale file** — an SFTP file not updated in 72 hours, which usually means the dealer's export stopped.
- **Empty file** — a file with no used retail listings.

---

## Scheduling

`.github/workflows/daily-import.yml` runs the import every day at 06:00 UTC. It can also be started from **GitHub → Actions → Daily Inventory Import → Run workflow**, with checkboxes for a dry run and for allowing mass deactivation.

Set these as **repository secrets** (GitHub → Settings → Secrets and variables → Actions): `SFTP_HOST`, `SFTP_PORT` (optional), `SFTP_USER`, `SFTP_PASSWORD`, `SFTP_REMOTE_PATH`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

> GitHub runs scheduled workflows from the repository's **default branch** only. Make sure that branch has the latest code.

A good first run: trigger the workflow manually with **dry run** checked, confirm the file counts and planned changes in the run summary, then run it for real.

---

## Sample data

- `fixtures/` — snapshots of the Audi Cape Fear and Land Rover Cape Fear feeds, used by `import:local`.
- `examples/sample.csv` — a small hand-made file showing the expected columns and edge cases (a new car, a fleet car, a blank price, pipe-delimited lists). It isn't imported by `import:local`.
