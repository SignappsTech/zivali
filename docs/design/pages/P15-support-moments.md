---
source: 03§P15
page: P15 Support moments (tip, contribution, checkout hand-off)
stories: TASK-33 (FR-021, FR-020)
platforms: web, mobile
mockup: docs/design/mockups/P15-support-moments.html
copy: docs/content/pages/P15-support-moments.md
---

# P15 Support moments

## Purpose

Two voluntary, honest ways to help keep the service free: a thank-you tip on the reunited screen and an optional contribution after a lost report is published. Both are quiet, never pre-selected, never block reporting, matching or alerts (P-1, P-2), and never appear for anonymous finders. Wording is "support / contribution", not "donation" (FR-021, Q-008).

## Reunited tip (inside P14)

- h3 and one sentence. Three amount pills (3, 5, 10 EUR; none selected), "Other amount" line field with the minimum 2.00 EUR validated inline.
- Two buttons of the **same size**, side by side on web and stacked on mobile: Pay (`secondary`, label includes the amount once chosen) and Skip (`secondary`), at equal weight; the page's primary lives in P14. Skip is exactly as visible as Pay. Disabled Pay explains "Choose an amount".
- A one-line transparency link to the page Where your money goes (M4, hidden until then) and a Stripe test-mode note when not in production (a `note` that no real card is charged).

## Contribution at lost confirmation (inside P6)

A collapsed row at the end of the confirmation screen: text and a caret. Expanding reveals two to five euro pills (2, 3, 5; none selected) and a button "Prispevaj {amount}" (`support.contribution_pay`; amount once chosen). Not shown again for that report once skipped or paid. No countdown, no badge, no guilt copy.

## Checkout hand-off

| Platform | Behaviour |
|---|---|
| Web | redirect to Stripe Checkout (test mode), return to the same page |
| Mobile | a sheet explains "You will pay in your browser" with primary "Continue" and text "Cancel", opens the web checkout in an in-app browser, returns to the app (app-store rules for tips: risk R-003 in the delivery plan) |

Return states (full screen on web, sheet on mobile):

| Return | Content |
|---|---|
| Success | check icon in a tonal circle, h2 thanks, sentence that a receipt was emailed, primary "Back to my report" |
| Cancelled | neutral, "Nothing was charged", primary "Back", text "Try again" |
| Failed (declined) | calm note with the reason in plain language, primary "Try another card", text "Skip" |
| Pending (webhook delay) | "We are confirming your payment", auto-refresh, text "Back" |

## My payments (Profile, web `/account/payments`)

Plain list of contributions: date, purpose, amount, receipt text button. Empty state sentence. Test-mode label on every row in non-production.

## States

Below minimum amount ("minimum 2.00 EUR"), signed-out visitor taps Pay (gate sheet P16, tip needs an account for the receipt), email unverified (receipt note), network error with retry, already paid for this report (row replaced by thanks).

## Accessibility

Amount pills are a `radiogroup`; Pay and Skip are both buttons in tab order; errors tie to the field; currency formatted for SL (`3,00 €`); focus returns to the heading after return from checkout.

## Assets

None.

## Mockup scope (`P15-support-moments.html`)

1. Mobile: tip block (idle, amount chosen, below minimum), collapsed and expanded contribution row, hand-off sheet, success, cancelled, failed, pending.
2. Web: tip block, return states, My payments.
3. Light and dark.
