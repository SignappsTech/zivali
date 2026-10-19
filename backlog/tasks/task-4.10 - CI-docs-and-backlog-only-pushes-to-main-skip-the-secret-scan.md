---
id: TASK-4.10
title: 'CI: docs- and backlog-only pushes to main skip the secret scan'
status: In Progress
assignee:
  - '@tech-lead'
created_date: '2026-10-19 18:25'
updated_date: '2026-10-19 19:27'
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
Branch: agent/task-4.10-secret-scan
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every push to main and every PR runs secretlint over the whole tree, including pushes that touch only docs/**, backlog/** or *.md (a small separate job or workflow without the paths filter; target under 1 minute)
- [x] #2 The full ci job keeps its paths filter (no extra e2e or build minutes for docs-only pushes) and the deploy trigger is unchanged
- [ ] #3 A fake token committed alone in a backlog task file turns the run red (shown once on a branch, then removed)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented (tech-lead, 2026-10-19): .github/workflows/secrets.yml, job secretlint, on every pull_request and push to main with no paths filter; npx fetches only secretlint 13.0.7 and the recommended preset 13.0.7 (lockfile versions), no pnpm install. ci.yml paths filter and deploy.yml untouched (one comment line in ci.yml points to secrets.yml). Local proof on a temp copy of HEAD with the job's exact command: clean tree exit 0 in 33 s on Windows incl. the npx download; a fake ghp_ token appended to this task file exit 1, [GITHUB_TOKEN] reported with the value masked; probe deleted. AC#3 (branch run on GitHub) is for the lead after the merge; the check is not yet required by branch protection.
<!-- SECTION:NOTES:END -->
