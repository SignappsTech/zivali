---
source: 03§P21
page: P21 Ad slots and house ads
stories: TASK-36 (FR-029, FR-030)
platforms: web, mobile
version: 1.1
mockup: docs/design/mockups/P21-ad-slots.html
copy: docs/content/pages/P21-ad-slots.md
---

# P21 Ad slots and house ads

## Purpose

Labelled, calm sponsor placements that earn revenue without eroding trust in a stressful product. Four fixed slots, one creative format, house ads for every empty slot, and strict rules about where ads never appear.

## Rules (enforced by API and test, not only by design)

- **No ad** on report lost, report found, sign-in and auth, chat, payment, consent settings, admin, and the Partners page (P22). The shell's Flow variant has no sidebar slot (P1).
- Every ad shows the label **"Oglas"** (EN "Ad") in 13 px bold `muted-foreground`, top-left of the unit, always visible and in the accessible name.
- Never the first item in a feed, never adjacent to another ad, at most one ad per screen on mobile and per page except the web sidebar plus one inline.
- Links use `rel="sponsored noopener"`; targets 44 px or more; focus ring; alt text on the image; silent collapse when no ad or when blocked (the space collapses without a gap, the reserved size avoids layout shift while loading).
- Calm styling: `muted` or `card` surface (never a colour fill), radius 20, no border, no shadow, no animation, no badge, no countdown.

## Creative format

One image format: **4:3, minimum 1200 by 900 px**, JPG or PNG under 500 KB. Slots crop it with `object-fit: cover` as below. The ad also has a title (max 60 characters), text (max 120) and a link.

| Slot | Where | Layout | Image box |
|---|---|---|---|
| Feed | map list, every N-th row (default 8) | a row like a pet row on `muted` surface: label above, image 64 by 64 (radius 20), title (bold), one text line, chevron | 1:1 crop |
| Detail | report detail, once, below the sightings (P9) | a unit on `muted` surface: label, image 96 by 96 left, title, two text lines, text button "Learn more" | 1:1 crop |
| Reunited | reunited screen below the tip (P14), rendered only once the tip ask is skipped or paid, or when there is no ask (see below) | unit like Detail, full width; stacked on mobile: label, 96 px image beside the text, text button "Več o tem" | 1:1 crop |
| Sidebar | web, from `lg`, right column, sticky (P1) | unit 320 wide: label, image 4:3 on top, title, text, text button | 4:3 |

**Vet Partner placement:** a featured "nearest vet" unit in the Detail slot (and optionally the Feed slot) for a verified vet partner: same layout as Detail with the partner name, area and a text button "Call or open map"; always labelled "Oglas"; the same calm rules, never in the no-ad routes. Admin previews it in P20.

Reserved sizes (measured in the P21 mockup; smaller values would shift the layout): Feed 88 px row; Detail and Reunited 200 px on mobile and 176 px on web (label, 2-line title, 2 text lines, 44 px button); Sidebar 320 by 452 px (4:3 image 288 by 216, title, 3 text lines, 44 px button).

**Reunited and the support ask (P15).** The Reunited ad stays in its slot below the tip but is not rendered, not even requested, while the tip ask is shown. It appears once the ask is skipped or paid, or when there is no ask (signed out). Web and mobile follow the same rule; the M3 frame shows the ad after the ask is closed.

**Reunited screen copy:** the ad label "Oglas" and the default text button "Več o tem" come from the P21 content slice; the P14 copy does not repeat them.

## House ads (fill every empty slot, no tracking pixels)

| House ad | Message | Link |
|---|---|---|
| Support | keep the service free | support page (M4: transparency) or the contribution flow |
| Partner with us | advertise your business | Partners page (P22) |
| Adopt | adopt an animal from a shelter | the adoption information page (content decides the target; never /za-zavetisca) |

Same layout as sponsor ads, labelled "Oglas" as well (honest), but with a quiet marker "House" only in admin previews. Each has an illustration asset (see image tasks) of the same 4:3 format.

## Targeting display

None visible to users. Admin previews show targeting (P20).

## States

Loading (reserved box, no skeleton shimmer), loaded, house fallback, ad-blocked or failed (collapsed), image missing (text-only unit), long text truncation (two lines with ellipsis), keyboard focus, dark mode.

## Accessibility

Unit is a link with accessible name "Ad: title"; image alt from the admin field; the "Oglas" label is text; contrast per tokens; no auto-playing media; focus ring visible; not trapped in the tab order before main content; screen readers meet the ad after the content it relates to (inline units) or as a complementary landmark (sidebar).

## Assets

| File | Brief |
|---|---|
| `assets/house-ad-support.png` | House ad illustration, 4:3, support the service. See image task. |
| `assets/house-ad-partner.png` | House ad illustration, 4:3, local businesses. See image task. |
| `assets/house-ad-adopt.png` | House ad illustration, 4:3, adopt from a shelter. See image task. |

## Mockup scope (`P21-ad-slots.html`)

1. Each slot in context at 390 and 1200 px: Feed row between pet rows (with the "never first, never adjacent" rule shown), Detail, Reunited, Sidebar.
2. House ads (three) in each slot format.
3. States: loading reserved box, collapsed, text-only, long text, focus.
4. A routes table frame listing where ads never appear.
5. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-238, CH-247, CH-266, CH-385: reserved sizes 200/176 and 320x452, Reunited stacked on mobile, ad hidden while the tip ask is shown |
