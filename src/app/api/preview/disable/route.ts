import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Exit Draft Mode — the "Exit preview" link in the draft banner points here.
// Clears the draft cookie so the browser goes back to seeing only published
// posts, then returns to the blog (the slug if given, else the index).
export async function GET(req: NextRequest) {
  (await draftMode()).disable();
  const slug = req.nextUrl.searchParams.get("slug");
  redirect(slug ? `/blog/${encodeURIComponent(slug)}` : "/blog");
}
