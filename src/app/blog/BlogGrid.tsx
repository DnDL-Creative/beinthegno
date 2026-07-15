"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import type { BlogPost } from "./posts";
import styles from "./page.module.css";

type SortOption = "newest" | "oldest" | "popular";

const parseDate = (dateStr: string): number => {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

export default function BlogGrid({ posts }: { posts: BlogPost[] }) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Collect unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    posts.forEach((p) => p.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [posts]);

  const sorted = useMemo(() => {
    let filtered = activeTag
      ? posts.filter((p) => p.tags.includes(activeTag))
      : posts;
    return [...filtered].sort((a, b) => {
      const da = parseDate(a.date);
      const db = parseDate(b.date);
      switch (sort) {
        case "oldest":
          return da - db;
        case "popular":
          // Popular = newest for now (can swap to view count later)
          return db - da;
        case "newest":
        default:
          return db - da;
      }
    });
  }, [posts, sort, activeTag]);

  // Nothing published yet → a calm empty state instead of bare sort controls
  // over an empty grid. Drafts live in VibeWriter until published.
  if (posts.length === 0) {
    return (
      <p className={styles.emptyState}>
        no observations yet. the signal is still forming.
      </p>
    );
  }

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.sortGroup}>
          {(["newest", "oldest", "popular"] as SortOption[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setSort(opt)}
              className={`${styles.sortBtn} ${sort === opt ? styles.sortBtnActive : ""}`}
            >
              {opt === "newest" ? "↑ newest" : opt === "oldest" ? "↓ oldest" : "♛ popular"}
            </button>
          ))}
        </div>

        <select
          value={activeTag || ""}
          onChange={(e) => setActiveTag(e.target.value || null)}
          className={styles.tagSelect}
        >
          <option value="">all tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.grid}>
        {sorted.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className={styles.cardLink}>
            <PipeFrame bg="hsl(38, 28%, 88%)">
              <article className={styles.card}>
                <h2 className={styles.cardTitle}>{post.title}</h2>
                <p className={styles.cardSubtitle}>{post.subtitle}</p>
                <div className={styles.cardFooter}>
                  <span className={styles.meta}>{post.date}</span>
                  <span className={styles.dot}>·</span>
                  <span className={styles.readTime}>{post.readTime}</span>
                  <span className={styles.dot}>·</span>
                  {post.tags.map((t) => (
                    <span key={t} className={styles.tag}>{t}</span>
                  ))}
                </div>
              </article>
            </PipeFrame>
          </Link>
        ))}
      </div>
    </>
  );
}
