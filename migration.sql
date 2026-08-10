-- =============================================================================
-- Used-Car Marketplace — Supabase Database Migration
-- =============================================================================
--
-- HOW TO RUN:
--   1. Open your Supabase project at https://supabase.com/dashboard
--   2. Go to SQL Editor (left sidebar)
--   3. Click "New query"
--   4. Paste this entire file and click "Run"
--
-- This is safe to run more than once — all statements use IF NOT EXISTS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- DEALERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id    text UNIQUE NOT NULL,
  name         text,
  address      text,
  city         text,
  postal_code  text,
  email        text,
  phone        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- LISTINGS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vin                  text UNIQUE NOT NULL,
  dealer_id            text NOT NULL REFERENCES dealers(dealer_id) ON DELETE RESTRICT,
  stock_number         text,
  year                 integer,
  make                 text,
  model                text,
  model_number         text,
  body                 text,
  transmission         text,
  series               text,
  series_detail        text,
  door_count           integer,
  odometer             integer,
  engine_cylinders     integer,
  engine_displacement  text,
  engine               text,
  drivetrain           text,
  exterior_color       text,
  interior_color       text,
  msrp                 numeric(12, 2),
  price                numeric(12, 2),          -- NULL means "Call for Price"
  certified            boolean NOT NULL DEFAULT false,
  description          text,
  features             text,
  photo_urls           text[] NOT NULL DEFAULT '{}',
  city_mpg             integer,
  highway_mpg          integer,
  vehicle_detail_link  text,
  inventory_date       date,
  photos_last_modified date,
  age                  integer,
  status               text NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- LEADS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vin                 text,
  listing_id          uuid REFERENCES listings(id) ON DELETE SET NULL,
  lead_type           text NOT NULL,             -- 'inquiry' | 'click_for_price'
  name                text,
  email               text,
  phone               text,
  message             text,
  vehicle_detail_link text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_listings_vin         ON listings(vin);
CREATE INDEX IF NOT EXISTS idx_listings_status      ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_make        ON listings(make);
CREATE INDEX IF NOT EXISTS idx_listings_model       ON listings(model);
CREATE INDEX IF NOT EXISTS idx_listings_dealer_id   ON listings(dealer_id);
CREATE INDEX IF NOT EXISTS idx_listings_year        ON listings(year);
CREATE INDEX IF NOT EXISTS idx_listings_price       ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_odometer    ON listings(odometer);
CREATE INDEX IF NOT EXISTS idx_leads_vin            ON leads(vin);
CREATE INDEX IF NOT EXISTS idx_leads_listing_id     ON leads(listing_id);

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER (keeps listings.updated_at current on every update)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_set_updated_at ON listings;
CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
ALTER TABLE dealers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads    ENABLE ROW LEVEL SECURITY;

-- DEALERS: anon can read all rows
DROP POLICY IF EXISTS "anon_read_dealers" ON dealers;
CREATE POLICY "anon_read_dealers"
  ON dealers FOR SELECT
  TO anon
  USING (true);

-- LISTINGS: anon can read only active listings
DROP POLICY IF EXISTS "anon_read_active_listings" ON listings;
CREATE POLICY "anon_read_active_listings"
  ON listings FOR SELECT
  TO anon
  USING (status = 'active');

-- LEADS: anon can insert (submit inquiry / click-for-price); no SELECT
DROP POLICY IF EXISTS "anon_insert_leads" ON leads;
CREATE POLICY "anon_insert_leads"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- =============================================================================
-- Done! Your tables are ready.
-- Env vars to add to your project (Project Settings → API):
--   SUPABASE_URL              = https://<project-ref>.supabase.co
--   SUPABASE_ANON_KEY         = <anon / public key>
--   SUPABASE_SERVICE_ROLE_KEY = <service_role key>  ← keep this secret!
--
-- For the Vite frontend, also add:
--   VITE_SUPABASE_URL         = same as SUPABASE_URL
--   VITE_SUPABASE_ANON_KEY    = same as SUPABASE_ANON_KEY
-- =============================================================================
