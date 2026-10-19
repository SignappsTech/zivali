---
id: TASK-4.9
title: 'Bug: CI secretlint skips deploy/ and backlog/'
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-19 15:05'
updated_date: '2026-10-19 18:38'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-4
priority: medium
ordinal: 428200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Packet: TASK-4 AC#4 (a leaked secret fails the CI build), docs/04 §CI/CD (secretlint on the source roots), root package.json verify:static. Branch: agent/<id>. Review: lead.

Steps: in a scratch folder with the repo's .secretlintrc.json, put the same fake ghp_ token in apps/leak.yml, deploy/docker-compose.yml and backlog/note.md; run secretlint with the verify:static globs "apps/**" "packages/**" "scripts/**" "tests/**" "supabase/**" "docs/**" ".github/**" "*".
Expected: all three are reported and the run exits 1.
Actual: only apps/leak.yml is reported; deploy/ (compose, nginx, remote.sh: the files closest to credentials) and backlog/ (task notes agents write) are never scanned in CI. Scanning them directly finds both tokens. The pre-commit hook covers staged files, but hooks are skippable and the repo is public.
Severity: Medium.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 pnpm verify:static (CI step) runs secretlint over deploy/** and backlog/** as well (or over every tracked file, .secretlintignore still applies)
- [x] #2 A fake GitHub token planted in deploy/docker-compose.yml or in a backlog task file makes pnpm verify:static exit non-zero
- [x] #3 pnpm verify:static stays green on main (QA probe 2026-10-19: deploy/**, backlog/**, .husky/**, .vscode/** have no findings today)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch: agent/TASK-4.9-secretlint-all-roots. verify:static secretlint now scans **/* (gitignore, .secretlintignore, node_modules, .git skipped). Proof: fake ghp_ token in deploy/docker-compose.yml -> pnpm verify:static exit 1; probes in backlog/, .husky/, .vscode/ also reported; clean tree exit 0 (secretlint ~2 s). Docs 04/05 0.16, slices, README wording.
<!-- SECTION:NOTES:END -->
