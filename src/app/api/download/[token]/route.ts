import { NextResponse } from "next/server";
import { getFulfilledOrder, resolveOrderAsset } from "@/lib/orders";
import { presignDownload } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * Tokenized digital delivery.
 *
 *   GET /api/download/[token]              → JSON list of the order's files
 *   GET /api/download/[token]?asset=<id>   → 302 to a 1-hour presigned R2 URL
 *
 * Tokens come from paid itg_orders rows and expire 30 days after
 * purchase. Deliverable R2 keys never appear in any response.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const assetId = new URL(request.url).searchParams.get("asset");

  if (assetId) {
    const resolved = await resolveOrderAsset(token, assetId);
    if (!resolved) {
      return NextResponse.json(
        { error: "Download link is invalid or has expired." },
        { status: 404 }
      );
    }
    // presignDownload throws when R2 env keys are missing — catch it so a
    // paying customer gets a readable message instead of an opaque 500.
    // The download_count was already bumped by resolveOrderAsset, so the
    // failure is logged loudly for manual follow-up.
    try {
      const url = await presignDownload(resolved.r2Key, resolved.fileName);
      return NextResponse.redirect(url, 302);
    } catch (e) {
      console.error(
        `[intheGno] Presign failed for token ${token} asset ${assetId}:`,
        e
      );
      return NextResponse.json(
        {
          error:
            "We couldn't generate your download link. Your purchase is safe — please contact us and we'll send the files.",
        },
        { status: 503 }
      );
    }
  }

  const fulfilled = await getFulfilledOrder(token);
  if (!fulfilled) {
    return NextResponse.json(
      { error: "Download link is invalid or has expired." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    expiresAt: fulfilled.order.expires_at,
    files: fulfilled.files.map((f) => ({
      assetId: f.assetId,
      productTitle: f.productTitle,
      kind: f.kind,
      label: f.label,
      fileName: f.fileName,
      sizeBytes: f.sizeBytes,
      durationSeconds: f.durationSeconds,
      url: `/api/download/${token}?asset=${f.assetId}`,
    })),
  });
}
