import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth";
import {
  buildObjectKey,
  presignUpload,
  publicUrl,
  isR2Configured,
} from "@/lib/r2";

export const runtime = "nodejs";

const MAX_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB — long meditation audio is fine
const SCOPES = new Set(["image", "preview", "digital"]);

/**
 * Presigned R2 upload for the admin CMS.
 *
 * POST { fileName, contentType, scope: "image" | "preview" | "digital", sizeBytes? }
 *  →   { uploadUrl, key, publicUrl? }
 *
 * The browser PUTs the file straight to R2; nothing streams through
 * Vercel. `image`/`preview` land on the public media domain; `digital`
 * gets an unguessable key served only via tokenized downloads.
 */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "R2 is not configured (R2_ACCOUNT_ID / keys missing)." },
      { status: 503 }
    );
  }

  let body: { fileName?: string; contentType?: string; scope?: string; sizeBytes?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { fileName, contentType, scope, sizeBytes } = body;
  if (!fileName || !scope || !SCOPES.has(scope)) {
    return NextResponse.json(
      { error: "fileName and scope (image|preview|digital) are required." },
      { status: 400 }
    );
  }
  if (sizeBytes && sizeBytes > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 1 GB limit." }, { status: 413 });
  }

  const typedScope = scope as "image" | "preview" | "digital";
  const key = buildObjectKey(typedScope, fileName);
  const uploadUrl = await presignUpload(key, contentType || "", typedScope);

  return NextResponse.json({
    uploadUrl,
    key,
    ...(typedScope !== "digital" ? { publicUrl: publicUrl(key) } : {}),
  });
}
