---
id: TASK-26.4
title: 'Web My reports, owner actions and reunited screen'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-18.2
  - TASK-9.3
  - TASK-6.9
  - TASK-7.1
  - TASK-26.2
  - TASK-18.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C4-reports-and-pets.md
  - docs/design/pages/P14-reunited.md
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-26
priority: high
ordinal: 197000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners and finders close the loop and keep listings fresh; the reunited moment hosts the thank-you ask and one ad (FR-012).

## Packet

Unblocks on: Web report detail /r/[code]: SSR, slots, OG image, JSON-LD, 410 merged (TASK-18.2); Web sign-in, sign-up, verification, reset, account page and guards merged (TASK-9.3); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Reunited and lifecycle (P14) approved (TASK-26.2); Design: Report detail (lost, found, sighted) (P9) approved (TASK-18.1)
Design: P14 docs/design/pages/P14-reunited.md (mockup docs/design/mockups/P14-reunited.html; TASK-26.2); P9 docs/design/pages/P9-report-detail.md (mockup docs/design/mockups/P9-report-detail.html; TASK-18.1)
Copy: docs/content/pages/P14-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report); docs/content/pages/P9-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C4 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-26.4-lifecycle-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 My reports lists the user's reports with status; owner actions (edit, close with reason, reopen within 7 days, extend, mark reunited) fill the owner-actions slot for owners and manage-link holders, per P9 and P14.
- [ ] #2 The reunited screen celebrates calmly, shows next steps and an opt-in success-story consent checkbox, and reserves the tip slot and one labelled ad slot.
- [ ] #3 reunited fires with species, region and municipality only, with consent; a finder marking 'returned' and an owner reopening within 7 days both work.
- [ ] #4 axe 0 violations; Playwright covers close, reopen and mark reunited.
<!-- AC:END -->
