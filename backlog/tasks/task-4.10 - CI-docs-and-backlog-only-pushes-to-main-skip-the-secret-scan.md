---
id: TASK-4.10
title: 'CI: docs- and backlog-only pushes to main skip the secret scan'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 18:25'
updated_date: '2026-10-19 18:25'
labels:
  - bug
  - 'est:XS'
  - tech
dependencies:
  - TASK-4.9
references:
  - docs/05-quality-security-plan.md§Security
  - .github/workflows/ci.yml
parent_task_id: TASK-4
priority: medium
ordinal: 434200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by the TASK-4.9 implementer (2026-10-19): TASK-4.6 added a paths filter to ci.yml, so a token committed only in backlog/ or docs/ reaches main unchecked unless the pre-commit hook caught it.

## Packet
Unblocks on: TASK-4.9 merged
Branch: agent/task-4-secret-scan-always
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every push to main and every PR runs secretlint over the whole tree, including pushes that touch only docs/**, backlog/** or *.md (a small separate job or workflow without the paths filter; target under 1 minute)
- [ ] #2 The full ci job keeps its paths filter (no extra e2e or build minutes for docs-only pushes) and the deploy trigger is unchanged
- [ ] #3 A fake token committed alone in a backlog task file turns the run red (shown once on a branch, then removed)
<!-- AC:END -->
