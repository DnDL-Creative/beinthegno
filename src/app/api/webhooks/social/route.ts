import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

/**
 * Social Syndication Webhook Handler
 * Triggered on new post publication. Formats content and pushes to
 * X, Threads, Pinterest via Make.com or custom serverless functions.
 *
 * SECURITY: gated by a shared secret BEFORE the syndication logic exists.
 * This endpoint was previously wide open — harmless while it only logged,
 * but the moment the TODOs below are wired to real social APIs, an
 * unauthenticated caller could post to Daniel's accounts at will. The gate
 * ships first and fails closed when SOCIAL_WEBHOOK_SECRET is unset.
 *
 * Caller must send:  x-social-secret: <SOCIAL_WEBHOOK_SECRET>
 */
function secretOk(provided: string | null): boolean {
  const expected = process.env.SOCIAL_WEBHOOK_SECRET;
  if (!expected) return false; // unconfigured → deny
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretOk(request.headers.get("x-social-secret"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // TODO: Format micro-content for each platform
    // TODO: Push to X API, Threads API, Pinterest API (or Make.com webhook)

    console.log("[Social Webhook] New post syndication triggered:", {
      postId: body?.id,
      slug: body?.slug,
    });

    return NextResponse.json({ syndicated: true }, { status: 200 });
  } catch (error) {
    console.error("[Social Webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
