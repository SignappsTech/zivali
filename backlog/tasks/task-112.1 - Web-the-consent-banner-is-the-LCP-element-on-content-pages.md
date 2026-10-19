---
id: TASK-112.1
title: 'Web: the consent banner is the LCP element on content pages'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 11:17'
labels:
  - fe
  - 'est:S'
dependencies: []
references:
  - docs/tech/frontend.md
  - docs/design/system.md
parent_task_id: TASK-112
priority: medium
ordinal: 414200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-112 found that on content pages the LCP element is the consent banner (#consent-body). It paints after hydration, which pushes LCP past 2.5 s (also seen in TASK-115.6). Make the banner stop being the LCP element or paint it early: render its text on the server, or keep it out of the LCP candidates (e.g. a fixed small block that never outgrows the main content), without breaking consent gating (no analytics before consent).

## Packet

Unblocks on: - (TASK-112 merged or not; independent)
Design: docs/design/system.md consent banner; no visual change
Review: tech-lead code review (full mode); CI quality job shows the LCP
Branch: agent/task-112.1-consent-lcp
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On the content pages the LCP element is page content, not the consent banner, and LCP is within the TASK-112 budget in the CI quality run
- [ ] #2 Consent gating unchanged: nothing loads analytics before consent; unit tests
<!-- AC:END -->
