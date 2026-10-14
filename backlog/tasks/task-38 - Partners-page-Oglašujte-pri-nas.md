---
id: TASK-38
title: 'Partners page: Oglašujte pri nas'
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-14 21:03'
updated_date: '2026-10-14 22:34'
labels:
  - story
  - 'req:FR-032'
milestone: m-1
dependencies:
  - TASK-11
  - TASK-2
  - TASK-35
priority: high
ordinal: 38000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
This is the client's main pitch tool: a public page that shows companies the audience, the placements and a way to get in touch, using live numbers instead of promises.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a visitor, when they open the Partners page (SL: Oglašujte pri nas), then they see the pitch, ad formats and slots (media kit), audience stats (registered users, active reports, reunions by region) and a contact form.
- [ ] #2 Given the stats, when computed, then they come from our DB (optionally enriched from the GA Data API behind a flag once credentials exist), are aggregated, cached for at most 1 hour and any figure below 5 is shown as under 5.
- [ ] #3 Given the contact form, when submitted, then company, contact, region of interest and message are validated, captcha and rate limiting apply, the lead is stored for admins and emailed to the client and consent to be contacted is explicit.
- [ ] #4 Given SL and EN, when switched, then copy is final (no placeholders) and the page has meta tags and an Open Graph image and is indexable.
- [ ] #5 Given a nearly empty database, when stats are low, then the page reads honestly (shows pilot status) and never shows invented numbers.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-14 content-strategist: drafts are being written now against the draft voice guide and glossary (TASK-2, awaiting native review and client approval). Status stays To Do until TASK-2 is approved and TASK-11/TASK-35 are done (build part). Copy files: docs/content/pages/ and docs/content/legal/.

2026-10-15: final SL/EN copy in docs/content/pages/P22-partners.md (pitch, live stats labels incl. '< 5' and pilot note, four slots and format, targeting, Vet Partner section, trust rules, pricing on request, enquiry form with interest ad/vet_partner, validation and states, FAQ, SEO). Client decisions pending: reply time (2 working days), 'first partners get better terms', media kit PDF. Build ACs belong to TASK-38.2/38.3.
<!-- SECTION:NOTES:END -->

## Packet

Unblocks on: public layout and footer (TASK-11); approved tone guide (TASK-2); slot registry and formats for the media kit (TASK-35)
