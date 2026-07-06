import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import parse from "html-react-parser";
import { PipeFrame } from "@/components/ui/PipeFrame/PipeFrame";
import { getPost, getAllSlugs, getAllPosts } from "../posts";
import { processShortcodes } from "../processShortcodes";
import { richReplace } from "./_components/richReplace";
import { renderInlineMarkup, stripInlineMarkup } from "./_components/inlineMarkup";
import ReadingProgress from "./_components/ReadingProgress";
import RelatedPosts from "./_components/RelatedPosts";
import ProductCarousel from "./_components/ProductCarousel";
import CarouselHydrator from "./_components/CarouselHydrator";
import ImageLightbox from "@/components/ui/ImageLightbox";
import AudioSection from "./_components/AudioSection";
import AudioHydrator from "./_components/AudioHydrator";
import styles from "./page.module.css";

/** Revalidate every 60s so VibeWriter edits go live without redeploying */
export const revalidate = 60;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Not Found" };
  return {
    title: post.seoTitle || stripInlineMarkup(post.title),
    description: post.metaDescription || stripInlineMarkup(post.subtitle),
    openGraph: {
      title: post.seoTitle || stripInlineMarkup(post.title),
      description: post.metaDescription || stripInlineMarkup(post.subtitle),
      type: "article",
      ...(post.heroImage && {
        images: [{ url: post.heroImage, width: 1200, height: 630, alt: post.heroImageAlt || stripInlineMarkup(post.title) }],
      }),
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const allPosts = await getAllPosts();

  return (
    <main className={styles.main}>
      <ReadingProgress color="var(--color-copper, #B87333)" />
      {/* ── HERO IMAGE ──────────────────────────────────────────── */}
      {post.heroImage && (
      <div className={styles.heroWrap} style={{ margin: '46px auto 44px' }}>
          {/* Use PipeFrame for default/square (rectangular corners), CSS border for circle/rounded */}
          {post.heroStyle?.shape === 'circle' || post.heroStyle?.shape === 'rounded' ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
            }}>
              <Image
                src={post.heroImage}
                alt={post.heroImageAlt || stripInlineMarkup(post.title)}
                width={960}
                height={540}
                priority
                style={{
                  width: '100%',
                  maxWidth: post.heroStyle?.shape === 'circle' ? '540px' : undefined,
                  height: 'auto',
                  aspectRatio: post.heroStyle?.ratio || (post.heroStyle?.shape === 'circle' ? '1/1' : undefined),
                  objectFit: 'cover',
                  borderRadius: post.heroStyle?.shape === 'circle' ? '50%' : '16px',
                  border: '3px solid #B87333',
                  boxShadow: '0 0 20px rgba(184, 115, 51, 0.3)',
                }}
              />
            </div>
          ) : (
            <PipeFrame>
              <Image
                src={post.heroImage}
                alt={post.heroImageAlt || stripInlineMarkup(post.title)}
                width={960}
                height={540}
                className={styles.heroImage}
                priority
                style={{
                  aspectRatio: post.heroStyle?.ratio || undefined,
                  objectFit: 'cover',
                }}
              />
            </PipeFrame>
          )}
          {post.heroImageAlt && post.heroImageAlt !== post.title && (
            <div className={styles.heroCaption}>
              {post.heroImageAlt}
            </div>
          )}
        </div>
      )}

      {/* ── ARTICLE ─────────────────────────────────────────────── */}
      <article className={styles.article}>

        {/* ── HEADER ────────────────────────────────────────────── */}
        <header className={styles.header}>
          <h1 className={styles.title} dangerouslySetInnerHTML={{ __html: renderInlineMarkup(post.title) }} />
          {post.subtitle && (
            <p className={styles.subtitle} dangerouslySetInnerHTML={{ __html: renderInlineMarkup(post.subtitle) }} />
          )}
          <div className={styles.meta}>
            <span>{post.date}</span>
            <span className={styles.metaPipe} />
            {post.tags.length > 0 && (
              <>
                <span className={styles.metaTag}>{post.tags[0]}</span>
                <span className={styles.metaPipe} />
              </>
            )}
            <span>{post.wordCount.toLocaleString()} words · {post.readTime}</span>
            {post.blogcastUrl && (
              <>
                <span className={styles.metaPipe} />
                <span>~{post.blogcastTime} min blogcast</span>
              </>
            )}
          </div>
        </header>

        {/* ── AUDIO (Spotify / Blogcast) ────────────────────────── */}
        <AudioSection musicEmbed={post.musicEmbed} blogcastUrl={post.blogcastUrl} />

        {/* ── BODY CONTENT ────────────────────────────────────── */}
        {/* .hasToc reveals the per-h2 "back to contents" arrows (only when the
            post actually has a Table of Contents block). */}
        <div
          className={`${styles.body}${post.content?.includes("data-vibe-toc") ? ` ${styles.hasToc}` : ""}`}
          data-lightbox
        >
          <CarouselHydrator />
          <ImageLightbox />
          <AudioHydrator />
          {post.content ? parse(processShortcodes(post.content), { replace: richReplace }) : (
            <p>Content unavailable.</p>
          )}
        </div>

        <footer className={styles.postFooter}>
          {post.author && (
            <div className={styles.authorBlock}>
              <span className={styles.authorName}>{post.author}</span>
              {post.authorTitle && (
                <>
                  <span className={styles.metaPipe} />
                  <span className={styles.authorTitle}>{post.authorTitle}</span>
                </>
              )}
            </div>
          )}
          <Link href="/blog" className={styles.backLink}>
            ← all observations
          </Link>
        </footer>
      </article>

      {/* ── STAY GROUNDED — LATEST RELEASES ───────────────────── */}
      <section className={styles.carouselSection}>
        <h2 className={styles.carouselHeading}>Stay Grounded</h2>
        <ProductCarousel />
      </section>

      {/* ── RELATED POSTS CAROUSEL ──────────────────────────────── */}
      <section className={styles.carouselSection}>
        <h2 className={styles.carouselHeading}>More Observations</h2>
        <RelatedPosts currentSlug={slug} allPosts={allPosts} />
      </section>
    </main>
  );
}
