/* ═══════════════════════════════════════════════════════════════════
   Admin Auth Helpers — server-side only.
   The Supabase project is shared across DnDL apps, so a session alone
   is not enough: the user must also be present in itg_admins.
   ═══════════════════════════════════════════════════════════════════ */

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./supabase";
import { createSupabaseAdminClient } from "./supabase-admin";

/** Session user, or null. Reads the Supabase auth cookie. */
export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/** True if the given auth user is an intheGno admin. */
export async function isItgAdmin(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("itg_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * For admin pages: returns the admin user or redirects.
 * Logged out → /login. Logged in but not an admin → home.
 */
export async function requireAdminPage(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!(await isItgAdmin(user.id))) redirect("/");
  return user;
}

/**
 * For server actions & API routes: returns the admin user or null.
 * Callers must treat null as 401/403.
 */
export async function getAdminUser(): Promise<User | null> {
  const user = await getSessionUser();
  if (!user) return null;
  return (await isItgAdmin(user.id)) ? user : null;
}
