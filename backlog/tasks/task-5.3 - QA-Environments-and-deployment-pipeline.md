---
id: TASK-5.3
title: 'QA: Environments and deployment pipeline'
status: To Do
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-15 00:14'
labels:
  - qa
  - 'est:XS'
milestone: m-0
dependencies:
  - TASK-5.1
  - TASK-5.2
references:
  - docs/tech/frontend.md
parent_task_id: TASK-5
priority: medium
ordinal: 222000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verify story TASK-5 (Environments and deployment pipeline) on main once all its tasks are merged: acceptance criteria below, quality gates, keyboard and screen-reader spot checks. File bug tasks for failures and set qa:pass or qa:fail.

## Packet

Unblocks on: Hetzner deploy: Docker Compose + Caddy, GHCR images, migrations, nightly backup to R2 merged (TASK-5.1); EAS build profiles, mobile env per environment, Firebase config as secrets merged (TASK-5.2)
Review: n/a (QA)
Branch: - (verify on main)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given merged code on main, when the GitHub Actions deploy workflow runs, then the api, worker and web images are built, pushed to GHCR and started on the Hetzner VPS with Docker Compose behind Caddy (HTTPS), Prisma migrations are applied to the staging Supabase project (EU Frankfurt) first, and smoke checks pass; with credentials missing it runs in dry-run and reports which ones.
- [ ] #2 Given a migration, when applied, then it has a documented rollback (or forward fix) and runs in CI against a clean local database.
- [ ] #3 Given operations, when the day ends, then a nightly pg_dump is written to Cloudflare R2 with 30-day retention, and a keep-alive keeps the Supabase Free project from pausing.
- [ ] #4 Given EAS, when a developer runs a build profile, then development and preview profiles exist (no store submission).
- [ ] #5 Given the environments, when documented, then a runbook lists required credentials, who provides them, the monthly cost and which features stay blocked without them.
- [ ] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
- [ ] #7 Given staging storage, when the R2 buckets are checked, then zivali-private, zivali-media and zivali-backups exist in the EU jurisdiction (HeadBucket on the EU endpoint succeeds) and a web photo upload works through the CORS rule.
<!-- AC:END -->
