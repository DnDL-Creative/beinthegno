/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { domToReact, type DOMNode } from "html-react-parser";
import BlogFaq, { type FAQItem } from "./BlogFaq";
import KeyTakeaways from "./KeyTakeaways";
import JumpToBox from "./JumpToBox";
import CtaButton from "./CtaButton";
import TocBackLink from "./TocBackLink";

// html-react-parser `replace` for blog content. VibeWriter (the dndlcreativellc
// content app) exports several blocks as semantic HTML that we upgrade into real
// intheGno components here:
//   • <section data-vibe-faq> …<details><summary>Q</summary>…[itemprop=text]A…
//        → a copper-pipe FAQ accordion (re-emits FAQPage JSON-LD).
//   • <a data-vibe-cta href>label</a>  → a filled copper pill (centered).
//   • <nav data-vibe-toc> …<a href="#slug">Label</a>…  ("Table of Contents")
//        → a collapsible numbered jump-box.
//   • <h2> → heading + a "back to contents" arrow (revealed by .body.hasToc).

// Concatenate the text of a domhandler node tree.
function textOf(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.data || "";
  return (node.children || []).map(textOf).join("");
}

// Inline HTML → markdown-ish tokens BlogFaq renders: **bold**, *italic*,
// [text](url). Bold, italic, and links all survive the round-trip now.
function inlineMd(node: any): string {
  const f = (n: any): string => {
    if (n.type === "text") return n.data || "";
    if (n.name === "strong" || n.name === "b")
      return `**${(n.children || []).map(f).join("")}**`;
    if (n.name === "em" || n.name === "i")
      return `*${(n.children || []).map(f).join("")}*`;
    if (n.name === "a") {
      const href = (n.attribs || {}).href || "";
      const t = (n.children || []).map(f).join("");
      return href ? `[${t}](${href})` : t;
    }
    if (n.name === "br") return "\n";
    return (n.children || []).map(f).join("");
  };
  return f(node);
}

// Convert a FAQ answer node into the markdown-ish string BlogFaq renders
// (paragraphs separated by blank lines).
function answerMarkdown(node: any): string {
  const kids = node.children || [];
  const paras = kids.filter((k: any) => k.name === "p");
  const out = paras.length
    ? paras.map((p: any) => inlineMd(p).trim())
    : [inlineMd(node).trim()];
  return out.filter(Boolean).join("\n\n");
}

function findOne(node: any, pred: (n: any) => boolean): any {
  if (!node) return null;
  if (pred(node)) return node;
  for (const c of node.children || []) {
    const r = findOne(c, pred);
    if (r) return r;
  }
  return null;
}
function findAll(node: any, pred: (n: any) => boolean, acc: any[] = []): any[] {
  if (!node) return acc;
  if (pred(node)) acc.push(node);
  for (const c of node.children || []) findAll(c, pred, acc);
  return acc;
}

export function richReplace(domNode: DOMNode): React.JSX.Element | undefined {
  const el = domNode as any;
  // NOTE: deliberately NOT `instanceof Element`. html-react-parser v6 ships
  // multiple domhandler copies, so its re-exported `Element` is a *different*
  // class than the parsed nodes — `node instanceof Element` is always false and
  // silently no-ops the entire replace (verified: node.type==='tag', attribs
  // intact, instanceof === false). Duck-type on the node shape instead.
  if (!el || typeof el.name !== "string" || !el.attribs) return undefined;
  const attribs = el.attribs;

  // ── FAQ accordion ──
  if (el.name === "section" && "data-vibe-faq" in attribs) {
    const items: FAQItem[] = [];
    for (const d of (el.children || []).filter((c: any) => c.name === "details")) {
      const summary = findOne(d, (n: any) => n.name === "summary");
      const ans = findOne(d, (n: any) => (n.attribs || {}).itemprop === "text");
      const q = inlineMd(summary).trim();
      if (q) items.push({ q, a: ans ? answerMarkdown(ans) : "" });
    }
    if (!items.length) return undefined;
    return <BlogFaq items={items} />;
  }

  // ── Key Takeaways card (VibeWriter <section data-vibe-takeaways><ul><li>…) ──
  if (el.name === "section" && "data-vibe-takeaways" in attribs) {
    const items = findAll(el, (n: any) => n.name === "li")
      .map((li: any) => textOf(li).trim())
      .filter(Boolean);
    if (!items.length) return undefined;
    return <KeyTakeaways items={items} />;
  }

  // ── Inline CTA button (VibeWriter <a data-vibe-cta href>label</a>) ──
  if (el.name === "a" && "data-vibe-cta" in attribs) {
    const href = attribs.href || "#";
    const label = textOf(el).trim();
    if (!label) return undefined;
    return (
      <div style={{ textAlign: "center", margin: "2rem 0" }}>
        <CtaButton href={href} label={label} />
      </div>
    );
  }

  // ── "Table of Contents" → collapsible box ──
  if (el.name === "nav" && "data-vibe-toc" in attribs) {
    // Custom short labels travel on the nav as data-vibe-toc-labels, keyed by
    // heading slug. Apply them here as the SOURCE OF TRUTH so a custom entry wins
    // over the heading text baked into the <a> — this fixes posts saved before
    // the label was baked in (no re-save needed) and guards against the editor's
    // fill missing the override.
    let tocLabels: Record<string, string> = {};
    try {
      tocLabels = JSON.parse(attribs["data-vibe-toc-labels"] || "{}") || {};
    } catch {
      tocLabels = {};
    }
    const links = findAll(el, (n: any) => n.name === "a")
      .map((a: any) => {
        // Heading level rides on the parent <li>: VibeWriter stamps
        // data-level="3"/"4"; older posts marked h3 with data-sub.
        const at = (a.parent && a.parent.attribs) || {};
        const level =
          at["data-level"] === "4"
            ? 4
            : at["data-level"] === "3" || "data-sub" in at
              ? 3
              : 2;
        const href = (a.attribs || {}).href || "#";
        // Match the label by the link's slug; fall back to the de-duplicated
        // base (strip a trailing -2/-3 that VibeWriter adds for repeat headings).
        const slug = href.replace(/^#/, "");
        const custom = tocLabels[slug] ?? tocLabels[slug.replace(/-\d+$/, "")];
        return {
          href,
          label: (custom && custom.trim()) || textOf(a).trim(),
          level,
        };
      })
      .filter((l: any) => l.label);
    if (!links.length) return undefined;
    return <JumpToBox links={links} />;
  }

  // ── Generic body links — external open in a NEW TAB, internal stay in-page ──
  if (el.name === "a" && attribs.href && !("data-vibe-cta" in attribs)) {
    const raw = String(attribs.href).trim();
    const isInternal =
      raw.startsWith("/") ||
      raw.startsWith("#") ||
      (/^https?:\/\//i.test(raw) &&
        (() => {
          try {
            return new URL(raw).host.endsWith("beinthegno.com");
          } catch {
            return false;
          }
        })());
    if (isInternal) return undefined; // default render keeps it same-tab
    // External: normalize a bare domain to https:// and open it in a new tab.
    const href = /^(https?:|mailto:|tel:)/i.test(raw) ? raw : `https://${raw}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {domToReact(el.children || [])}
      </a>
    );
  }

  // ── h2 → section heading + a "back to contents" arrow (floated top-right).
  //    Rendered on every h2; CSS reveals it only when .body has .hasToc. The
  //    arrow links to the TOC (#table-of-contents); aria-label carries the
  //    meaning so the heading's own text stays clean for SEO/screen readers. ──
  if (el.name === "h2") {
    return (
      <h2 id={attribs.id}>
        <TocBackLink />
        {domToReact(el.children || [], { replace: richReplace })}
      </h2>
    );
  }

  return undefined;
}
