import { createServiceRoleClient } from "@workspace/supabase-client";
import type { DealerRow, ListingRow } from "./parse.js";

/** Batch size for Supabase upsert calls — stay well under PostgREST limits. */
const BATCH_SIZE = 200;

export interface UpsertResult {
  dealersUpserted: number;
  listingsUpserted: number;
  deactivated: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main upsert function
// ---------------------------------------------------------------------------

export async function upsertInventory(
  supabaseUrl: string,
  serviceRoleKey: string,
  dealers: Map<string, DealerRow>,
  listings: ListingRow[],
): Promise<UpsertResult> {
  const client = createServiceRoleClient(supabaseUrl, serviceRoleKey);

  // 1. Upsert dealers
  const dealerRows = [...dealers.values()];
  let dealersUpserted = 0;

  for (const batch of chunk(dealerRows, BATCH_SIZE)) {
    const { error } = await client
      .from("dealers")
      .upsert(batch, { onConflict: "dealer_id" });

    if (error) {
      console.error("[db] Error upserting dealers:", error.message);
      throw new Error(`Dealer upsert failed: ${error.message}`);
    }
    dealersUpserted += batch.length;
  }

  console.log(`[db] Upserted ${dealersUpserted} dealer(s)`);

  // 2. Upsert listings — include updated_at so the trigger fires correctly
  const now = new Date().toISOString();
  const listingPayloads = listings.map((l) => ({ ...l, updated_at: now }));
  let listingsUpserted = 0;

  for (const batch of chunk(listingPayloads, BATCH_SIZE)) {
    const { error } = await client
      .from("listings")
      .upsert(batch, { onConflict: "vin" });

    if (error) {
      console.error("[db] Error upserting listings:", error.message);
      throw new Error(`Listings upsert failed: ${error.message}`);
    }
    listingsUpserted += batch.length;
  }

  console.log(`[db] Upserted ${listingsUpserted} listing(s)`);

  // 3. Inactive sweep — mark listings for these dealers that are not in today's VIN set
  const dealerIds = [...dealers.keys()];
  const todayVins = listings.map((l) => l.vin);
  let deactivated = 0;

  if (dealerIds.length > 0) {
    // We can't do "vin NOT IN (huge list)" efficiently in one shot, so we fetch
    // currently active VINs for these dealers and compute the diff locally.
    const { data: activeRows, error: fetchError } = await client
      .from("listings")
      .select("vin")
      .eq("status", "active")
      .in("dealer_id", dealerIds);

    if (fetchError) {
      console.error("[db] Error fetching active VINs:", fetchError.message);
      throw new Error(`Active VIN fetch failed: ${fetchError.message}`);
    }

    const todayVinSet = new Set(todayVins);
    const toDeactivate = (activeRows ?? [])
      .map((r: { vin: string }) => r.vin)
      .filter((vin: string) => !todayVinSet.has(vin));

    if (toDeactivate.length > 0) {
      for (const batch of chunk(toDeactivate, BATCH_SIZE)) {
        const { error: deactError } = await client
          .from("listings")
          .update({ status: "inactive", updated_at: now })
          .in("vin", batch);

        if (deactError) {
          console.error("[db] Error deactivating listings:", deactError.message);
          throw new Error(`Deactivation failed: ${deactError.message}`);
        }
        deactivated += batch.length;
      }
    }
  }

  console.log(`[db] Deactivated ${deactivated} stale listing(s)`);

  return { dealersUpserted, listingsUpserted, deactivated };
}
