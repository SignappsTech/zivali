---
source: 03§P3
page: P3 Public pages (home and content templates)
stories: TASK-27, TASK-28, TASK-72 (FR-035)
platforms: web
mockup: docs/design/mockups/P3-public-pages.html
copy: docs/content/pages/P3-public-pages.md
---

# P3 Public pages

## Purpose

The home page and the reusable templates for every public content page: how it works, safety tips, FAQ, for shelters, about, success stories (later) and the legal pages. They carry SEO, trust and the two entry actions. Final copy is written by the content strategist; this slice fixes structure.

## Templates

| Template | Pages |
|---|---|
| T1 Home | Home |
| T2 Article | How it works, Safety tips, For shelters, About, Where your money goes (M4), Success stories (M5) |
| T3 FAQ | FAQ |
| T4 Legal | Privacy, Cookies, Terms, Imprint, Accessibility statement |

All use the Content variant of the web shell (P1) without a sidebar. Public pages have **no ad slot** unless P21 says so.

## T1 Home: section order

1. **Hero.** Two columns: left display headline (max 2 lines), one supporting sentence (max 20 words), primary "Report lost", text button "Report found" with arrow; right large photo (radius 36, placeholder from system imagery rules). No eyebrow, no logo strip.
2. **Near you.** H2, three pet tiles (4:3 photo, name, status word, distance or area) from the live read model, text button "Open the map". Shows the empty-state pattern when no reports exist.
3. **How it works.** H2 and three stacked rows (large number, h3, one sentence) on the left with one supporting photo on the right. Not three equal cards.
4. **Safe by design.** One column: h2, a short paragraph, three plain list items (hidden phone numbers, approximate locations, in-app chat), text button "Read the safety tips".
5. **For shelters and vets.** One block: h2, a sentence, text button "For shelters".
6. **Keep it free.** One quiet sentence about support with a text link to the transparency page (hidden until M4).

Section gap 96 px, each section a different layout family (split, list, stack). Structured data: Organization.

## T2 Article

Breadcrumb text link back, h1, lede (20/32), body at 640 px reading width, h2 sections, optional inline image (radius 24), quote blocks only if content provides one, a closing action row (primary or text). Optional sticky "On this page" list from `xl` for pages longer than five sections.

## T3 FAQ

h1 and lede, then grouped questions. Each question is a full-width button row (`card` surface, radius 20, plus/minus icon, 24 px padding), answer expands below in body text, one open at a time not required. Groups separated by 48 px with an h2. A closing note with a link to contact. Uses FAQPage structured data.

## T4 Legal

h1, "last updated" line, and a `note` that reads "requires client and legal review" while the page is a draft. Body in the Article style with numbered h2 sections. From `xl` a sticky "On this page" list on the left. Print stylesheet: single column, no header or footer chrome.

## States

Loading (skeleton for text pages is minimal), language fallback notice (an EN page missing a translation shows the SL text with a `note`; should not occur), offline.

## Responsive

Hero stacks (photo under text, 4:3). Home sections become single column. Article and legal pages keep 640 px measure and 20 px gutters on mobile. 320 px and 400 % zoom reflow without horizontal scroll.

## Accessibility

One h1, ordered headings, FAQ rows are buttons with `aria-expanded`, legal TOC is a `nav` with a label, link text is meaningful, images have alt text, contrast per tokens, reading order matches visual order.

## Assets

| File | Brief |
|---|---|
| (none generated) | Home hero and supporting photo use real, licensed photography or the placeholder set until the content strategist chooses final photos. No generated images for real animals. |

## Mockup scope (`P3-public-pages.html`)

1. T1 Home at 1200 px and 390 px, with the "Near you" empty state variant.
2. T2 Article (How it works) at 1200 and 390 px.
3. T3 FAQ with one row expanded.
4. T4 Legal with the draft note and the table of contents.
5. Light and dark.
