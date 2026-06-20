"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  saveCollection,
  deleteCollection,
  type SaveCollectionInput,
} from "@/app/actions/admin";
import type { ItgCollectionRow } from "@/types/database";
import type { CollectionKind } from "@/types/catalog";
import { cn } from "@/utils/cn";
import form from "../admin-form.module.css";
import local from "./CollectionForm.module.css";

/* ═══════════════════════════════════════════════════════════════════
   CollectionForm — create / edit a collection.
   Shared by /admin/collections/new and /admin/collections/[id].
   ═══════════════════════════════════════════════════════════════════ */

const KINDS: CollectionKind[] = ["physical", "digital", "mixed"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CollectionForm({
  collection,
}: {
  collection: ItgCollectionRow | null;
}) {
  const router = useRouter();
  const isEdit = Boolean(collection);

  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [title, setTitle] = useState(collection?.title ?? "");
  const [navLabel, setNavLabel] = useState(collection?.nav_label ?? "");
  const [tagline, setTagline] = useState(collection?.tagline ?? "");
  const [description, setDescription] = useState(collection?.description ?? "");
  const [kind, setKind] = useState<CollectionKind>(
    collection?.kind ?? "physical"
  );
  const [badge, setBadge] = useState(collection?.badge ?? "");
  const [sortOrder, setSortOrder] = useState(
    String(collection?.sort_order ?? 0)
  );
  const [showInNav, setShowInNav] = useState(collection?.show_in_nav ?? true);
  const [published, setPublished] = useState(collection?.published ?? false);
  const [seoTitle, setSeoTitle] = useState(collection?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(
    collection?.seo_description ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onTitleChange(value: string) {
    setTitle(value);
    // Auto-fill slug until the user edits it directly.
    if (!slugTouched) setSlug(slugify(value));
    if (!navLabel) setNavLabel(value);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const input: SaveCollectionInput = {
      id: collection?.id,
      slug,
      title,
      navLabel,
      tagline,
      description,
      kind,
      badge,
      sortOrder: Number.parseInt(sortOrder, 10) || 0,
      showInNav,
      published,
      seoTitle,
      seoDescription,
    };

    const result = await saveCollection(input);
    if (!result.ok) {
      setError(result.error ?? "couldn't save");
      setSaving(false);
      return;
    }
    router.push("/admin/collections");
    router.refresh();
  }

  async function onDelete() {
    if (!collection) return;
    if (
      !window.confirm(
        `delete "${collection.title}"? products keep existing but lose this collection.`
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    const result = await deleteCollection(collection.id);
    if (!result.ok) {
      setError(result.error ?? "couldn't delete");
      setDeleting(false);
      return;
    }
    router.push("/admin/collections");
    router.refresh();
  }

  return (
    <main className={form.main}>
      <header className={form.header}>
        <Link href="/admin/collections" className={form.crumb}>
          ← collections
        </Link>
        <h1 className={form.title}>
          {isEdit ? (
            <>
              edit <span className={form.accent}>{collection?.title}</span>
            </>
          ) : (
            <>
              new <span className={form.accent}>collection</span>
            </>
          )}
        </h1>
        <p className={form.liveUrl}>
          live url: beinthegno.com/<strong>{slug || "your-slug"}</strong>
        </p>
      </header>

      <form onSubmit={onSubmit}>
        {/* ── BASICS ───────────────────────────────────────────── */}
        <section className={form.section}>
          <span className={form.sectionLabel}>basics</span>
          <div className={form.row}>
            <div className={form.field}>
              <label className={form.label} htmlFor="c-title">
                title
              </label>
              <input
                id="c-title"
                className={form.input}
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                required
              />
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="c-slug">
                slug
              </label>
              <input
                id="c-slug"
                className={cn(form.input, form.mono)}
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                required
              />
            </div>
          </div>

          <div className={form.row}>
            <div className={form.field}>
              <label className={form.label} htmlFor="c-nav">
                nav label
              </label>
              <input
                id="c-nav"
                className={form.input}
                value={navLabel}
                onChange={(e) => setNavLabel(e.target.value)}
              />
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="c-kind">
                kind
              </label>
              <select
                id="c-kind"
                className={form.select}
                value={kind}
                onChange={(e) => setKind(e.target.value as CollectionKind)}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={form.field}>
            <label className={form.label} htmlFor="c-tagline">
              tagline
            </label>
            <input
              id="c-tagline"
              className={form.input}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
            {tagline && <p className={local.tagline}>{tagline}</p>}
          </div>

          <div className={form.field}>
            <label className={form.label} htmlFor="c-desc">
              description
            </label>
            <textarea
              id="c-desc"
              className={form.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={form.row}>
            <div className={form.field}>
              <label className={form.label} htmlFor="c-badge">
                badge
              </label>
              <input
                id="c-badge"
                className={form.input}
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="coming soon"
              />
            </div>
            <div className={form.field}>
              <label className={form.label} htmlFor="c-sort">
                sort order
              </label>
              <input
                id="c-sort"
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
                checked={showInNav}
                onChange={(e) => setShowInNav(e.target.checked)}
              />
              show in nav
            </label>
            <label className={form.check}>
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              published
            </label>
          </div>
        </section>

        {/* ── SEO ──────────────────────────────────────────────── */}
        <section className={form.section} style={{ marginTop: "var(--space-6)" }}>
          <span className={form.sectionLabel}>seo</span>
          <div className={form.field}>
            <label className={form.label} htmlFor="c-seo-title">
              seo title
            </label>
            <input
              id="c-seo-title"
              className={form.input}
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />
          </div>
          <div className={form.field}>
            <label className={form.label} htmlFor="c-seo-desc">
              seo description
            </label>
            <textarea
              id="c-seo-desc"
              className={form.textarea}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />
          </div>
        </section>

        {/* ── SAVE BAR ─────────────────────────────────────────── */}
        <div className={form.saveBar}>
          <button className={form.primary} type="submit" disabled={saving}>
            {saving ? "saving…" : isEdit ? "save changes" : "create collection"}
          </button>
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
