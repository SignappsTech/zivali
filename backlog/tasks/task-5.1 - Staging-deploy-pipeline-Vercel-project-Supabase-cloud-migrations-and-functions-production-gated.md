---
id: TASK-5.1
title: >-
  Hetzner deploy: Docker Compose + Caddy, GHCR images, migrations, nightly
  backup to R2
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 11:52'
labels:
  - tech
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.7
  - TASK-3.3
  - TASK-6.3
references:
  - docs/tech/backend.md
  - docs/tech/adr/016-environments-hosting-cicd.md
  - docs/tech/frontend.md
  - docs/tech/adr/014-photo-pipeline-and-storage.md
parent_task_id: TASK-5
priority: medium
ordinal: 119000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Brief v1.0 hosts api, worker and web on one Hetzner VPS (about €5–10/month) with Supabase Free and R2; staging must deploy from main, production on tags. Hetzner, R2, DNS and GitHub Actions secrets arrive later, so missing credentials must give needs-input and a dry run (ADR-016).

## Packet

Unblocks on: apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer merged (TASK-3.7); Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3); Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain merged (TASK-6.3)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-5.1-deploy
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 deploy/docker-compose.yml runs caddy, web (Next.js standalone), api and worker (same image) with restart policies, log rotation and per-environment .env files; the Caddyfile serves the web and api hostnames with automatic HTTPS and security headers.
- [ ] #2 GitHub Actions deploy.yml builds and pushes images to GHCR, then over SSH pulls, runs `prisma migrate deploy` in a one-off api container, restarts the stack and runs smoke checks (/ping, /v1/health/ready, web home, ADR-021 exposure checks); production runs on version tags with manual approval.
- [ ] #3 scripts/deploy.mjs <staging|production> performs the same steps from a workstation and, when Hetzner, R2, DNS or GitHub secrets are missing, prints NEEDS-INPUT with the variable names (never values), runs the dry-run path (image builds, migrate diff against a fresh local database, tests) and exits 0.
- [ ] #4 The db.backup job writes a nightly compressed pg_dump of the app data to the R2 backups bucket with a 30-day lifecycle rule; the db.keepalive job and the uptime check keep Supabase Free awake; restore steps are written down.
- [ ] #5 The README section Environments and credentials lists the credentials, who provides them, the monthly cost and what stays blocked without them.
- [ ] #6 The runbook creates zivali-private, zivali-media and zivali-backups in the R2 EU jurisdiction (CORS rule on zivali-private, 30-day lifecycle on zivali-backups, public access for zivali-media) per ADR-014; scripts/deploy.mjs checks each bucket with HeadBucket on the EU endpoint and prints NEEDS-INPUT when one is missing.
- [ ] #7 Supabase cloud: Realtime 'Allow public access' is turned off (private Broadcast channels only, ADR-023); the API's exposed schemas list contains only public (ADR-021)
- [ ] #8 Retention proposal, confirm with the lawyer pack LQ list: audit_log kept 12 months then deleted, zivali-backups 30 days rolling; recorded in data-inventory.json (CH-104)
<!-- AC:END -->
