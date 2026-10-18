---
source: 03§P18
page: P18 Poster and sharing
stories: TASK-24 (FR-011)
platforms: web, mobile
version: 1.1
mockup: docs/design/mockups/P18-poster-share.html
copy: docs/content/pages/P18-poster-share.md
---

# P18 Poster and sharing

## Purpose

Give an owner a printable A4 poster and one-tap sharing so the search reaches neighbours and Facebook groups. The poster works in greyscale at distance and never shows a phone number, exact location or where a found animal is kept.

## Screen: "Poster and sharing" (from the detail page or confirmation)

1. Top bar (back, title).
2. **Poster preview:** the A4 page at the top (portrait, `card` frame with the page on `background`, radius 12 corners, no border), zoomable.
3. Language choice as two toggle pills (Slovenian, English) above the preview.
4. Primary `lg` "Download PDF" (generation under 5 s, progress state). Text button "Print".
5. **Share:** a list of rows (WhatsApp, Facebook, Copy link, More...) or the native share sheet on mobile; a short preview of the link card (photo, title) below.
6. Quiet note: poster contains a QR code that opens the listing.

### Facebook row (as built, TASK-114.9)

- **Web:** the row is always the sharer link (opens a new tab) and copies the post text in the same tap. For the owner of an open lost report the kit dialog now opens behind the sharer instead of replacing it. If the clipboard is refused, the text is shown for copying: in an "Objava za Facebook" dialog with "Kopiraj besedilo" (visitors), or inside the kit (owner).
- **Mobile:** the row copies the post, then opens the sharer; if the clipboard is refused the system share sheet opens with the text.

## Poster layout (A4 portrait, 210 by 297 mm, print safe margin 12 mm)

| Zone | Content | Size and rule |
|---|---|---|
| Top band | the word for "missing" and the species ("Missing dog"), SL or EN | 64 pt bold display (about 26 mm), black on white; status by word, not colour |
| Photo | best photo, 4:3, left of a CTA and QR column | 114 mm wide (about 86 mm tall), high contrast crop on the face |
| Name | pet name | 72 pt bold display |
| Facts | colour, size, collar, special marks (3 to 5 lines) | 22 pt, regular, black |
| Where and when | area name, approximate (never an address), date | 22 pt |
| Reward (optional, lost posters with a reward only) | amount large (28 pt bold, `tabular-nums`), note small (14 pt, one line, max 80 chars), then the `poster.safety_reward` line (12 pt) | Between Where and when and the footer. Omitted entirely when no reward. Must not shrink the photo (still 114 mm wide) or the QR (still at least 55 mm); trim the facts to 3 lines before shrinking either. |
| Call to action | "If you see this animal, scan the code" | 26 pt bold, in the right column above the QR (186 mm text width = 114 mm photo + 8 mm gap + 64 mm column) |
| QR | large code (56 mm) with the short link printed below it, right column beside the photo | quiet zone 4 modules, `qr-foreground` on `qr` (black on white), must scan in greyscale |

Height budget inside the 273 mm safe height: band 26 + photo row about 92 (CTA, QR and link) + name 28 + facts up to 36 + where and when 18 + reward 22 + footer 8 + gaps 20 = about 250 mm with a reward, 228 mm without. Nothing may overflow the A4 page; verify with the print render.
| Footer | logo mark and wordmark, small | greyscale-safe, 12 pt |

No phone number, no email, no chip number, no exact address. The poster uses only the print tokens (system §3.2 Print tokens: paper, ink, one mid-grey); brand colour appears in screen previews only. Closed or reunited reports render "Home again" instead of the appeal (or the download is unavailable).

## Open Graph and share card

1200 by 630: photo left (square crop, radius 24), right side species and name in display type, short line of the area (approximate), logo at the bottom; no exact or holding location. Localised text. Used by WhatsApp, Facebook and the web app's metadata.

## States

| State | Behaviour |
|---|---|
| Generating | primary shows a spinner and "Preparing", skeleton preview |
| Ready | primary becomes "Download PDF", file name shown |
| Failure | note with retry |
| No good photo | blocks download with a `note` and primary "Add a photo" |
| Report closed or reunited | shows the "Home again" variant or an unavailable note |
| Share unsupported (web) | falls back to Copy link |
| Copied | toast "Link copied" |

## Responsive and accessibility

On mobile the preview is a scrollable thumbnail with "View full size". The preview has an `alt` summarising the poster; the PDF is tagged with the title and language; QR code has the link printed beside it as text; buttons have accessible names; the share rows are a list of buttons.

## Assets

None (the poster uses the report photo; logo mark from `docs/design/brand/`).

## Mockup scope (`P18-poster-share.html`)

1. Mobile and web: the screen with preview, language pills, share rows; generating, failure and no-photo states.
2. The A4 poster (SL and EN, lost dog example) as print HTML with `@media print` rules and its greyscale rendering.
3. The Open Graph card at 1200 by 630.
4. Light and dark for the screen (the poster itself is always black on white).

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | Facebook row: always the sharer link, copies the text in the same tap, clipboard-refused fallback (CH-507, TASK-114.9). |
