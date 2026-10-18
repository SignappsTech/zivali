---
id: TASK-90.7
title: >-
  Public pages: cut first-load JS for mobile LCP 2.5 s, then make the Lighthouse
  quality job blocking
status: In Progress
assignee:
  - '@tech-lead'
created_date: '2026-10-16 02:04'
updated_date: '2026-10-18 22:08'
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
- [x] #1 First-load JS on the public pages is cut (route-level splitting, no client-only libraries on server-rendered pages, smaller shared chunks) with a measured before/after per page.
- [ ] #2 Mobile Lighthouse LCP <= 2.5 s on the 9 public pages (best of 2), performance >= 0.9, CLS <= 0.1.
- [ ] #3 The CI quality job runs Lighthouse with the user-approved sandbox fix, and continue-on-error is removed.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Merged (manual) after review: JS 164->151 KB on 8 pages, LCP 2.69-3.16 s, perf 0.91-0.94. AC#2 re-scoped by the lead: LCP <= 2.5 s is measured on staging (HTTP/2, CDN); the local lab has a ~2.7 s floor. AC#3 waits on the user's CI sandbox approval.

CH-315/CH-364 (2026-10-19): measurements are in docs/05 section Quality gates (v0.12). No budget change in lighthouserc.json: the LCP budget stays 2.5 s and is judged on staging; the remaining options are devtools throttling or a re-scoped local budget (decision for the lead on AC#2/#3).
<!-- SECTION:NOTES:END -->
