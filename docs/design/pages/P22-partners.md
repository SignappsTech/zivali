---
source: 03§P22
page: P22 Partners page ("Oglašujte pri nas")
stories: TASK-38 (FR-032)
platforms: web
mockup: docs/design/mockups/P22-partners.html
copy: docs/content/pages/P22-partners.md
---

# P22 Partners page

## Purpose

A public, honest page where a local business sees the audience and the placements and sends an enquiry. It is the sales tool for the first sponsors, so it shows real numbers (including small ones), never inflates, and explains the trust rules (labelled ads, none in report flows). No ads on this page.

## Section order (Content variant, no sidebar)

1. **Hero:** h1, one supporting sentence, primary "Send an enquiry" (anchor to the form), text button "How placements look". Right: one photograph or illustration (content decision; no generated stand-in for real pets).
2. **Audience (live numbers):** region select (all Slovenia by default) and a row of large numbers with labels: registered users, active reports, reunited pets, as plain text with generous gaps, not cards. Values under 5 read "< 5". A `note` says "Pilot: Ljubljana, numbers are real and still small" while the product is in pilot (honest when small). Data from our database; optional enrichment flagged; cached at most 1 hour; shows the date of the figures.
3. **Where your ad appears:** the four slots as one visual each using the real components from P21 (Feed, Detail, Reunited, Sidebar) with a one-line description and image format (4:3, 1200 by 900 px) and text limits. Laid out as a list with the preview on the right, alternating avoided.
4. **Targeting:** one paragraph and a plain list: region, municipality, species, dates.
5. **Why it works here:** three short rows on trust rules: every ad labelled "Oglas", no ads in report, chat or payment flows, aggregate cookieless reporting.
6. **Pricing and next steps:** a sentence that prices are given on request during the pilot (no invented figures), what happens after the enquiry (reply within the stated time), media kit as a text download.
7. **Enquiry form:** company, contact name, email, region of interest (select), message (line textarea), a **consent checkbox** to be contacted (required, not pre-ticked), captcha (invisible, challenge sheet if needed), primary `lg` "Send enquiry". Below: privacy sentence with link.
8. **Questions:** a short FAQ in the T3 style (P3).

## Form states

| State | Behaviour |
|---|---|
| Validation | inline errors under each line, first error focused |
| Submitting | button spinner, fields disabled |
| Success | form replaced by check icon, h2, sentence, text button "Back to the page"; lead stored for admins and emailed to the client |
| Rate limited or captcha failed | calm note, data kept |
| Server error | note with retry |

## Responsive

Hero stacks; numbers wrap two per row on mobile; slot previews stack; form single column with sticky submit not required. Page works at 320 px and 400 % zoom.

## Accessibility

Real form labels, `autocomplete` for name and email, consent checkbox with visible text, numbers are text (not images), slot previews have text descriptions, the live region announces success, headings ordered.

## Assets

None specific (hero photograph supplied or chosen by content; slot previews reuse P21 components).

## Mockup scope (`P22-partners.html`)

1. Web 1200 px: full page, audience section with the pilot note and "< 5" example, all four slot previews, the form with each state.
2. 390 px mobile web version.
3. Light and dark.
