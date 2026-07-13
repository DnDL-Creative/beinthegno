import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// ── BLOG DRAFT PREVIEW (VibeWriter "Save & Preview" lands here) ──────────────
// VibeWriter mints a link to this route, server-side, holding the shared
// PREVIEW_SECRET. We validate the secret, flip on Next.js Draft Mode (sets a
// signed cookie), then redirect to the REAL /blog/<slug> page. In draft mode the
// fetcher (blog/posts.ts → getPost) drops the `published=true` filter and reads
// the row with the service-role client, so an UNPUBLISHED draft renders through
// the exact production template — pixel-identical to how it will look live.
//
// Public visitors never have the cookie, so they still see only published posts.
// This route is reachable without an intheGno session by design (the secret is
// the gate); proxy.ts only matches /admin + /login, so /api/preview is open.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const slug = req.nextUrl.searchParams.get("slug");

  if (!process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return new Response("Invalid preview token", { status: 401 });
  }
  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  (await draftMode()).enable();

  // Only ever redirect to our own /blog/<slug> — slug is path-encoded so it can't
  // break out to another path or origin.
  redirect(`/blog/${encodeURIComponent(slug)}`);
}
