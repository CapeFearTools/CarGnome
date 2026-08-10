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
import { fetchFromSftp, readLocalFixture } from "./sftp.js";
import { parseCsv } from "./parse.js";
import { upsertInventory } from "./db.js";

const isLocal = process.argv.includes("--local");

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log(`\n====================================================`);
  console.log(`  AutoClassic Inventory Ingestion — ${new Date().toISOString()}`);
  console.log(`  Mode: ${isLocal ? "LOCAL FIXTURE" : "SFTP"}`);
  console.log(`====================================================\n`);

  // ── 1. Load config ─────────────────────────────────────────────────────────
  let csvBuffer: Buffer;
  let supabaseUrl: string;
  let supabaseServiceRoleKey: string;

  if (isLocal) {
    const config = loadLocalConfig();
    supabaseUrl = config.supabaseUrl;
    supabaseServiceRoleKey = config.supabaseServiceRoleKey;
    csvBuffer = readLocalFixture();
  } else {
    const config = loadConfig();
    supabaseUrl = config.supabaseUrl;
    supabaseServiceRoleKey = config.supabaseServiceRoleKey;

    // ── 2. Fetch CSV from SFTP ─────────────────────────────────────────────
    try {
      csvBuffer = await fetchFromSftp(config.sftp);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n[error] SFTP fetch failed: ${msg}`);
      console.error(
        "[error] Check SFTP_HOST, SFTP_USER, SFTP_PASSWORD, SFTP_REMOTE_PATH.\n",
      );
      process.exit(1);
    }
  }

  // ── 3. Parse & filter ──────────────────────────────────────────────────────
  console.log("[parse] Parsing CSV…");
  const { dealers, listings, totalRows, filteredRows, droppedRows } =
    parseCsv(csvBuffer);

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
