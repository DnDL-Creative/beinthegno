"use client";

import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  saveProduct,
  deleteProduct,
  createAsset,
  deleteAsset,
  type SaveProductInput,
} from "@/app/actions/admin";
import type {
  ItgProductRow,
  ItgProductAssetRow,
} from "@/types/database";
import type {
  ProductImage,
  ProductOptionGroup,
  ProductType,
  ProductStatus,
  AssetKind,
} from "@/types/catalog";
import { cn } from "@/utils/cn";
import form from "../admin-form.module.css";
import local from "./ProductForm.module.css";

/* ═══════════════════════════════════════════════════════════════════
   ProductForm — the heart of the CMS.
   Sections: basics · pricing · story · images · options · shopify ·
   files · seo. Images/files upload direct to R2 via /api/admin/upload.
   Shared by /admin/products/new and /admin/products/[id].
   ═══════════════════════════════════════════════════════════════════ */

const PRODUCT_TYPES: ProductType[] = [
  "physical",
  "digital",
  "service",
  "bundle",
  "other",
];
const STATUSES: ProductStatus[] = ["draft", "active", "archived"];

type Collection = { id: string; slug: string; title: string };

/* ── helpers ─────────────────────────────────────────────────────── */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asImages(value: unknown): ProductImage[] {
  return Array.isArray(value) ? (value as ProductImage[]) : [];
}

function asOptions(value: unknown): ProductOptionGroup[] {
  return Array.isArray(value) ? (value as ProductOptionGroup[]) : [];
}

function asFeatures(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Infer an asset kind from a MIME type / filename. */
function inferKind(contentType: string, fileName: string): AssetKind {
  const ct = contentType.toLowerCase();
  const name = fileName.toLowerCase();
  if (ct.startsWith("audio/")) return "audio";
  if (ct === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (ct.startsWith("video/")) return "video";
  if (
    ct.startsWith("text/") ||
    name.endsWith(".md") ||
    name.endsWith(".txt")
  )
    return "text";
  if (
    ct.includes("zip") ||
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    name.endsWith(".7z")
  )
    return "archive";
  if (ct.startsWith("image/")) return "image";
  return "other";
}

type UploadResult = {
  key: string;
  publicUrl?: string;
};

/** Request a presigned URL then PUT the bytes to R2. Returns the key. */
async function uploadToR2(
  file: File,
  scope: "image" | "preview" | "digital"
): Promise<UploadResult> {
  const presignRes = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      scope,
      sizeBytes: file.size,
    }),
  });

  if (!presignRes.ok) {
    const body = (await presignRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "upload could not be authorized");
  }

  const { uploadUrl, key, publicUrl } = (await presignRes.json()) as {
    uploadUrl: string;
    key: string;
    publicUrl?: string;
  };

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!putRes.ok) {
    throw new Error("the file failed to upload to storage");
  }

  return { key, publicUrl };
}

/* ═══════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════ */

export function ProductForm({
  product,
  assets: initialAssets,
  collections,
}: {
  product: ItgProductRow | null;
  assets: ItgProductAssetRow[];
  collections: Collection[];
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const productId = product?.id ?? null;

  /* ── basics ─────────────────────────────────────────────────── */
  const [title, setTitle] = useState(product?.title ?? "");
  const [handle, setHandle] = useState(product?.handle ?? "");
  const [handleTouched, setHandleTouched] = useState(isEdit);
  const [subtitle, setSubtitle] = useState(product?.subtitle ?? "");
  const [collectionId, setCollectionId] = useState(
    product?.collection_id ?? ""
  );
  const [productType, setProductType] = useState<ProductType>(
    product?.product_type ?? "physical"
  );
  const [status, setStatus] = useState<ProductStatus>(
    product?.status ?? "draft"
  );
  const [badge, setBadge] = useState(product?.badge ?? "");
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(String(product?.sort_order ?? 0));

  /* ── pricing ────────────────────────────────────────────────── */
  const [price, setPrice] = useState(
    product ? String(product.price) : "0"
  );
  const [compareAt, setCompareAt] = useState(
    product?.compare_at_price != null ? String(product.compare_at_price) : ""
  );
  const [currency, setCurrency] = useState(product?.currency ?? "USD");
  const [priceNote, setPriceNote] = useState(
    typeof product?.metadata === "object" &&
      product?.metadata &&
      "price_note" in product.metadata
      ? String((product.metadata as Record<string, unknown>).price_note ?? "")
      : ""
  );

  /* ── story ──────────────────────────────────────────────────── */
  const [descriptionHtml, setDescriptionHtml] = useState(
    product?.description_html ?? ""
  );
  const [featuresText, setFeaturesText] = useState(
    asFeatures(product?.features).join("\n")
  );

  /* ── images ─────────────────────────────────────────────────── */
  const [images, setImages] = useState<ProductImage[]>(
    asImages(product?.images)
  );
  const [imgUploading, setImgUploading] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  /* ── options ────────────────────────────────────────────────── */
  const [options, setOptions] = useState<ProductOptionGroup[]>(
    asOptions(product?.options)
  );

  const [requiresShipping, setRequiresShipping] = useState(
    product?.requires_shipping ?? true
  );

  /* ── files ──────────────────────────────────────────────────── */
  const [assets, setAssets] = useState<ItgProductAssetRow[]>(initialAssets);
  const [deliverableLabel, setDeliverableLabel] = useState("");
  const [previewLabel, setPreviewLabel] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  /* ── seo ────────────────────────────────────────────────────── */
  const [seoTitle, setSeoTitle] = useState(product?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(
    product?.seo_description ?? ""
  );

  /* ── save state ─────────────────────────────────────────────── */
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDigital = productType === "digital";

  const collectionSlug = useMemo(
    () => collections.find((c) => c.id === collectionId)?.slug ?? "",
    [collections, collectionId]
  );

  /* ── basics handlers ────────────────────────────────────────── */
  function onTitleChange(value: string) {
    setTitle(value);
    if (!handleTouched) setHandle(slugify(value));
  }

  /* ── image handlers ─────────────────────────────────────────── */
  async function onImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setImgUploading(true);
    setImgError(null);
    const added: ProductImage[] = [];
    try {
      for (const file of Array.from(files)) {
        const { publicUrl } = await uploadToR2(file, "image");
        if (publicUrl) added.push({ url: publicUrl, alt: title });
      }
      setImages((prev) => [...prev, ...added]);
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "image upload failed");
      if (added.length) setImages((prev) => [...prev, ...added]);
    } finally {
      setImgUploading(false);
    }
  }

  function updateImageAlt(index: number, alt: string) {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, alt } : img))
    );
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function moveImage(index: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  /* ── option handlers ────────────────────────────────────────── */
  function addOptionGroup() {
    setOptions((prev) => [...prev, { name: "", values: [] }]);
  }

  function updateOptionName(index: number, name: string) {
    setOptions((prev) =>
      prev.map((g, i) => (i === index ? { ...g, name } : g))
    );
  }

  function updateOptionValues(index: number, csv: string) {
    const values = csv
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    setOptions((prev) =>
      prev.map((g, i) => (i === index ? { ...g, values } : g))
    );
  }

  function removeOptionGroup(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  /* ── file (asset) handlers ──────────────────────────────────── */
  async function onAssetFiles(
    files: FileList | null,
    isPreview: boolean
  ) {
    if (!files || files.length === 0 || !productId) return;
    setFileUploading(true);
    setFileError(null);
    try {
      for (const file of Array.from(files)) {
        const scope = isPreview ? "preview" : "digital";
        const { key } = await uploadToR2(file, scope);
        const kind = inferKind(file.type, file.name);
        const label =
          (isPreview ? previewLabel : deliverableLabel).trim() || file.name;
        const result = await createAsset({
          productId,
          kind,
          label,
          r2Key: key,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          isPreview,
          sortOrder: assets.length,
        });
        if (!result.ok) {
          setFileError(result.error ?? "couldn't save the file");
          continue;
        }
        // Optimistically reflect the new asset row.
        setAssets((prev) => [
          ...prev,
          {
            id: result.id ?? `tmp-${Date.now()}`,
            product_id: productId,
            kind,
            label,
            r2_key: key,
            file_name: file.name,
            content_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            duration_seconds: null,
            is_preview: isPreview,
            sort_order: prev.length,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "file upload failed");
    } finally {
      setFileUploading(false);
    }
  }

  async function onDeleteAsset(asset: ItgProductAssetRow) {
    if (!window.confirm(`delete "${asset.label || asset.file_name}"?`)) return;
    const result = await deleteAsset(asset.id);
    if (!result.ok) {
      setFileError(result.error ?? "couldn't delete the file");
      return;
    }
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
  }

  /* ── submit / delete ────────────────────────────────────────── */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const features = featuresText
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    const input: SaveProductInput = {
      id: productId ?? undefined,
      handle,
      collectionId: collectionId || null,
      title,
      subtitle,
      descriptionHtml,
      productType,
      status,
      badge,
      price: Number.parseFloat(price) || 0,
      compareAtPrice: compareAt.trim() ? Number.parseFloat(compareAt) : null,
      currency,
      images,
      options,
      features,
      requiresShipping,
      featured,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      seoTitle,
      seoDescription,
      priceNote,
    };

    const result = await saveProduct(input);
    if (!result.ok) {
      setError(result.error ?? "couldn't save");
      setSaving(false);
      return;
    }

    if (!isEdit && result.id) {
      // New product → jump to its edit page so files can be uploaded.
      router.push(`/admin/products/${result.id}`);
      router.refresh();
      return;
    }
    router.refresh();
    setSaving(false);
  }

  async function onDelete() {
    if (!product) return;
    if (
      !window.confirm(
        `delete "${product.title}"? this also removes its uploaded files.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    const result = await deleteProduct(product.id);
    if (!result.ok) {
      setError(result.error ?? "couldn't delete");
      setDeleting(false);
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  const deliverables = assets.filter((a) => !a.is_preview);
  const previews = assets.filter((a) => a.is_preview);

  return (
    <main className={form.main}>
      <header className={form.header}>
        <Link href="/admin/products" className={form.crumb}>
          ← products
        </Link>
        <h1 className={form.title}>
          {isEdit ? (
            <>
              edit <span className={form.accent}>{product?.title}</span>
            </>
          ) : (
            <>
              new <span className={form.accent}>product</span>
            </>
          )}
        </h1>
        {collectionSlug && handle && (
          <p className={form.liveUrl}>
            live url: beinthegno.com/{collectionSlug}/<strong>{handle}</strong>
          </p>
        )}
      </header>

      <form onSubmit={onSubmit}>
        {/* ── 1. BASICS ──────────────────────────────────────── */}
        <section className={form.section}>
          <span className={form.sectionLabel}>basics</span>
          <div className={form.row}>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-title">
                title
              </label>
              <input
                id="p-title"
                className={form.input}
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                required
              />
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-handle">
                handle
              </label>
              <input
                id="p-handle"
                className={cn(form.input, form.mono)}
                value={handle}
                onChange={(e) => {
                  setHandleTouched(true);
                  setHandle(e.target.value);
                }}
                required
              />
            </div>
          </div>

          <div className={form.field}>
            <label className={form.label} htmlFor="p-subtitle">
              subtitle
            </label>
            <input
              id="p-subtitle"
              className={form.input}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

          <div className={form.row3}>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-collection">
                collection
              </label>
              <select
                id="p-collection"
                className={form.select}
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
              >
                <option value="">— none —</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-type">
                type
              </label>
              <select
                id="p-type"
                className={form.select}
                value={productType}
                onChange={(e) =>
                  setProductType(e.target.value as ProductType)
                }
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-status">
                status
              </label>
              <select
                id="p-status"
                className={form.select}
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={form.row}>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-badge">
                badge
              </label>
              <input
                id="p-badge"
                className={form.input}
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="coming soon"
              />
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-sort">
                sort order
              </label>
              <input
                id="p-sort"
                type="number"
                className={cn(form.input, form.mono)}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>

          <div className={form.checkRow}>
            <label className={form.check}>
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              featured
            </label>
          </div>
        </section>

        {/* ── 2. PRICING ─────────────────────────────────────── */}
        <section className={form.section} style={{ marginTop: "var(--space-6)" }}>
          <span className={form.sectionLabel}>pricing</span>
          <div className={form.row3}>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-price">
                price
              </label>
              <input
                id="p-price"
                type="number"
                step="0.01"
                min="0"
                className={cn(form.input, form.mono)}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-compare">
                compare-at
              </label>
              <input
                id="p-compare"
                type="number"
                step="0.01"
                min="0"
                className={cn(form.input, form.mono)}
                value={compareAt}
                onChange={(e) => setCompareAt(e.target.value)}
                placeholder="(optional)"
              />
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="p-currency">
                currency
              </label>
              <input
                id="p-currency"
                className={cn(form.input, form.mono)}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
              />
            </div>
          </div>
          <div className={form.field}>
            <label className={form.label} htmlFor="p-price-note">
              price note
            </label>
            <input
              id="p-price-note"
              className={form.input}
              value={priceNote}
              onChange={(e) => setPriceNote(e.target.value)}
              placeholder="debut drop... so we dropped the price"
            />
          </div>
        </section>

        {/* ── 3. STORY ───────────────────────────────────────── */}
        <section className={form.section} style={{ marginTop: "var(--space-6)" }}>
          <span className={form.sectionLabel}>story</span>
          <div className={form.field}>
            <label className={form.label} htmlFor="p-desc">
              description
            </label>
            <textarea
              id="p-desc"
              className={form.textarea}
              style={{ minHeight: "160px" }}
              value={descriptionHtml}
              onChange={(e) => setDescriptionHtml(e.target.value)}
            />
            <p className={form.help}>HTML allowed (e.g. &lt;p&gt;, &lt;ul&gt;, &lt;strong&gt;)</p>
          </div>
          <div className={form.field}>
            <label className={form.label} htmlFor="p-features">
              features / what&apos;s inside
            </label>
            <textarea
              id="p-features"
              className={form.textarea}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
            />
            <p className={form.help}>one bullet per line</p>
          </div>
        </section>

        {/* ── 4. IMAGES ──────────────────────────────────────── */}
        <section className={form.section} style={{ marginTop: "var(--space-6)" }}>
          <span className={form.sectionLabel}>images</span>
          <div className={form.field}>
            <input
              type="file"
              accept="image/*"
              multiple
              className={form.fileInput}
              disabled={imgUploading}
              onChange={(e) => {
                onImageFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {imgUploading && (
              <p className={form.progress}>uploading images…</p>
            )}
            {imgError && <p className={form.error}>{imgError}</p>}
          </div>

          {images.length > 0 && (
            <div className={form.imageGrid}>
              {images.map((img, i) => (
                <div key={`${img.url}-${i}`} className={form.imageCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt ?? ""}
                    className={form.thumb}
                  />
                  <input
                    className={form.altInput}
                    value={img.alt ?? ""}
                    onChange={(e) => updateImageAlt(i, e.target.value)}
                    placeholder="alt text"
                  />
                  <div className={form.imageActions}>
                    <button
                      type="button"
                      className={form.iconBtn}
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      aria-label="move left"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={cn(form.iconBtn, form.removeBtn)}
                      onClick={() => removeImage(i)}
                      aria-label="remove"
                    >
                      remove
                    </button>
                    <button
                      type="button"
                      className={form.iconBtn}
                      onClick={() => moveImage(i, 1)}
                      disabled={i === images.length - 1}
                      aria-label="move right"
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 5. OPTIONS (non-digital) ───────────────────────── */}
        {!isDigital && (
          <section className={form.section} style={{ marginTop: "var(--space-6)" }}>
            <span className={form.sectionLabel}>options</span>
            <p className={form.sectionHint}>
              variant choices like size or color
            </p>
            <div className={local.optionGroupList}>
              {options.map((group, i) => (
                <div key={i} className={local.optionGroupCard}>
                  <div className={form.field}>
                    <label className={form.label}>name</label>
                    <input
                      className={form.input}
                      value={group.name}
                      onChange={(e) => updateOptionName(i, e.target.value)}
                      placeholder="Size"
                    />
                  </div>
                  <div className={form.field}>
                    <label className={form.label}>values (comma-separated)</label>
                    <input
                      className={form.input}
                      defaultValue={group.values.join(", ")}
                      onChange={(e) => updateOptionValues(i, e.target.value)}
                      placeholder="S, M, L, XL"
                    />
                  </div>
                  <div className={form.field}>
                    <button
                      type="button"
                      className={cn(form.iconBtn, form.removeBtn)}
                      onClick={() => removeOptionGroup(i)}
                    >
                      remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={local.addGroup}
              onClick={addOptionGroup}
            >
              + add option group
            </button>
          </section>
        )}

        {/* ── 6. FULFILLMENT (physical) ──────────────────────── */}
        {!isDigital && (
          <section className={form.section} style={{ marginTop: "var(--space-6)" }}>
            <span className={form.sectionLabel}>fulfillment (physical)</span>
            <div className={form.checkRow}>
              <label className={form.check}>
                <input
                  type="checkbox"
                  checked={requiresShipping}
                  onChange={(e) => setRequiresShipping(e.target.checked)}
                />
                requires shipping
              </label>
            </div>
            <p className={form.help}>
              physical goods check out through Stripe (shipping collected at
              checkout) and are printed &amp; shipped by Printify. Until
              PRINTIFY_API_TOKEN is set, paid orders are logged for manual
              fulfillment from the Printify dashboard.
            </p>
          </section>
        )}

        {/* ── 7. FILES (digital downloads) ───────────────────── */}
        <section className={form.section} style={{ marginTop: "var(--space-6)" }}>
          <span className={form.sectionLabel}>files (digital downloads)</span>
          {!productId && (
            <p className={form.sectionHint}>save first, then upload files</p>
          )}

          {/* paid deliverables */}
          <div className={form.uploadBlock}>
            <span className={form.uploadBlockTitle}>paid deliverables</span>
            <div className={form.field}>
              <label className={form.label}>label (optional)</label>
              <input
                className={form.input}
                value={deliverableLabel}
                onChange={(e) => setDeliverableLabel(e.target.value)}
                placeholder="defaults to the file name"
                disabled={!productId}
              />
            </div>
            <input
              type="file"
              multiple
              className={form.fileInput}
              disabled={!productId || fileUploading}
              onChange={(e) => {
                onAssetFiles(e.target.files, false);
                e.target.value = "";
              }}
            />
            {deliverables.length > 0 && (
              <div className={form.assetList}>
                {deliverables.map((a) => (
                  <div key={a.id} className={form.assetRow}>
                    <span className={form.assetKind}>{a.kind}</span>
                    <span className={form.assetLabel}>
                      {a.label || a.file_name}
                    </span>
                    <span className={form.assetMeta}>
                      {formatBytes(a.size_bytes)}
                    </span>
                    <button
                      type="button"
                      className={cn(form.iconBtn, form.removeBtn)}
                      onClick={() => onDeleteAsset(a)}
                    >
                      delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* free previews */}
          <div className={form.uploadBlock}>
            <span className={form.uploadBlockTitle}>free previews</span>
            <div className={form.field}>
              <label className={form.label}>label (optional)</label>
              <input
                className={form.input}
                value={previewLabel}
                onChange={(e) => setPreviewLabel(e.target.value)}
                placeholder="defaults to the file name"
                disabled={!productId}
              />
            </div>
            <input
              type="file"
              multiple
              className={form.fileInput}
              disabled={!productId || fileUploading}
              onChange={(e) => {
                onAssetFiles(e.target.files, true);
                e.target.value = "";
              }}
            />
            {previews.length > 0 && (
              <div className={form.assetList}>
                {previews.map((a) => (
                  <div key={a.id} className={form.assetRow}>
                    <span className={form.assetKind}>{a.kind}</span>
                    <span className={form.assetLabel}>
                      {a.label || a.file_name}
                    </span>
                    <span className={form.assetMeta}>
                      {formatBytes(a.size_bytes)} · preview
                    </span>
                    <button
                      type="button"
                      className={cn(form.iconBtn, form.removeBtn)}
                      onClick={() => onDeleteAsset(a)}
                    >
                      delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {fileUploading && <p className={form.progress}>uploading file…</p>}
          {fileError && <p className={form.error}>{fileError}</p>}
        </section>

        {/* ── 8. SEO ─────────────────────────────────────────── */}
        <section className={form.section} style={{ marginTop: "var(--space-6)" }}>
          <span className={form.sectionLabel}>seo</span>
          <div className={form.field}>
            <label className={form.label} htmlFor="p-seo-title">
              seo title
            </label>
            <input
              id="p-seo-title"
              className={form.input}
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
          </div>
          <div className={form.field}>
            <label className={form.label} htmlFor="p-seo-desc">
              seo description
            </label>
            <textarea
              id="p-seo-desc"
              className={form.textarea}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
          </div>
        </section>

        {/* ── SAVE BAR ───────────────────────────────────────── */}
        <div className={form.saveBar}>
          <button className={form.primary} type="submit" disabled={saving}>
            {saving ? "saving…" : isEdit ? "save changes" : "create product"}
          </button>
          {status === "active" && collectionSlug && handle && (
            <Link
              href={`/${collectionSlug}/${handle}`}
              className={form.viewLink}
              target="_blank"
            >
              view on site →
            </Link>
          )}
          {error && <span className={form.error}>{error}</span>}
          {isEdit && (
            <button
              type="button"
              className={form.danger}
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "deleting…" : "delete"}
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
