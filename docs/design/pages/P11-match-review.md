---
source: 03§P11
page: P11 Match review
stories: TASK-20 (FR-008)
platforms: web, mobile
version: 1.1
mockup: docs/design/mockups/P11-match-review.html
copy: docs/content/pages/P11-match-review.md
---

# P11 Match review

## Purpose

The owner sees suggested matches between their lost report and found or sighted reports, understands why, and confirms or rejects. Confirming opens a chat. It is the emotional peak of the product, so it is plain, honest and calm: no percentages, no hype.

## Entry points

Push or inbox notification "Possible match", the note on the owner's detail page (P9), the Inbox tab, and the owner's "My reports" row.

## Matches list (per lost report)

Header: back, pet name and photo (small), count in one line. Rows (no cards): candidate photo 64, status word (Found or Sighted), area and distance, time gap ("found 3 hours after"), and a strength word with a three-step indicator (Possible, Likely, Very likely; shown as a word and three small bars, never a number). A chip match row shows the plain line "Chip number matches" with a shield icon above the others and sorts first. Pull to refresh. Rejected matches never reappear.

Empty state: spot illustration, h3 "No matches yet", sentence that we keep looking and will notify, text button "Share the search".

## Review screen

1. Flow-style top bar (back, "Match" title, overflow with Report abuse).
2. **Comparison.** Mobile: two photos stacked in one 4:3 frame with a toggle (My pet / Candidate) and swipe; thumbnails below for more photos. Web `lg`: two photos side by side.
3. **Strength** line: word and bars, then **Why we think so** as a plain list with check icons: same chip, distance in km, time gap, size, colours (each line one short sentence; contents from the match reasons).
4. **Facts table**: rows (Species, Size, Colours, Sex, Found where (area), When) with my pet's value left and the candidate's right; matching rows carry a check icon and the word "Matches", differing rows "Differs". Text, not colour.
5. **Caveat note** when the report is a sighting only ("The animal may be elsewhere") or when the match is chip-only without a photo.
6. Actions: primary `lg` "This is my animal"; text button "Not my animal". Neither shows contact data. Rejecting asks one confirmation: "Hide this match for good?".

**As built on mobile (TASK-20.4, CH-332).** The reject dialog (M5) adds one optional multiline "Razlog (neobvezno)" field under the sentence. The overflow "Prijavi zlorabo" is left out until the P10 abuse sheet (TASK-25.4) exists, so the bar is back plus a centred title. No pinch to zoom: the toggle, a horizontal swipe and the thumbnails switch photos. The empty state has no illustration until `assets/empty-no-reports.png` exists. The "Kraj" row compares the reverse-geocoded names of the two fuzzed areas.

## After confirming

Chat opens (P12) with a system message "Match confirmed" and the safety banner. The match is marked Confirmed in the list; both sides are notified. If several matches are confirmed, each has its own chat.

## Shelter and multiple owners

When a found report has several claiming owners the finder sees them as separate chats (no list on this page). A moderator can intervene via abuse reports.

## States

| State | Behaviour |
|---|---|
| Loading | row and comparison skeletons |
| Chip match | pinned top row and a calm banner, no celebration animation |
| Low strength | shown with "Possible" wording and no emphasis |
| Match withdrawn | row disappears, note on the list "A match was removed" |
| Offline | cached list read-only, actions disabled with explanation |
| Already confirmed | review screen shows "Match confirmed" and a link to the chat |

## Responsive

`lg`: list left (360 px), review right. Below: separate screens. Photos are large; pinch to zoom.

## Accessibility

Strength is text plus bars with an accessible label; comparison table is a real table with headers; the photo toggle has labelled buttons; both actions are reachable without gestures; confirmations use dialogs with focus management; no information only by colour.

## Assets

| File | Brief |
|---|---|
| `assets/empty-no-reports.png` | Reused for "No matches yet" (shared empty illustration). |

## Mockup scope (`P11-match-review.html`)

1. Mobile: list (with a chip match and others), empty, review (photo toggle), review with sighting caveat, reject confirmation, already confirmed, loading.
2. Web 1200 px: list and review side by side.
3. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-332: mobile review screen as built |
