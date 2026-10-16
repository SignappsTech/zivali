---
id: TASK-90.7
title: >-
  Public pages: cut first-load JS for mobile LCP 2.5 s, then make the Lighthouse
  quality job blocking
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-16 02:04'
labels:
  - bug
  - fe
  - 'est:S'
milestone: m-1
dependencies:
  - TASK-90.6
parent_task_id: TASK-90
priority: medium
ordinal: 338000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Carries TASK-90.6 AC#2 (LCP part) and AC#3. After the font cuts (160.6 to 47.3 KB), mobile Lighthouse performance is 0.90-0.93 and CLS 0 on all 9 public pages, but LCP is 2.84-3.21 s: the first-load scripts (about 164 KB) now dominate. Reports: scratchpad quality-report-after (TASK-90.6).

CI: the quality job can't launch Chrome on the GitHub runner (AppArmor userns restriction). The sandbox fix waits on the user's approval; don't commit one until then.

## Packet

Review: tech-lead code review (full mode)
Branch: agent/task-90.7-public-js
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 First-load JS on the public pages is cut (route-level splitting, no client-only libraries on server-rendered pages, smaller shared chunks) with a measured before/after per page.
- [ ] #2 Mobile Lighthouse LCP <= 2.5 s on the 9 public pages (best of 2), performance >= 0.9, CLS <= 0.1.
- [ ] #3 The CI quality job runs Lighthouse with the user-approved sandbox fix, and continue-on-error is removed.
<!-- AC:END -->
