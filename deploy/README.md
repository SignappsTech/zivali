# Deploy runbook: Hetzner VPS, Supabase, R2 (ADR-016)

One Hetzner Cloud **CAX11** (Arm64 Ampere, 2 vCPU, 4 GB, 40 GB disk, Ubuntu 24.04, EU) runs everything with Docker Compose:

| Compose project     | Services                                 | Hostnames (`DOMAIN`)                   |
| ------------------- | ---------------------------------------- | -------------------------------------- |
| `zivali-staging`    | api, worker (same image), web            | `staging.DOMAIN`, `api.staging.DOMAIN` |
| `zivali-production` | api, worker, web                         | `DOMAIN`, `www.DOMAIN`, `api.DOMAIN`   |
| `zivali-edge`       | caddy (TLS, proxy, headers), one per VPS | all of the above                       |

Database and Auth: Supabase project `najdimo` (staging, Free). Photos and nightly database dumps: Cloudflare R2 (EU jurisdiction). Images: GHCR (`ghcr.io/pbozic/zivali-api`, `ghcr.io/pbozic/zivali-web`), built for `linux/arm64`.

On the VPS everything lives in `/opt/zivali/`:

    docker-compose.yml, Caddyfile, remote.sh     copied from deploy/ on every deploy
    staging/.env         api and worker variables (mode 600)
    staging/web.env      web server variables (mode 600)
    staging/release.env  API_IMAGE, WEB_IMAGE, APP_VERSION of the running release (written by remote.sh)
    staging/release.env.prev   the release before it (rollback)
    production/…         the same for production

The deploy itself is `node scripts/deploy.mjs <staging|production>` (workstation) or `.github/workflows/deploy.yml` (CI, which runs the same script). Anything missing prints `NEEDS-INPUT` with the names and runs the dry run instead.

## 1. VPS (once)

1. Hetzner Cloud console, project `najdimo`, **Add server**: type **CAX11** (Arm64), image **Ubuntu 24.04**, location Falkenstein, Nuremberg or Helsinki, your SSH key. Networking: keep the **public IPv4** (GitHub runners and many networks reach the server over IPv4 only) and IPv6. **Backups: off** (the server is stateless; database dumps go to R2). Cost about €7.31/month incl. VAT with the IPv4. If production needs more room, resize to **CAX21** (4 vCPU, 8 GB) in the console (Rescale, keep the disk size so you can scale back).
2. **Firewall** (Firewalls, Create firewall, apply to the server). Inbound: TCP 80 and TCP 443 and UDP 443 (HTTP/3) from any IPv4 and IPv6; TCP 22 from the admin IP only. Outbound: leave open.
   CI deploys over SSH from GitHub's runners, whose IPs change. Give the workflow `HETZNER_API_TOKEN` (Security, API tokens, Read & Write) and `HETZNER_FIREWALL_ID` (the number in the firewall's URL): `scripts/deploy.mjs` adds a temporary port 22 rule for the runner's IPv4 and removes it when the deploy ends. Without them, run deploys from the admin machine.
3. As root, once:

    ```sh
    apt-get update && apt-get -y upgrade            # unattended-upgrades is on by default in Ubuntu 24.04
    curl -fsSL https://get.docker.com | sh           # Docker Engine and the Compose plugin (arm64)
    adduser --disabled-password --gecos "" deploy && usermod -aG docker deploy
    install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
    cp ~/.ssh/authorized_keys /home/deploy/.ssh/ && chown deploy: /home/deploy/.ssh/authorized_keys
    install -d -o deploy -g deploy -m 750 /opt/zivali /opt/zivali/staging /opt/zivali/production
    sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && systemctl reload ssh
    ```

4. CI deploy key: `ssh-keygen -t ed25519 -f zivali-deploy -C github-actions -N ""`; append `zivali-deploy.pub` to `/home/deploy/.ssh/authorized_keys`; the private key is the secret `HETZNER_SSH_KEY`; `ssh-keyscan -t ed25519 <ipv4>` is `HETZNER_KNOWN_HOSTS`; `HETZNER_HOST=deploy@<ipv4>`. A workstation uses its own key (`HETZNER_SSH_KEY` may be a path to the key file).
5. Environment files, as `deploy`, mode 600 (`umask 077` first). Values never go into Git or images.
    - `/opt/zivali/staging/.env`: the apps/api block of the root `.env.example`, plus `APP_ENV=staging` and `DOMAIN` (both also drive Compose, see `docker-compose.yml`). Database: Supabase **Connect, Session pooler** (IPv4; containers have no IPv6 by default) for both `DATABASE_URL` and `DIRECT_URL`, each ending in `?schema=app`. Secrets `RATE_SALT`, `IDEMPOTENCY_KEY`, `FUZZ_SECRET`: `openssl rand -hex 32` each, per environment. `STORAGE_PROVIDER=r2` with the `R2_*` values and `MEDIA_BASE_URL`. Every other adapter is configured or explicitly `off` (`PAYMENTS_PROVIDER`, `EMAIL_PROVIDER`, `PUSH_PROVIDER`, `CAPTCHA_PROVIDER`, `AI_PROVIDER`, `EMBEDDER_PROVIDER`); `mock` is refused outside local. `WEB_ORIGINS=https://staging.DOMAIN`.
    - `/opt/zivali/staging/web.env`: `APP_ENV=staging`, `R2_UPLOAD_ORIGIN=https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com`, and `GA_PROPERTY_ID`/`GA_SERVICE_ACCOUNT_KEY_FILE` only once partner stats are on. `NEXT_PUBLIC_*` values do not go here: they are baked into the web image at build time by `scripts/deploy.mjs` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DOMAIN` and the optional `NEXT_PUBLIC_*` it is given).
    - Production: the same under `/opt/zivali/production/`, with the production Supabase project and `APP_ENV=production`; the same `DOMAIN` in both.
    - Never paste the output of `docker compose config`: it prints the values.

## 2. DNS

With a domain (Cloudflare DNS or any other): A records (and AAAA for the IPv6) for `staging`, `api.staging`, `@`, `www` and `api`, all pointing at the VPS. On Cloudflare set them to **DNS only** (grey cloud) so Caddy can obtain its Let's Encrypt certificates. `DOMAIN` is the bare domain, for example `najdimo.si`.

Until a domain exists: `DOMAIN=<ipv4 with dashes>.sslip.io` (for example `203-0-113-10.sslip.io`); sslip.io resolves `staging.203-0-113-10.sslip.io` to the IP, no records needed. Don't ship store builds on that name. Production hostnames without a deployed production stack answer 502; Caddy keeps retrying their certificates until their DNS points here.

## 3. R2 buckets (EU jurisdiction, ADR-014)

Create them once, from a machine with `npx wrangler login` done on the client's Cloudflare account. The jurisdiction cannot be changed later; every S3 call uses `https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com`.

```sh
for b in zivali-private zivali-media zivali-backups; do npx wrangler r2 bucket create $b --jurisdiction eu; done
# 30-day lifecycle on the backups (CH-104: 30 days rolling)
npx wrangler r2 bucket lifecycle add zivali-backups expire-30d --expire-days 30 --jurisdiction eu
# CORS on the private bucket: presigned PUT/GET from the web origins (mobile is not subject to CORS)
npx wrangler r2 bucket cors set zivali-private --file r2-cors.json --jurisdiction eu
# Public read for the published photos: a custom domain on the Cloudflare zone (or `r2 bucket dev-url enable`)
npx wrangler r2 bucket domain add zivali-media --domain media.<domain> --zone-id <zone id> --jurisdiction eu
```

`r2-cors.json` (local file, not committed; list every web origin):

```json
{
	"rules": [
		{
			"allowed": {
				"origins": ["https://staging.<domain>", "https://<domain>"],
				"methods": ["PUT", "GET"],
				"headers": ["Content-Type"]
			},
			"maxAgeSeconds": 3600
		}
	]
}
```

Then an **R2 API token** (Object Read & Write, limited to the three buckets) gives `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`; `R2_ACCOUNT_ID` is on the R2 overview page. Check that public access works for the EU bucket (open an uploaded test object at `MEDIA_BASE_URL`); if it does not, Caddy proxies `media.<domain>` to the bucket instead (ADR-014). `node scripts/deploy.mjs staging --dry-run` runs `HeadBucket` on each bucket at the EU endpoint and prints `NEEDS-INPUT` for a missing one.

## 4. Supabase cloud settings (client, in the dashboard)

For project `najdimo` (and later the production project):

1. **Project Settings, Data API, Exposed schemas**: only `public` (remove `graphql_public` if listed); save. App tables live in `app`, which is never exposed (ADR-021).
2. **Realtime, Settings**: turn **off** "Allow public access", so only private Broadcast channels work (ADR-023).
3. **Connect, Session pooler**: the connection string for `DATABASE_URL` and `DIRECT_URL` in `/opt/zivali/<env>/.env` (add `?schema=app`).

`scripts/deploy.mjs` checks 1 and 2 before every deploy with read-only Management API calls (`GET /v1/projects/{ref}/postgrest` and `GET /v1/projects/{ref}/config/realtime`, needs `SUPABASE_ACCESS_TOKEN`) and prints `NEEDS-INPUT` with the dashboard step when one is off. After the first deploy, load the reference data once from a checkout with that `DATABASE_URL`: `pnpm --filter api db:seed` (fixture seeders skip themselves outside local).

## 5. GitHub Actions

- Environments `staging` and `production` (Settings, Environments). `production`: **Required reviewers** (the manual approval) and deployment tags `v*`.
- Secrets per environment: `HETZNER_HOST`, `HETZNER_SSH_KEY`, `HETZNER_KNOWN_HOSTS`, `HETZNER_API_TOKEN`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `SUPABASE_ACCESS_TOKEN`. Variables per environment: `DOMAIN`, `HETZNER_FIREWALL_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_REF`, `STAGING_URL`/`PRODUCTION_URL` (shown on the run), and optionally `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test only). GHCR uses the workflow's own `GITHUB_TOKEN`.
- Repository variable `DEPLOY_ENABLED=true` switches the workflow on. Until then nothing deploys; with it on and a secret missing, the job fails with `NEEDS-INPUT` and the names.
- Images are built on `ubuntu-24.04` with Docker Buildx for `linux/arm64`: the JS builds run natively, only the api image's runtime stage (apt-get, Prisma engine) runs under QEMU. Alternative: `runs-on: ubuntu-24.04-arm` builds natively without QEMU (check that Arm runners are available for this private repository's plan first).

## 6. Deploy

- **Staging**: every push to `main` that passes `ci` deploys automatically. From a workstation: `node scripts/deploy.mjs staging` (values from the root `.env.local`; a clean working tree).
- **Production**: `git tag v1.2.3 && git push origin v1.2.3`, then approve the run in the `production` environment. From a workstation: check out the tag, `node scripts/deploy.mjs production --yes` (values from `.env.production.local`).
- Steps: checks (credentials, R2 buckets, Supabase settings, the VPS env files) → build and push `zivali-api:<sha or tag>` and `zivali-web:<env>-<sha or tag>` (`linux/arm64`) → copy `deploy/` to `/opt/zivali` → `remote.sh`: pull, one-off `prisma migrate deploy` in an api container, `up -d` api, worker and web, start or reload Caddy → smoke checks (`/ping`, `/v1/health/ready`, web home, PostgREST with the public key reaches no app table). A failed migration leaves the running release untouched.
- Dry run without deploying: `node scripts/deploy.mjs staging --dry-run` (add `--skip-images` to skip the two image builds): builds both arm64 images, applies all migrations to a scratch database on the local Supabase server, runs `prisma migrate diff` against `prisma/schemas` and the ADR-021 security tests on it, then drops the scratch database.

## 7. Rollback

Images: the previous release is still on the VPS. As `deploy`:

```sh
cd /opt/zivali
cat staging/release.env.prev                       # API_IMAGE, WEB_IMAGE, APP_VERSION before the last deploy
docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env.prev up -d api worker web
cp staging/release.env.prev staging/release.env
```

Or redeploy an older commit or tag through the workflow (re-run its job). The database only moves forward: a bad migration is fixed with a new migration, never by rolling back.

## 8. Backups and restore

- The worker's `db.backup` job runs nightly at 02:00 Europe/Ljubljana: `pg_dump --format=custom --schema=app` (compressed) to `zivali-backups/db/<APP_ENV>/<YYYY-MM-DD>.dump`. The bucket's lifecycle rule deletes dumps after 30 days. RPO 24 hours (Supabase Free has no point-in-time recovery).
- Not in the dump: Supabase Auth (`auth.*`, the accounts) and the job queue (`pgboss`). On Supabase Free the accounts have no backup of ours; upgrade to Pro (daily backups) when that risk is no longer acceptable (R-015).
- Check: R2 lists today's object; `docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env logs worker | grep "db backup"`; a failing dump retries 5 times, then shows as failed in `GET /v1/admin/queues`.

Restore (drill in M5):

```sh
# 1. Fetch the dump
npx wrangler r2 object get zivali-backups/db/staging/2026-10-15.dump --file restore.dump --jurisdiction eu
# 2. Stop the writers (as deploy on the VPS)
docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env stop api worker
# 3. A new or empty database first gets the extensions and schema: run the migrations (or just deploy once)
# 4. Replace schema app with the dump; pg_restore 17 ships in the api image. RESTORE_URL is DIRECT_URL without ?schema=app.
docker run --rm -i -e RESTORE_URL --entrypoint sh <api image> -c \
  'cat > /tmp/r.dump && pg_restore --clean --if-exists --no-owner --no-privileges --schema=app -d "$RESTORE_URL" /tmp/r.dump' < restore.dump
# 5. Lockdown check (ADR-021) from a checkout: DATABASE_URL=<that URL with ?schema=app> pnpm --filter api test:security
# 6. Start api and worker again; smoke: /v1/health/ready
docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env up -d api worker
```

The dump carries the tables' row level security flags and `_prisma_migrations`; grants are not dumped, so the deny-all lockdown holds after a restore.

## 9. Keep-alive, uptime and logs

- Supabase Free pauses a project after a week without activity. The worker's `db.keepalive` job queries the database every 6 hours, and an external uptime check keeps it awake too: create a free HTTPS monitor (UptimeRobot or Better Stack) on `https://api.staging.DOMAIN/v1/health/ready` every 5 minutes with an e-mail alert. That endpoint touches the database and answers 503 when it is down.
- Logs: `docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env logs -f api` (or `worker`, `web`); each container keeps at most 5 x 10 MB. Caddy writes no access log (client IPs and full URLs).
