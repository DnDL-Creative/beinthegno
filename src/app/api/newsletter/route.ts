import { NextResponse } from "next/server";
import { subscribe } from "@/lib/newsletter";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Unauthenticated + writes to the DB with the service-role client + can
// trigger a Resend call, so it needs a throttle. Signing up is a
// once-in-a-while action; 5 per 10 min per IP is generous for humans.
const LIMIT = 5;
const WINDOW_MS = 10 * 60 * 1000;

/**
 * Newsletter signup. POST { email, source? } → { ok, message }.
 * Always persists to Supabase (itg_subscribers); Resend sync is
 * best-effort, so the form works even before RESEND_API_KEY is set.
 */
export async function POST(request: Request) {
  const gate = rateLimit(`newsletter:${clientIp(request)}`, LIMIT, WINDOW_MS);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many signups. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfter) } }
    );
  }

  let email: string | undefined;
  let source: string | undefined;
  try {
    ({ email, source } = await request.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (!email || typeof email !== "string") {
    return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
  }

  // `source` is client-supplied and lands in the DB — bound it so it can't
  // be used to stuff arbitrary payloads into itg_subscribers.
  const safeSource =
    typeof source === "string" && source.trim()
      ? source.trim().slice(0, 64).replace(/[^\w:.-]/g, "")
      : "site";

  const result = await subscribe(email, safeSource);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: result.alreadySubscribed ? "You're already on the list." : "You're in. Stay grounded.",
  });
}
