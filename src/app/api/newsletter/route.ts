import { NextResponse } from "next/server";
import { subscribe } from "@/lib/newsletter";

export const runtime = "nodejs";

/**
 * Newsletter signup. POST { email, source? } → { ok, message }.
 * Always persists to Supabase (itg_subscribers); Resend sync is
 * best-effort, so the form works even before RESEND_API_KEY is set.
 */
export async function POST(request: Request) {
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

  const result = await subscribe(email, typeof source === "string" ? source : "site");
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: result.alreadySubscribed ? "You're already on the list." : "You're in. Stay grounded.",
  });
}
