---
source: 03§P7
page: P7 Report found or sighted (no account) and manage page
stories: TASK-30, TASK-17 (FR-006, FR-003, FR-004)
platforms: web, mobile
version: 1.2
mockup: docs/design/mockups/P7-report-found.html
copy: docs/content/pages/P7-report-found.md
---

# P7 Report found or sighted

## Purpose

A finder or passer-by reports an animal in under a minute, without an account, from a phone. Median under 60 seconds (G-3), so the flow is short and every screen has one question. No ad, no payment prompt.

## Flow (Flow variant: flow top bar with back, five step bars, close)

| Step | Question (h1) | Control |
|---|---|---|
| 1 Photo | Take a photo | large camera button (primary `lg`), "Choose from gallery" text button, thumbnail strip up to 5 (only one required); camera primer from P2 |
| 2 What | Is this right? / What did you find? | **With AI (M3):** photo, a plain sentence of the suggestion ("Medium dog, brown and white") with the sparkle note, primary "Yes, continue", text button "Edit details". **Without AI (M2 and fallback):** choice rows Dog / Cat, then optional size and colour pills. |
| 3 Where | Where did you find it? | location row with a small map thumbnail and the address, auto from GPS or photo EXIF, text button "Change" opens P5 (found: no radius). A note says the place where the animal is kept is never asked. |
| 4 Situation | Do you have the animal? | two choice rows: "I have the animal with me" and "I only saw it". Optional note (line textarea) and optional email ("Send me my private link"). |
| 5 Send | Publish | summary of one line each and primary `lg` "Publish report"; privacy line (phone numbers stay hidden, the owner writes to you in the app) |

Captcha runs invisibly; if it needs a challenge it appears as a sheet. Rate limit (5 per hour, 20 per day) shows a friendly note on Send.

### Sighted from a listing

On a lost report, "Report a sighting" (P9) starts a shorter flow: Where, When (Just now, Today, Another time), optional photo, note, Send. The sighting is linked to the lost report and the owner is notified.

## Success screen

h1 confirmation, one sentence that the report is live, a **private link block**: the long link in a read-only line with a "Copy link" button and, if an email was given, a note it was sent. Primary "Open my report", text buttons "Create an account to keep it" (claim, P16), "Share". No tip, no ad.

**Responsible shelter** (FR-044, R-006.1), after submit only, under the link block, no card: a `phone` icon row with one sentence (report the find to the shelter responsible for {municipality}), the shelter name in bold, the number (`tabular-nums`), a `secondary` "Pokliči" (`tel:`) and the line that any vet or shelter can read the chip. Legal timing only when the `content.legal_timings` flag is on. Unconfirmed shelter or unknown municipality: use the `shelter_row` states defined in P6 §Flow ("Morda pristojno zavetišče" with a muted "Ni potrjeno", or up to 2 nearest shelters, or the directory `note`), never a guessed number. The same row appears on the "sent" screen of a queued offline report (FR-042) and works from the cached directory. Shown when the finder has the animal; whether the "I only saw it" path shows it is the content slice's call.

## Manage page (private link, any device, no sign-in)

Standard top bar and a content column. Sections in order: status word and photo; the report facts; a quiet note that the link is private; **Messages**: the report's conversations as P12 rows that open each thread (web `/nabiralnik/[id]`, mobile likewise), with no separate "Odpri sporočila" button (`report_found.manage_open_messages` is unused on both platforms, CH-441); a count only when there are unread messages; actions as text rows: Edit, Close report, "Animal returned to owner" (mark returned), Delete my data (confirm dialog, R-034.4). Primary on this page: none. Expiry notice at day 25 with "Keep for 30 more days". Lost link: nothing can be recovered unless an email was given (the page for resend is a neutral request form with the generic response).

## States

| State | Behaviour |
|---|---|
| Offline (M3 Should) | "Saved, will send when you are online" note; queue visible on the Map tab |
| Camera denied | gallery path; note |
| Photo duplicate | friendly note, the existing report is offered |
| Captcha failed or provider outage | calm retry note; fail-open or closed is decided in the TDD, the design shows the retry |
| Rate limited | friendly note with when to try again |
| Success | as above |
| Report hidden by moderation | manage page note "Under review" |
| Closed or expired | read-only with "Reopen" within 7 days |

## Web differences

Centred 560 px column; camera button becomes a file input and drag area; GPS via the browser prompt; the success screen shows the link block with a QR code to open on a phone.

## Responsive and accessibility

Large controls, 56 px primary, bottom-anchored on mobile. Camera and thumbnail controls named, focus to the heading on step change, copy button announces "Copied", the private link is real selectable text. Works at 200 % text.

### Waiting to send

A report made offline shows a success-like screen with a clock icon and "Čaka na pošiljanje": it will be sent when online, a text button "Cancel", and a quiet row on the Map tab for queued reports with status words (Waiting, Sending, Sent, Failed with retry). No duplicate on retry.

Parts built provisionally in TASK-86.2 (CH-263), now the spec:

1. Before sign-out with reports waiting, an alert dialog: title is the pending count; "Send now" primary, "Delete" secondary, "Cancel" text.
2. A sent row has a text button "Odpri mojo prijavo".
3. Rows without a photo (sent rows lose theirs) use a 64 px `muted` tile with a paw icon.
4. A stuck row shows its reason (`errors.<code>`, 14 `muted-foreground`) under the status word.

## Assets

None.

## Mockup scope (`P7-report-found.html`)

1. Mobile: steps 1 to 5 (both step-2 variants), sighted flow, success with link block and the responsible-shelter row (plus the unknown-municipality note variant), manage page (with and without messages), delete dialog, rate-limited note, camera denied.
2. Web: steps 1, 3, 5, success with QR, manage page.
3. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-263: waiting-to-send dialog, sent-row action, photo-less tile, stuck reason line |
| 1.2 | 2026-10-18 | CH-441: Messages as conversation rows, no open-messages button |
