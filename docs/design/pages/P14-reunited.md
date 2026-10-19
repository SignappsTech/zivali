---
source: 03§P14
page: P14 Reunited and report lifecycle
stories: TASK-26 (FR-012)
platforms: web, mobile
version: 1.2
mockup: docs/design/mockups/P14-reunited.html
copy: docs/content/pages/P14-reunited.md
---

# P14 Reunited and lifecycle

## Purpose

Close the loop gracefully: mark an animal home, close or extend a search, and keep the map trustworthy. The reunited screen is the warmest moment in the product; it stays calm, honest and short. It holds two optional slots, the thank-you tip (P15) and one ad (P21), and a story consent.

## Mark reunited (owner)

Started from the owner view of the detail page (P9, primary "Animal is home again"), a notification, or a reminder. There is no "Which one?" step (CH-342, 2026-10-19): C4 `mark_reunited` takes no counterpart, so the choice would change nothing.

1. **Confirm** (bottom sheet or dialog): h2, one sentence of what happens (listing closed, alerts and boosts stop), primary `lg` "Yes, it is home", text button "Not yet".

## Reunited screen

Order top to bottom, single column, large spacing:

1. Spot illustration at the top (`assets/reunited-celebration.png`: sun, hills and a trail, no faces). The pet photo sits below it as its own rounded 4:3 frame; the two never overlap.
2. h1 "Home again" with the pet name; one warm sentence of thanks.
3. **Story consent:** a switch row, off by default, explaining that the story may be shown publicly after moderation and can be withdrawn at any time (A-023).
4. **Support moment** (P15): h3, three amount pills, custom amount, and two equal buttons, Pay and Skip, the same size.
5. **Ad slot** (P21, labelled "Oglas"), once, below the support moment. State rule: while the tip ask is shown the ad is not rendered and not requested; it appears once the ask is skipped or paid, or at once when there is no ask (signed out). Mobile reads `useSupportTipState(code)`; web the same state.
6. Primary `lg` "Done" goes to the map. Text button: Share the good news.

The report page then shows the Reunited variant (P9). Both sides of a match see a Reunited note; the finder's version is shorter and has no tip.

## Close without reunion

Owner menu "Close search" opens a sheet: reason as choice rows (Home again another way, No longer searching, Posted by mistake, Other), primary `lg` "Close search", text "Keep open". No note field (CH-342, CH-446): the C4 close transition takes no note and typed text must never be dropped. **A finder who manages a report** (`manager_role` not `owner`; web "Več možnosti", the /m close row, mobile) gets a neutral confirm dialog without reason rows, sent as `other` (CH-445): the owner reasons do not fit a found or sighted report, and "returned to owner" has its own action below. Closing cancels alerts, boosts and pending reminders. A closed report shows "Reopen" for 7 days.

## Reminders and expiry

| Moment | Surface |
|---|---|
| Lost, day 7, 14, 30 | notification and email: a plain question with primary "Keep searching" and a text button "Close search" |
| Lost, day 90 | auto-close with one-tap extension on the notification and on the detail page |
| Found or sighted, 30 days without update | note on the manage page and email: "Keep for 30 more days" |
| Shelter intakes | exempt (M3) |

## Finder marks "returned" (manage page, P7)

Dialog confirm, then a short thank-you screen (no tip, no ad): illustration is not used, a line of thanks and a text button "Create an account to keep your reports".

## Disagreement

If the owner disagrees with a finder's "returned", the owner sees a note on the detail page with a primary "Reopen" within 7 days.

## States

Loading on confirm (button spinner), network error (note, retry), already closed, reopened (toast).

## Responsive and accessibility

Illustration decorative (empty alt); the reunited heading takes focus on arrival; amount pills and Pay/Skip are reachable in order; consent switch has a visible label; no flashing or confetti; reduced motion gets a static layout.

## Assets

| File | Brief |
|---|---|
| `assets/reunited-celebration.png` | Warm flat illustration of daylight returning: sun, soft hills in lagoon and mist tones, a dotted trail to a simple house shape. See image task. |

## Mockup scope (`P14-reunited.html`)

1. Mobile: which-one sheet, confirm sheet, reunited screen (with tip and ad slots, tip expanded), close-without-reunion sheet, reminder card, finder returned dialog and thank-you.
2. Web: reunited screen at 1200 px, close dialog, manage page notices.
3. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-385: ad appears only after the tip ask is skipped or paid |
| 1.2 | 2026-10-19 | CH-342, CH-445, CH-446: no "Which one?" step, no close note, finders close with a neutral confirm |
