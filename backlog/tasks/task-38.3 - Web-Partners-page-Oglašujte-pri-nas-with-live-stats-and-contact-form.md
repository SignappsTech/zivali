---
id: TASK-38.3
title: Web Partners page (Oglašujte pri nas) with live stats and contact form
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
updated_date: '2026-10-16 04:05'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-11.2
  - TASK-6.10
  - TASK-38.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C14-ads-partners.md
  - docs/design/pages/P22-partners.md
  - docs/content/pages/P22-partners.md
parent_task_id: TASK-38
priority: high
ordinal: 216000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
This is the client's pitch tool: real audience numbers and a way for companies to get in touch (FR-032).

## Packet

Unblocks on: Web shell: header, footer, layout, route groups and guards, shared states merged (TASK-11.2); Contract clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners merged (TASK-6.10); Design: Partners page "Oglašujte pri nas" (P22) approved (TASK-38.1)
Design: P22 docs/design/pages/P22-partners.md (mockup docs/design/mockups/P22-partners.html; TASK-38.1)
Copy: docs/content/pages/P22-partners.md
Contracts: C14, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-38.3-partners-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The Partners page (SL /oglasevanje, EN /en/advertise) shows the pitch, formats and slots, live audience stats and a contact form with explicit consent and captcha, per P22, with final copy from the content slice.
- [ ] #2 Low numbers read honestly (pilot status, '< 5'); nothing is invented.
- [ ] #3 A valid enquiry shows a confirmation; errors and rate limits are localised.
- [ ] #4 Meta tags and an Open Graph image are set and the page is indexable; Lighthouse SEO ≥ 95 and accessibility ≥ 95.
<!-- AC:END -->
