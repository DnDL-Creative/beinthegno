/* ═══════════════════════════════════════════════════════════════════
   Supabase Browser Client — safe for Client Components.
   Kept separate from supabase.ts so the server client's `next/headers`
   import never gets pulled into the browser bundle.
   ═══════════════════════════════════════════════════════════════════ */

import { createBrowserClient } from "@supabase/ssr";

/** Create a Supabase client for use in Client Components. */
export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "[intheGno] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
