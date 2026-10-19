---
id: TASK-5.3
title: 'QA: Environments and deployment pipeline'
status: Done
assignee:
  - '@qa'
created_date: '2026-10-14 22:15'
updated_date: '2026-10-19 15:03'
labels:
  - qa
  - 'qa:pass'
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
- [x] #1 Given merged code on main, when the GitHub Actions deploy workflow runs, then the api, worker and web images are built, pushed to GHCR and started on the Hetzner VPS with Docker Compose behind Caddy (HTTPS), Prisma migrations are applied to the staging Supabase project (EU Frankfurt) first, and smoke checks pass; with credentials missing it runs in dry-run and reports which ones.
- [x] #2 Given a migration, when applied, then it has a documented rollback (or forward fix) and runs in CI against a clean local database.
- [x] #3 Given operations, when the day ends, then a nightly pg_dump is written to Cloudflare R2 with 30-day retention, and a keep-alive keeps the Supabase Free project from pausing.
- [x] #4 Given EAS, when a developer runs a build profile, then development and preview profiles exist (no store submission).
- [x] #5 Given the environments, when documented, then a runbook lists required credentials, who provides them, the monthly cost and which features stay blocked without them.
- [x] #6 Story gates pass on main: `pnpm verify`, plus `pnpm quality` for the pages this story touches; results recorded in the QA notes.
- [x] #7 Given staging storage, when the R2 buckets are checked, then zivali-private, zivali-media and zivali-backups exist in the EU jurisdiction (HeadBucket on the EU endpoint succeeds) and a web photo upload works through the CORS rule.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
QA sweep 2026-10-19 (web-only pilot rules; main ef6c492f; no suites run locally; read-only live checks). Result: qa:pass.
- AC#1 PASS (as built per CH-151/CH-158: nginx+certbot, no GHCR, docker save|zstd|ssh, `--deploy --strict` gate): deploy run 39270775804 (staging job, head 69d07c97) green after ci 39269904291; live https://najdimo.si/api/health {ok, version 69d07c9716f7, env staging}, https://api.najdimo.si/v1/health/ready {db ok, queue_lag_s 0, same version}; HSTS/nosniff/XFO on web; http and www 301 to https://najdimo.si. Missing credentials print NEEDS-INPUT names, dry run without --deploy, exit 1 under --strict (deploy.mjs main; scripts/deploy.test.mjs 13 tests in verify:static, green in CI). One Supabase project for the pilot (CH-109, CH-487).
- AC#2 PASS with CHANGE: 32/34 migrations carry a `rollback:` header; ADR-016 sets forward migrations as the fix for all (the 2 without a header: 20261015043154_app_config_updated_at_default, 20261016130000_task_35_2_link_url_check, both trivial; backend.md DoD wants the header, observation only). Clean-DB run moved out of CI by TASK-4.6 (owner): now deploy.mjs dry run + DoD scratch DB -> CHANGE row (task-5 AC#2) in backlog/changes.md.
- AC#3 PASS: worker cron db.backup '0 2 * * *' Europe/Ljubljana (pg_dump --format=custom --schema=app -> zivali-backups/db/<env>/<date>.dump; test/jobs/db.backup.test.ts), db.keepalive '0 */6 * * *' (select 1) plus the 30 s api healthcheck; 30-day expiry rule per deploy/README.md §3 (done) and data-inventory.json. Live ready check shows the worker queue at lag 0. Bucket lifecycle and dump objects not inspected directly (R2 credential use refused by the permission classifier).
- AC#4 PASS (config) / build deferred: apps/mobile/eas.json has development (developmentClient, internal, apk) and preview (internal, staging env) profiles, `submit: {}` (no store submission). Running an EAS build: deferred: web-only pilot (owner 2026-10-19).
- AC#5 PASS: README "Environments and credentials" lists each credential, who provides it, monthly cost and what stays blocked; running cost about EUR 7-8/month. CHANGE row: its environments table predates the pilot host (najdimo.si = staging stack, CH-487).
- AC#6 PASS (CI evidence): ci verify green on 69d07c97 (verify:static, web build, pnpm audit, 298 web e2e); the full `pnpm verify` runs in the local merge gate (TASK-4.6). `pnpm quality`: n/a, the story touches no web pages (only /api/health JSON); quality.yml has no runs yet (created by TASK-4.6, nightly 02:30 UTC). Keyboard/screen-reader: n/a (no UI).
- AC#7 PASS: the green `--strict` deploy ran HeadBucket on https://<account>.eu.r2.cloudflarestorage.com for zivali-private, zivali-media, zivali-backups (any failure is NEEDS-INPUT -> exit 1). Web upload through the CORS rule: live GET https://api.najdimo.si/v1/reports shows 5 of 7 reports created 2026-10-19 with photos on media.najdimo.si (image 200, image/jpeg), and the browser PUTs the file to the upload URL POST /v1/photos returns (packages/types photos.ts, method PUT), so those uploads crossed the CORS rule; CORS rule (najdimo.si, www, staging) per deploy/README.md §3. e2e photos.spec.ts covers the flow on the mock API.
Bugs: none.
<!-- SECTION:NOTES:END -->
