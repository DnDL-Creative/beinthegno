/* ═══════════════════════════════════════════════════════════════════
   Newsletter — Resend audience + Supabase mirror. Server-side only.
   We keep our own copy of every subscriber in itg_subscribers (so the
   list survives a provider swap) and best-effort sync to a Resend
   audience for sending. Resend is optional: with no key, signups still
   persist to Supabase and the form works.
   ═══════════════════════════════════════════════════════════════════ */

import { Resend } from "resend";
import { createSupabaseAdminClient } from "./supabase-admin";

let _resend: Resend | null = null;

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("[intheGno] Missing RESEND_API_KEY");
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return EMAIL_RE.test(email) && email.length <= 254 ? email : null;
}

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string };

/**
 * Subscribe an email. Idempotent: re-subscribing an existing address
 * succeeds (and re-activates an unsubscribed one). Stores in Supabase
 * first; Resend sync is best-effort and never fails the signup.
 */
export async function subscribe(
  rawEmail: string,
  source = "site"
): Promise<SubscribeResult> {
  const email = normalizeEmail(rawEmail);
  if (!email) return { ok: false, error: "Enter a valid email." };

  const db = createSupabaseAdminClient();

  const { data: existing } = await db
    .from("itg_subscribers")
    .select("id, status")
    .eq("email", email)
    .maybeSingle<{ id: string; status: string }>();

  const alreadySubscribed = existing?.status === "subscribed";

  // Best-effort Resend audience sync.
  let resendContactId = "";
  if (isResendConfigured() && process.env.RESEND_AUDIENCE_ID) {
    try {
      const res = await getResend().contacts.create({
        email,
        audienceId: process.env.RESEND_AUDIENCE_ID,
        unsubscribed: false,
      });
      resendContactId = res.data?.id ?? "";
    } catch (e) {
      console.warn("[intheGno] Resend contact sync failed (non-fatal):", e);
    }
  }

  if (existing) {
    const { error } = await db
      .from("itg_subscribers")
      .update({
        status: "subscribed",
        ...(resendContactId ? { resend_contact_id: resendContactId } : {}),
      })
      .eq("id", existing.id);
    if (error) {
      console.error("[intheGno] subscribe update failed:", error);
      return { ok: false, error: "Something went wrong. Try again." };
    }
    return { ok: true, alreadySubscribed };
  }

  const { error } = await db.from("itg_subscribers").insert({
    email,
    source,
    status: "subscribed",
    resend_contact_id: resendContactId,
  });
  if (error) {
    // Unique-violation race → treat as success.
    if (error.code === "23505") return { ok: true, alreadySubscribed: true };
    console.error("[intheGno] subscribe insert failed:", error);
    return { ok: false, error: "Something went wrong. Try again." };
  }

  return { ok: true, alreadySubscribed: false };
}
