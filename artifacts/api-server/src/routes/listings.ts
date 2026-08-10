import { Router, type IRouter } from "express";
import { getAnonClient } from "@workspace/supabase-client";
import {
  GetListingsQueryParams,
  GetListingParams,
  GetListingsResponse,
  GetListingResponse,
  GetListingFiltersResponse,
  GetListingsStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /listings/filters — must be registered BEFORE /listings/:vin
router.get("/listings/filters", async (req, res): Promise<void> => {
  const client = getAnonClient();

  const { data, error } = await client
    .from("listings")
    .select("make, model, year, price, odometer")
    .eq("status", "active")
    .not("make", "is", null);

  if (error) {
    req.log.error({ err: error }, "Failed to fetch listing filters");
    res.status(500).json({ error: "Failed to fetch filters" });
    return;
  }

  const rows = data ?? [];

  const makes = [...new Set(rows.map((r) => r.make).filter(Boolean) as string[])].sort();
  const models = [...new Set(rows.map((r) => r.model).filter(Boolean) as string[])].sort();

  const years = rows.map((r) => r.year).filter((y): y is number => typeof y === "number");
  const prices = rows.map((r) => Number(r.price)).filter((p) => !isNaN(p) && p > 0);
  const odometers = rows.map((r) => r.odometer).filter((o): o is number => typeof o === "number");

  const filters = GetListingFiltersResponse.parse({
    makes,
    models,
    year_min: years.length ? Math.min(...years) : null,
    year_max: years.length ? Math.max(...years) : null,
    price_min: prices.length ? Math.min(...prices) : null,
    price_max: prices.length ? Math.max(...prices) : null,
    odometer_max: odometers.length ? Math.max(...odometers) : null,
  });

  res.json(filters);
});

// GET /listings/stats — must be registered BEFORE /listings/:vin
router.get("/listings/stats", async (req, res): Promise<void> => {
  const client = getAnonClient();

  const [totalResult, certResult, priceResult, makesResult] = await Promise.all([
    client.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
    client.from("listings").select("*", { count: "exact", head: true }).eq("status", "active").eq("certified", true),
    client.from("listings").select("price").eq("status", "active").not("price", "is", null),
    client.from("listings").select("make").eq("status", "active").not("make", "is", null),
  ]);

  const total = totalResult.count ?? 0;
  const certifiedCount = certResult.count ?? 0;
  const prices = (priceResult.data ?? []).map((r) => Number(r.price)).filter((p) => !isNaN(p) && p > 0);
  const uniqueMakes = new Set((makesResult.data ?? []).map((r) => r.make).filter(Boolean));

  const stats = GetListingsStatsResponse.parse({
    total,
    certified_count: certifiedCount,
    avg_price: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
    min_price: prices.length ? Math.min(...prices) : null,
    max_price: prices.length ? Math.max(...prices) : null,
    makes_count: uniqueMakes.size,
  });

  res.json(stats);
});

// GET /listings
router.get("/listings", async (req, res): Promise<void> => {
  const parsed = GetListingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { make, model, year_min, year_max, price_min, price_max, odometer_max, limit = 24, offset = 0 } = parsed.data;
  const client = getAnonClient();

  let query = client
    .from("listings")
    .select("*", { count: "exact" })
    .eq("status", "active");

  if (make) query = query.eq("make", make);
  if (model) query = query.eq("model", model);
  if (year_min != null) query = query.gte("year", year_min);
  if (year_max != null) query = query.lte("year", year_max);
  if (price_min != null) query = query.gte("price", price_min);
  if (price_max != null) query = query.lte("price", price_max);
  if (odometer_max != null) query = query.lte("odometer", odometer_max);

  query = query.order("created_at", { ascending: false });
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
  const { data, error } = await client
    .from("listings")
    .select("*")
    .eq("vin", params.data.vin)
    .eq("status", "active")
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }

  res.json(GetListingResponse.parse(data));
});

export default router;
