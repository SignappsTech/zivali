---
source: 03§P10
page: P10 Report abuse
stories: TASK-25 (FR-018)
platforms: web, mobile
mockup: docs/design/mockups/P10-report-abuse.html
copy: docs/content/pages/P10-report-abuse.md
---

# P10 Report abuse

## Purpose

Anyone can flag a scam, fake or inappropriate listing, profile or chat message in two taps. It must feel safe and quick, never accusatory, and it works for signed-out visitors too (rate limited).

## Entry points

- Listing: More menu on the detail page (P9).
- Chat message: long press or the message menu (P12); also "Report and block" in the chat header menu.
- Profile or shelter name: link in the account header of a public profile (later).
- Banner: the listing owner's notice when their listing was hidden by reports (see states).

## Sheet (mobile) or dialog (web)

1. h2 "Report this" with the target named in one line (listing title, "this message", "this user").
2. Reason as choice rows (single choice): Scam or asking for money, Fake listing, Spam, Inappropriate image, Other. Selected row uses the primary fill with a check.
3. Optional note (line textarea, 500 characters, counter only near the limit).
4. For messages and users: a second row "Also block this user" as a switch.
5. Primary `lg` "Send report" (disabled until a reason is chosen, with help text explaining why). Text button "Cancel".
6. Privacy line: reports are reviewed by moderators; the other person is not told who reported.

## Confirmation

Replaces the sheet content: check icon in a tonal circle, h2 "Thank you", one sentence about review time, text button "Done". For messages the thread shows the message folded with "You reported this message".

## States

| State | Behaviour |
|---|---|
| Rate limited (anonymous) | calm note, nothing lost, try again later |
| Already reported | note "You already reported this", no second submit |
| Network error | inline retry, selection kept |
| Own listing | the entry is not shown |
| Listing hidden after three reports | owner sees a `note` on the detail page and in the inbox that the listing is under review, with a text button "Contact support"; public gets the 410 page |

## Responsive and accessibility

Sheet snap at content height; dialog max 440 px on web (system §10.9). Choice rows are a `radiogroup`; the confirmation is announced politely; focus moves to the heading on open and returns to the trigger on close; no auto-dismiss.

## Assets

None.

## Mockup scope (`P10-report-abuse.html`)

1. Mobile: sheet for a listing, a message (with block switch), disabled primary, confirmation, rate-limited, already reported, owner "under review" note.
2. Web: dialog for a listing and a message.
3. Light and dark.
