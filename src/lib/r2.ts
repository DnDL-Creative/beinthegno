/* ═══════════════════════════════════════════════════════════════════
   Cloudflare R2 — media + digital goods storage. Server-side only.

   Bucket layout (single `inthegno` bucket, public custom domain
   media.beinthegno.com):
     products/…   public product images        → served via public URL
     previews/…   public sample audio/text     → served via public URL
     digital/…    paid deliverables under unguessable uuid prefixes
                  → served ONLY via short-lived presigned GET urls
                    from /api/download/[token]

   Matches the DnDL house R2 convention (cinesonic, danielnotdaylewis):
   R2_PUBLIC_BUCKET + R2_PRIVATE_BUCKET + bare R2_PUBLIC_DOMAIN.
   If you create a dedicated private bucket for deliverables, set
   R2_PRIVATE_BUCKET=inthegno-private and nothing else changes; until
   then deliverables fall back to the public bucket's digital/ prefix.
   ═══════════════════════════════════════════════════════════════════ */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

export const R2_PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET || "inthegno";

/** Paid digital deliverables. Falls back to the public bucket (under the
 *  unguessable digital/ prefix) when no dedicated private bucket exists. */
export const R2_PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET || R2_PUBLIC_BUCKET;

/** Bare custom domain per house convention; tolerate a full URL or trailing
 *  slash too. https:// is prepended in publicUrl(). */
export const R2_PUBLIC_DOMAIN = (
  process.env.R2_PUBLIC_DOMAIN ||
  process.env.R2_PUBLIC_URL ||
  "media.beinthegno.com"
)
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

let _client: S3Client | null = null;

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
  );
}

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("[intheGno] Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY");
  }

  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

/** Public CDN URL for an object in the public bucket. */
export function publicUrl(key: string): string {
  return `https://${R2_PUBLIC_DOMAIN}/${key.replace(/^\//, "")}`;
}

/** Slugify a filename, keeping the extension. */
function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "file";
  const ext = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  return `${base}${ext}`;
}

/**
 * Build the R2 object key for an upload.
 * Public scopes get readable paths; digital deliverables get an
 * unguessable uuid segment so the public domain can't be brute-forced.
 */
export function buildObjectKey(
  scope: "image" | "preview" | "digital",
  fileName: string
): string {
  const name = safeFileName(fileName);
  switch (scope) {
    case "image":
      return `products/${randomUUID().slice(0, 8)}-${name}`;
    case "preview":
      return `previews/${randomUUID().slice(0, 8)}-${name}`;
    case "digital":
      return `digital/${randomUUID()}/${name}`;
  }
}

/** Presigned PUT URL for direct browser → R2 uploads (10 min). */
export async function presignUpload(
  key: string,
  contentType: string,
  scope: "image" | "preview" | "digital"
): Promise<string> {
  const bucket = scope === "digital" ? R2_PRIVATE_BUCKET : R2_PUBLIC_BUCKET;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
  });
  return getSignedUrl(getClient(), command, { expiresIn: 600 });
}

/** Presigned GET URL for a paid deliverable (1 hour, forces download). */
export async function presignDownload(
  key: string,
  fileName?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_PRIVATE_BUCKET,
    Key: key,
    ResponseContentDisposition: fileName
      ? `attachment; filename="${fileName.replace(/"/g, "")}"`
      : "attachment",
  });
  return getSignedUrl(getClient(), command, { expiresIn: 3600 });
}

/** Delete an object (used when removing assets in the CMS). */
export async function deleteObject(key: string, scope: "public" | "digital"): Promise<void> {
  const bucket = scope === "digital" ? R2_PRIVATE_BUCKET : R2_PUBLIC_BUCKET;
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
