---
source: 03§P7
page: P7 Report found or sighted (no account) and manage page
stories: TASK-30, TASK-17, TASK-41 (FR-006, FR-003, FR-004)
platforms: web, mobile
version: 1.3
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

## AI suggestions (M3, TASK-41)

Shared by P7 (steps 1 and 2), P6 (photo and details steps, new-pet path) and P8 (add and edit form); P6 and P8 point here. Wireframe: `docs/design/wireframes/M-ai-prefill.html` (frames F1 to F12). Behaviour: C19 §Client rules. Copy: P7 copy §3 (`report_found.ai_*`) and §3a (`ai_prefill.*`).

**Status.** The owner (Primož Božič) approved v1 with changes on 2026-10-19. Everything below is approved except the items marked **pending (v2)**: they wait for the owner to confirm wireframe v2, and no mockup or code uses them before that is recorded in TASK-41.1.

### States

| API answer (C19) | On screen | Frame |
|---|---|---|
| `pending` (first photo only, polled every 750 ms, at most 10 s) | `ai_prefill.checking` with a spinner in the AI slot; nothing is blocked | F1 |
| `ready`, value at 0.6 or more | P7 with a species and no `no_animal`/`other_animal` notice before Naprej on step 1: "Je to pravilno?" sentence screen. Everywhere else: filled if empty and untouched, marked "Predlog" | F2, F3, F4 |
| `ready`, `value: null` (below 0.6) | Field empty with `low_confidence` (`low_confidence_breed` for Pasma) | F3, F4 |
| `ready`, nothing at 0.6 or more | A hint under every such field; `none_live` read out once (owner, Q3) | F10 |
| `ready`, species differs from the chosen one | `species_differs` hint and the `species_switch` text button; never switched; only values valid for the chosen species fill | F5 |
| `ready`, collar seen | `collar_hint` under Ovratnica (P6, P8), `collar_hint_note` under the note (P7 step 4); never filled | F4 |
| late result, after the person touched fields | Fills only empty, untouched fields with marks; no new hints; focus stays | F6 |
| `notice` `no_animal` or `other_animal` | Note under the first photo with "Zamenjaj fotografijo" and "Obdrži fotografijo"; nothing filled; P7 skips the sentence screen. Another animal: the person carries on by hand (owner, Q5) | F8 |
| `notice` `multiple_animals` | Fills as usual, with the same note | F8 |
| `unavailable`, error, timeout, `ai.enabled` false | Nothing extra: the form as in M2 | F9 |

### Rules (approved)

1. **One AI slot per screen, by the main action**: mobile footer above the primary button, web above the buttons, P8 web in the summary card. It holds in turn `checking`, the note (`note_continue` in P6 and on P7's "Uredi podatke" path, `note_save` in P8) with the "Kako nastanejo predlogi?" text button, or a late notice. It sits below the fields, so a change never moves a field.
2. **Predlog mark** (`ai_prefill.suggested`): sparkle (filled, 16) and "Predlog" 14 bold `primary` after the field label; on P7 "Uredi podatke", where the h1 is the label, inside the selected row (in the row's text colour). A status word, not a tonal pill (system 10.5). `suggested_a11y` is the control's accessible description. The mark goes when the person changes the field, and on Save or Publish.
3. **Hints**: sparkle outline 16 `primary` and 14/20 `muted-foreground` text under the field; never a boxed panel (system 10.8).
4. **Fill rule**: only empty fields the person has not touched; a cleared suggestion counts as touched and never comes back. A field that still carries the mark counts as untouched when a replaced first photo is checked again.
5. **Late result**: after the person touched a field on the current step, it only fills and marks; no hint lines, focus never moves.
6. **Species differs**: never switched by itself; breed codes of the other species never fill. After "Izberi psa" (or "Izberi mačko"), empty, untouched fields valid for the new species fill and are marked.
7. **Notices**: a neutral note (system 10.6) under the first photo, never blocking. `no_animal`, `other_animal`: nothing fills and P7 skips the sentence screen. If the person has left the photo step, the notice shows in the slot.
8. **Announcements**: one polite region per photo, read once: `arrived_live` with the number filled, `none_live`, or the notice title. The checking line clears silently. Nothing when every field is already filled.
9. **Nothing saved unconfirmed**: values become the person's own only through Shrani (P8), Objavi iskanje (P6), or "Da, nadaljuj" and Objavi prijavo (P7). Saving is never blocked by marks; on the saving step the note stays in the slot while a mark remains, and P8 adds "Preveri predloge", which moves focus to the first marked field (owner, Q7).
10. **Disclosure**: "Kako nastanejo predlogi?" opens `info_body` inline on web and in a bottom sheet on mobile, with the privacy link to `/zasebnost#s8`; shown only when `ai.enabled` is true.

### Pending (v2, awaiting the owner)

Contract and copy changes for these are filed as CH-596 (C19) and CH-597 (P7 copy §3a).

1. **Confidence level** (Q2, F3 to F7): the mark reads "Predlog · zelo verjetno" (0.85 or more) or "Predlog · verjetno" (0.6 to 0.84), the level 14 regular `muted-foreground` (inherits the row colour in a selected row). Text, never colour alone or a number. Accessible description: "Predlog iz fotografije, zelo verjetno pravilen. Preverite ga." Below 0.6 there is no change. Alternative: a percentage. The sentence screen (F2) shows no level.
2. **Breed in the found sentence** (Q4, F2, F3): "Pes, labradorec, črne barve"; left out when null, `*.mixed` or `*.unknown`. "Uredi podatke" then shows "Pasma (neobvezno)", filled and marked; without a breed suggestion the step is as today. "Da, nadaljuj" keeps the breed with the report.
3. **Crop tool** (Q6, F8, F11, F12): opens from "Obreži fotografijo" in the several-animals note and from a crop button under every editable photo (next to Odstrani). A frame over the dimmed photo with rule-of-thirds lines, four corner handles (44 px targets) and edge handles; free shape with a minimum size (tech-lead, ADR-017). Keyboard: Tab to the frame, then each corner; arrows move or resize by 1 %, with Shift 10 %; Esc cancels. Mobile: full screen with Uporabi (primary) and Prekliči (text) in the footer. Web: a 680 px dialog, the actions on the right. "Uporabi" replaces the photo in the form with the cropped copy before anything is saved; the first photo is checked again from `pending` (F12). Focus goes back to the opener (the photo's crop button when the note is gone). The library is the tech-lead's choice (ADR-017).

### Responsive and accessibility

1. Mobile 390 (app and web at phone width) and desktop 1440 share one layout per form; only the slot position differs (rule 1).
2. All targets at least 44 px; marks and levels are text; the spinner turns slowly under reduced motion (system 7).
3. The wireframe's DOM check (both themes): no overflow, targets at least 44 px, text contrast at least 4.5:1.

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
| 1.3 | 2026-10-19 | TASK-41.1: §AI suggestions from the wireframe the owner approved with changes on 2026-10-19; the v2 parts (confidence level, breed in the found sentence, crop tool) are marked pending |
