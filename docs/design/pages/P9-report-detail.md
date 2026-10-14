---
source: 03§P9
page: P9 Report detail (lost, found, sighted)
stories: TASK-18 (FR-007, FR-004, FR-011, FR-012)
platforms: web, mobile
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
6. Reward line (M4) as a quiet sentence with the gift icon, only when set.
7. Safety `note` (one, shield icon): never send money first.
8. **Slot B:** share and poster as one ghost button "Share or print poster" (menu: Share link, WhatsApp, Facebook, Poster with QR code) (P18).
9. **Slot C:** report abuse as a quiet text link in an overflow menu ("More": Report abuse, Copy link).

Below the columns, in order: **Where it was seen** (map left with area disc, sightings list right, plain rows with time and text), **Ad slot** (labelled "Oglas", once, P21, only on this page type), **Near here** (three pet tiles, no container). Structured data and Open Graph per FR-007.

## Mobile layout

Photo carousel full-bleed under the status bar (swipe, page position shown as small text below the photo, not on it), floating round icon buttons for back and share over the photo with a soft scrim circle. Then status word, h1, facts, area line and a map thumbnail (opens a full map sheet), "About", sightings, ad slot, nearby tiles. **Sticky bottom action bar** (`card`, 20 px padding): primary `lg` action from slot A and a text button for the secondary; overflow icon opens More. Bottom navigation hides on this screen.

## Owner view (the signed-in owner or the manage-link holder)

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
| Shelter report (M3) | `verified` pill "Verified shelter" with the shelter name |

## States

Loading skeleton (photo block, title, facts), image failure (placeholder tile), map offline (text-only area line), network error note with retry, contact requires sign-in (P16 gate sheet with verified-email prompt for unverified users).

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
