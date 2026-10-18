---
id: TASK-25.3
title: Web ReportAbuseDialog and detail-page slot
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:13'
updated_date: '2026-10-18 21:18'
labels:
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-18.2
  - TASK-6.10
  - TASK-25.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C11-abuse-reports.md
  - docs/design/pages/P10-report-abuse.md
parent_task_id: TASK-25
priority: medium
ordinal: 184000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Anyone can flag a suspicious listing in one or two taps; the same dialog is reused from chat and profiles (FR-018).

## Packet

Unblocks on: Web report detail /r/[code]: SSR, slots, OG image, JSON-LD, 410 merged (TASK-18.2); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Report abuse (P10) approved (TASK-25.1)
Design: P10 docs/design/pages/P10-report-abuse.md (mockup docs/design/mockups/P10-report-abuse.html; TASK-25.1)
Copy: docs/content/pages/P10-report-abuse.md
Contracts: C11 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-25.3-abuse-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ReportAbuseDialog lets anyone pick a reason (scam, fake, spam, inappropriate image, other), add an optional note and submit, per P10; anonymous visitors sign in anonymously first.
- [ ] #2 It fills the `slot-c` ("Več možnosti": report abuse, copy link) on the detail page and is reusable from chat and profiles; duplicates show the same confirmation.
- [ ] #3 Rate-limit and error messages are localised; axe 0 violations.
<!-- AC:END -->
