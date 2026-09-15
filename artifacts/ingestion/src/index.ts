/**
 * @workspace/ingestion — Daily inventory import
 *
 * Usage:
 *   pnpm --filter @workspace/ingestion run import          # SFTP → Supabase
 *   pnpm --filter @workspace/ingestion run import:local    # fixtures/*.csv → Supabase
 *
 * Add flags after the script name, e.g. `run import --dry-run`:
 *   --dry-run                  Download, parse and compare with the database, but write
 *                              nothing. Without Supabase credentials it stops after parsing.
 *   --allow-mass-deactivation  Skip the safety check that holds back deactivating more
 *                              than half of a dealer's listings in one run.
 *
 * Settings come from environment variables, or artifacts/ingestion/.env for local runs
 * (copy .env.example). The process exits with code 1 when the run fails or needs
 * attention, so a scheduled GitHub Actions run shows up red.
 */

import { appendFileSync } from "node:fs";
import { loadSftpConfig, loadSupabaseConfig } from "./config.js";
import { fetchFromSftp, readLocalFixtureDir, type SourceFile } from "./sftp.js";
import { parseCsv, type DealerRow, type ListingRow } from "./parse.js";
import { planImport, type ImportPlan } from "./plan.js";
import { applyImport, connect, fetchExistingListings } from "./db.js";

/** A source file older than this suggests the dealer's export has stopped. */
const STALE_FILE_HOURS = 72;

const args = process.argv.slice(2);
const isLocal = args.includes("--local");
const isDryRun = args.includes("--dry-run");
const allowMassDeactivation = args.includes("--allow-mass-deactivation");

interface FileSummary {
  name: string;
  totalRows: number;
  usedRetailRows: number;
  listings: number;
}

/** Appends Markdown to the GitHub Actions run summary when running there. */
function writeStepSummary(lines: string[]): void {
  const summaryPath = process.env["GITHUB_STEP_SUMMARY"];
  if (!summaryPath) return;
  try {
    appendFileSync(summaryPath, lines.join("\n") + "\n");
  } catch {
    // The summary is a convenience; never fail the import over it.
  }
}

async function main(): Promise<number> {
  // Local runs read artifacts/ingestion/.env; in GitHub Actions the values come from secrets.
  try {
    process.loadEnvFile();
  } catch {
    // No .env file
  }

  const startedAt = Date.now();
  console.log(`\n====================================================`);
  console.log(`  Drive Cape Fear Inventory Import — ${new Date().toISOString()}`);
  console.log(`  Source: ${isLocal ? "local fixtures" : "SFTP"}${isDryRun ? " (dry run — no database writes)" : ""}`);
  console.log(`====================================================\n`);

  // Check settings before downloading anything.
  const supabaseConfig = loadSupabaseConfig(!isDryRun);
  const sftpConfig = isLocal ? null : loadSftpConfig();

  // Anything a person should look at, even when the import itself went through.
  const problems: string[] = [];

  // ── 1. Source files ─────────────────────────────────────────────────────────
  // Each store sends its own CSV, so one run can import several files.
  let files: SourceFile[];
  if (!sftpConfig) {
    files = readLocalFixtureDir();
  } else {
    try {
      files = await fetchFromSftp(sftpConfig);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `SFTP download failed: ${msg}\n` +
          "Check SFTP_HOST, SFTP_PORT, SFTP_USER, SFTP_PASSWORD and SFTP_REMOTE_PATH.",
      );
    }
  }

  for (const file of files) {
    if (!file.modifiedAt) continue;
    const ageHours = (Date.now() - file.modifiedAt.getTime()) / 3_600_000;
    if (ageHours > STALE_FILE_HOURS) {
      problems.push(
        `${file.name} was last updated ${Math.floor(ageHours / 24)} days ago; the dealer's export may have stopped.`,
      );
    }
  }

  // ── 2. Parse, filter and merge ─────────────────────────────────────────────
  console.log(`[parse] Parsing ${files.length} file(s)…`);
  const dealers = new Map<string, DealerRow>();
  const listingsByVin = new Map<string, { listing: ListingRow; file: string }>();
  const fileSummaries: FileSummary[] = [];

  for (const file of files) {
    const result = parseCsv(file.buffer);
    console.log(
      `[parse]   ${file.name}: ${result.totalRows} rows, ${result.filteredRows} used retail, ${result.listings.length} importable`,
    );
    fileSummaries.push({
      name: file.name,
      totalRows: result.totalRows,
      usedRetailRows: result.filteredRows,
      listings: result.listings.length,
    });

    if (result.skippedRows > 0) {
      console.warn(`[warn]    ${file.name}: skipped ${result.skippedRows} row(s) with no VIN or DealerId`);
    }
    if (result.listings.length === 0) {
      problems.push(`${file.name} has no used retail listings; check the file and the filter in src/parse.ts.`);
    }

    for (const [dealerId, dealer] of result.dealers) {
      dealers.set(dealerId, dealer);
    }
    for (const listing of result.listings) {
      const previous = listingsByVin.get(listing.vin);
      if (previous) {
        // The same VIN twice in one upsert batch fails the whole batch, so keep one copy.
        console.warn(
          `[warn]    VIN ${listing.vin} appears more than once (${previous.file}, ${file.name}); keeping the copy from ${file.name}`,
        );
      }
      listingsByVin.set(listing.vin, { listing, file: file.name });
    }
  }

  const listings = [...listingsByVin.values()].map((entry) => entry.listing);
  console.log(`[parse] Dealers  : ${dealers.size}`);
  console.log(`[parse] Listings : ${listings.length.toLocaleString()}`);

  // ── 3. Compare with the database, then write ───────────────────────────────
  let plan: ImportPlan | null = null;

  if (listings.length === 0) {
    problems.push("Nothing to import: no file had used retail listings.");
  } else if (!supabaseConfig) {
    console.log("\n[db] No Supabase credentials; the dry run stops before comparing with the database.");
  } else {
    try {
      const client = connect(supabaseConfig.url, supabaseConfig.serviceRoleKey);
      const dealerIds = [...new Set(listings.map((listing) => listing.dealer_id))];
      const existing = await fetchExistingListings(client, dealerIds);
      plan = planImport(existing, listings, { allowMassDeactivation });

      for (const dealer of plan.dealers) {
        console.log(
          `[plan] ${dealer.dealerId}: ${dealer.incoming} in feed, ${dealer.activeBefore} active before, ` +
            `${dealer.toDeactivate.length} to deactivate${dealer.blocked ? " (held back)" : ""}`,
        );
        if (dealer.blocked) {
          problems.push(
            `Held back deactivating ${dealer.toDeactivate.length} of ${dealer.activeBefore} active listings for ${dealer.dealerId}. ` +
              "Losing more than half of a dealer's cars in one run usually means an incomplete feed. " +
              "If those cars really are gone, re-run with --allow-mass-deactivation.",
          );
        }
      }

      if (!isDryRun) {
        await applyImport(client, [...dealers.values()], listings, plan);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Database step failed: ${msg}\n` +
          "For connection or permission errors, check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      );
    }
  }

  // ── 4. Report ──────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const deactivatedLabel = isDryRun ? "Would deactivate" : "Deactivated";

  console.log(`\n====================================================`);
  console.log(`  ${isDryRun ? "Dry run" : "Import"} finished in ${elapsed}s`);
  console.log(`  Dealers          : ${dealers.size}`);
  console.log(`  Listings in feed : ${listings.length}`);
  if (plan) {
    console.log(`  New              : ${plan.newCount}`);
    console.log(`  Updated          : ${plan.updatedCount}`);
    console.log(`  Reactivated      : ${plan.reactivatedCount}`);
    console.log(`  ${deactivatedLabel.padEnd(17)}: ${plan.deactivate.length}`);
  }
  console.log(`====================================================\n`);
  for (const problem of problems) {
    console.warn(`[attention] ${problem}`);
  }

  const summary = [
    `## Inventory import${isDryRun ? " (dry run)" : ""}`,
    "",
    "| File | Rows | Used retail | Listings |",
    "| --- | ---: | ---: | ---: |",
    ...fileSummaries.map((f) => `| ${f.name} | ${f.totalRows} | ${f.usedRetailRows} | ${f.listings} |`),
    "",
  ];
  if (plan) {
    summary.push(
      "| Change | Listings |",
      "| --- | ---: |",
      `| New | ${plan.newCount} |`,
      `| Updated | ${plan.updatedCount} |`,
      `| Reactivated | ${plan.reactivatedCount} |`,
      `| ${deactivatedLabel} | ${plan.deactivate.length} |`,
      "",
    );
  } else if (listings.length > 0) {
    summary.push("_Stopped before comparing with the database (no Supabase credentials)._", "");
  }
  if (problems.length > 0) {
    summary.push("### Needs attention", "", ...problems.map((problem) => `- ${problem}`), "");
  }
  writeStepSummary(summary);

  return problems.length > 0 ? 1 : 0;
}

function finish(exitCode: number): void {
  process.exitCode = exitCode;
  // Exit anyway if an open connection keeps Node running after the work is done.
  setTimeout(() => process.exit(exitCode), 10_000).unref();
}

main()
  .then(finish)
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[error] ${message}\n`);
    writeStepSummary(["## Inventory import failed", "", "```", message, "```"]);
    finish(1);
  });
