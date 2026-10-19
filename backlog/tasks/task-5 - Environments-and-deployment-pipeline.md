---
id: TASK-5
title: Environments and deployment pipeline
status: Done
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:01'
updated_date: '2026-10-19 15:04'
labels:
  - story
  - 'req:NFR-AVAIL'
milestone: m-0
dependencies:
  - TASK-3
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Continuous delivery needs staging (and later production) for the API, worker, website, database and mobile builds on a budget of about €5–10/month (brief v1.0): one Hetzner VPS, Supabase Free, Cloudflare R2, EAS free tier. Hetzner, R2 and DNS credentials may arrive later, so the pipeline must also work in dry-run.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given merged code on main, when the GitHub Actions deploy workflow runs, then the api, worker and web images are built, pushed to GHCR and started on the Hetzner VPS with Docker Compose behind Caddy (HTTPS), Prisma migrations are applied to the staging Supabase project (EU Frankfurt) first, and smoke checks pass; with credentials missing it runs in dry-run and reports which ones.
- [ ] #2 Given a migration, when applied, then it has a documented rollback (or forward fix) and runs in CI against a clean local database.
- [ ] #3 Given operations, when the day ends, then a nightly pg_dump is written to Cloudflare R2 with 30-day retention, and a keep-alive keeps the Supabase Free project from pausing.
- [ ] #4 Given EAS, when a developer runs a build profile, then development and preview profiles exist (no store submission).
- [ ] #5 Given the environments, when documented, then a runbook lists required credentials, who provides them, the monthly cost and which features stay blocked without them.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Lead: closed after its QA pass; all child tasks Done.
<!-- SECTION:NOTES:END -->

## Packet

Unblocks on: buildable apps/web, apps/api and apps/mobile merged (TASK-3)
