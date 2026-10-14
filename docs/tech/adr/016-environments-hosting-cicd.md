# ADR-016: One Hetzner VPS with Docker Compose and Caddy; Supabase Free; R2; GitHub Actions; `pnpm verify` locally

- Status: Accepted (revised 2026-10-15 for brief v1.0; replaces the Vercel version) · Owner: Tech Lead
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
- **CI**: `.github/workflows/ci.yml` on pull requests and main (repository `git@github.com:pbozic/zivali.git`); deploy workflow on main (staging) and on tags with manual approval (production). Secrets live in GitHub Actions secrets and on the VPS in `/opt/zivali/.env` (mode 600), never in images. `pnpm verify` runs the same gates locally and is required before an implementer reports done.
- **Credential gating**: `scripts/deploy.mjs <env> [--dry-run]` checks the required variables; missing ones print `NEEDS-INPUT:` with names (never values) and the script runs the dry-run path (build images, `prisma migrate diff` against a fresh local database, tests) and exits 0.

## Consequences

- Monthly cost at start: VPS about €4–5, Supabase Free €0, R2 free tier €0, EAS free tier; domain extra.
- One VPS is a single point of failure; acceptable for the pilot (NFR-AVAIL 99.5 %), with Compose restart policies, an external uptime check and a written restore procedure.
- New client items: Hetzner project and API token (or SSH access to a VPS), Cloudflare account with R2 enabled and keys, DNS for the domain.
