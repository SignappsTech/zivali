---
source: 03§P3
page: P3 Public pages (home and content templates)
stories: TASK-27, TASK-28, TASK-72 (FR-035), TASK-90 (FR-044, shelter pages)
platforms: web
mockup: docs/design/mockups/P3-public-pages.html, docs/design/mockups/P3-shelter-pages.html (T5, T6)
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
| T5 Shelter directory | `/zavetisca` (EN `/en/shelters`): find the shelter responsible for a municipality, and all shelters |
| T6 Shelter page | `/zavetisca/{slug}` (EN `/en/shelters/{slug}`): one shelter, one per registered shelter (17) |

All use the Content variant of the web shell (P1) without a sidebar. Public pages have **no ad slot** unless P21 says so (T5 and T6 have none).

## T1 Home: section order

1. **Hero.** Two columns: left display headline (max 2 lines), one supporting sentence (max 20 words), primary "Report lost", text button "Report found" with arrow; right large photo (radius 36, placeholder from system imagery rules). No eyebrow, no logo strip.
2. **Near you.** H2, three pet tiles from `md` (4:3 photo, name, status word, distance or area); below `md` pet rows (system 10.6) instead of tiles from the live read model, text button "Open the map". Shows the empty-state pattern when no reports exist.
3. **How it works.** H2 and three stacked rows (large number, h3, one sentence) on the left with one supporting photo on the right. Not three equal cards.
4. **Safe by design.** One column: h2, a short paragraph, three plain list items (hidden phone numbers, approximate locations, in-app chat), text button "Read the safety tips".
5. **For shelters and vets.** One block: h2, a sentence, text button "For shelters".
6. **Keep it free.** One quiet sentence about support with a text link to the transparency page (hidden until M4).

Section gap 96 px, each section a different layout family (split, list, stack). Structured data: Organization.

## T2 Article

Breadcrumb text link back, h1, lede (20/32), body at 640 px reading width, h2 sections, optional inline image (radius 24), quote blocks only if content provides one, a closing action row (primary or text). Optional "On this page" list for pages longer than five sections: sticky from `lg` (240 + 48 gap + 640 = 928 fits 1024 minus 2 x 48); below `lg` one collapsed disclosure row above the body.

## T3 FAQ

h1 and lede, then grouped questions. Each question is a full-width button row (`card` surface, radius 20, plus/minus icon, 24 px padding), answer expands below in body text, one open at a time not required. Groups separated by 48 px with an h2. A closing note with a link to contact. Uses FAQPage structured data.

## T4 Legal

h1, "last updated" line, and a `note` that reads "requires client and legal review" while the page is a draft. Body in the Article style with numbered h2 sections. From `lg` a sticky "On this page" list on the left (240 + 48 gap + 640 = 928 = 1024 - 2 x 48); below `lg` one collapsed disclosure row above the body, so the 18 legal links do not push the text down. Print stylesheet: single column, no header or footer chrome.

## T5 Shelter directory (`/zavetisca`)

Strings in quotes in T5 and T6 are placeholders; the content slice owns the final copy.

Purpose: an owner or finder learns in one step which shelter is responsible for their municipality and can call it. Calm and useful: one question, one answer, then the full list. Linked from the footer (P1), the "For shelters" page, and the P6 and P7 post-submit checklists.

Section order (640 px column, the list may use the 1120 px content width from `lg`):

1. h1 and a one-sentence lede (content slice).
2. **Municipality search**: one line field with a leading `map-pin-area` icon and the label above ("Vaša občina"), a combobox over the 212 municipalities. Matching ignores diacritics and case ("skofja" finds "Škofja Loka"); suggestions open as a listbox (system 10.3 Select on web), at most 8. No search button: choosing a municipality shows the answer.
3. **Answer** (appears under the field, announced politely), on `card` (radius 24, padding 24, no border): meta line "Za občino {municipality} je pristojno", h2 shelter name (link to T6), phone in h3 size with `tabular-nums` (grouped "01 234 56 78"), the page's one primary `lg` "Pokliči" (`phone` icon, `tel:` link), and a text button "Delovni čas in naslov" to T6. If a municipality has two shelters (for example dogs and cats), show two answers stacked, each with its own call button as `secondary`, and no primary.
4. **Unknown or unconfirmed municipality** (R-044.5). Never a guessed name or number.
   - *Unknown* (no likely shelter): a `note` with an `info` icon: no confirmed shelter for this municipality yet, call the municipality, and a text link to the full list. Plus the 2 nearest shelters as plain rows (as in item 5).
   - *Unconfirmed* (a likely shelter exists, not confirmed by the municipality): a card as in item 3 headed "Morda pristojno zavetišče" with the status "Ni potrjeno" (icon plus word, never colour only), the shelter name linking to T6. No "Pokliči" primary: the `tel:` call is a `secondary` button whose label says it is unconfirmed, plus the link to the shelter page. If no likely shelter can be named, show the list of the 2 nearest shelters instead.
   - The map block on T6 (`.sh-map`) gets an inset 1 px `map-road-casing` hairline so its edge reads in light mode.
5. **All shelters** (h2 with the count): plain rows, no cards, 20 px apart, alphabetical: shelter name (h3, link to T6), meta line with the area ("Ljubljana z okolico · 24 občin"), phone right-aligned on `lg` (`tabular-nums`, a `tel:` link). From `lg` two columns of rows.
6. **Legal note slot**: a `note` with the reporting duty, rendered only when the `content.legal_timings` flag is on. Absent otherwise (no empty space).
7. Quiet line: "Podatki preverjeni {date}", source, and a text link to report an error (contact).

States: before search (field and list only), suggestions open, answer, two answers, unknown municipality, no match for the typed text ("Občine {text} ne najdemo", with the list still below), loading skeleton (answer card shape), error note with retry. Offline: the generic P1 offline note; the list stays if cached.

## T6 Shelter page (`/zavetisca/{slug}`)

Purpose: everything needed to reach this shelter, on one calm page that search engines understand. Structured data `AnimalShelter` (name, address, telephone, openingHoursSpecification, areaServed, url); unique title and description from the content slice.

Section order:

1. Text link back "Vsa zavetišča" (breadcrumb).
2. h1 shelter name; meta line "Pristojno za {n} občin".
3. **Contact** (from `lg` two columns, 7 and 5; contact left, map right):
   - Phone in h2 size, `tabular-nums`, then the one primary `lg` "Pokliči" (`tel:`). If no phone is published: a sentence that says so and the website link takes its place as a `secondary` button.
   - Address (two lines) with a text link "Odpri v zemljevidu" (opens the platform maps app or OpenStreetMap, new tab, says so).
   - **Opening hours** as a plain two-column list (day range, hours; `tabular-nums`), for example "pon–pet 8.00–16.00", "sob 9.00–12.00", "ned in prazniki zaprto". No live "open now" claim (holidays make it unreliable).
   - Website and e-mail as text links if present.
   - Map: static calm map (radius 24, 4:3, `map-*` tokens), the shelter as the 48 px `primary` pin from P5 (a public address, so an exact pin is allowed here; this is the only exact pin outside the owner view). Not interactive; the address above is its text alternative.
4. **Municipalities served** (h2 with the count): an alphabetical plain list in up to three columns on `lg`, one column on mobile. No pills or chips. Each municipality is plain text (the index search already covers lookup).
5. **What to do** (h2): two plain rows with an icon, one sentence each and a text button: lost ("Prijavi izgubljeno žival", to P6) and found ("Prijavi najdeno žival", to P7). Not a second primary.
6. **Legal note slot** as in T5 (flag-gated).
7. Quiet line: last verified date and source, text link to report an error.

States: loading skeleton (h1, phone, hours lines, map block), unknown slug (the P1 404 page with a link to T5), **stale data** (last verified more than 12 months ago): a `note` with a `clock` icon above the contact block, "Podatki so bili nazadnje preverjeni {date}. Pred obiskom pokličite." (still shows the data), missing phone (as above), missing hours ("Delovni čas ni objavljen"), map offline (the map block is omitted, the address stays).

Responsive (T5 and T6): single column on mobile with 20 px gutters; the call button is full width `lg` in the page flow, never floating. Phone numbers and hours never wrap mid-number. 320 px and 400 % zoom reflow without horizontal scroll.

Accessibility (T5 and T6): the search is a labelled combobox with `aria-expanded`, `aria-activedescendant` and a polite live region for the answer; call buttons have names that include the shelter ("Pokliči {shelter name}"); phone numbers are `tel:` links in the list rows; in the T5 answer card and on T6 the large number is selectable text beside one `tel:` "Pokliči" button (two adjacent links to one target are avoided), and the button's `aria-label` carries the shelter name; the answer card's 3-size limit counts text sizes only (meta 14, h2 name, phone h3), not the button label; hours are a description list; the map is decorative (`alt=""`) because the address is text.

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

## Mockup scope (`P3-shelter-pages.html`, TASK-90 design task)

1. T5 at 1200 and 390 px: before search, suggestions open (typed "skof"), answer with call button, two answers, unknown municipality note, no match, legal note slot shown (flag on).
2. T6 at 1200 and 390 px: full page, stale-data note, no-phone variant, loading skeleton.
3. Light and dark. Shelter names, numbers and hours are marked sample data until the content slice and the directory provide them.
