---
source: 03§P17
version: 1.1
page: P17 Consent banner and preferences
stories: TASK-13 (FR-039, FR-038)
platforms: web, mobile
mockup: docs/design/mockups/P17-consent.html
copy: docs/content/pages/P17-consent.md
---

# P17 Consent

## Purpose

An honest, accessible cookie and analytics choice that is quick to answer and as easy to change as to give. EU rules require equal weight for Accept and Reject, nothing pre-selected, and no analytics before consent. It must never get in the way of an urgent report.

## Banner (web) and sheet (mobile): first view

- Placement: web, bottom-left on `lg` (max 560 px, radius 24, `popover` surface, `shadow-lg`) and full-width bottom sheet below `lg`. Mobile: bottom sheet over the first screen. It does not cover the top bar or the primary action of a flow.
- Content: h2, two sentences (what analytics is used for, that nothing is sent before consent, no personal data), a text link to the Cookie policy.
- **Web banner (as built, TASK-115.11, design check 2026-10-19, CH-630):** Reject all and Accept all are an equal `secondary` pair side by side at every width (each wraps to its own line only when a label would not fit, for example at 200 % text); Customise is a text button after them, in the same row from about 390 px and under the pair below that. At 390 x 844 the first view is 280 px high (was 392, 46 % of the screen). Equal weight holds for the two choices that decide consent; Customise only opens the detail view, and the Customise view keeps three equal buttons.
- **Mobile app sheet (unchanged):** three buttons with identical size, style and weight, all `secondary`, stacked with equal width. Order: Reject all, Accept all, Customise. It may be aligned to the web banner later.
- Closing the banner with Escape or ignoring it keeps everything denied.

## Customise view (same surface, replaces the content)

- Back text button, h2.
- Two rows with a switch each: **Strictly necessary** (on, disabled, with a lock note) and **Analytics** (off by default). Each row has one sentence on purpose, duration and provider (Google Analytics 4 and Firebase Analytics) as plain text.
- Buttons, equal size: Save choice, Accept all, Reject all. Nothing pre-selected beyond necessary storage.

## Cookie settings entry

Footer link "Cookie settings" (P1) and the Profile row (P13) reopen the Customise view directly with the stored choice shown. Withdrawal is one switch plus Save, same effort as accepting. A toast "Choice saved" confirms. Withdrawing clears analytics cookies at once.

## Re-ask

Shown again after 12 months or when the consent version changes (new vendor or purpose). The first sentence says what changed.

## States

| State | Behaviour |
|---|---|
| First visit or launch | banner or sheet visible, focus moved into it |
| Choice stored | banner gone, no reload; toast only when changed from settings |
| Customise open | back returns to the first view |
| Version bump | banner returns with "what changed" sentence |
| Native app | sheet appears after the permission primers have been dismissed or on first idle, never over the camera |

## Responsive

Mobile sheet at content height; on the web banner the pair stays side by side and only wraps when a label no longer fits (the app sheet stacks at 320 px); text at 200 % scrolls inside the sheet while the buttons stay reachable.

## Accessibility

`role="dialog"` non-modal with an accessible name; focus moves to the heading on appear and returns to the page when closed; all buttons are real buttons with the same hit area; switches are labelled; contrast per tokens; reduced motion shows no slide; the banner is announced politely once.

## Assets

None.

## Mockup scope (`P17-consent.html`)

1. Web 1200 px: banner over the home page, Customise view, Cookie settings reopened with analytics on, re-ask with change sentence.
2. Mobile: sheet, Customise, settings row, 320 px stack.
3. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-19 | CH-630: web banner first view as built, Reject and Accept as a side-by-side pair with Customise as a text button; app sheet unchanged. |
