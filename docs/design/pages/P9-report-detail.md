---
source: 03§P9
page: P9 Report detail (lost, found, sighted)
stories: TASK-18 (FR-007, FR-004, FR-011, FR-012)
platforms: web, mobile
version: 1.2
mockup: docs/design/mockups/P9-report-detail.html
copy: docs/content/pages/P9-report-detail.md
---

# P9 Report detail

## Purpose

The page for one listing, reached from the map, a link, a WhatsApp preview or a poster QR. Every later feature acts from here (contact, share, poster, sighting, abuse report, owner actions, ads), so the layout has named slots. It is also the SEO and link-preview surface.

## Web layout (Content variant, `lg`: two columns, photo 7 / info 5)

Left column: back text button, large photo (radius 32, 4:3), up to four small thumbnails (88 by 72, radius 16, inactive at 55 % opacity), "About" h2 with the circumstances in body text (max 58 ch), sightings and map sections below (see order).

Right column (no card, plain on `background`, sticky from `lg`):

1. Status word with icon (large, `st-lg`) and "missing since" date. A tonal pill is **not** used here.
2. h1 name (display 64), species and breed line (20, muted).
3. Facts, two columns: colour, size, collar, chip ("Chip on file", never the number), sex and age if known.
4. Area line: map-pin-area icon, bold area name, one sentence that the area is approximate.
5. **Action slot A (type dependent):**
   - Lost, visitor or other user: primary `lg` "Report a sighting"; text button "Message the owner" (Contact).
   - Found: primary `lg` "This is my animal" (starts contact, P12); text button "Report a sighting".
   - Sighted: primary `lg` "Message the person who saw it"; text button "This is my animal".
   - Own report: see "Owner view".
6. Reward line as a quiet, display-only sentence with the gift icon, only when the owner set one. No payment through the app and no escrow (brief v1.1): the line never mentions Stripe or holding money, and the safety note below covers "never pay before the animal is back".
7. Safety `note` (one, shield icon): never send money first.
8. **Slot B:** share and poster as one ghost button "Share or print poster" (menu: Share link, WhatsApp, Facebook, Poster with QR code) (P18).
9. **Slot C:** report abuse as a quiet text link in an overflow menu ("More": Report abuse, Copy link).

Below the columns, in order: **Where it was seen** (map left with area disc, sightings list right, plain rows with time and text), **Ad slot** (labelled "Oglas", once, P21, only on this page type), **Near here** (three pet tiles, no container). Structured data and Open Graph per FR-007.

**Web sidebar (TASK-36.5, CH-457).** The 320 px P21 sidebar (landmark "Oglasi", sticky from `lg`) does not sit beside the photo/info grid, which has no room for it. It sits beside the sections below the columns ("Where it was seen", the detail ad, "Near here"), which then share the remaining `1fr` column. For a closed or reunited report there is no "Where it was seen" and the detail unit would be adjacent to the sidebar (P21: never adjacent), so the sidebar shows for an active report only.

## Mobile layout

Photo carousel full-bleed under the status bar (swipe, page position shown as small text below the photo, not on it), floating round icon buttons for back and share over the photo with a soft scrim circle. Then status word, h1, facts, area line and a map thumbnail (opens a full map sheet), "About", sightings, ad slot, nearby tiles. **Sticky bottom action bar** (`card`, 20 px padding): primary `lg` action from slot A and a text button for the secondary; overflow icon opens More. Bottom navigation hides on this screen.

## Owner view (the signed-in owner or the manage-link holder)

The owner of a lost report also sees the **responsible shelter** row (as in P6): name for the municipality, the number on web, and a call action (FR-044). The row is the shared `shelter_row` pattern from P6 §Flow, including the unconfirmed states ("Morda pristojno zavetišče" plus muted "Ni potrjeno", or up to 2 nearest shelters).

Replaces slot A with: primary `lg` "Animal is home again" (P14), text buttons "Edit", "Poster", and an overflow with "Close search", "Boost" (M4, hidden until then). A calm `note` appears when there are new match suggestions ("2 possible matches", link to P11) and when the report is held or hidden. The owner also sees their exact pin with "visible only to you" on the map.

## Status variants

| Status | Treatment |
|---|---|
| Open (lost, found, sighted) | as above |
| Matched | owner sees the matches note; public view unchanged |
| Reunited | status word "Home again" with the heart; calm line of thanks; actions removed except share; photo stays |
| Closed | muted status word "Closed", actions removed, report keeps its page for 30 days then 410 |
| Held or hidden | owner sees why (note); everyone else gets the 410 page |
| Removed or expired | 410 page from P1 with a link to the map; not indexable |
| Anonymous finder's report | status and facts the same; shows "Reported by a finder" instead of a name |
| Shelter report (M3) | A `card` (web; plain block on mobile) with the page's one tonal pill `verified` "Verified shelter", the shelter name and place, "in the shelter since {date}", and a call action: on web the phone number in `tabular-nums` next to a `secondary` call button (desktop cannot tap to call), on mobile the call is the text button in the action bar. No countdown bar or days-left count: the holding period sentence appears only when the `content.legal_timings` flag is on (Q-006, the app never asserts legal duties). "Report a sighting" is hidden while the animal is in a shelter. |

## States

Loading skeleton (photo block, title, facts; **mobile only**, CH-661: web has none, the report is in the first HTML and client navigations keep the previous page until it arrives), image failure (placeholder tile), map offline (text-only area line), network error note with retry, contact requires sign-in (P16 gate sheet with verified-email prompt for unverified users).

**Contact gate after sign-in (CH-472).** On mobile the screen stays mounted under the auth screens, so contact continues once signed in (TASK-21.6). On web the P16 gate leaves the page and returns to it through `next`; the visitor presses the contact button again. The mockup note "the conversation opens" describes mobile; resuming contact from a `next` marker on web would be a follow-up task.

## Responsive

`lg` two columns; below `lg` single column with the info before "About". Sticky action bar only on mobile and tablet. Thumbnails become a swipe carousel on mobile.

## Accessibility

Photo carousel is keyboard operable with named controls; every photo has alt text from the content slice rules (species, colour, one mark); status is icon plus word; the map has the text alternative "Approximate area around Šiška, about 500 m"; sticky bar does not cover focused content; one h1; More menu is a labelled menu button.

## Assets

None.

## Mockup scope (`P9-report-detail.html`)

1. Web 1200 px: lost (visitor), found (visitor), sighted, own lost report, reunited, closed, 410, loading.
2. Mobile: lost (visitor with sticky bar), owner view with matches note, found, map sheet, More menu, gate sheet.
3. 768 px tablet of the lost page.
4. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-457, CH-472: web ad sidebar placement, contact after the sign-in gate |
| 1.2 | 2026-10-19 | CH-661: loading skeleton is mobile only. |
