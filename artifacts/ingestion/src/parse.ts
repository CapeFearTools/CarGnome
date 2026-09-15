import { parse } from "csv-parse/sync";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DealerRow {
  dealer_id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  email: string | null;
  phone: string | null;
}

export interface ListingRow {
  vin: string;
  dealer_id: string;
  stock_number: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  model_number: string | null;
  body: string | null;
  transmission: string | null;
  series: string | null;
  series_detail: string | null;
  door_count: number | null;
  odometer: number | null;
  engine_cylinders: number | null;
  engine_displacement: string | null;
  engine: string | null;
  drivetrain: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  msrp: number | null;
  price: number | null; // null = "Call for Price"
  certified: boolean;
  description: string | null;
  features: string | null;
  photo_urls: string[];
  city_mpg: number | null;
  highway_mpg: number | null;
  vehicle_detail_link: string | null;
  inventory_date: string | null;
  photos_last_modified: string | null;
  age: number | null;
  status: "active";
}

export interface ParseResult {
  dealers: Map<string, DealerRow>; // keyed by dealer_id
  listings: ListingRow[];
  totalRows: number;
  /** Rows that passed the used + retail filter. */
  filteredRows: number;
  droppedRows: number;
  /** Filtered rows skipped because they have no VIN or DealerId. */
  skippedRows: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function str(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

function num(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === "") return null;
  const n = parseFloat(s.replace(/[$,\s]/g, ""));
  return isNaN(n) ? null : n;
}

function int(val: unknown): number | null {
  const n = num(val);
  return n === null ? null : Math.round(n);
}

/** A money amount; zero or negative means the feed has no real price. */
function money(val: unknown): number | null {
  const n = num(val);
  return n !== null && n > 0 ? n : null;
}

function bool(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1" || s === "y";
}

/** Split a photo URL list — feeds delimit with pipes (|) or commas. */
function splitPhotos(val: unknown): string[] {
  const s = str(val);
  if (!s) return [];
  const delimiter = s.includes("|") ? "|" : ",";
  const urls = s
    .split(delimiter)
    .map((u) => u.trim())
    .filter(Boolean);
  return [...new Set(urls)];
}

/**
 * Normalises a feed date to YYYY-MM-DD, or null when it isn't a real date.
 * An unparseable value would make Postgres reject the whole batch.
 */
function dateStr(val: unknown): string | null {
  const s = str(val);
  if (!s) return null;

  // YYYY-MM-DD, optionally followed by a time, or MM/DD/YYYY, optionally
  // followed by a time (e.g. "7/30/2026 1:59:46 PM"). Anything after the date is ignored.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : us
      ? [Number(us[3]), Number(us[1]), Number(us[2])]
      : [NaN, NaN, NaN];

  // Reject impossible dates such as 13/45/2026.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isNaN(date.getTime()) || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Keeps used vehicles offered for retail. Feeds either spell the values out
 * ("Used", "Retail") or send codes: New/Used is "U"/"N", Disposition is
 * "R" (retail), "F" (fleet) or "W" (wholesale).
 */
function isUsedRetail(row: Record<string, unknown>): boolean {
  const newUsed = (str(row["New/Used"]) ?? "").toLowerCase();
  const disposition = (str(row["Disposition"]) ?? "").toLowerCase();
  const isUsed = newUsed === "u" || newUsed === "used";
  const isRetail = disposition === "r" || disposition.includes("retail");
  return isUsed && isRetail;
}

// ---------------------------------------------------------------------------
// Main parsing function
// ---------------------------------------------------------------------------

export function parseCsv(csvBuffer: Buffer): ParseResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = parse(csvBuffer, {
    columns: true,       // use first row as headers
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,           // strip UTF-8 BOM if present
  });

  const totalRows = rows.length;
  const filtered = rows.filter(isUsedRetail);
  const droppedRows = totalRows - filtered.length;

  const dealers = new Map<string, DealerRow>();
  const listings: ListingRow[] = [];
  let skippedRows = 0;

  for (const r of filtered) {
    const dealerId = str(r["DealerId"]);
    const vin = str(r["VIN"]);
    if (!dealerId || !vin) {
      // Can't upsert without the keys
      skippedRows += 1;
      continue;
    }

    // Collect unique dealers
    if (!dealers.has(dealerId)) {
      dealers.set(dealerId, {
        dealer_id: dealerId,
        name: str(r["Dealer Name"]),
        address: str(r["Dealer Address"]),
        city: str(r["Dealer City"]),
        postal_code: str(r["Dealer Postal Code"]),
        email: str(r["Marketing Email Address"]),
        phone: str(r["Marketing Phone Number"]),
      });
    }

    listings.push({
      vin,
      dealer_id: dealerId,
      stock_number: str(r["Stock #"]),
      year: int(r["Year"]),
      make: str(r["Make"]),
      model: str(r["Model"]),
      model_number: str(r["Model Number"]),
      body: str(r["Body"]),
      transmission: str(r["Transmission"]),
      series: str(r["Series"]),
      series_detail: str(r["Series Detail"]),
      door_count: int(r["Body Door Ct"]),
      odometer: int(r["Odometer"]),
      engine_cylinders: int(r["Engine Cylinder Ct"]),
      engine_displacement: str(r["Engine Displacement"]),
      engine: str(r["Engine"]),
      drivetrain: str(r["Drivetrain Desc"]),
      exterior_color: str(r["Colour"]),
      interior_color: str(r["Interior Color"]),
      msrp: money(r["MSRP"]),
      price: money(r["Price"]), // blank or 0 → null → "Call for Price"
      certified: bool(r["Certified"]),
      description: str(r["Description"]),
      features: str(r["Features"]),
      photo_urls: splitPhotos(r["Photo Url List"]),
      city_mpg: int(r["City MPG"]),
      highway_mpg: int(r["Highway MPG"]),
      vehicle_detail_link: str(r["Vehicle Detail Link"]),
      inventory_date: dateStr(r["Inventory Date"]),
      photos_last_modified: dateStr(r["Photos Last Modified Date"]),
      age: int(r["Age"]),
      status: "active",
    });
  }

  return {
    dealers,
    listings,
    totalRows,
    filteredRows: filtered.length,
    droppedRows,
    skippedRows,
  };
}
