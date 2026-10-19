---
id: TASK-4.10
title: 'CI: docs- and backlog-only pushes to main skip the secret scan'
status: In Progress
assignee:
  - '@tech-lead'
created_date: '2026-10-19 18:25'
updated_date: '2026-10-19 19:29'
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
Implemented (tech-lead, 2026-10-19): .github/workflows/secrets.yml, job secretlint, on every pull_request and push to main with no paths filter. Review fix: lockfile route, pnpm install --frozen-lockfile --ignore-scripts --filter . (root devDependencies only), then pnpm exec secretlint; setup-node without a package-manager cache, so no partial store under ci.yml's key. ci.yml paths filter and deploy.yml untouched (one comment line in ci.yml points to secrets.yml). Local proof on a temp copy of HEAD with the lockfile secretlint 13.0.7 (no pnpm install allowed locally, so the install step is untested here): clean tree exit 0; a fake ghp_ token appended to this task file exit 1, [GITHUB_TOKEN] reported with the value masked; probe deleted. AC#3 (branch run on GitHub, timing under 1 minute) is for the lead after the merge; the check is not yet required by branch protection.
<!-- SECTION:NOTES:END -->
