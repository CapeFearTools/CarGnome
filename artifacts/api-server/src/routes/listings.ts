import { Router, type IRouter } from "express";
import { getAnonClient } from "@workspace/supabase-client";
import { cached } from "../lib/cache";
import {
  GetListingsQueryParams,
  GetListingParams,
  GetListingsResponse,
  GetListingResponse,
  GetListingFiltersQueryParams,
  GetListingFiltersResponse,
  GetListingsStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

/** Largest page a client can request from GET /listings. */
const MAX_PAGE_SIZE = 100;

/** Supabase returns at most 1,000 rows per request by default. */
const FETCH_BATCH_SIZE = 1000;

/**
 * How long the filters/stats endpoints reuse one inventory scan.
 *
 * Both endpoints aggregate over every active listing, so without this each
 * page load costs a full walk of the table. Inventory only changes when the
 * overnight import runs, so a few minutes of staleness is invisible to
 * shoppers.
 */
const INVENTORY_CACHE_MS = 5 * 60 * 1000;

/**
 * Edge caching for the read-only listing endpoints.
 *
 * `s-maxage` is what Vercel's CDN honours — plain `max-age` only reaches the
 * visitor's browser, which does nothing for someone arriving for the first
 * time. `stale-while-revalidate` lets the edge answer instantly from a slightly
 * stale copy while it refreshes behind the scenes, so no visitor waits on a
 * cold function start plus a full inventory scan.
 *
 * Inventory changes once a day, when the overnight import runs.
 */
const FILTERS_CACHE = "public, s-maxage=300, stale-while-revalidate=600";

/** Listings vary by query string, so they are cached briefly rather than long. */
const LISTINGS_CACHE = "public, s-maxage=60, stale-while-revalidate=300";

/** The columns the filters and stats endpoints aggregate over. */
interface InventoryRow {
  make: string | null;
  model: string | null;
  year: number | null;
  price: number | string | null;
  odometer: number | null;
  certified: boolean | null;
}

/** The `make` parameter takes one make or a comma-separated list: "Audi,Land Rover". */
function parseMakes(make: string | undefined): string[] {
  if (!make) return [];
  return [...new Set(make.split(",").map((m) => m.trim()).filter(Boolean))];
}

function clampInt(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), min), max) : min;
}

function distinctSorted(values: (string | null)[]): string[] {
  const present = values.filter((v): v is string => Boolean(v));
  return [...new Set(present)].sort((a, b) => a.localeCompare(b));
}

function minOf(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => Math.min(a, b)) : null;
}

function maxOf(values: number[]): number | null {
  return values.length > 0 ? values.reduce((a, b) => Math.max(a, b)) : null;
}

/**
 * Loads the aggregate columns for every active listing, paging past the
 * per-request row cap so filters and stats cover the whole inventory.
 *
 * Call `getActiveInventory` instead of this — the rows are shared between
 * requests, so treat them as read-only.
 */
async function fetchActiveInventory(): Promise<InventoryRow[]> {
  const client = getAnonClient();
  const rows: InventoryRow[] = [];

  for (;;) {
    const { data, count, error } = await client
      .from("listings")
      .select("make, model, year, price, odometer, certified", { count: "exact" })
      .eq("status", "active")
      .order("id")
      .range(rows.length, rows.length + FETCH_BATCH_SIZE - 1);

    if (error) throw error;

    const page = (data ?? []) as InventoryRow[];
    rows.push(...page);
    if (page.length === 0 || rows.length >= (count ?? 0)) return rows;
  }
}

/** The shared, briefly cached inventory snapshot behind filters and stats. */
const getActiveInventory = cached(INVENTORY_CACHE_MS, fetchActiveInventory);

// GET /listings/filters — must be registered BEFORE /listings/:vin
router.get("/listings/filters", async (req, res): Promise<void> => {
  const parsed = GetListingFiltersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let rows: InventoryRow[];
  try {
    rows = await getActiveInventory();
  } catch (err) {
    req.log.error({ err }, "Failed to fetch listing filters");
    res.status(500).json({ error: "Failed to fetch filters" });
    return;
  }

  // With a make selected, only offer that make's models.
  const makes = parseMakes(parsed.data.make);
  const modelRows =
    makes.length > 0 ? rows.filter((r) => r.make !== null && makes.includes(r.make)) : rows;

  const years = rows.map((r) => r.year).filter((y): y is number => typeof y === "number");
  const prices = rows.map((r) => Number(r.price)).filter((p) => p > 0);
  const odometers = rows.map((r) => r.odometer).filter((o): o is number => typeof o === "number");

  const filters = GetListingFiltersResponse.parse({
    makes: distinctSorted(rows.map((r) => r.make)),
    models: distinctSorted(modelRows.map((r) => r.model)),
    year_min: minOf(years),
    year_max: maxOf(years),
    price_min: minOf(prices),
    price_max: maxOf(prices),
    odometer_max: maxOf(odometers),
  });

  res.setHeader("Cache-Control", FILTERS_CACHE);
  res.json(filters);
});

// GET /listings/stats — must be registered BEFORE /listings/:vin
router.get("/listings/stats", async (req, res): Promise<void> => {
  let rows: InventoryRow[];
  try {
    rows = await getActiveInventory();
  } catch (err) {
    req.log.error({ err }, "Failed to fetch listing stats");
    res.status(500).json({ error: "Failed to fetch stats" });
    return;
  }

  const prices = rows.map((r) => Number(r.price)).filter((p) => p > 0);

  const stats = GetListingsStatsResponse.parse({
    total: rows.length,
    certified_count: rows.filter((r) => r.certified === true).length,
    avg_price: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
    min_price: minOf(prices),
    max_price: maxOf(prices),
    makes_count: distinctSorted(rows.map((r) => r.make)).length,
  });

  res.setHeader("Cache-Control", FILTERS_CACHE);
  res.json(stats);
});

// GET /listings
router.get("/listings", async (req, res): Promise<void> => {
  const parsed = GetListingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { make, model, year_min, year_max, price_min, price_max, odometer_max } = parsed.data;
  const limit = clampInt(parsed.data.limit, 1, MAX_PAGE_SIZE);
  const offset = clampInt(parsed.data.offset, 0, Number.MAX_SAFE_INTEGER);
  const makes = parseMakes(make);
  const client = getAnonClient();

  let query = client
    .from("listings")
    .select("*", { count: "exact" })
    .eq("status", "active");

  if (makes.length === 1) query = query.eq("make", makes[0]);
  if (makes.length > 1) query = query.in("make", makes);
  if (model) query = query.eq("model", model);
  if (year_min != null) query = query.gte("year", year_min);
  if (year_max != null) query = query.lte("year", year_max);
  if (price_min != null) query = query.gte("price", price_min);
  if (price_max != null) query = query.lte("price", price_max);
  if (odometer_max != null) query = query.lte("odometer", odometer_max);

  // Each import inserts many rows with the same created_at, so break ties by VIN
  // to keep pages stable (no repeats or gaps between offsets).
  query = query.order("created_at", { ascending: false }).order("vin");
  query = query.range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    req.log.error({ err: error }, "Failed to fetch listings");
    res.status(500).json({ error: "Failed to fetch listings" });
    return;
  }

  const response = GetListingsResponse.parse({
    items: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });

  res.setHeader("Cache-Control", LISTINGS_CACHE);
  res.json(response);
});

// GET /listings/:vin
router.get("/listings/:vin", async (req, res): Promise<void> => {
  const rawVin = Array.isArray(req.params.vin) ? req.params.vin[0] : req.params.vin;
  const params = GetListingParams.safeParse({ vin: rawVin });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const client = getAnonClient();
  const { data: listing, error } = await client
    .from("listings")
    .select("*")
    .eq("vin", params.data.vin)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    req.log.error({ err: error }, "Failed to fetch listing");
    res.status(500).json({ error: "Failed to fetch listing" });
    return;
  }

  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  // Attach the selling dealer's contact details. If they can't be loaded,
  // still show the car.
  let dealer: unknown;
  if (listing.dealer_id) {
    const { data: dealerRow, error: dealerError } = await client
      .from("dealers")
      .select("dealer_id, name, address, city, postal_code, email, phone")
      .eq("dealer_id", listing.dealer_id)
      .maybeSingle();

    if (dealerError) {
      req.log.warn({ err: dealerError }, "Failed to fetch dealer for listing");
    }
    dealer = dealerRow ?? undefined;
  }

  res.setHeader("Cache-Control", LISTINGS_CACHE);
  res.json(GetListingResponse.parse({ ...listing, dealer }));
});

export default router;
