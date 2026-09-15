import type { ListingRow } from "./parse.js";

/** A listing already in the database, with the fields planning needs. */
export interface ExistingListing {
  vin: string;
  dealer_id: string;
  status: string;
}

export interface DealerPlan {
  dealerId: string;
  /** Listings for this dealer in today's feed. */
  incoming: number;
  /** Active listings for this dealer before the import. */
  activeBefore: number;
  /** Active VINs missing from today's feed (sold or removed). */
  toDeactivate: string[];
  /** True when the mass-deactivation safety check held these deactivations back. */
  blocked: boolean;
}

export interface ImportPlan {
  newCount: number;
  updatedCount: number;
  reactivatedCount: number;
  dealers: DealerPlan[];
  /** VINs to mark inactive, leaving out dealers the safety check blocked. */
  deactivate: string[];
}

/**
 * Safety check: when a dealer would lose more than this share of its active
 * listings in one run (and more than MASS_DEACTIVATION_MIN cars), its
 * deactivations are held back. A truncated or half-exported feed looks exactly
 * like that, and acting on it would pull real inventory off the site.
 */
export const MASS_DEACTIVATION_SHARE = 0.5;
export const MASS_DEACTIVATION_MIN = 10;

/**
 * Works out what an import will change. Only dealers present in today's feed
 * are swept, so a dealer whose file is missing keeps its listings.
 */
export function planImport(
  existing: ExistingListing[],
  incoming: ListingRow[],
  options: { allowMassDeactivation: boolean },
): ImportPlan {
  const existingByVin = new Map(existing.map((row) => [row.vin, row]));
  const incomingVins = new Set(incoming.map((row) => row.vin));

  let newCount = 0;
  let updatedCount = 0;
  let reactivatedCount = 0;
  for (const listing of incoming) {
    const current = existingByVin.get(listing.vin);
    if (!current) newCount += 1;
    else if (current.status === "active") updatedCount += 1;
    else reactivatedCount += 1;
  }

  const dealerIds = [...new Set(incoming.map((row) => row.dealer_id))].sort();
  const dealers = dealerIds.map((dealerId): DealerPlan => {
    const active = existing.filter((row) => row.dealer_id === dealerId && row.status === "active");
    const toDeactivate = active.filter((row) => !incomingVins.has(row.vin)).map((row) => row.vin);
    const blocked =
      !options.allowMassDeactivation &&
      toDeactivate.length > MASS_DEACTIVATION_MIN &&
      toDeactivate.length > active.length * MASS_DEACTIVATION_SHARE;

    return {
      dealerId,
      incoming: incoming.filter((row) => row.dealer_id === dealerId).length,
      activeBefore: active.length,
      toDeactivate,
      blocked,
    };
  });

  return {
    newCount,
    updatedCount,
    reactivatedCount,
    dealers,
    deactivate: dealers.filter((dealer) => !dealer.blocked).flatMap((dealer) => dealer.toDeactivate),
  };
}
