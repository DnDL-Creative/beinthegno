---
name: inthegno-blog-engine
description: Write publish-ready intheGno (beinthegno.com) blog posts in the Gnostic-Jester voice. Process — Daniel gives 1 to 3 topics; you DEEPLY UNDERSTAND the brand first by reading this repo (the site copy, the product/collection seeds in sql/itg_commerce.sql, spec.md, existing itg_posts, the sitemap — never write from generic assumptions); you return an OUTLINE per post (a short overview + the 6 sections each with a one-line brief); Daniel tweaks; then you BUILD each post section by section with per-section tone check-ins. Every post ~1,500 words, exactly 6 H2 sections (4 content + FAQ + CTA), 5 sitemap-verified internal links (max 2 blogs), focus/secondary/tertiary keywords + meta description + hero alt, output shaped for the itg_posts table + VibeWriter widgets. Use whenever drafting or generating a blog post for intheGno / beinthegno.com.
---

# intheGno Blog Engine — read the brand, outline, then build it together

Two ideas drive this skill:

1. **Every post is grounded in what intheGno actually is.** Before you outline anything, you read this repo — the live site copy, the collection/product seeds, `spec.md`, existing posts. intheGno's brand is *spiritual sovereignty for people who've stopped trusting the grid* — a post that invents a product, misstates the methodology blend, or slips into guru-speak breaks the spell. You write from what's true and in-voice, never from generic "wellness blog" assumptions.
2. **The post is built WITH Daniel, section by section** — not handed to him finished. After each section you do a short back-and-forth (a tone check plus whatever first-hand material that section needs), and only then move on.

The full writing constitution — **the Gnostic-Jester voice**, the anti-slop rules, the **wellness-disclaimer rule** (educational/self-development, never medical or psychological advice), the defamation guardrail, SEO/GEO, the field set, the body shape, the link rule, the widget + shortcode output contract — lives in `spec.md` next to this file. Read it before writing a word; you and any huddle agents are bound by it. **The voice is the whole product; SEO is plumbing.**

**The body shape is a hard rule (from `spec.md`):** every post has **exactly 6 H2 sections = 4 content H2s (#1–#4) + the FAQ (#5) + the final CTA (#6)**. The FAQ counts as one of the six. Each content section runs ~200–400 words (~300 practical ceiling) so the whole post lands at ~1,500 (hard cap 1,500).

**Batch size: 1 to 3 posts per session.** Outline all of them together, then build them one at a time.

The launch topic list lives in `topics.md` — when Daniel says "pick from the list" or doesn't name a topic, draw from there (it carries per-topic keywords, tags, and destinations).

## How it runs

### 1. Topic(s) in + a one-line brief-back

Daniel names 1 to 3 topics (or points at `topics.md`). State each one back in a line — topic, focus keyword, destination offer, tag, audience, and the angle in a sentence — and ask only the angle-critical questions you need to outline well. Don't silently reframe a topic (a "why therapy failed you → the Sovereign Architect" piece must not drift into a generic "self-care tips" listicle).

If Daniel pastes a VibeWriter SEO brief (a block headed `=== VIBEWRITER SEO BRIEF ===`), lock onto it: its `Focus keyword:` is the primary, its `Secondary keywords:` are the secondaries. No brief = propose them yourself.

### 2. READ THE BRAND (the grounding step — do not skip)

Before outlining, actually learn what intheGno is and what it can truthfully say. Read, in this repo:

- **`spec.md`** (next to this file) — the constitution: voice, tags, methodology blend, disclaimer + defamation rules, field set, output contract. It wins over anything else.
- **The live site copy** — `src/app/layout.tsx` + `src/app/page.tsx` (brand line, "Stay Grounded"), the collection/product truth in **`sql/itg_commerce.sql`** (the five lines — copper, apparel, orgone, anti-emf, **Heal & Succeed** — their taglines, and the real Heal & Succeed products: The Sovereign Architect $197, The Living Instrument $97, The Sovereign Mirror bundle $97 + the five $27 scripts, the 30/15/25/25/15 methodology blend, "human-written, recorded in pro studios in the USA & Italy").
- **The blog render pipeline** — `src/app/blog/posts.ts` (the `itg_posts` → `BlogPost` mapping), `src/app/blog/[slug]/page.tsx`, `processShortcodes.ts`, and `_components/richReplace.tsx` (the `data-vibe-*` widgets). This is the source of truth for the OUTPUT CONTRACT below.
- **1–2 existing posts** (read the live `itg_posts` rows, or the static fallback in `posts.ts`: *new age grift, truth isn't linear, humanity has already split, what is freedom, how they're cooking us, violence is not the answer*) to absorb the live voice.

Keep the conclusions as a tight brand-understanding brief (real offers + prices + status, the methodology blend, the vocabulary, the tag set, live vs coming-soon pages) and reuse it across every post in the batch. Reading the codebase is a good place for an Explore/research agent — keep the brief, not the file dumps.

**Build the link inventory now:** fetch `https://beinthegno.com/sitemap.xml` and split it into **published-blog** URLs and **non-blog site** URLs. Internal links come ONLY from this inventory. **If the sitemap is gated/unreachable, ASK Daniel which posts are live** and use his list (still ≤2 blog links per post). Collection/offer pages (`/healing`, `/copper`, `/orgone`, `/anti-emf`, `/apparel`, product pages `/healing/{handle}`) are the forgiving site-link targets.

### 3. Outline every requested post

If the Workflow tool is available, run the 3-agent huddle (`panel.js`) once per topic — invoke **Workflow** with `scriptPath: <this folder>/panel.js` and `args` as a real JSON object (NOT a JSON string): `{ topic, keyword, secondaryKeywords, tertiaryKeywords, destination, tag, details, companyContext, publishedBlogs, sitePages, specPath }`. Pass the brand-understanding brief as `companyContext`, the two sitemap lists as `publishedBlogs` / `sitePages`, empty strings for anything not given. Otherwise build the blueprint yourself, playing all three roles (angle → structure/links → voice card) against `spec.md`.

Present each post's outline to Daniel in THIS shape:

- A short **OVERVIEW** — the angle, who it's for, and the one destination offer, in 2 to 3 lines.
- The **6 H2 sections, each with a one-line brief:** content H2 #1–#4 (flag where the listicle lands), the FAQ (#5), and the CTA (#6).
- The **keyword set** (focus + secondary + tertiary), the **5 internal links** (≤2 blogs, all verified against the inventory), and **2–3 external** sources.

Present all 1–3 outlines together.

### 4. Daniel tweaks the outline(s)

Show the outlines; take his edits; iterate until he signs off on each. It's far cheaper to fix the plan than a written section. Lock the outline before writing a word of body.

### 5. Build each post section by section (the main event)

Working from the signed-off outline, **you** write one unit at a time, in the Gnostic-Jester voice, obeying `spec.md`. **After each unit, stop, show it, and run one Q&A round — a tone check AND the first-hand pull that unit needs — then apply his answer before the next.** About 6 rounds per post, in order:

1. **The opening — H1 title + H2 dek + the intro lead, delivered TOGETHER.** Lock the voice before any content section (draft the FIELDS alongside). If Daniel hands you a title or dek, use it VERBATIM (same wording + casing) — never reword, pad, or recase. The FIELDS Subtitle must be character-for-character identical to the body dek.
2. **Key Takeaways + the Jump-to-Section note** — once the opening voice is approved.
3.–6. **Content H2 #1, #2, #3, #4** — one section per round (200–400 words each, the listicle where the outline put it, H3s as needed).
7. **FAQ** (H2 #5) — the `## Frequently Asked Questions` header + up to 3 Q&As, shortest to longest.
8. **CTA** (H2 #6, ≤2 sentences + the button).

(To stay near 6 rounds, fold the takeaways into the intro round and the FAQ into the CTA round.)

For each unit:

- Write it in the Gnostic-Jester voice, around its target length, showing the **running word count** (e.g. *"running total: 740 / 1,500"*).
- **Bake the interview in here:** ask the 1–2 first-hand questions THIS unit needs — the personal anecdote, the real number/price, the hot take, the moment he changed his mind, the mistake-and-lesson, the one line he'd say. Draw from those across the build instead of front-loading. Pair it with the tone check (*"good as is / punchier / more sovereign / more intimate / funnier?"*).
- **Weave this unit's links in AS you write it** (internal + external, bracket notation). Spread the 5 internal + 2–3 external across sections; never batch them at the end. Every content section earns its share of links AND its bold/italic emphasis — no bare sections.
- **Research public facts yourself** (Jung/Zeland/Hill/Monroe/Lecoq references, market stats, platform changes) and cite them inline with a real source. Only Daniel's personal/first-hand material becomes a `[DANIEL: …]` gap — never fabricate his details or invent a product/price/claim.
- **Obey the wellness-disclaimer + defamation rules in `spec.md`** as you write — this content is educational self-development, never medical/psychological advice; opinion and satire about power/institutions are the brand, but statements of fact about real living people must be true/attributed.
- **Look ahead:** when an earlier edit ripples forward (a coined phrase, a shifted angle, a stale outline beat), flag it and propose the fix instead of blindly following the outline.

### 6. Assemble + QA → paste-ready

- Stitch the locked units into the full BODY. Run the Quick QA checklist in `spec.md` and hard-verify: ~1,500 words (never over); exactly 6 H2s (4 content + FAQ + CTA); exactly 5 internal links, ≤2 blogs, every internal URL present in the link inventory; the CTA section is ≤2 sentences + the button; the wellness disclaimer present where the post touches trauma/healing; active voice, no em dashes, no slop, sounds like the Jester (not a wellness content mill).
- Output per post as TWO blocks: **(1) META + IMAGE PLAN** — the FIELDS in the exact order in `spec.md`, then the 4-image plan (hero + 3, each with 3 sourcing options); **(2) THE POST** — the clean paste-ready body with widget markers inline. Call out any `[DANIEL: …]` gaps to fill before publishing.

## OUTPUT CONTRACT (how a post becomes a database row)

Posts land in the Supabase **`itg_posts`** table (schema: `sql/create_itg_posts.sql`; mapping: `src/app/blog/posts.ts`). The FIELDS block maps onto these columns:

| FIELDS line | Column | Notes |
|---|---|---|
| Title | `title` | The H1. Rendered by the template — never repeated in the body. Inline `**bold**`/`*italic*` allowed (see `inlineMarkup.ts`). |
| URL slug | `slug` | Keyword-led kebab, 3–6 words, unique, never changed after publish. |
| Subtitle (dek) | `subtitle` | Character-for-character identical to the body's dek. *(optional column — carry it in FIELDS regardless.)* |
| SEO title | `seo_title` | ≤60 chars, keyword near the front. *(optional column.)* |
| Meta description | `meta_description` | ≤155 chars, keyword once + a hook. *(optional column.)* |
| Date | `date` | `YYYY-MM-DD` (stored as text). |
| Tag | `tag` | Exactly one tag from the set in `spec.md`. |
| Body | `content` | HTML string (VibeWriter persists Lexical output as HTML; `posts.ts` reads it as a string). |
| Hero image | `image` | Uploaded in VibeWriter (auto-WebP to R2); you supply the 3-option image plan. |
| Hero alt text | `image_caption` | This column is the hero's ALT text. Always filled, honest, keyword if truthful. |
| In-post images | `image_2`…`image_6` | Optional extra slots (media is usually placed inline via shortcodes instead). |
| Blogcast audio | `blogcast_url` | Optional narrated-post audio URL → renders the TechnicolorPlayer. |
| Music embed | `music_embed` | Optional Spotify/SoundCloud URL. |
| Author / title / bio | `author`, `author_title`, `author_url`, `author_bio` | The byline (see `spec.md`). No hand-written byline in the body. |
| — | `published` | Daniel flips it (or scheduling does). |

**Delivery = VibeWriter (default).** Daniel pastes FIELDS into the side panel and the BODY into the editor. The special blocks are toolbar-inserted Lexical nodes; mark each in the body with a clear note (`[KEY TAKEAWAYS BLOCK — bullets below]`, `[INSERT JUMP-TO-SECTION BLOCK]`, a real `## Frequently Asked Questions` header + `[FAQ BLOCK — Q&As below]`, `[CTA BUTTON — text: "…"; link: /path]`). Media goes inline as intheGno **shortcodes** (see below).

**Direct SQL / seeded HTML.** If a post ships as raw HTML into `itg_posts.content`, emit the widget markup **verbatim** so `richReplace.tsx` picks it up (`class`/`style` are stripped on save — state lives in `data-*`/`itemprop` only):

- **FAQ — `data-vibe-faq`** (mandatory for every post's FAQ):
  ```html
  <h2>Frequently Asked Questions</h2>
  <section data-vibe-faq itemscope itemtype="https://schema.org/FAQPage">
    <details itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <summary itemprop="name">The question, plain text?</summary>
      <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <div itemprop="text"><p>The answer. Plain — no bold, no italics.</p></div>
      </div>
    </details>
    <!-- up to 3 <details>, shortest question to longest -->
  </section>
  ```
- **Jump-to-Section (TOC):** `<nav data-vibe-toc><h3>Table of Contents</h3><ul><li><a href="#h2-slug">Label</a></li>…</ul></nav>` with matching `id`s on every `<h2>`.
- **Key Takeaways:** `<div data-vibe-takeaways>…</div>` (3–5 bullets).
- **CTA button:** `<a data-vibe-cta href="/path">Button label</a>` — exactly one, at the very end.
- **Media shortcodes** (`processShortcodes.ts`, `itg-` prefixed): `[[image:URL|size=large|align=center|caption=…]]`, `[[audio:URL]]` (Cloudflare Stream / mp3 → TechnicolorPlayer; Spotify → embed), `[[video:URL]]`, `[[duo:URL1|URL2]]`, `[[trio:…]]`, `[[carousel:URL1|URL2|…]]`, `[[tweet:URL]]`, `[[instagram:URL]]`, `[[tiktok:URL]]`. Use these for in-body media instead of raw `<img>`.

Never freelance the widget markup — an FAQ/TOC written any other way renders as dead plain HTML and loses its rich result.

## Integrity rules (load-bearing — long versions in `spec.md`)

- **Ground every post in the real brand.** Read the site copy / seeds / `spec.md` (step 2) before outlining. Never invent a product, price, methodology percentage, or claim. The Heal & Succeed line, prices, and the 30/15/25/25/15 blend are fixed facts — quote them, don't approximate.
- **Wellness-disclaimer rule.** intheGno's healing/shadow-work content is educational self-development, NOT medical or psychological advice, not a substitute for therapy or treatment. Any post that touches trauma, addiction, or mental health carries the disclaimer (see `spec.md`) and never promises a cure.
- **Defamation guardrail.** Opinion and satire about institutions, systems, "the grid," and power are the brand and are protected. But a statement of *fact* about a real, living person (especially a crime) must be true and attributed to a citable source, or reframed as opinion/satire — never asserted as fact. Protects Daniel legally; it's editorial, not moral.
- **Never invent Daniel's first-hand details.** Missing personal material becomes a `[DANIEL: …]` placeholder. Public facts (Jung/Zeland/Hill sources, stats, platform changes) you research and cite yourself.
- **Never invent a URL.** Internal links come only from the verified inventory — exactly 5 per post, ≤2 blogs.
- **1–3 posts per batch.** Outline all, confirm the angles, then build section by section.

If the user only wants to *read or reference* the engine (not generate a post), point them at `spec.md` — that's the constitution. The launch topics live in `topics.md`.
