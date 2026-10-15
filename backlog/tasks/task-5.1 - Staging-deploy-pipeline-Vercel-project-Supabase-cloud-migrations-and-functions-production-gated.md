---
id: TASK-5.1
title: >-
  Hetzner deploy: Docker Compose + Caddy, GHCR images, migrations, nightly
  backup to R2
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 13:53'
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
- [x] #1 deploy/docker-compose.yml runs caddy, web (Next.js standalone), api and worker (same image) with restart policies, log rotation and per-environment .env files; the Caddyfile serves the web and api hostnames with automatic HTTPS and security headers.
- [x] #2 GitHub Actions deploy.yml builds and pushes images to GHCR, then over SSH pulls, runs `prisma migrate deploy` in a one-off api container, restarts the stack and runs smoke checks (/ping, /v1/health/ready, web home, ADR-021 exposure checks); production runs on version tags with manual approval.
- [x] #3 scripts/deploy.mjs <staging|production> performs the same steps from a workstation and, when Hetzner, R2, DNS or GitHub secrets are missing, prints NEEDS-INPUT with the variable names (never values), runs the dry-run path (image builds, migrate diff against a fresh local database, tests) and exits 0.
- [x] #4 The db.backup job writes a nightly compressed pg_dump of the app data to the R2 backups bucket with a 30-day lifecycle rule; the db.keepalive job and the uptime check keep Supabase Free awake; restore steps are written down.
- [x] #5 The README section Environments and credentials lists the credentials, who provides them, the monthly cost and what stays blocked without them.
- [x] #6 The runbook creates zivali-private, zivali-media and zivali-backups in the R2 EU jurisdiction (CORS rule on zivali-private, 30-day lifecycle on zivali-backups, public access for zivali-media) per ADR-014; scripts/deploy.mjs checks each bucket with HeadBucket on the EU endpoint and prints NEEDS-INPUT when one is missing.
- [ ] #7 Supabase cloud: Realtime 'Allow public access' is turned off (private Broadcast channels only, ADR-023); the API's exposed schemas list contains only public (ADR-021)
- [x] #8 Retention proposal, confirm with the lawyer pack LQ list: audit_log kept 12 months then deleted, zivali-backups 30 days rolling; recorded in data-inventory.json (CH-104)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Delivered (branch agent/task-5.1-deploy). Hostnames (config: /opt/zivali/edge.env + WEB_HOST/API_HOST, not code): staging.najdimo.si (web), api-staging.najdimo.si (API); production najdimo.si + www.najdimo.si (web, www redirects), api.najdimo.si (API); media.najdimo.si = R2 custom domain (no nginx block). Single-level names because Cloudflare proxies them and free Universal SSL covers *.najdimo.si only.

- deploy/docker-compose.yml: per-environment project zivali-<env> (api, worker = same image, web); one nginx + one certbot per VPS (project zivali-edge, profile edge, shared network zivali-edge with <env>-api/<env>-web aliases); restart unless-stopped; json-file rotation 5 x 10 MB; env files /opt/zivali/<env>/.env, web.env, release.env, /opt/zivali/edge.env.
- nginx (client request: nginx instead of Caddy): nginx:1.30-alpine, deploy/nginx/templates/zivali.conf.template rendered from edge.env; HTTP->HTTPS, TLS 1.2/1.3, HSTS + nosniff + Referrer-Policy + X-Frame-Options only when the app sent none (map on $upstream_http_*), gzip, proxy_pass per request (Docker DNS resolver, so a missing environment is a 502, not a dead nginx), X-Forwarded-For/X-Real-IP = $remote_addr, X-Forwarded-Proto, real IP from CF-Connecting-IP only for Cloudflare ranges (deploy/nginx/cloudflare-ips.conf, refresh one-liner in the runbook), API bodies <= 2 MB, unknown SNI rejected, no access log, server_tokens off. nginx/start.sh waits for the first certificate (no crash loop), reloads every 12 h for renewed certs.
- certbot/dns-cloudflare:v5.8.0 (arm64 manifest checked): DNS-01, renew loop twice a day; token from CERTBOT_CLOUDFLARE_TOKEN, else CLOUDFLARE_API_TOKEN (Zone DNS Edit on najdimo.si only); deploy.mjs writes /opt/zivali/cloudflare.ini (0600, via SSH stdin, never committed); first issuance = documented one-off docker run in deploy/README.md (one cert, CERT_NAME=najdimo.si, five SANs).
- deploy/remote.sh: `check` (read-only, piped over SSH: env files, edge.env, Compose, certificate; NEEDS-INPUT lines) and `deploy` (pull, one-off prisma migrate deploy in an api container, up api/worker/web, nginx + certbot up, re-render templates, nginx -t, reload; release.env replaced only after success; release.env.prev for rollback).
- Images for the Hetzner CAX11 (linux/arm64): build stages FROM --platform=$BUILDPLATFORM; api runtime stage installs openssl + postgresql-client-17 (PGDG; apt/curl retries) and fetches the Prisma schema engine for the target platform; web = Next standalone, runtime stage only copies; sharp dropped from the standalone (next/image unused; comment says what to copy when it is).
- scripts/deploy.mjs <staging|production> [--dry-run] [--skip-images] [--strict] [--yes] + scripts/deploy.test.mjs (7 tests). Checks: credentials by group (names only), HeadBucket on zivali-private/-media/-backups at the EU endpoint, Supabase exposed schemas == public and Realtime private_only (read-only Management API GETs), remote.sh check over SSH. Missing -> NEEDS-INPUT + dry run (arm64 builds, migrations from zero on scratch DB zivali_dry_run_<pid> on the local server + prisma migrate diff --exit-code, ADR-021 security tests, DB dropped), exit 0. Deploy: buildx --push, scp deploy/, cloudflare.ini, remote.sh with a one-shot GHCR login, smoke (/ping, /v1/health/ready, web home, PostgREST root + GET/app-profile/POST on profiles, audit_log, app_config refused). Optional HETZNER_API_TOKEN + HETZNER_FIREWALL_ID: temporary port-22 rule for the runner's IPv4 (firewall keeps 22 admin-only).
- .github/workflows/deploy.yml: staging on workflow_run of ci (success, push to main), production on tags v*.*.* in environment production (required reviewers = approval); both run `node scripts/deploy.mjs <env> --strict`; QEMU (setup-qemu-action v4.4.0, SHA-pinned) for the arm64 runtime stage; off until vars.DEPLOY_ENABLED == 'true'. ci.yml: commented stub replaced by a pointer; `pnpm images` builds web too.
- db.backup job: pg_dump --format=custom --schema=app (libpq env from DATABASE_URL, no password on the command line, Prisma ?schema dropped) to zivali-backups/db/<APP_ENV>/<date>.dump; no-op in local; 5 tests. db.keepalive unchanged (6 h).
- deploy/README.md runbook; README 'Environments and credentials'; .env.example deploy names; data-inventory.json retention (audit_log 12 months, zivali-backups 30 days rolling; CH-104, pending LQ-19).

Verification:
- `node scripts/deploy.mjs staging --skip-images` (no credentials): exit 0. NEEDS-INPUT: Hetzner: HETZNER_HOST, HETZNER_SSH_KEY; GitHub: GHCR_TOKEN; Hostnames: WEB_HOST, API_HOST; TLS: CERTBOT_CLOUDFLARE_TOKEN or CLOUDFLARE_API_TOKEN; R2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY; Supabase: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF; VPS (checked over SSH once HETZNER_* are set): edge.env, staging/.env, staging/web.env, TLS certificate. Migrations from zero + migrate diff (no difference) + security tests 36/36, scratch DB dropped.
- Full dry run with images (before the nginx switch; Dockerfiles unchanged since except apt retries): web arm64 image ok (326 s; started under QEMU: Next 'Ready', then fails fast on the missing build-time NEXT_PUBLIC_*, as designed). api arm64 image failed both allowed local builds for environment reasons: Docker Desktop had no arm64 binfmt (registered with tonistiigi/binfmt --install arm64), then DNS failure resolving deb.debian.org mid-apt. Cap of two builds reached, so the api runtime-stage commands ran once in an arm64 node:22-slim container: pg_dump 17.11 on aarch64, about 11 minutes under QEMU on this loaded machine. The full api image build is first confirmed by CI (images job, amd64) and the deploy job (arm64), or one more local build if allowed.
- nginx config: rendered and run with a throwaway self-signed cert and an echo upstream: nginx -t ok; API proxied with HSTS/nosniff/Referrer/X-Frame added, client-sent X-Forwarded-For replaced, X-Forwarded-Proto https; web without upstream 502; http -> https 301; www -> apex 301; unknown SNI handshake refused; template re-render + reload ok; start.sh waits without a cert. Compose config renders both projects. actionlint 1.7.7 and shellcheck (remote.sh, start.sh) clean.
- Restore drill locally: pg_dump 17 -n app -> scratch DB task_5_1 migrated -> pg_restore --clean --if-exists --no-owner --no-privileges --schema=app -> counts match, test:security 36/36; task_5_1 dropped.

Needs client (exact steps in deploy/README.md):
- AC#7 Supabase dashboard, project najdimo: Project Settings > Data API > Exposed schemas = only `public` (remove graphql_public), save; Realtime > Settings > turn off 'Allow public access'. Then `node scripts/deploy.mjs staging --dry-run` with SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF set confirms both (read-only GETs). Nothing was applied to the hosted project by this task.
- Hetzner CAX11 (keep IPv4, backups off), Cloud Firewall 80/443 open, 22 admin IP only; deploy user; /opt/zivali/edge.env, <env>/.env, <env>/web.env (DATABASE_URL/DIRECT_URL = Supabase session pooler with ?schema=app).
- Cloudflare: A/AAAA records staging, api-staging, @, www, api proxied; SSL mode Full (strict); DNS-edit token; first certificate issuance (one-off command).
- GitHub environments staging/production (required reviewers), secrets/vars, DEPLOY_ENABLED=true; free uptime monitor on https://api-staging.najdimo.si/v1/health/ready every 5 min.

Follow-ups and change requests:
- CHANGE docs/tech/adr/016: CX22 -> CAX11 Arm64 (linux/arm64, Buildx + QEMU); Caddy -> nginx + certbot DNS-01 (one edge per VPS, zivali-edge); hostnames api-staging.najdimo.si instead of api.staging.<domain>; firewall 22 admin-only with a temporary CI rule; env files /opt/zivali/<env>/{.env,web.env} + edge.env; smoke /ping (ADR says /health).
- CHANGE docs/tech/backend.md: env table Deploy row += WEB_HOST, API_HOST, CERTBOT_CLOUDFLARE_TOKEN|CLOUDFLARE_API_TOKEN, HETZNER_KNOWN_HOSTS, HETZNER_API_TOKEN, HETZNER_FIREWALL_ID, optional GHCR_OWNER/GHCR_USER, SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY (web build); SUPABASE_DB_PASSWORD and EXPO_TOKEN are not used by deploy.mjs; repo map deploy/ = docker-compose.yml, nginx/, remote.sh, README.md (no Caddyfile); command row += --skip-images/--strict/--yes. Pre-existing: backend.md says SUPABASE_SECRET_KEY, lib/config.ts reads SUPABASE_SERVICE_ROLE_KEY.
- CHANGE docs/legal/lawyer-briefing.md §8 says 24 months for the admin audit log; CH-104/AC#8 propose 12 months; align after LQ-19. The audit_log purge itself is not implemented (pending confirmation).
- docs/client-todo.md still says CX22.
- Backups cover schema app only; Supabase Auth accounts have no backup on Free (R-015: Pro).
- GHCR private packages: free tier about 500 MB storage and 1 GB transfer per month; VPS pulls count; prune old tags.
- Pre-existing: `pnpm install` ends with ERR_PNPM_IGNORED_BUILDS for @scarf/scarf (swagger-ui-dist), so every `pnpm <script>` re-runs install; fix with `'@scarf/scarf': false` in allowBuilds.
- Pre-existing shared-DB pollution: the local postgres DB carries migration 20261015105000_task_15_8_geocoder from another branch, so data-inventory.test fails there; it passes on a fresh DB (dry run).
<!-- SECTION:NOTES:END -->
