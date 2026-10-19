---
id: TASK-90.9
title: >-
  Web shelter page: opening-hours list forces horizontal scroll at 320 px (EN)
  and at 200 percent text
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:20'
updated_date: '2026-10-19 20:40'
labels:
  - bug
  - 'est:XS'
  - web
  - a11y
dependencies: []
parent_task_id: TASK-90
ordinal: 456200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: https://najdimo.si/en/shelters/obalno-zavetisce (live 1ce20600, 2026-10-19, signed out), Chromium and WebKit at 320x844; and any shelter page (e.g. /zavetisca/zavetisce-ljubljana, /en/shelters/zavetisce-maribor) at 390x844 with html{font-size:200%} injected (as e2e/large-text.spec.ts, TASK-18.8).
Expected: no horizontal scroll at 320 px and at 200 % text (P3 T5/T6 Responsive: 320 px and 400 % zoom reflow without horizontal scroll; frontend.md DoD 'works at 320 px width and 200 % text'); long day ranges wrap, times and the phone number stay unbroken.
Actual: scrollWidth - clientWidth = 26 px at 320 px on EN Obalno (dt 'Tuesday, Thursday–Saturday'), and 98-302 px at 390 px + 200 % text on every shelter page, SL and EN (Ljubljana SL 179, Maribor EN 98, Obalno EN 302). The whole contact column (Telefon, number, Pokliči, Naslov) is pushed past the viewport. Hiding the hours dl brings the overflow to 0. Cause: in apps/web/app/[locale]/(public)/shelters/[slug]/page.tsx the hours dl is grid-cols-[max-content_1fr] (the dt never wraps) with whitespace-nowrap times, inside the auto-sized track of the contact grid. Same in Chromium and WebKit. SL at 320 px and 100 % text is fine.
Severity: medium (WCAG 1.4.10 / 1.4.4; the call button sits in the pushed column).

## Packet

Unblocks on: -
Branch: agent/<id>-shelter-hours-reflow
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given any /zavetisca/{slug} or /en/shelters/{slug} at 320 px, and at 390 px with root text at 200 percent, then the page has no horizontal scroll: day ranges wrap, times and phone numbers do not break mid-number, and a large-text e2e case covers one SL and one EN shelter page
<!-- AC:END -->
