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
  filteredRows: number;
  droppedRows: number;
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
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function int(val: unknown): number | null {
  const n = num(val);
  return n === null ? null : Math.round(n);
}

function bool(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim().toLowerCase();
  return s === "true" || s === "yes" || s === "1" || s === "y";
}

/** Split a photo URL list — the feed uses pipe (|) as the delimiter. */
function splitPhotos(val: unknown): string[] {
  const s = str(val);
  if (!s) return [];
  // Support both | and , delimiters; filter out empty strings
  const delimiter = s.includes("|") ? "|" : ",";
  return s
    .split(delimiter)
    .map((u) => u.trim())
    .filter(Boolean);
}

/** Normalise an ISO-ish date string or return null. */
function dateStr(val: unknown): string | null {
  const s = str(val);
  if (!s) return null;
  // Accept YYYY-MM-DD or MM/DD/YYYY and convert to YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    const [m, d, y] = s.split("/");
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return s;
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

  // Filter: Used vehicles with Retail disposition
  const filtered = rows.filter((r) => {
    const newUsed = str(r["New/Used"]);
    const disposition = str(r["Disposition"]) ?? "";
    const isUsed = newUsed?.toLowerCase() === "used";
    const isRetail = disposition.toLowerCase().includes("retail");
    return isUsed && isRetail;
  });

  const droppedRows = totalRows - filtered.length;

  const dealers = new Map<string, DealerRow>();
  const listings: ListingRow[] = [];

  for (const r of filtered) {
    const dealerId = str(r["DealerId"]);
    if (!dealerId || !str(r["VIN"])) {
      // Skip rows without a dealer ID or VIN — can't upsert without the key
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
      vin: str(r["VIN"])!,
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
      msrp: num(r["MSRP"]),
      price: num(r["Price"]), // empty string → null → "Call for Price"
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
  };
}
