---
id: TASK-114.36
title: >-
  API dev tooling: realtime stub in scratch DBs, seeded photos through
  PhotosDomain, fixed seed short codes (CH-182, CH-193, CH-409)
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-18 22:07'
labels:
  - be
  - 'est:M'
  - no-design
dependencies: []
references:
  - docs/tech/backend.md
  - docs/05-quality-security-plan.md
  - docs/tech/contracts/C5-photos-storage.md
parent_task_id: TASK-114
priority: medium
ordinal: 398200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Group of seed and test-setup changes (apps/api, tests/quality, lighthouserc.json).
1. CH-182: fresh scratch DBs lack the realtime schema, so NotificationsDomain.deliver() fails in broadcast(). The scratch-DB recipe (apps/api README section Tests) and the test global-setup when it creates one also create a stub realtime.send(jsonb, text, text, boolean), like the copied auth schema.
2. CH-193: seed photos go through PhotosDomain (upload, processPhoto, publishReportPhotos) in prisma/seeders/10-reports.seeder.ts so fixtures get real display and thumb variants instead of the original JPEG for both.
3. CH-409: seeded reports get fixed short codes (like their fixed ids). Add one lost and one found detail page (SL and EN) to PAGES in tests/quality/quality.spec.mjs and to lighthouserc.json, so AC#4 of TASK-18.2 (perf >= 90, SEO >= 95 on a detail page) is measured. Lighthouse budgets stay as they are (see TASK-90.7).

## Packet

Unblocks on: nothing open (TASK-14.1, TASK-18.2 merged).
Review: tech-lead code review; run pnpm verify and pnpm quality once before reporting done.
Branch: agent/task-114.36-dev-tooling
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A scratch DB made by the README recipe or the test global-setup has a realtime.send stub; NotificationsDomain.deliver() passes on it without manual SQL.
- [ ] #2 Seeded report photos have distinct display and thumb variants produced by PhotosDomain; the seed stays idempotent.
- [ ] #3 Seeded reports have stable short codes; the quality PAGES list and lighthouserc.json include a lost and a found detail page in SL and EN, and pnpm quality reports them.
<!-- AC:END -->
