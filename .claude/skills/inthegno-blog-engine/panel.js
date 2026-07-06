export const meta = {
  name: 'inthegno-blog-blueprint',
  description: "Fast 3-agent strategy huddle for an intheGno blog post — angle + the only-intheGno-could-write-it synthesis, then SEO + verified links, then the Gnostic-Jester voice card. Returns a BLUEPRINT the main agent writes from section-by-section; it does NOT write the post itself.",
  phases: [
    { title: 'Angle', detail: 'set the angle + brand-grounded moat + exactly-4-content-section outline' },
    { title: 'Structure', detail: 'lock the keyword set, refine outline, pick 5 verified internal links + external sources' },
    { title: 'Voice', detail: 'build the Gnostic-Jester voice card for this topic + draft the FIELDS' },
  ],
}

// ── Inputs (from the skill via args) ──────────────────────────
// args may arrive as a parsed object OR a JSON-encoded string; property access
// on a string silently yields undefined, which would default the whole brief —
// so coerce to an object before reading any field.
let A = args || {}
if (typeof A === 'string') {
  try { A = JSON.parse(A) } catch (e) { A = {} }
}
const specPath = A.specPath || '/Users/daniellewis/Desktop/DnDL Creative LLC/intheGno/.claude/skills/inthegno-blog-engine/spec.md'
const topic = A.topic || 'an intheGno topic'
const keyword = A.keyword || ''
const secondaryKeywords = A.secondaryKeywords || ''
const tertiaryKeywords = A.tertiaryKeywords || ''
const destination = A.destination || ''
const tag = A.tag || ''
const details = A.details || ''
const companyContext = A.companyContext || '' // brand-understanding brief the skill gathered from this repo (site copy, seeds, methodology blend, vocabulary, live pages)

function renderList(list) {
  if (!list) return '(none provided)'
  const arr = Array.isArray(list) ? list : [list]
  if (!arr.length) return '(none provided)'
  return arr.map((x) => {
    if (x && typeof x === 'object') return `- ${x.url || x.href || ''}${x.title ? `  (${x.title})` : ''}`
    return `- ${x}`
  }).join('\n')
}
const publishedBlogs = renderList(A.publishedBlogs)
const sitePages = renderList(A.sitePages)

const SPEC = `FIRST, read the intheGno Blog Engine constitution at ${specPath} and obey it exactly — the GNOSTIC-JESTER voice (clear-eyed not bitter, humorous not mean, sovereign not arrogant, intimate not preachy; mostly lowercase headings; profanity allowed in moderation, never slurs; esoteric but always practical; mocks the grid/Demiurge/Archons/pendulum, never the reader), the anti-slop rules (NO em dashes, active voice, no "dive in / unlock / elevate / in conclusion", no throat-clearing intros, no fake first-hand), the INTEGRITY rules (never invent a product, price, or the methodology blend; the WELLNESS DISCLAIMER is mandatory on any post touching trauma/addiction/mental health — educational self-development, NOT medical or psychological advice, never a promised cure; the DEFAMATION guardrail — satire/opinion about systems is fine, but no unproven factual accusation about a named living person), the SEO/GEO rules, the field set, the link rule, the required body shape, and the output/widget contract. The voice is the whole product; SEO is plumbing. Current spec: ~1,500 words (1,200–1,500, 1,500 hard cap); EXACTLY 4 H2 CONTENT sections (#1–#4) + FAQ (#5) + FINAL CTA (#6) = EXACTLY 6 H2s total (hard fixed); each content section ~200–400 words (~300 ceiling); the FINAL H2 is STRICTLY a call-to-action (heading + ≤2 sentences + one button); focus + secondary + tertiary keywords always set; meta ≤155, SEO title ≤60; 5 internal links where AT MOST 2 are blog posts. Pick ONE destination by AUDIENCE PRIORITY: (1) a Heal & Succeed offer (/healing or a product like /healing/the-sovereign-architect) — the money line; (2) the newsletter "stay in the gno" — for top-of-funnel essays; (3) a physical line (/copper, /orgone, /anti-emf, /apparel) — for vessel/EMF/talisman topics. Brand facts are FIXED: Heal & Succeed = The Sovereign Architect ($197; blend 30% classic Reality Transurfing / 15% Transurfing Yourself / 25% Jung / 25% inner-child+somatic / 15% Hill reforged; +$47 Monroe module), The Living Instrument ($97), The Sovereign Mirror bundle ($97) + five $27 scripts; all human-written, recorded in pro studios USA & Italy; it's "shadow work / guided sessions," NEVER "ritual." Physical = talismans not shields, made to order USA & Italy.`

const CONTEXT = `BRIEF INPUTS
Topic / working title: ${topic}
Focus keyword: ${keyword || '(none given — propose one from real search intent)'}
Secondary keywords (2–3): ${secondaryKeywords || '(none given — propose 2–3 close variants)'}
Tertiary keywords (2–3 long-tail, FAQ-friendly): ${tertiaryKeywords || '(none given — propose 2–3 question-shaped long-tails)'}
Destination offer: ${destination || '(none given — pick the natural one from the audience-priority map)'}
Tag: ${tag || '(none given — pick one of: sovereignty, shadow work, transurfing, the vessel, manipulation, NPCs, hypocrisy, healing)'}
Daniel's real first-hand details (use ONLY these; never invent his stories): ${details || '(none provided — wherever first-hand material is needed, mark a clearly-labeled [DANIEL: …] placeholder rather than fabricating)'}

BRAND UNDERSTANDING (real offers, prices, methodology blend, vocabulary, and live-vs-coming-soon pages the skill gathered from this repo — GROUND every claim in THIS, never in generic wellness-blog assumptions; anything not confirmed here gets a [VERIFY: …] marker, never invented): ${companyContext || '(none provided — the skill should read the brand before the huddle)'}`

const LINK_SOURCES = `VERIFIED LINK SOURCES — the ONLY URLs you may use for internal links.
PUBLISHED BLOG POSTS (at most 2 of the 5 internal links may come from here):
${publishedBlogs}

NON-BLOG SITE PAGES (at least 3 of the 5 internal links must come from here):
${sitePages}

Hard rules: choose EXACTLY 5 internal links, AT MOST 2 from the blog list and AT LEAST 3 site pages, one of them pointing to the destination offer. Every URL is copied verbatim from the lists above — never invent or guess a slug; a page not in these lists is NOT live, so don't link it. If a blog you want isn't listed, it isn't published — pick another or a site page. Then pick 2–3 external high-authority sources (a Jung or Zeland text, a peer-reviewed study, a named stat), each supporting a specific claim.`

log(`Huddle: "${String(topic).slice(0, 60)}" | kw="${keyword}" | tag="${tag}" | blogs/pages: ${Array.isArray(A.publishedBlogs) ? A.publishedBlogs.length : '?'} / ${Array.isArray(A.sitePages) ? A.sitePages.length : '?'} | brandCtx: ${companyContext ? companyContext.length + ' chars' : 'NONE'}`)

// THREE agents, one at a time, each handed the prior work. They produce a
// BLUEPRINT for the main agent to write from interactively — they do NOT write
// the body. Keep outputs tight; this huddle is built for speed.

// 1) Angle + synthesis moat + section outline.
phase('Angle')
const angle = await agent(
  `${SPEC}\n\nYou are the SUBJECT-MATTER EXPERT (Jungian shadow work, Reality Transurfing + Transurfing Yourself, Napoleon Hill, inner-child/somatic work, Gnosticism, and the intheGno product line + vessel topics: EMF/copper/orgone). Set the unique angle and the SYNTHESIS MOAT — the specific, only-intheGno-could-write-it framing (a cross-lineage synthesis, a coined frame like "the pendulum" or "importance zero", a reforged Hill principle) that lifts this above a commodity wellness post. Use ONLY the brand context and Daniel's provided details; mark anything unverified [VERIFY: …] and anything personal-and-missing [DANIEL: …], never invent. If the topic touches trauma/addiction/mental health, note that the wellness disclaimer is required. Then propose an outline of EXACTLY 4 CONTENT-section H2s (#1–#4; hard rule — always 4, each ~200–400 words, ~300 ceiling): for each give a working H2 title, a one-line beat, and a target word count, with totals (lead ≤150, Key Takeaways, the 4 content sections, FAQ #5, tiny CTA #6) landing at ~1,500 (1,200–1,500 cap). Flag where the listicle lands. Output: the angle, the hook direction, the must-include verified facts (or their [VERIFY: …] gaps), and the section outline. Be concise — a blueprint, not prose.\n\n${CONTEXT}`,
  { label: 'sme:angle', phase: 'Angle' })

// 2) SEO/GEO + the 5 verified internal links.
phase('Structure')
const structure = await agent(
  `${SPEC}\n\nYou are the SEO/GEO + LINKS STRATEGIST. From the angle and outline below: lock the FOCUS keyword, 2–3 SECONDARY keywords, and 2–3 TERTIARY long-tail keywords (if the brief supplies Daniel's keywords, USE THOSE — only propose your own when none given); refine the 4-content-section answer-first outline (always exactly 4, each ~200–400 words; keep per-section targets so the total stays 1,200–1,500); assign which keyword opens each section; point the tertiary keywords at the FAQ; note where the listicle fits. Then select the links, obeying the link-sources block exactly — each as an anchor-text → URL pair marked BLOG / PAGE / EXTERNAL, one pointing at the destination offer. Add a one-line note per section on how to make it AI-citable (a self-contained, quotable, answer-first opening line). Challenge the angle only if it won't rank — voice and truth win ties. Output: the keyword set + refined section outline (titles + beats + target words + opening keyword) + the 5 internal links + the external sources + AI-citability notes.\n\n${CONTEXT}\n\n${LINK_SOURCES}\n\nANGLE & OUTLINE (from the subject-matter expert):\n${angle}`,
  { label: 'seo:structure', phase: 'Structure' })

// 3) Voice card for this topic + draft FIELDS. (No body — the main agent writes that.)
phase('Voice')
const voice = await agent(
  `${SPEC}\n\nYou are the VOICE & CRAFT LEAD — keeper of the Gnostic-Jester voice (clear-eyed not bitter, humorous not mean, sovereign not arrogant, intimate; mostly lowercase; profanity in moderation; esoteric but practical; trap-then-door structure; the one-line gut-punch). You are NOT writing the post body; the main agent writes it section by section with Daniel. Hand them a VOICE CARD for THIS topic: 2–3 candidate hook/lead lines in voice (grounded, [VERIFY:…]/[DANIEL:…] where needed); the 3–4 signature moves to deploy (a coined frame, an honest hedge, an exact-price/number reveal, the gut-punch); a short do/don't for this topic's traps (especially the wellness-disclaimer and defamation landmines, and "shadow work" not "ritual"); and one or two sample in-voice sentences to pattern-match. Then draft the FIELDS in the spec's exact order (Title → Subtitle → Hero image idea (3 options, never an AI image of a real person/place) → Hero alt → Date → Tag → Author → Author title → Author link → Author bio → Focus keyword → Secondary keywords → Tertiary keywords → URL slug → SEO title ≤60 → Meta description ≤155 → Blogcast/music (optional) → Planning), using the keyword set and links below. Keep every [VERIFY:…]/[DANIEL:…] gap. Output the VOICE CARD then the draft FIELDS.\n\n${CONTEXT}\n\nANGLE & OUTLINE:\n${angle}\n\nKEYWORDS, OUTLINE & LINKS:\n${structure}`,
  { label: 'voice:card', phase: 'Voice' })

// Assemble the blueprint the main agent will write from.
return `=== intheGno BLOG BLUEPRINT ===
(The main agent writes the post section by section from this, checking tone with Daniel after each section. This is NOT the finished post.)

--- ANGLE & SYNTHESIS MOAT ---
${angle}

--- KEYWORDS, SECTION OUTLINE & LINKS (5 internal ≤2 blogs / external sources) ---
${structure}

--- VOICE CARD + DRAFT FIELDS ---
${voice}
`
