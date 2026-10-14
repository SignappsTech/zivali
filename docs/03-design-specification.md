---
doc_id: DOC-03
title: Design Specification
version: 0.2
status: Draft
date: 2026-10-14
owner: Design Lead
audience: Client, team
approvals:
  - Client | | |
  - Design Lead | | |
---

<!-- Owner: design-lead. Master design doc. Implementers never read this: they read docs/design/system.md and docs/design/pages/P*.md slices. -->

# Design directions

Lean mode: one direction with two variations, explored as style tiles and key screens in `design/directions/` (overview at `design/directions/index.html`). The client chose variation A on 2026-10-14, after a second review asked for a calmer, cleaner pass (one primary action, one question per screen, fewer outlines, fewer badges, fewer map markers). The chosen direction below includes that pass.

| Direction | Idea | Mood | Chosen |
|---|---|---|---|
| A Lagoon | Cool teal on mist, soft pill shapes, flat tonal surfaces, sun yellow as the only warm accent | Calm, warm, hopeful, held | **Yes** (2026-10-14) |
| B Ink and Sun | Poster-clear ink type, one sun-yellow action colour, crisp corners | Clear, confident, urgent without panic | No (explored, dropped) |

Direction name: **Warm harbour**, realised as Lagoon. Mockups: `design/directions/A.html` (style tile, three mobile screens, one web page, light and dark, side by side). Tokens: `design/tokens.json`. System slice: `design/system.md`.

# Brand and visual language

- **Name:** **Najdimo** (recommended, not final: Q-001). "Let's find (them)." Tagline: "Spet doma." / "Home again." Alternatives considered: Pot domov, Spet doma, Doma, Sled (reasons in `design/directions/index.html`). Domain and trademark check still needed; najdimo.si, .com, .app and .eu do not resolve today, which is not a registry check.
- **Personality:** calm, warm, hopeful, trustworthy. We speak like a kind neighbour who knows what to do. We avoid alarm (capitals, red banners, many exclamation marks), cute talk and paw puns, emoji in the interface, guilt and pity, and promises we cannot keep.
- **Logo:** a map pin with two soft ears, the hole holding a sun-yellow dot ("the eye of the search"). Works at 16 px and in one colour plus the dot. Files in `design/brand/` (`najdimo-mark.svg`, `najdimo-mark-light.svg`, `najdimo-app-icon.svg`). The wordmark is live text in Bricolage Grotesque for now and will be outlined in the final logo pack.
- **Color:** lagoon teal (`#145360` primary), mist neutrals (`#E8EEEE` canvas, `#FBFDFD` card), night neutrals for dark mode, sun yellow (`#F7B32B`) as the single warm accent. Status colours: coral (lost), leaf green (found), blue (sighted), sun (reunited). Premium plum, verified teal. 7:1 contrast for body text and the primary action, 4.5:1 minimum elsewhere, verified by the token build. Roles and values in `design/system.md`.
- **Typography:** Bricolage Grotesque (headings) and Atkinson Hyperlegible Next (text), both Google Fonts with full Slovenian diacritics (Č, Š, Ž verified). Body 16 px minimum, meta 14 px, chip numbers tabular with a slashed zero.
- **Imagery:** honest owner-snapshot photography, rounded frames, no text or pills on photos. Illustration is flat geometry in brand colours, used only for empty states and onboarding. Generated images are never used as a stand-in for a real report. Brief format for image tasks is in `design/system.md`.
- **Iconography and motion:** Phosphor Icons (regular, bold, fill), status always icon plus word plus colour. Motion only for feedback and state change, `transform` and `opacity` only, reduced motion honoured.
- **Maps:** OpenFreeMap tiles in a calm style (land, water, parks, main roads, area names). Lost pets appear as a translucent area with the pet photo, never an exact pin. At most three marker styles.
- **Surface rules (the "clean" pass):** surfaces separate by tone and space, not by outline. No card borders, no shadows except on floating controls and sheets, no card inside a card, one primary button per view, fields are a label and a line, bottom navigation has at most four items and no count badges.

# Information architecture

To be completed in planning, after the product requirements (DOC-02) are final. Working shape from the brief:

- Mobile: bottom navigation with four items (Zemljevid, Opozorila, Prijavi, Profil). "Prijavi" opens a choice of lost, found or sighted report.
- Web: header with Zemljevid, Izgubljene, Najdene, Kako deluje; "Prijava" and "Prijavi" on the right. Public lost and found pages are indexable (SEO). Shelter portal and admin use the sidebar pattern.

# Page inventory

To be completed in planning (page list, purposes and mockup paths come from the requirements). Direction mockups already cover: home with map and nearby reports, the "Prijavi" choices, one question of the found-report flow (AI confirmation), and the public lost-pet page.

| ID | Page | Purpose | Key sections | Mockup | Status |
|---|---|---|---|---|---|
| | | | | design/directions/A.html (direction screens only) | Direction approved, page mockups pending |

# Content strategy

To be completed with the content strategist. Direction rules already fixed: Slovenian is the default language, English second; copy is gender-neutral (nouns and imperatives); status labels agree with the noun "žival" ("Izgubljena", "Najdena", "Opažena", "Spet doma"); one clear action per screen; reassurance about privacy at the moment it matters (phone number stays hidden); no promises of success; text lengths grow 15 to 20 % in Slovenian, so no fixed-width controls.

# Accessibility

WCAG 2.2 AA throughout, with AAA (7:1) for body text and the primary action because users are outdoors in sunlight.

- Contrast pairs are declared in `design/tokens.json` and enforced by `design/build-tokens.mjs`.
- Visible 3 px focus ring with 2 px offset everywhere. Touch targets 44 px or more, main action 56 px.
- Every field has a visible label above it, errors are text with an icon tied to the field, no placeholder-as-label.
- Status is never colour alone. Map reports are always also available as a list.
- Light and dark modes meet the same ratios. Reduced motion and OS text scaling up to 200 % are supported.
- Alt text for every photo (species, colour, one mark). Accessibility statement required (European Accessibility Act).

# Responsive behavior

Mobile first. Breakpoints: 640 (sm), 768 (md), 1024 (lg), 1280 (xl), 1536 (2xl). Mobile uses a single column, 20 px gutters, bottom navigation, bottom sheets and one question per flow screen. From `md` the navigation moves to a top bar and tiles go two-column. From `lg` the web layout applies (two-column detail, 1120 px content, 48 px gutters). Pages reflow to 320 px and at 400 % zoom without horizontal scroll. Details in `design/system.md`.

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft |
| 0.2 | 2026-10-14 | Direction phase: brand proposal (name Najdimo, tone, logo, palette, type), directions A and B explored, client chose A, decluttering pass applied, direction section and brand and visual language written. IA, page inventory and content strategy left for planning. |
