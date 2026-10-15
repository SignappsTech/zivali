---
id: TASK-5.1
title: >-
  Hetzner deploy: Docker Compose + nginx/certbot, direct image transfer (no
  registry), migrations, rollback, nightly backup to R2
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 14:39'
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
- [x] #1 deploy/docker-compose.yml runs nginx and certbot (one edge per VPS), web (Next.js standalone), api and worker (same image) with restart policies, healthchecks, log rotation and per-environment .env files; the nginx config serves the web and api hostnames over HTTPS (certbot DNS-01 through Cloudflare) with security headers.
- [x] #2 GitHub Actions deploy.yml builds the linux/arm64 images on the runner and transfers them straight to the VPS over SSH (docker save | zstd | docker load, no registry), runs `prisma migrate deploy` in a one-off api container, brings the stack up healthy and runs smoke checks (/ping, /v1/health/ready, the web version, web home, ADR-021 exposure GETs), rolling back to the running release on failure; production runs on version tags with manual approval.
- [x] #3 scripts/deploy.mjs <staging|production> performs the same steps from a workstation and, when Hetzner, R2, DNS or GitHub secrets are missing, prints NEEDS-INPUT with the variable names (never values), runs the dry-run path (image builds, migrate diff against a fresh local database, tests) and exits 0.
- [x] #4 The db.backup job writes a nightly compressed pg_dump of the app data to the R2 backups bucket with a 30-day lifecycle rule; the db.keepalive job and the uptime check keep Supabase Free awake; restore steps are written down.
- [x] #5 The README section Environments and credentials lists the credentials, who provides them, the monthly cost and what stays blocked without them.
- [x] #6 The runbook creates zivali-private, zivali-media and zivali-backups in the R2 EU jurisdiction (CORS rule on zivali-private, 30-day lifecycle on zivali-backups, public access for zivali-media) per ADR-014; scripts/deploy.mjs checks each bucket with HeadBucket on the EU endpoint and prints NEEDS-INPUT when one is missing.
- [ ] #7 Supabase cloud: Realtime 'Allow public access' is turned off (private Broadcast channels only, ADR-023); the API's exposed schemas list contains only public (ADR-021). Client, Supabase dashboard, project najdimo: Project Settings > Data API > Exposed schemas: remove everything but `public` (e.g. graphql_public), Save; Realtime > Settings > turn off 'Allow public access', Save. `node scripts/deploy.mjs staging` (read-only GETs) then prints no Supabase NEEDS-INPUT.
- [x] #8 Retention proposal, confirm with the lawyer pack LQ list: audit_log kept 12 months then deleted, zivali-backups 30 days rolling; recorded in data-inventory.json (CH-104)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Delivered (branch agent/task-5.1-deploy; review round 1 fixed: CHANGES 1-14). Hostnames (config: /opt/zivali/edge.env + WEB_HOST/API_HOST, not code): staging.najdimo.si (web), api-staging.najdimo.si (API); production najdimo.si + www.najdimo.si (web, www redirects), api.najdimo.si (API); media.najdimo.si = R2 custom domain (no nginx block). Single-level names because Cloudflare proxies them and free Universal SSL covers *.najdimo.si only.

- deploy/docker-compose.yml: per-environment project zivali-<env> (api, worker = same image, web), `pull_policy: never` (images arrive with docker load), healthchecks (api /v1/health/ready, web /api/health; node fetch, start_interval 2 s); one nginx + one certbot per VPS (project zivali-edge, profile edge, shared network zivali-edge with <env>-api/<env>-web aliases); restart unless-stopped; json-file rotation 5 x 10 MB; env files /opt/zivali/<env>/.env, web.env, release.env, /opt/zivali/edge.env.
- nginx (nginx:1.30-alpine, templates/zivali.conf.template rendered from edge.env): HTTP->HTTPS, TLS 1.2/1.3, HSTS + nosniff + Referrer-Policy + X-Frame-Options only when the app sent none, gzip, proxy_pass per request (Docker DNS; a missing environment is a 502), X-Forwarded-For/X-Real-IP = $remote_addr, X-Forwarded-Proto, X-Forwarded-Host = $host and `Forwarded ""` (client values never reach Next Server Actions/Express), real IP from CF-Connecting-IP only for Cloudflare ranges, API bodies <= 2 MB, unknown SNI: handshake rejected, known SNI + unknown Host: 444, no access log. start.sh waits for the first certificate, reloads every 12 h.
- certbot/dns-cloudflare:v5.8.0: DNS-01, renew loop twice a day; token CERTBOT_CLOUDFLARE_TOKEN only (Zone DNS Edit on najdimo.si; no fallback); deploy.mjs writes /opt/zivali/cloudflare.ini (0600, via SSH stdin); first issuance = one-off docker run in deploy/README.md.
- No registry (GHCR dropped): images zivali-api:<sha|tag> and zivali-web:<env>-<sha|tag> are built locally (buildx --platform linux/arm64 --load) and streamed: docker save | zstd -T0 -3 | ssh "zstd -dc | docker load".
- scripts/deploy.mjs <staging|production> [--deploy] [--strict] [--skip-images] [--yes] | --close-ssh. Without --deploy nothing is written anywhere (no firewall rule, no file on the VPS, no image transfer): read-only checks (credentials by group, names only; HeadBucket x3 on the EU endpoint; Supabase exposed schemas + Realtime private_only via Management API GETs; `remote.sh check` over SSH), then the dry run (arm64 builds unless --skip-images, migrations from zero on scratch DB zivali_dry_run_<pid> + prisma migrate diff --exit-code, ADR-021 security tests, DB dropped), exit 0. --deploy (CI: --deploy --strict): temporary port-22 rule for this IPv4 (only when HETZNER_API_TOKEN + HETZNER_FIREWALL_ID), build, scp deploy/, cloudflare.ini, image transfer, `remote.sh deploy`, smoke (GETs only: /ping, /v1/health/ready, web /api/health version === tag, web home, PostgREST root + public/app-profile GETs on profiles, audit_log, app_config refused), then `remote.sh promote`, or `remote.sh rollback` + exit 1. --close-ssh removes every "(temporary)" rule. SSH: HETZNER_KNOWN_HOSTS required (StrictHostKeyChecking=yes, no accept-new), default user deploy@. Outside world injectable (main(argv, io)); scripts/deploy.test.mjs 11 tests incl. "full fake credentials, no --deploy -> only GETs/HeadBucket/remote.sh check, firewall untouched, dry run", "--deploy opens and closes only this run's rule", "--deploy --strict + missing var -> exit 1, nothing written", "--close-ssh removes all temporary rules".
- deploy/remote.sh: check (read-only; env files present, mode 600 + owner deploy, DIRECT_URL present and not port 6543, Compose, zstd, certificate), deploy (docker image inspect of both images, one-off prisma migrate deploy, `up -d --wait --wait-timeout 180` from release.env.next, on failure re-up release.env and exit 1; nginx + certbot up, re-render, nginx -t, reload; release.env not touched), promote (release.env -> .prev, .next -> release.env, docker rmi of zivali-* tags no */release.env{,.prev,.next} names, image prune), rollback (drop .next, re-up release.env; exit 1 when there is none).
- .github/workflows/deploy.yml: staging on workflow_run of ci (success, push to main), production on tags v*.*.* in environment production (required reviewers); `node scripts/deploy.mjs <env> --deploy --strict`, then `if: always()` `--close-ssh`; permissions contents: read only (no packages: write); QEMU for the arm64 runtime stage; off until vars.DEPLOY_ENABLED == 'true'.
- Runbook deploy/README.md: §1 apt-get install zstd, deploy user (docker group, no sudo), host key fingerprint, sshd drop-in 00-zivali.conf (PermitRootLogin no, PasswordAuthentication no, KbdInteractiveAuthentication no) after testing deploy@, HETZNER_HOST=<ipv4>, HETZNER_KNOWN_HOSTS checked against the fingerprint; env files 600/deploy; session pooler 5432 for DIRECT_URL; §6 deploy/dry run; §7 automatic + manual rollback; §8 restore with PGPASSWORD via -e (no password in argv).
- db.backup job (nightly pg_dump --format=custom --schema=app to zivali-backups/db/<APP_ENV>/<date>.dump), README 'Environments and credentials', .env.example deploy names (GHCR_TOKEN, CLOUDFLARE_API_TOKEN removed), data-inventory.json retention: unchanged from round 1.

Verification (round 2; machine-load rule: no full pnpm verify, no image builds):
- node --test scripts/deploy.test.mjs: 11/11.
- node scripts/deploy.mjs staging --skip-images (worktree, no .env.local): exit 0; NEEDS-INPUT names only; migrations from zero + migrate diff + security tests 65/65 on a scratch DB, dropped.
- Read-only checks with the main checkout's credentials (`node --env-file=<main>/.env.local scripts/deploy.mjs staging --strict --skip-images`, no --deploy, no SSH because HETZNER_HOST is unset): R2 buckets ok; NEEDS-INPUT: HETZNER_HOST, HETZNER_SSH_KEY, HETZNER_KNOWN_HOSTS, WEB_HOST, API_HOST, VPS items; Supabase exposed schemas = public, graphql_public; Realtime private_only = null (default, public access on).
- remote.sh in ubuntu:24.04 with a fake docker: promote (prev/next moved, only unreferenced zivali-* tags removed), rollback (and rc 1 without an earlier release), check (mode/owner, DIRECT_URL missing and :6543, zstd), deploy with an unhealthy release (re-up of release.env, rc 1, release.env unchanged), missing image (stops before migrations), healthy deploy (.next kept for promote).
- nginx -t ok with the new template; known SNI + unknown Host: connection closed (444); unknown SNI: handshake refused; known host: 502 without upstream. shellcheck 0.10.0 (remote.sh, start.sh) and actionlint 1.7.7 clean; compose config renders (healthchecks, pull_policy never, edge project).
- Round 1 evidence kept: web arm64 image built; api runtime-stage commands ran in arm64 (pg_dump 17.11); restore drill locally.

Needs client (exact steps in deploy/README.md):
- AC#7 (still open): Supabase dashboard, project najdimo: Project Settings > Data API > Exposed schemas: remove graphql_public, keep only public, Save; Realtime > Settings > turn off 'Allow public access', Save. `node scripts/deploy.mjs staging` then prints no Supabase NEEDS-INPUT.
- Hetzner: firewall (80/443 any, 22 admin IP), HETZNER_FIREWALL_ID; VPS bootstrap §1 (deploy user, zstd, sshd hardening), HETZNER_HOST/SSH_KEY/KNOWN_HOSTS; /opt/zivali/edge.env, <env>/.env, <env>/web.env.
- Cloudflare: A/AAAA staging, api-staging, @, www, api proxied; SSL Full (strict); first certificate issuance.
- GitHub: environments staging/production (required reviewers), secrets/vars, DEPLOY_ENABLED=true; uptime monitor on https://api-staging.najdimo.si/v1/health/ready.

Follow-ups and change requests:
- CHANGE docs/tech/adr/016: CX22 -> CAX11 Arm64; Caddy -> nginx + certbot DNS-01 (zivali-edge); no registry (docker save | zstd | docker load); api-staging.najdimo.si; firewall 22 admin-only + temporary CI rule + always() --close-ssh; `--deploy` gate instead of `--dry-run`; healthchecks + promote/rollback; smoke /ping.
- CHANGE docs/tech/backend.md: env table Deploy row: drop GHCR_TOKEN; add WEB_HOST, API_HOST, CERTBOT_CLOUDFLARE_TOKEN, HETZNER_KNOWN_HOSTS (required), optional HETZNER_API_TOKEN/HETZNER_FIREWALL_ID, SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY; command row `node scripts/deploy.mjs staging [--deploy]`; repo map deploy/ = docker-compose.yml, nginx/, remote.sh, README.md.
- Staging and production jobs have separate concurrency groups; one job's always() --close-ssh removes the other's temporary rule if both run at the same moment. Option: one group for both (both use the one VPS), at the cost that a newer queued run replaces a pending one.
- CHANGE docs/legal/lawyer-briefing.md §8 (24 months) vs CH-104 (12 months) for audit_log; purge not implemented (pending LQ-19).
- Backups cover schema app only; Supabase Auth has no backup on Free (R-015).
- The api healthcheck hits /v1/health/ready every 30 s (a DB query); fine for keep-alive, worth knowing for logs.
<!-- SECTION:NOTES:END -->
