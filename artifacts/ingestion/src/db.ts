import { createServiceRoleClient } from "@workspace/supabase-client";
import type { DealerRow, ListingRow } from "./parse.js";
import type { ExistingListing, ImportPlan } from "./plan.js";

export type DbClient = ReturnType<typeof createServiceRoleClient>;

/**
 * Rows per write. Real listings carry long descriptions and dozens of photo
 * URLs, so keep request bodies small.
 */
const WRITE_BATCH_SIZE = 100;

/** Rows per read; Supabase returns at most 1,000 rows per request by default. */
const READ_PAGE_SIZE = 1000;

export interface ApplyResult {
  dealersUpserted: number;
  listingsUpserted: number;
  deactivated: number;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export function connect(url: string, serviceRoleKey: string): DbClient {
  return createServiceRoleClient(url, serviceRoleKey);
}

/** Loads every listing (active or not) belonging to the given dealers, page by page. */
export async function fetchExistingListings(client: DbClient, dealerIds: string[]): Promise<ExistingListing[]> {
  const rows: ExistingListing[] = [];
  if (dealerIds.length === 0) return rows;

  for (;;) {
    const { data, count, error } = await client
      .from("listings")
      .select("vin, dealer_id, status", { count: "exact" })
      .in("dealer_id", dealerIds)
      .order("vin")
      .range(rows.length, rows.length + READ_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Loading existing listings failed: ${error.message}`);
    }

    const page = (data ?? []) as ExistingListing[];
    rows.push(...page);
    if (page.length === 0 || rows.length >= (count ?? 0)) return rows;
  }
}

/** Writes an import: dealers first (listings reference them), then listings, then deactivations. */
export async function applyImport(
  client: DbClient,
  dealers: DealerRow[],
  listings: ListingRow[],
  plan: ImportPlan,
): Promise<ApplyResult> {
  for (const batch of chunk(dealers, WRITE_BATCH_SIZE)) {
    const { error } = await client.from("dealers").upsert(batch, { onConflict: "dealer_id" });
    if (error) {
      throw new Error(`Dealer upsert failed: ${error.message}`);
    }
  }
  console.log(`[db] Upserted ${dealers.length} dealer(s)`);

  // Stamp updated_at even when nothing else changed, as a record that the car was in today's feed.
  const now = new Date().toISOString();
  let listingsUpserted = 0;
  for (const batch of chunk(listings, WRITE_BATCH_SIZE)) {
    const { error } = await client
      .from("listings")
      .upsert(batch.map((listing) => ({ ...listing, updated_at: now })), { onConflict: "vin" });
    if (error) {
      throw new Error(`Listings upsert failed: ${error.message}`);
    }
    listingsUpserted += batch.length;
  }
  console.log(`[db] Upserted ${listingsUpserted} listing(s)`);

  let deactivated = 0;
  for (const batch of chunk(plan.deactivate, WRITE_BATCH_SIZE)) {
    const { error } = await client
      .from("listings")
      .update({ status: "inactive", updated_at: now })
      .in("vin", batch)
      .eq("status", "active");
    if (error) {
      throw new Error(`Deactivation failed: ${error.message}`);
    }
    deactivated += batch.length;
  }
  console.log(`[db] Deactivated ${deactivated} listing(s)`);

  return { dealersUpserted: dealers.length, listingsUpserted, deactivated };
}
