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
 *
 * Note: clients are untyped (SupabaseClient<any>) — runtime type safety is
 * provided by Zod schemas from @workspace/api-zod on the server and
 * generated hooks on the frontend. Keeping the client untyped avoids
 * complex PostgREST type inference issues with the Database generic.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Re-export table types for convenience
export type { Dealer } from "@workspace/db";
export type { Listing } from "@workspace/db";
export type { Lead } from "@workspace/db";

// ---------------------------------------------------------------------------
// Factory functions (explicit URL + key — usable in any environment)
// ---------------------------------------------------------------------------

/** Create an anon (public) Supabase client — safe to use in the browser. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAnonClient(supabaseUrl: string, supabaseAnonKey: string): SupabaseClient<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(supabaseUrl, supabaseAnonKey);
}

/** Create a service-role Supabase client — server-side only, bypasses RLS. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createServiceRoleClient(supabaseUrl: string, serviceRoleKey: string): SupabaseClient<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ---------------------------------------------------------------------------
// Pre-configured singletons that read from process.env (server / Node only)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _anonClient: SupabaseClient<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _serviceRoleClient: SupabaseClient<any> | null = null;

/**
 * Returns the shared anon Supabase client for server-side code.
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in process.env.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAnonClient(): SupabaseClient<any> {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getServiceRoleClient(): SupabaseClient<any> {
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
