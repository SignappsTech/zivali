# ADR-016: One Hetzner VPS with Docker Compose and Caddy; Supabase Free; R2; GitHub Actions; `pnpm verify` locally

- Status: Accepted (revised 2026-10-15 for brief v1.0; replaces the Vercel version; amended 2026-10-18 with the as-built decisions below, CH-151, CH-158, CH-214; amended 2026-10-19 for the CI split and the deploy build cache, TASK-4.6) · Owner: Tech Lead
- Source: brief v1.0 §Technical (hosting about €5–10/month), NFR-AVAIL, NFR-DEVX, TASK-4, TASK-5, R-001, R-015

## Decision

- **Environments**
  - Local: `supabase start` (Postgres 17 + PostGIS + pgvector, Auth, Realtime, mail catcher) + `docker compose -f docker-compose.dev.yml up` (MinIO) + `pnpm dev` (api, worker, web) + Expo dev client. All mocks, offline.
  - Staging: one Hetzner Cloud VPS (CX22-class, 2 vCPU, 4 GB, EU, about €4–5/month) with Docker Compose: `caddy` (TLS, reverse proxy), `web` (Next.js standalone), `api` (Express), `worker` (pg-boss). Database and Auth: Supabase project `najdimo` (eu-central-1, Free). Photos and backups: Cloudflare R2. Hostnames `staging.<domain>` and `api.staging.<domain>` (until a domain exists: the VPS IP with a `sslip.io` name).
  - Production: same compose on the same VPS under separate names and a separate Supabase project when the pilot goes public (or a second VPS if load requires); upgrade Supabase to Pro when limits or backup needs require (R-015).
- **No Vercel**: Hobby forbids commercial use; Next.js runs as `output: 'standalone'` in its own container.
- **Images**: GitHub Actions builds `api` (also used by the worker) and `web` images (multi-stage, pnpm `deploy --prod`), pushes to GHCR, then deploys over SSH: `docker compose pull` → one-off `api` container `prisma migrate deploy` → `docker compose up -d` → smoke checks (`/health`, `/v1/health/ready`, web home, the ADR-021 exposure checks). Rollback: redeploy the previous image tag; database fixes are forward migrations.
- **Caddy**: automatic HTTPS, security headers for the API, gzip/zstd, `api.` → api:4000, apex/`www` → web:3000.
- **Backups**: nightly `db.backup` job (worker image includes `pg_dump`) writes a compressed dump to the `zivali-backups` R2 bucket (30-day lifecycle); restore drill in M5. Supabase Free has no point-in-time recovery; RPO 24 h.
- **Keep-alive**: Supabase Free pauses after a week without activity; real traffic plus the `db.keepalive` job every 6 h and the uptime check on `/v1/health/ready` (touches the DB) prevent it.
- **CI**: `.github/workflows/ci.yml` on pull requests and main (repository `SignappsTech/zivali`; which gates run where: §As built, CI split); deploy workflow on main (staging) and on tags with manual approval (production). Secrets live in GitHub Actions secrets and on the VPS in `/opt/zivali/.env` (mode 600), never in images. `pnpm verify` runs the same gates locally and is required before an implementer reports done.
- **Credential gating**: `scripts/deploy.mjs <env> [--dry-run]` checks the required variables; missing ones print `NEEDS-INPUT:` with names (never values) and the script runs the dry-run path (build images, `prisma migrate diff` against a fresh local database, tests) and exits 0.

## As built (TASK-5.1, CH-151, CH-158; where this differs from the Decision above, this section wins)

- **Server**: Hetzner CAX11 (arm64), not CX22. The deploy user is the only login; root login and passwords are off. Port 22 is open to the admin IP only, plus a temporary CI rule that `always()` `--close-ssh` removes (all temporary port-22 rules) after the run.
- **Edge**: nginx + certbot with the DNS-01 challenge (Cloudflare), one edge project per VPS, instead of Caddy. Hostnames: staging `staging.najdimo.si` / `api-staging.najdimo.si`; production `najdimo.si` (+ `www`) / `api.najdimo.si`; `media.najdimo.si` = the R2 custom domain. Env files live under `/opt/zivali`.
- **No registry (no GHCR)**: images are built locally or in CI with `--load` and sent as `docker save | zstd | ssh docker load`. Smoke checks hit `/ping`.
- **Deploy sequence** (CH-214): one-off api container `prisma migrate deploy`, then a second one-off api container runs the seed (`node dist/seed/apps/api/prisma/seed.js`: reference data, idempotent, keeps admin edits; fixture seeders skip outside `APP_ENV=local`), then `up`. A failed seed fails the release like a failed migration. The api build emits `dist/seed/` (tsup.config.ts).
- **Deploy script**: `scripts/deploy.mjs <env> --deploy` is the gate instead of `--dry-run`. Compose healthchecks; promote and rollback via `release.env` / `release.env.prev` (the last 2 tags are kept).
- **CI split** (TASK-4.6, owner 2026-10-19; goal: push to live on staging in about 12–15 minutes): the full `pnpm verify` stays local (each implementer, and merge.mjs before every merge to main); CI `verify` runs only `pnpm verify:static`, the build of the packages web needs, `pnpm audit` and the web e2e (4 workers, mock API, no database), and is the only required check. `quality` runs nightly and on demand (`quality.yml`), `images` only on Docker-relevant changes (`images.yml`); superseded runs are cancelled; pushes that touch only `docs/**`, `backlog/**` or Markdown start no `ci` or `mobile`, so no deploy (the tokens source and one e2e fixture under `docs/` still count). The staging deploy still runs only after a successful `ci` on a push to main. Accepted risk: a lint, type or unit failure that merge.mjs missed (a direct push without it) reaches staging; the next local `pnpm verify` catches it.
- **Deploy build cache** (TASK-4.6): in Actions, `docker/setup-buildx-action` (a docker-container builder; the docker driver cannot export a cache) and an `actions/github-script` step that exposes the runtime token and cache URLs to the run steps; `deploy.mjs` then adds `--cache-from`/`--cache-to type=gha,mode=min,ignore-error=true` with one scope per image (`api`, `web-<env>`). A workstation deploy passes no cache flags. mode=min because both Dockerfiles copy the whole repo before `pnpm install`, so the build-stage layers change on every commit; the hit is the final stage (the api's emulated apt-get layer). Moving the install before the source copy (and then mode=max) is the next step for speed.

## Consequences

- Monthly cost at start: VPS about €4–5, Supabase Free €0, R2 free tier €0, EAS free tier; domain extra.
- One VPS is a single point of failure; acceptable for the pilot (NFR-AVAIL 99.5 %), with Compose restart policies, an external uptime check and a written restore procedure.
- New client items: Hetzner project and API token (or SSH access to a VPS), Cloudflare account with R2 enabled and keys, DNS for the domain.
