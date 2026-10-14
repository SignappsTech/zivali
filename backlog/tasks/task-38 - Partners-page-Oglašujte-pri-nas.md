---
id: TASK-38
title: 'Partners page: Oglašujte pri nas'
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-14 21:03'
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

## Packet

Unblocks on: public layout and footer (TASK-11); approved tone guide (TASK-2); slot registry and formats for the media kit (TASK-35)
