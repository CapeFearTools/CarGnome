/**
 * Supabase client helpers for the used-car marketplace.
 *
 * Server / Node usage (API server, ingestion worker):
 *   import { getAnonClient, getServiceRoleClient } from '@workspace/supabase-client'
 *   // Reads SUPABASE_URL + SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY from process.env
 *
 * Browser / Vite usage (react-vite frontend):
 *   import { createAnonClient } from '@workspace/supabase-client'
 *   const supabase = createAnonClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Dealer } from "@workspace/db";
import type { Listing } from "@workspace/db";
import type { Lead } from "@workspace/db";

// ---------------------------------------------------------------------------
// Database shape (used as the generic parameter for typed Supabase clients)
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      dealers: {
        Row: Dealer;
        Insert: Partial<Dealer> & { dealer_id: string };
        Update: Partial<Dealer>;
      };
      listings: {
        Row: Listing;
        Insert: Partial<Listing> & { vin: string; dealer_id: string };
        Update: Partial<Listing>;
      };
      leads: {
        Row: Lead;
        Insert: Partial<Lead> & { lead_type: string };
        Update: Partial<Lead>;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Factory functions (explicit URL + key — usable in any environment)
// ---------------------------------------------------------------------------

/** Create an anon (public) Supabase client — safe to use in the browser. */
export function createAnonClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/** Create a service-role Supabase client — server-side only, bypasses RLS. */
export function createServiceRoleClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Pre-configured singletons that read from process.env (server / Node only)
// ---------------------------------------------------------------------------

let _anonClient: SupabaseClient<Database> | null = null;
let _serviceRoleClient: SupabaseClient<Database> | null = null;

/**
 * Returns the shared anon Supabase client for server-side code.
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in process.env.
 */
export function getAnonClient(): SupabaseClient<Database> {
  if (!_anonClient) {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_ANON_KEY"];
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. " +
          "Find these in your Supabase dashboard → Project Settings → API.",
      );
    }
    _anonClient = createAnonClient(url, key);
  }
  return _anonClient;
}

/**
 * Returns the shared service-role Supabase client for server-side code.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in process.env.
 * This client bypasses Row Level Security — never expose it to the browser.
 */
export function getServiceRoleClient(): SupabaseClient<Database> {
  if (!_serviceRoleClient) {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
          "Find these in your Supabase dashboard → Project Settings → API.",
      );
    }
    _serviceRoleClient = createServiceRoleClient(url, key);
  }
  return _serviceRoleClient;
}

// ---------------------------------------------------------------------------
// Re-export table types for convenience
// ---------------------------------------------------------------------------
export type { Dealer, Listing, Lead };
