/**
 * @workspace/ingestion — Daily inventory import script
 *
 * Usage:
 *   pnpm --filter @workspace/ingestion run import          # SFTP mode
 *   pnpm --filter @workspace/ingestion run import:local    # local fixture mode
 *
 * All configuration is read from environment variables.
 * Copy .env.example to .env and fill in the values.
 */

import { loadConfig, loadLocalConfig } from "./config.js";
import { fetchFromSftp, readLocalFixtureDir } from "./sftp.js";
import { parseCsv, type DealerRow, type ListingRow } from "./parse.js";
import { upsertInventory } from "./db.js";

const isLocal = process.argv.includes("--local");

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log(`\n====================================================`);
  console.log(`  AutoClassic Inventory Ingestion — ${new Date().toISOString()}`);
  console.log(`  Mode: ${isLocal ? "LOCAL FIXTURE" : "SFTP"}`);
  console.log(`====================================================\n`);

  // ── 1. Load config & source CSV(s) ──────────────────────────────────────────
  // Each store/dealer may send its own CSV file, so we support fetching and
  // parsing multiple files in one run and merging the results before upsert.
  let csvBuffers: { filename: string; buffer: Buffer }[];
  let supabaseUrl: string;
  let supabaseServiceRoleKey: string;

  if (isLocal) {
    const config = loadLocalConfig();
    supabaseUrl = config.supabaseUrl;
    supabaseServiceRoleKey = config.supabaseServiceRoleKey;
    csvBuffers = readLocalFixtureDir();
  } else {
    const config = loadConfig();
    supabaseUrl = config.supabaseUrl;
    supabaseServiceRoleKey = config.supabaseServiceRoleKey;

    // ── 2. Fetch CSV from SFTP ─────────────────────────────────────────────
    try {
      const buffer = await fetchFromSftp(config.sftp);
      csvBuffers = [{ filename: config.sftp.remotePath, buffer }];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n[error] SFTP fetch failed: ${msg}`);
      console.error(
        "[error] Check SFTP_HOST, SFTP_USER, SFTP_PASSWORD, SFTP_REMOTE_PATH.\n",
      );
      process.exit(1);
    }
  }

  // ── 3. Parse & filter each file, merging results ────────────────────────────
  console.log(`[parse] Parsing ${csvBuffers.length} file(s)…`);
  const dealers = new Map<string, DealerRow>();
  const listings: ListingRow[] = [];
  let totalRows = 0;
  let filteredRows = 0;
  let droppedRows = 0;

  for (const { filename, buffer } of csvBuffers) {
    const result = parseCsv(buffer);
    console.log(
      `[parse]   ${filename}: ${result.totalRows} total, ${result.filteredRows} kept, ${result.droppedRows} dropped`,
    );
    for (const [dealerId, dealer] of result.dealers) {
      dealers.set(dealerId, dealer);
    }
    listings.push(...result.listings);
    totalRows += result.totalRows;
    filteredRows += result.filteredRows;
    droppedRows += result.droppedRows;
  }

  console.log(`[parse] Total rows in CSV  : ${totalRows.toLocaleString()}`);
  console.log(`[parse] Rows after filter  : ${filteredRows.toLocaleString()}`);
  console.log(`[parse] Dropped (non-retail): ${droppedRows.toLocaleString()}`);
  console.log(`[parse] Unique dealers     : ${dealers.size}`);
  console.log(`[parse] Listings to upsert : ${listings.length.toLocaleString()}`);

  if (listings.length === 0) {
    console.warn(
      "\n[warn] No listings to upsert — check the filter criteria " +
        "(New/Used === 'Used' and Disposition contains 'Retail').\n",
    );
    process.exit(0);
  }

  // ── 4. Upsert to Supabase ──────────────────────────────────────────────────
  console.log("\n[db] Connecting to Supabase…");
  let result;
  try {
    result = await upsertInventory(
      supabaseUrl,
      supabaseServiceRoleKey,
      dealers,
      listings,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`\n[error] Database operation failed: ${msg}`);
    console.error(
      "[error] Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n",
    );
    process.exit(1);
  }

  // ── 5. Summary ─────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n====================================================`);
  console.log(`  Import complete in ${elapsed}s`);
  console.log(`  Dealers upserted : ${result.dealersUpserted}`);
  console.log(`  Listings upserted: ${result.listingsUpserted}`);
  console.log(`  Deactivated      : ${result.deactivated}`);
  console.log(`====================================================\n`);
}

main().catch((err) => {
  console.error("[fatal]", err instanceof Error ? err.message : err);
  process.exit(1);
});
