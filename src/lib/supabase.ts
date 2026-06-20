/* ═══════════════════════════════════════════════════════════════════
   Supabase Client — Server & Browser
   Uses @supabase/ssr for App Router compatibility.
   ═══════════════════════════════════════════════════════════════════ */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Browser client lives in ./supabase-browser to keep next/headers out of
// the client bundle. Re-exported here for backward-compatible imports.
export { createSupabaseBrowserClient } from "./supabase-browser";

/**
 * Create a Supabase client for use in Server Components, API routes,
 * and Server Actions. Reads/writes cookies for session management.
 */
export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "[intheGno] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // `setAll` can fail in Server Components (read-only context).
        }
      },
    },
  });
}
