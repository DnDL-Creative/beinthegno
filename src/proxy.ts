/* ═══════════════════════════════════════════════════════════════════
   Proxy — Next 16 replacement for middleware.
   Refreshes the Supabase auth session on every matched request and
   gates the admin area:
     • /admin/* without a session → /login?next={pathname}
     • /login with a session       → ?next or /admin
   Auth-cookie writes from Supabase are copied onto any redirect so
   the refreshed session survives the bounce.
   NOTE: this only checks for a SESSION; admin membership (itg_admins)
   is enforced server-side in requireAdminPage()/getAdminUser().
   ═══════════════════════════════════════════════════════════════════ */

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // 1. Base response that carries forward request cookies.
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without env keys we can't check auth — let the request through and
  // let server-side guards handle protection.
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  // 2. Supabase client backed by request/response cookies.
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // 3. Refresh + read the session user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, searchParams } = request.nextUrl;

  // 4. Protect the admin area.
  if (pathname.startsWith("/admin") && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return redirectWithCookies(loginUrl, supabaseResponse);
  }

  // 5. Already signed in — skip the login page.
  if (pathname === "/login" && user) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.search = "";
    nextUrl.pathname = sanitizeNext(searchParams.get("next"));
    return redirectWithCookies(nextUrl, supabaseResponse);
  }

  return supabaseResponse;
}

/* ── HELPERS ─────────────────────────────────────────────────────── */

/** Redirect while preserving Supabase's refreshed auth cookies. */
function redirectWithCookies(
  url: URL,
  source: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

/** Only allow internal, single-leading-slash paths as a redirect target. */
function sanitizeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/admin";
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
