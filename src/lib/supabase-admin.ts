/* ═══════════════════════════════════════════════════════════════════
   Supabase Admin Client — SERVICE ROLE. Server-side only.
   Bypasses RLS; used by the CMS server actions, checkout, and
   webhook/download routes. Never import from a client component.
   ═══════════════════════════════════════════════════════════════════ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("[intheGno] supabase-admin must never run in the browser.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[intheGno] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
