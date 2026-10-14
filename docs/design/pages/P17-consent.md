---
source: 03§P17
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
- **Three buttons with identical size, style and weight**: Accept all, Reject all, Customise. All use the `secondary` style (none uses `primary`). Order: Reject all, Accept all, Customise (neutral order, same row on web, stacked on mobile with equal width).
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

Mobile sheet at content height; at 320 px buttons stack; text at 200 % scrolls inside the sheet while the buttons stay reachable.

## Accessibility

`role="dialog"` non-modal with an accessible name; focus moves to the heading on appear and returns to the page when closed; all buttons are real buttons with the same hit area; switches are labelled; contrast per tokens; reduced motion shows no slide; the banner is announced politely once.

## Assets

None.

## Mockup scope (`P17-consent.html`)

1. Web 1200 px: banner over the home page, Customise view, Cookie settings reopened with analytics on, re-ask with change sentence.
2. Mobile: sheet, Customise, settings row, 320 px stack.
3. Light and dark.
