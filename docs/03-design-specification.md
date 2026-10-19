---
doc_id: DOC-03
title: Design Specification
version: 0.7
status: Draft (direction approved 2026-10-14)
date: 2026-10-19
owner: Design Lead
audience: Client, team
approvals:
  - Client | Primož Božič | 2026-10-14 |
  - Design Lead | Claude | 2026-10-14 |
---

<!-- Owner: design-lead. Master design doc. Implementers never read this: they read docs/design/system.md and docs/design/pages/P*.md slices. -->

# Design directions

Lean mode: one direction with two variations, explored as style tiles and key screens in `design/directions/` (overview at `design/directions/index.html`). The client chose variation A on 2026-10-14 and, after a second review that asked for a calmer, cleaner pass (one primary action, one question per screen, fewer outlines, fewer badges, fewer map markers), **approved the decluttered direction A the same day**. The direction is approved; this document and the page slices still need client approval when the mockups exist.

| Direction | Idea | Mood | Chosen |
|---|---|---|---|
| A Lagoon | Cool teal on mist, soft pill shapes, flat tonal surfaces, sun yellow as the only warm accent | Calm, warm, hopeful, held | **Approved by the client, 2026-10-14** |
| B Ink and Sun | Poster-clear ink type, one sun-yellow action colour, crisp corners | Clear, confident, urgent without panic | No (explored, dropped) |

Direction name: **Warm harbour**, realised as Lagoon. Mockups: `design/directions/A.html` (style tile, three mobile screens, one web page, light and dark, side by side). Tokens: `design/tokens.json`. System slice: `design/system.md`.

# Brand and visual language

- **Name:** **Najdimo** (recommended, not final: Q-001). "Let's find (them)." Tagline: "Spet doma." / "Home again." Alternatives considered: Pot domov, Spet doma, Doma, Sled (reasons in `design/directions/index.html`). Domain and trademark check still needed; najdimo.si, .com, .app and .eu do not resolve today, which is not a registry check.
- **Personality:** calm, warm, hopeful, trustworthy. We speak like a kind neighbour who knows what to do. We avoid alarm (capitals, red banners, many exclamation marks), cute talk and paw puns, emoji in the interface, guilt and pity, and promises we cannot keep.
- **Logo:** a map pin with two soft ears, the hole holding a sun-yellow dot ("the eye of the search"). Works at 16 px and in one colour plus the dot. Files in `design/brand/` (`najdimo-mark.svg`, `najdimo-mark-light.svg`, `najdimo-app-icon.svg`). The wordmark is live text in Bricolage Grotesque for now and will be outlined in the final logo pack.
- **Color:** lagoon teal (`#145360` primary), mist neutrals (`#E8EEEE` canvas, `#FBFDFD` card), night neutrals for dark mode, sun yellow (`#F7B32B`) as the single warm accent. Status colours: coral (lost), leaf green (found), blue (sighted), sun (reunited). Premium plum, verified teal. 7:1 contrast for body text and the primary action, 4.5:1 minimum elsewhere, verified by the token build. Roles and values in `design/system.md`.
- **Typography:** Bricolage Grotesque (headings) and Atkinson Hyperlegible Next (text), both Google Fonts with full Slovenian diacritics (Č, Š, Ž verified). Body 16 px minimum, meta 14 px, chip numbers tabular with a slashed zero. **Web font budget (v0.5, TASK-90.5, NFR performance):** first-load fonts at or under about 60 KB, three self-hosted woff2 files: Bricolage Grotesque 700 (headings, one weight, optical size fixed), Atkinson Hyperlegible Next 400 and 700 (500 and 600 fold to 400 and 700). Each file is a custom Latin subset (Basic Latin, Latin-1, Latin Extended-A: covers Č Š Ž Đ Ć and typographic punctuation), preloaded, `font-display: swap` with a size-adjusted Arial fallback. Rationale: the mobile LCP gate (2.5 s) is lost to font bytes (159 KB of variable files with opsz and full weight ranges); the brand lives in the heading face and the Atkinson letterforms, not in extra weights. Details in `design/system.md` §4.
- **Imagery:** honest owner-snapshot photography, rounded frames, no text or pills on photos. Illustration is flat geometry in brand colours, used only for empty states, the reunited moment and house ads. Generated images are never used as a stand-in for a real report. Brief format for image tasks is in `design/system.md`.
- **Iconography and motion:** Phosphor Icons (regular, bold, fill), status always icon plus word plus colour. Motion only for feedback and state change, `transform` and `opacity` only, reduced motion honoured.
- **Maps:** OpenFreeMap tiles in a calm style (land, water, parks, main roads, area names). Lost pets appear as a translucent area with the pet photo, never an exact pin. At most three marker styles.
- **Surface rules (the "clean" pass):** surfaces separate by tone and space, not by outline. No card borders, no shadows except on floating controls and sheets, no card inside a card, one primary button per view, fields are a label and a line, bottom navigation has at most four items and no count badges. Dense admin tables may use hairlines.

# Information architecture

Sitemap (web). Mobile app navigation follows below.

    Najdimo (web)
    ├── Home (P3)
    ├── Map and list  /map (P4) → Report detail  /r/<code> (P9)
    │     ├── Lost, Found (filtered views of the same page)
    │     └── Contact → Chat (P12) · Report a sighting (P7) · Share and poster (P18) · Report abuse (P10)
    ├── Report ("Prijavi" menu, header primary action)
    │     ├── Lost animal (P6) → Location (P5) → Confirmation → Poster (P18), optional support (P15)
    │     ├── Found animal (P7, no account) → private manage page /m/<token> (P7)
    │     └── Sighted animal (P7)
    ├── Content pages (P3): How it works · Safety tips · FAQ · For shelters · About · Where your money goes (M4)
    ├── Shelter directory  /zavetisca (P3 T5) → Shelter page  /zavetisca/<slug> (P3 T6)
    ├── Partners "Oglašujte pri nas" (P22)
    ├── Sign in and create account (P16)
    ├── My account (signed in)
    │     ├── My pets (P8) · My reports → Match review (P11) → Chat (P12) → Reunited (P14) → Support (P15)
    │     ├── Inbox: Conversations (P12) · Notifications (P13)
    │     ├── Alerts and settings (P13) · Payments (P15)
    │     └── Cookie settings (P17)
    ├── Legal (P3 T4): Privacy · Cookies · Terms · Imprint · Accessibility statement
    └── Admin  /admin (P19): Dashboard · Ads (P20) · House ads (P20) · Enquiries · Shelter directory · Audit log · Settings
          (M3: Organisations and portal · M4: Moderation, Users, Orders, KPIs)

**Header (web):** logo, at most four links (Map, Lost, Found, How it works; signed in: How it works becomes My pets and reports), language, inbox icon and account menu (signed in) or Sign in, and the single primary "Report" menu. **Footer:** four groups (owner, 2026-10-19): Pomoč (How it works, Safety tips, FAQ, Shelters directory), Za organizacije (For shelters, Partners), Najdimo (About, Imprint, Accessibility), Pravno (Privacy, Cookies, Terms, Cookie settings); language; operator line with the company name and "Podatki o podjetju". Details in `design/system.md` 10.7.

**Mobile app tabs (four):** Map, Inbox, Report (action, opens the Report sheet), Profile. Signed-out users get the same tabs; Inbox and Profile show sign-in prompts, Cookie settings and language stay available.

## Key flows

    Report lost (owner)            P6: pet → [photos → details] → where (P5) → when → circumstances → review → [sign in P16] → confirmation → poster P18 · support P15 (optional)
    Report found (finder)          P7: photo → what (AI confirm from M3) → where (P5) → situation → publish → success with private link → manage page · chat via link
    Sighting                       P9 "Report a sighting" → P7 short flow → linked to the lost report, owner notified
    Browse                         P4 map and list ⇄ filters → P9 detail → contact / sighting / share / poster / abuse · ad slots: feed, detail, reunited, sidebar only (P21)
    Match and confirm              notification → P11 list → review → confirm → chat P12 | reject (hidden for good)
    Reunite                        P12 chat → owner marks home (P14) → reunited screen: story consent, tip (P15), one ad (P21) → report closed
    Alerts                         opt-in sheet or settings (P13, P5 alert area) → nearby alert → listing P9 → sighting or share
    Consent                        first visit → banner (P17) → analytics on or off → change later via Cookie settings
    Account                        gate sheet in any flow → sign in or create (P16) → return to the same step
    Admin ads                      P19 sign in with strong authentication → P20 create, preview in four slots, schedule → statistics and CSV
    Partners                       P22 page → enquiry form → lead in admin and email to the client
    Responsible shelter            P6 confirmation or P7 success → call the shelter for the municipality · or search /zavetisca (P3 T5) → shelter page (P3 T6) → call
    Directory upkeep               P19 shelter directory: yearly reminder after 31 March → edit or CSV dry run → live at once, audit-logged

# Page inventory

IDs are canonical: design slices are `design/pages/P<n>-<slug>.md`, mockups `design/mockups/P<n>-<slug>.html`, copy slices `content/pages/P<n>-<slug>.md`. M1 and M2 scope. Later milestones add pages (shelter portal, moderation queue, Premium, Boost, tags, transparency page, success stories) with their stories.

| ID | Page | Purpose | Key sections | Stories | Mockup | Status |
|---|---|---|---|---|---|---|
| P1 | Web shell | Header, footer, containers, sidebar region, shared states | Header with Report menu, footer, layout variants, loading, empty and error patterns | TASK-11 | design/mockups/P1-web-shell.html | Slice written, mockup pending |
| P2 | Mobile shell | Four tabs, Report sheet, permission primers, deep link landing | Bottom navigation, Report sheet, primers, signed-out states | TASK-12 | design/mockups/P2-mobile-shell.html | Slice written, mockup pending |
| P3 | Public pages | Home and content templates (article, FAQ, legal); shelter directory and shelter pages | Home layout B (photo hero with the lost/found chooser, recent reports with a static map teaser, numbers, how it works, safety, shelters), templates; municipality search, call, hours, municipalities served | TASK-27, TASK-28, TASK-90 | design/mockups/P3-public-pages.html, design/mockups/P3-shelter-pages.html | Slice written, mockups pending |
| P4 | Map and list | Browse reports near you, always with a list alternative | Area pill, markers, sheet and list, filter sheet, web two panes | TASK-31 | design/mockups/P4-map-list.html | Slice written, mockup pending |
| P5 | Location picker | One picker and the fuzzed public area | Search, centre pin, radius, privacy line, fuzzed disc | TASK-15 | design/mockups/P5-location-picker.html | Slice written, mockup pending |
| P6 | Report lost | Owner reports in minutes, one question per screen | Steps, sign-in gate, confirmation with optional support | TASK-29 | design/mockups/P6-report-lost.html | Slice written, mockup pending |
| P7 | Report found or sighted | No account, under a minute, private manage link | Photo, what, where, situation, publish, success link, manage page | TASK-30, TASK-17 | design/mockups/P7-report-found.html | Slice written, mockup pending |
| P8 | Pet profiles | Register pets, chip, photos | List, add and edit sections, detail | TASK-16 | design/mockups/P8-pet-profiles.html | Slice written, mockup pending |
| P9 | Report detail | The listing page and action slots | Photo, status, facts, area, actions, sightings, ad slot, owner view | TASK-18 | design/mockups/P9-report-detail.html | Slice written, mockup pending |
| P10 | Report abuse | Flag scams and bad content in two taps | Reason sheet, block, confirmation | TASK-25 | design/mockups/P10-report-abuse.html | Slice written, mockup pending |
| P11 | Match review | Understand and confirm or reject suggestions | List, comparison, reasons, confirm | TASK-20 | design/mockups/P11-match-review.html | Slice written, mockup pending |
| P12 | Chat | Safe talk without phone numbers | Conversation list, thread, safety banner, composer | TASK-21 | design/mockups/P12-chat.html | Slice written, mockup pending |
| P13 | Alerts, inbox and settings | Notifications, nearby alerts, account | Notification list, alert settings, account screen | TASK-22, TASK-23, TASK-9 | design/mockups/P13-alerts-inbox-settings.html | Slice written, mockup pending |
| P14 | Reunited and lifecycle | Close the loop gracefully | Mark home, reunited screen, close, reminders | TASK-26 | design/mockups/P14-reunited.html | Slice written, mockup pending |
| P15 | Support moments | Voluntary tip and contribution, checkout hand-off | Tip block, contribution row, return states, payments list | TASK-33 | design/mockups/P15-support-moments.html | Slice written, mockup pending |
| P16 | Auth | Sign in, create account, gates | Sign in, create, verify, reset, contextual gate | TASK-9 | design/mockups/P16-auth.html | Slice written, mockup pending |
| P17 | Consent | Equal-weight analytics choice | Banner, customise, settings, re-ask | TASK-13 | design/mockups/P17-consent.html | Slice written, mockup pending |
| P18 | Poster and sharing | A4 poster, share and link card | Preview, download, share rows, poster layout, OG card | TASK-24 | design/mockups/P18-poster-share.html | Slice written, mockup pending |
| P19 | Admin shell | Console frame, tables, access patterns; shelter directory upkeep | Sidebar, top bar, table pattern, strong-auth screens, audit log; directory tables, edit drawer, history, CSV dry run, yearly reminder | TASK-34, TASK-89 | design/mockups/P19-admin-shell.html, design/mockups/P19-shelter-directory.html | Slice written, mockups pending |
| P20 | Admin ads | Create, preview, schedule and measure ads | List, form with validation, statistics, house ads | TASK-37 | design/mockups/P20-admin-ads.html | Slice written, mockup pending |
| P21 | Ad slots and house ads | Labelled calm placements, four slots | Feed, detail, reunited, sidebar, house ads, no-ad routes | TASK-36 | design/mockups/P21-ad-slots.html | Slice written, mockup pending |
| P22 | Partners page | Audience, placements and an enquiry | Hero, live numbers, slot previews, form | TASK-38 | design/mockups/P22-partners.html | Slice written, mockup pending |
| P23 | UI kit gallery | Visual reference for all core components and states | Components by group in light and dark | TASK-8 | design/mockups/P23-ui-kit-gallery.html | Slice written, mockup pending |

# Content strategy

Final copy is owned by the content strategist (one slice per page at `content/pages/P<n>-<slug>.md`, glossary and voice guide first, TASK-2). Fixed by the design:

- **Tone:** calm, warm, hopeful, trustworthy; short sentences; no alarm and no cute talk; no promises of success.
- **Language:** Slovenian is the source, English follows; gender-neutral wording (nouns and imperatives, for example "Prijavi izgubo"); status labels agree with "žival" (Izgubljena, Najdena, Opažena, Spet doma); Slovenian runs 15 to 20 % longer, so no fixed-width controls.
- **Messaging hierarchy per screen:** one question or one heading, one supporting sentence at most, one primary action, quiet secondary actions. Reassurance appears where the worry arises (hidden phone numbers at publish, approximate location at the picker, "never send money first" in chat and on the detail page).
- **Calls to action:** verb plus object ("Prijavi izgubo", "Prijavi najdbo", "Prijavi opažanje"). One label per intent across a page. Report entry points always lead to the same Report choices.
- **Microcopy rules:** errors say what to do next; no blame; empty states are good news when true ("Ni prijav v bližini"); counts use Slovenian plural forms (one, two, few, other); dates and distances in Slovenian formats (14. 10., 1,2 km).
- **Commercial wording:** ads are labelled "Oglas" (EN "Ad"); support is "podpora / prispevek", never "donacija" unless the legal entity qualifies (Q-008); pricing is never invented on the Partners page.
- **Legal and consent copy:** drafts are marked "requires client and legal review"; consent buttons carry equal weight and neutral wording.

# Design workflow

Owner rule, 2026-10-16 (CH-491): every design rework needs a **wireframe confirmed by a person** (the owner or someone they name) before any mockup or implementation task starts.

- The wireframe is low fidelity, or a mock built from our real components when that is no more work. Files live in `docs/design/wireframes/`. An approved component mock also serves as the mockup.
- The approval (who, date, version) is written in the notes of the wireframe task. Mockup and frontend tasks depend on that task and do not start before the approval is there.
- Bug fixes to existing layouts do not need a wireframe.
- First uses: TASK-115.1 (homepage), TASK-116.1 (footer).

# Accessibility

WCAG 2.2 AA throughout, with AAA (7:1) for body text and the primary action because users are outdoors in sunlight.

- Contrast pairs are declared in `design/tokens.json` and enforced by `design/build-tokens.mjs`.
- Visible 3 px focus ring with 2 px offset everywhere. Touch targets 44 px or more, main action 56 px.
- Every field has a visible label above it, errors are text with an icon tied to the field, no placeholder-as-label.
- Status is never colour alone. Map reports are always also available as a list; every map has a text alternative.
- Light and dark modes meet the same ratios. Reduced motion and OS text scaling up to 200 % are supported; pages reflow at 400 % zoom.
- Alt text for every photo (species, colour, one mark); ad images require alt text in admin.
- The consent banner has equal-weight buttons, is focus-managed and labelled (P17).
- Accessibility statement required (European Accessibility Act); audited in M5.

# Responsive behavior

Mobile first. Breakpoints: 640 (sm), 768 (md), 1024 (lg), 1280 (xl), 1536 (2xl). Mobile uses a single column, 20 px gutters, bottom navigation, bottom sheets and one question per flow screen. From `md` the web header shows the full menu pattern as the slice describes; from `lg` the web layout applies (two-column detail, 1120 px content, 48 px gutters, right sidebar region for ads). Pages reflow to 320 px and at 400 % zoom without horizontal scroll. Details in `design/system.md` and each page slice.

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft |
| 0.2 | 2026-10-14 | Direction phase: brand proposal (name Najdimo, tone, logo, palette, type), directions A and B explored, client chose A, decluttering pass applied, direction section and brand and visual language written. |
| 0.3 | 2026-10-14 | Client approved the decluttered direction A. Information architecture, key flows, page inventory P1 to P23 (M1 and M2) with design slices, content strategy rules, accessibility and responsive sections completed from requirements v0.2. |
| 0.4 | 2026-10-15 | FR-044 shelter directory (PRD 0.6, tech re-plan): IA and flows add /zavetisca and the admin directory; P3 gains T5 and T6, P19 the directory screen, P6 and P7 the responsible-shelter call row, P1 footer the Shelters link. Design system v0.5 to v0.7 (P23 and P16 reviews). |
| 0.5 | 2026-10-16 | TASK-90.5: web font cuts for the mobile LCP gate (single heading weight 700, body 400/700, no opsz axis, custom Latin subsets, preload, size-adjusted fallback). Typography bullet and system.md §4 updated. |
| 0.6 | 2026-10-18 | Design workflow section: owner wireframe rule of 2026-10-16 (CH-491). Slice updates: P6 step list (CH-497), P13 switches (CH-502), P18 Facebook row (CH-507). |
| 0.7 | 2026-10-19 | IA footer groups (CH-594) and P3 home layout B (CH-600) in the inventory. Slice updates: system 0.18 (photo framing, footer, unread dot, coat swatches; tokens 0.6.0), P1, P3, P4, P6, P8, P10, P11, P13, P14, P15, P19, P22, P7 (AI suggestions v2 approved). |
