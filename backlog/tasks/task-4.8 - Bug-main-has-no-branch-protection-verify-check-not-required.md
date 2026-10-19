---
id: TASK-4.8
title: 'Bug: main has no branch protection; verify check not required'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 15:05'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-4
priority: high
ordinal: 426200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Packet: TASK-4 AC#1 (block the merge on failure), docs/04 §CI/CD Branch protection, ADR-016 §As built CI split. Branch: - (repository settings, admin gh auth; the gh api PUT command is in docs/04). Review: lead.

Steps: curl -s https://api.github.com/repos/SignappsTech/zivali/branches/main ; curl -s https://api.github.com/repos/SignappsTech/zivali/rules/branches/main (QA 2026-10-19, after the repo went public, CH-633).
Expected: main protected, required status check verify (strict), no force pushes, no deletion (docs/04 §CI/CD).
Actual: protected:false, required_status_checks enforcement_level off, contexts []; no rulesets ([]). Nothing on GitHub blocks merging a pull request with a red verify, and main accepts force pushes. The repo is now public, so outside pull requests are possible.
Severity: Medium (High once anyone besides the owner merges on GitHub).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 GET https://api.github.com/repos/SignappsTech/zivali/branches/main returns protected: true with required_status_checks.contexts = ["verify"] (strict)
- [ ] #2 Force pushes and deletion of main are off; settings match docs/04 §CI/CD Branch protection (enforce_admins false while Review: local)
- [ ] #3 A pull request whose ci verify job fails shows Merging is blocked on GitHub
<!-- AC:END -->
