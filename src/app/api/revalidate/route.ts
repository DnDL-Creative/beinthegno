import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

/**
 * Constant-time secret comparison that FAILS CLOSED.
 *
 * The previous check was `secret !== process.env.REVALIDATION_SECRET`.
 * With the env var unset that evaluates `undefined !== undefined` → false,
 * so the guard passed and ANY anonymous caller could force cache purges
 * (a cheap denial-of-wallet / origin-hammering vector). It also compared
 * with `!==`, which short-circuits on the first differing byte.
 */
function secretOk(provided: unknown): boolean {
  const expected = process.env.REVALIDATION_SECRET;
  if (!expected) return false; // never allow when unconfigured
  if (typeof provided !== "string" || provided.length === 0) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * On-Demand ISR Revalidation Endpoint
 * Call this to bust the cache for specific paths or tags.
 *
 * Usage:
 *   POST /api/revalidate
 *   Body: { "path": "/shop", "secret": "..." }
 *   or:   { "tag": "products", "secret": "..." }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Accept the secret from a header too, so it stays out of shell history
    // and server logs when called with curl.
    const secret = request.headers.get("x-revalidate-secret") ?? body?.secret;

    if (!secretOk(secret)) {
      return NextResponse.json(
        { error: "Invalid revalidation secret" },
        { status: 401 }
      );
    }

    if (body.path) {
      revalidatePath(body.path, "page");
      return NextResponse.json({ revalidated: true, path: body.path });
    }

    if (body.tag) {
      revalidateTag(body.tag, "max");
      return NextResponse.json({ revalidated: true, tag: body.tag });
    }

    return NextResponse.json(
      { error: "Must provide 'path' or 'tag' to revalidate" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Revalidate] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
