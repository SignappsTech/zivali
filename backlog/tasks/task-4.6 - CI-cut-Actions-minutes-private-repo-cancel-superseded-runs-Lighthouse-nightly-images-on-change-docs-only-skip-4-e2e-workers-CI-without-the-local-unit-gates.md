---
id: TASK-4.6
title: >-
  CI: cut Actions minutes (private repo): cancel superseded runs, Lighthouse
  nightly, images on change, docs-only skip, 4 e2e workers, CI without the local
  unit gates
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-19 13:55'
updated_date: '2026-10-19 14:12'
labels:
  - tech
  - 'est:S'
dependencies: []
references:
  - .github/workflows/ci.yml
  - docs/04-technical-design.md
  - docs/tech/adr/016-environments-hosting-cicd.md
parent_task_id: TASK-4
priority: high
ordinal: 418200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-19: the repo moved to the private org repo SignappsTech/zivali, so Actions minutes now count against the 2,000/month free quota. Today used about 550 minutes (verify 239, quality 141, deploy 63, images 59, mobile 46), about 45-55 minutes per push. Owner approved all of these:
1. concurrency on push to main: cancel-in-progress true (a newer push cancels the older ci run; same for mobile.yml).
2. quality (Lighthouse) leaves the push path: schedule nightly (e.g. 02:30 UTC) plus workflow_dispatch; no longer on push or pull_request.
3. images runs only when Dockerfiles, deploy/, pnpm-lock.yaml, package.json files or the Docker build scripts change (paths filter, or a changed-files check inside the job).
4. ci and mobile skip pushes that only touch docs/**, backlog/**, **/*.md (paths-ignore); deploy follows ci (workflow_run), so it is skipped too.
5. Playwright in CI uses 4 workers (the runner has 4 vCPU); keep retries as they are.
6. Option 7: the CI verify job no longer repeats what merge.mjs runs locally on every merge: keep pnpm verify:static (format, root tests, secretlint), the build needed by e2e, pnpm audit and the web e2e; drop turbo lint/typecheck/test from CI.
Update docs/04 §CI/CD, ADR-016 and the branch-protection note (required checks: verify only; quality and images no longer run on every push).

## Packet

Unblocks on: -
Review: tech-lead review by a second reviewer (CI config)
Branch: agent/task-4.6-ci-minutes
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A push to main cancels the older running ci (and mobile) run
- [ ] #2 quality runs nightly and on demand only; images only on Docker-relevant changes; docs/backlog-only pushes start no ci, mobile or deploy
- [ ] #3 CI verify runs verify:static, build, audit and e2e with 4 workers, and no turbo lint/typecheck/test; deploy still runs only after a green ci on main
- [ ] #4 docs/04 §CI/CD, ADR-016 and the branch-protection note updated
<!-- AC:END -->
