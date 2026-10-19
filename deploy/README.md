# Deploy runbook: Hetzner VPS, nginx, Supabase, R2 (ADR-016)

One Hetzner Cloud **CAX11** (Arm64 Ampere, 2 vCPU, 4 GB, 40 GB disk, Ubuntu 24.04, EU) runs everything with Docker Compose:

| Compose project     | Services                                         | Hostnames (config, not code)                               |
| ------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| `zivali-staging`    | api, worker (same image), web                    | `staging.najdimo.si` (web), `api-staging.najdimo.si` (API) |
| `zivali-production` | api, worker, web                                 | `najdimo.si` + `www.najdimo.si` (web), `api.najdimo.si`    |
| `zivali-edge`       | nginx (TLS, proxy, headers) and certbot, one VPS | all of the above                                           |

Single-level names only: Cloudflare proxies the hostnames, and its free Universal SSL covers `najdimo.si` and `*.najdimo.si`, not `*.staging.najdimo.si`. Public photos: `https://media.najdimo.si` (R2 custom domain on `zivali-media`, served by Cloudflare, no nginx block). Database and Auth: Supabase project `najdimo` (staging, Free). Images: `zivali-api:<sha or tag>` and `zivali-web:<env>-<sha or tag>`, built for `linux/arm64` on the deploying machine and streamed to the VPS over SSH (`docker save | zstd | docker load`); no registry.

**Web-first pilot (TASK-76.1):** until the public launch the staging stack serves `najdimo.si` and `api.najdimo.si` (one environment; `staging.najdimo.si` and `www` redirect), payments in Stripe test mode, noindex by configuration: hostnames in `edge.env`, flags and the split before launch in [`docs/tech/pilot-runbook.md`](../docs/tech/pilot-runbook.md).

On the VPS everything lives in `/opt/zivali/`:

    docker-compose.yml, remote.sh, nginx/     copied from deploy/ on every deploy
    cloudflare.ini       certbot's Cloudflare token (mode 600; written by every deploy, first by hand, see TLS)
    edge.env             hostnames and CERT_NAME for nginx
    letsencrypt/         certificates (certbot)
    staging/.env         api and worker variables (mode 600)
    staging/web.env      web server variables (mode 600)
    staging/release.env  API_IMAGE, WEB_IMAGE, APP_VERSION of the running release (written by remote.sh)
    staging/release.env.prev   the release before it (rollback)
    staging/release.env.next   a release being deployed, until its smoke checks pass (promote) or fail (rollback)
    production/…         the same for production

The deploy itself is `node scripts/deploy.mjs <staging|production> --deploy` (workstation) or `.github/workflows/deploy.yml` (CI, which runs the same script). Without `--deploy` the script only runs its read-only checks and the dry run and writes nothing outside the machine. Anything missing prints `NEEDS-INPUT` with the names and runs the dry run instead.

## 1. VPS (once)

1. Hetzner Cloud console, project `najdimo`, **Add server**: type **CAX11** (Arm64), image **Ubuntu 24.04**, location Falkenstein, Nuremberg or Helsinki, your SSH key. Networking: keep the **public IPv4** (GitHub runners deploy over IPv4) and IPv6. **Backups: off** (the server is stateless; database dumps go to R2). About €7.31/month incl. VAT with the IPv4. If production needs more room, resize to **CAX21** (4 vCPU, 8 GB) in the console (Rescale; keep the disk size so you can scale back).
2. **Cloud Firewall** (Firewalls, Create firewall, apply to the server). Inbound: TCP 80 and TCP 443 from any IPv4 and IPv6; TCP 22 from the admin IP only. Outbound: leave open. Optional hardening: allow 80/443 only from Cloudflare's ranges (`deploy/nginx/cloudflare-ips.conf`).
   CI deploys over SSH from GitHub's runners, whose IPs change. Give the workflow `HETZNER_API_TOKEN` (Security, API tokens, Read & Write) and `HETZNER_FIREWALL_ID` (the number in the firewall's URL): `scripts/deploy.mjs --deploy` adds a temporary port 22 rule (description `deploy <ip> (temporary)`) for the runner's IPv4 and removes it when the deploy ends; the workflow's last step (`if: always()`) runs `scripts/deploy.mjs <env> --close-ssh`, which removes every `(temporary)` rule, so a cancelled run leaves none behind. Without them, deploy from the admin machine.
3. As root (`ssh root@<ipv4>`), once. The user `deploy` runs every deploy; it gets the `docker` group (root-equivalent on this host, so guard its keys) and no sudo: nothing in this runbook needs it.

    ```sh
    apt-get update && apt-get -y upgrade            # unattended-upgrades is on by default in Ubuntu 24.04
    apt-get install -y zstd                          # the images arrive zstd-compressed (docker save | zstd)
    curl -fsSL https://get.docker.com | sh           # Docker Engine and the Compose plugin (arm64)
    adduser --disabled-password --gecos "" deploy && usermod -aG docker deploy
    install -d -o deploy -g deploy -m 700 /home/deploy/.ssh
    install -o deploy -g deploy -m 600 ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
    install -d -o deploy -g deploy -m 750 /opt/zivali /opt/zivali/staging /opt/zivali/production
    ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub   # the host key fingerprint, for step 4
    ```

    In a second terminal, check that `ssh deploy@<ipv4> docker ps` works. Then, still as root, close root and password logins (the drop-in sorts before Ubuntu's and cloud-init's own files, and sshd keeps the first value it reads):

    ```sh
    printf 'PermitRootLogin no\nPasswordAuthentication no\nKbdInteractiveAuthentication no\n' > /etc/ssh/sshd_config.d/00-zivali.conf
    sshd -t && systemctl restart ssh
    sshd -T | grep -E '^(permitrootlogin|passwordauthentication|kbdinteractiveauthentication) '   # all three "no"
    ```

    Later root work goes through the Hetzner console (Rescue, Reset root password, then Console), not SSH.

4. CI deploy key: `ssh-keygen -t ed25519 -f zivali-deploy -C github-actions -N ""`; append `zivali-deploy.pub` to `/home/deploy/.ssh/authorized_keys`; the private key is the secret `HETZNER_SSH_KEY`. `HETZNER_KNOWN_HOSTS` (required: the host key is pinned) is the output of `ssh-keyscan -t ed25519 <ipv4>`; check it with `ssh-keyscan -t ed25519 <ipv4> | ssh-keygen -lf -`, which must print the fingerprint from step 3. `HETZNER_HOST=<ipv4>` (the user is `deploy`; `user@<ipv4>` picks another). A workstation uses its own key (`HETZNER_SSH_KEY` may be a path to the key file).
5. Files, as `deploy`, mode 600 and owned by `deploy` (`umask 077` first; `remote.sh check` reports any other mode or owner). Values never go into Git or images.
    - `/opt/zivali/edge.env` (hostnames are config; change them here and in `WEB_HOST`/`API_HOST`, then reissue the certificate):

        ```
        CERT_NAME=najdimo.si
        STAGING_WEB_HOST=staging.najdimo.si
        STAGING_ALIAS_HOSTS=alias.invalid
        STAGING_API_HOST=api-staging.najdimo.si
        PRODUCTION_WEB_HOST=najdimo.si
        PRODUCTION_API_HOST=api.najdimo.si
        ```

        `STAGING_ALIAS_HOSTS`: names that 301 to `STAGING_WEB_HOST` (the pilot: `www.najdimo.si staging.najdimo.si`, docs/tech/pilot-runbook.md §1); required and never empty (nginx refuses an empty `server_name`), `alias.invalid` when none. The API host variables take several space-separated names; the web ones exactly one.

    - `/opt/zivali/staging/.env`: the apps/api block of the root `.env.example`, plus `APP_ENV=staging` (it also picks the env files in Compose). Database: Supabase **Connect, Session pooler** (IPv4; containers have no IPv6 by default; port **5432**) for both `DATABASE_URL` and `DIRECT_URL`, each ending in `?schema=app`. Not the transaction pooler (port 6543): migrations need a session, and `remote.sh check` reports a missing `DIRECT_URL` or one on port 6543. Secrets `RATE_SALT`, `IDEMPOTENCY_KEY`, `FUZZ_SECRET`: `openssl rand -hex 32` each, per environment. `STORAGE_PROVIDER=r2` with the `R2_*` values and `MEDIA_BASE_URL=https://media.najdimo.si`. Every other adapter is configured or explicitly `off` (`PAYMENTS_PROVIDER`, `EMAIL_PROVIDER`, `PUSH_PROVIDER`, `CAPTCHA_PROVIDER`, `AI_PROVIDER`, `EMBEDDER_PROVIDER`); `mock` is refused outside local. `API_URL=https://api-staging.najdimo.si`, `APP_URL` and `WEB_ORIGINS=https://staging.najdimo.si`.
    - `/opt/zivali/staging/web.env`: `APP_ENV=staging`, `R2_UPLOAD_ORIGIN=https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com`, `MEDIA_BASE_URL=https://media.najdimo.si` (the API's value; the web fails fast without it), and `GA_PROPERTY_ID`/`GA_SERVICE_ACCOUNT_KEY_FILE` only once partner stats are on. `NEXT_PUBLIC_*` values do not go here: they are baked into the web image at build time by `scripts/deploy.mjs` (from `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `WEB_HOST`, `API_HOST` and the optional `NEXT_PUBLIC_*` it is given).
    - Payments (C13, test mode only): `PAYMENTS_PROVIDER=stripe` with `STRIPE_SECRET_KEY` (`sk_test_` of the "Najdimo sandbox" account; live keys stop the API at boot) and `STRIPE_WEBHOOK_SECRET`, else `PAYMENTS_PROVIDER=off`. `node scripts/stripe-webhook.mjs staging` creates the test-mode endpoint `https://<API_HOST>/v1/webhooks/stripe` through the Stripe API (idempotent) and writes its signing secret to the root `.env.local` without printing it; copy that line into `/opt/zivali/staging/.env`.
    - Production: the same under `/opt/zivali/production/` with the production Supabase project, `APP_ENV=production` and the production hostnames.
    - Never paste the output of `docker compose config`: it prints the values.

## 2. DNS and TLS (Cloudflare zone `najdimo.si`)

DNS: A records (and AAAA for the IPv6) for `staging`, `api-staging`, `@`, `www` and `api`, all pointing at the VPS and **proxied** (orange cloud). SSL/TLS mode: **Full (strict)** (Cloudflare checks the origin's Let's Encrypt certificate). `media` is the R2 custom domain (already live).

Certificates come from certbot with the **DNS-01** challenge (Cloudflare proxies the hostnames, so HTTP-01 is not reliable). One certificate (`CERT_NAME`) covers all five hostnames.

1. A Cloudflare **API token** with only **Zone, DNS, Edit** on the zone `najdimo.si` (My Profile, API Tokens, Create Token, Edit zone DNS template). It is `CERTBOT_CLOUDFLARE_TOKEN` in `.env.local` and the GitHub environments; every deploy writes it to `/opt/zivali/cloudflare.ini` (mode 600). It is never committed.
2. First issuance, once, as `deploy` on the VPS (before the first deploy, so the token file is written by hand here):

    ```sh
    cd /opt/zivali
    (umask 077 && printf 'dns_cloudflare_api_token = %s\n' '<token>' > cloudflare.ini)
    docker run --rm -v /opt/zivali/letsencrypt:/etc/letsencrypt -v /opt/zivali/cloudflare.ini:/etc/cloudflare.ini:ro \
      certbot/dns-cloudflare:v5.8.0 certonly --dns-cloudflare --dns-cloudflare-credentials /etc/cloudflare.ini \
      --dns-cloudflare-propagation-seconds 30 --cert-name najdimo.si \
      -d najdimo.si -d www.najdimo.si -d api.najdimo.si -d staging.najdimo.si -d api-staging.najdimo.si \
      --email <ops e-mail> --agree-tos --no-eff-email --non-interactive
    ```

    Adding or renaming a hostname: the same command with every `-d` and `--expand`, then a deploy (or `docker compose -p zivali-edge … restart nginx`).

3. Renewal: the `certbot` service runs `certbot renew` twice a day with the same token file; the `nginx` service reloads twice a day and so picks up renewed certificates. Until the first certificate exists, nginx waits instead of crash-looping (`nginx/start.sh`), and `scripts/deploy.mjs` reports `NEEDS-INPUT` for it.
4. nginx (`nginx/templates/zivali.conf.template`, rendered from `edge.env`): HTTP → HTTPS, TLS 1.2/1.3, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` (only when the app sent none; helmet and the web CSP stay authoritative), gzip, `proxy_pass` to `<env>-web:3000` and `<env>-api:4000` with `X-Forwarded-For`, `X-Forwarded-Proto` and `X-Forwarded-Host` set by nginx (a client's values and its `Forwarded` header never reach Next.js Server Actions or Express), request bodies up to 2 MB on the API (photos go straight to R2), unknown hostnames refused (unknown SNI: no handshake; known SNI with an unknown `Host`: connection closed, 444), no access log.
5. Real client IPs: nginx trusts `CF-Connecting-IP` only from Cloudflare's ranges in `nginx/cloudflare-ips.conf`. Refresh it now and then (Cloudflare announces changes) from the repo root, commit, deploy:

    ```sh
    { echo "# Cloudflare edge ranges (https://www.cloudflare.com/ips/), fetched $(date -u +%F). Refresh: deploy/README.md, TLS."
      for v in 4 6; do curl -fsS "https://www.cloudflare.com/ips-v$v" | sed 's/.*/set_real_ip_from &;/'; echo; done
    } | grep . > deploy/nginx/cloudflare-ips.conf
    ```

## 3. R2 buckets (EU jurisdiction, ADR-014) — done

`zivali-private` (CORS: PUT and GET from `https://najdimo.si`, `https://www.najdimo.si`, `https://staging.najdimo.si`), `zivali-media` (public through `https://media.najdimo.si`) and `zivali-backups` (30-day expiry rule) exist in the EU jurisdiction. Every S3 call and presigned URL uses `https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com`; the jurisdiction cannot be changed later (a wrong bucket must be recreated and its objects copied). For reference, the commands that create them:

```sh
for b in zivali-private zivali-media zivali-backups; do npx wrangler r2 bucket create $b --jurisdiction eu; done
npx wrangler r2 bucket lifecycle add zivali-backups expire-30d --expire-days 30 --jurisdiction eu
npx wrangler r2 bucket cors set zivali-private --file r2-cors.json --jurisdiction eu
npx wrangler r2 bucket domain add zivali-media --domain media.najdimo.si --zone-id <zone id> --jurisdiction eu
```

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` come from an R2 API token (Object Read & Write, limited to the three buckets). `scripts/deploy.mjs` runs a read-only `HeadBucket` on each bucket at the EU endpoint before every deploy and prints `NEEDS-INPUT` for a missing one.

## 4. Supabase cloud settings (client, in the dashboard)

For project `najdimo` (and later the production project):

1. **Project Settings, Data API, Exposed schemas**: only `public` (remove `graphql_public` if listed); save. App tables live in `app`, which is never exposed (ADR-021).
2. **Realtime, Settings**: turn **off** "Allow public access", so only private Broadcast channels work (ADR-023).
3. **Connect, Session pooler**: the connection string for `DATABASE_URL` and `DIRECT_URL` in `/opt/zivali/<env>/.env` (add `?schema=app`).

`scripts/deploy.mjs` checks 1 and 2 before every deploy with read-only Management API calls (`GET /v1/projects/{ref}/postgrest` and `GET /v1/projects/{ref}/config/realtime`, needs `SUPABASE_ACCESS_TOKEN`) and prints `NEEDS-INPUT` with the dashboard step when one is off. Reference data (regions and municipalities, geocoder places, the shelter directory, house ads) needs no manual write: every deploy runs the seed after the migrations (section 6).

## 5. GitHub Actions

- Environments `staging` and `production` (Settings, Environments). `production`: **Required reviewers** (the manual approval) and deployment tags `v*`.
- Secrets per environment: `HETZNER_HOST`, `HETZNER_SSH_KEY`, `HETZNER_KNOWN_HOSTS`, `HETZNER_API_TOKEN`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `SUPABASE_ACCESS_TOKEN`, `CERTBOT_CLOUDFLARE_TOKEN`. Variables per environment: `WEB_HOST`, `API_HOST`, `HETZNER_FIREWALL_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_REF`, and optionally `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test only). No registry, so the jobs need no `packages` permission.
- Repository variable `DEPLOY_ENABLED=true` switches the workflow on. Until then nothing deploys; with it on and a secret missing, the job fails with `NEEDS-INPUT` and the names.
- Images are built on `ubuntu-24.04` with Docker Buildx for `linux/arm64` and streamed to the VPS: the JS builds run natively, only the api image's runtime stage (apt-get, Prisma engine) runs under QEMU. Alternative: `runs-on: ubuntu-24.04-arm` builds natively without QEMU (check that Arm runners are available for this private repository's plan first).

## 6. Deploy

- **Staging**: every push to `main` that passes `ci` deploys automatically. From a workstation: `node scripts/deploy.mjs staging --deploy` (values from the root `.env.local`; a clean working tree; `zstd` on the PATH: Linux and macOS from the package manager, Windows from the facebook/zstd GitHub releases).
- **Production**: `git tag v1.2.3 && git push origin v1.2.3`, then approve the run in the `production` environment. From a workstation: check out the tag, `node scripts/deploy.mjs production --deploy --yes` (values from `.env.production.local`).
- Steps: checks (credentials, R2 buckets, Supabase settings, `remote.sh check` on the VPS: env files with mode and owner, `DIRECT_URL`, `edge.env`, Docker Compose, `zstd`, the certificate) → build `zivali-api:<sha or tag>` and `zivali-web:<env>-<sha or tag>` (`linux/arm64`) locally → copy `deploy/` to `/opt/zivali`, write `cloudflare.ini` → `docker save | zstd | ssh docker load` → `remote.sh deploy`: one-off `prisma migrate deploy` in an api container, then the seed in another (`node dist/seed/apps/api/prisma/seed.js`: the reference data, idempotent, admin edits to the directory and house ads kept, the fixture seeders skip themselves outside `APP_ENV=local`; about half a minute, mostly the geocoder places), api, worker and web `up --wait` (healthy within 180 s by their compose healthchecks, else the running release is started again and the deploy fails), nginx and certbot up, nginx config re-rendered, tested and reloaded → smoke checks, GETs only (`/ping`, `/v1/health/ready`, `/api/health` reports the new version, web home, PostgREST with the public key reaches no app table) → `remote.sh promote` (`release.env` becomes `release.env.prev`, the new release becomes `release.env`, images no release file names are removed). A failed smoke check runs `remote.sh rollback` (the release in `release.env` up again) and fails the deploy. A failed migration or seed stops the deploy before anything restarts: the running release stays untouched and nothing is promoted.
- Dry run (the default without `--deploy`): `node scripts/deploy.mjs staging` (add `--skip-images` to skip the two image builds): the read-only checks, then builds both arm64 images, applies all migrations to a scratch database on the local Supabase server, runs the seed on it as staging, runs `prisma migrate diff` against `prisma/schemas` and the ADR-021 security tests on it, then drops the scratch database. A workstation needs Arm64 emulation in Docker; if a build fails with `exec format error`, register it once: `docker run --privileged --rm tonistiigi/binfmt --install arm64`.

## 7. Rollback

A deploy whose containers do not become healthy, or whose smoke checks fail, goes back to the running release by itself (`remote.sh rollback`). To go back one release by hand, as `deploy` (the previous images are still on the VPS):

```sh
cd /opt/zivali
cat staging/release.env.prev                       # API_IMAGE, WEB_IMAGE, APP_VERSION before the last deploy
cp staging/release.env.prev staging/release.env && sh remote.sh rollback staging
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
# 4. Replace schema app with the dump; pg_restore 17 ships in the api image. RESTORE_URL is DIRECT_URL without the
#    password and without ?schema=app; the password is typed into PGPASSWORD (not echoed), so neither is on a command line.
read -rs PGPASSWORD && export PGPASSWORD
export RESTORE_URL='postgresql://postgres.<project ref>@<pooler host>:5432/postgres'
docker run --rm -i -e PGPASSWORD -e RESTORE_URL --entrypoint sh <api image> -c \
  'cat > /tmp/r.dump && pg_restore --clean --if-exists --no-owner --no-privileges --schema=app -d "$RESTORE_URL" /tmp/r.dump' < restore.dump
unset PGPASSWORD
# 5. Lockdown check (ADR-021) from a checkout: DATABASE_URL=<that URL with ?schema=app> pnpm --filter api test:security
# 6. Start api and worker again; smoke: /v1/health/ready
docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env up -d api worker
```

The dump carries the tables' row level security flags and `_prisma_migrations`; grants are not dumped, so the deny-all lockdown holds after a restore.

## 9. Keep-alive, uptime and logs

- Supabase Free pauses a project after a week without activity. The worker's `db.keepalive` job queries the database every 6 hours, and an external uptime check keeps it awake too: create a free HTTPS monitor (UptimeRobot or Better Stack) on `https://api-staging.najdimo.si/v1/health/ready` every 5 minutes with an e-mail alert. That endpoint touches the database and answers 503 when it is down.
- Logs: `docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env logs -f api` (or `worker`, `web`); each container keeps at most 5 x 10 MB. nginx writes no access log (client IPs and full URLs).

## 10. Fiscal invoices (FURS, TASK-92)

Card payments may need fiscally verified invoices (davčno potrjevanje računov, ZDavPR: cards count as cash); the accountant decides (Q-012). The worker's `payment.effects` issues one invoice per succeeded payment: number `<premise>-<device>-<sequence>` (gapless per premise and device), VAT 22 %, ZOI (ours) and EOR (from FURS), a PDF in the private bucket, then the receipt email. `FISCAL_PROVIDER`: `mock` (default in every environment; test codes, "Testni račun" on the PDF), `furs` (the FURS **test** environment `blagajne-test.fu.gov.si` only; the production endpoint is refused until the live-payments task), `off` (no invoices).

Premises and device registration, once per environment, by the client with the accountant (values are client items: never in Git, logs or chat):

1. Record the Q-012 decision: `update app.app_config set value = 'true'` (or `'false'`) `where key = 'fiscal.required'`, with the accountant's note in the decision log. Not required: set `FISCAL_PROVIDER=off`; the receipt then stays a payment confirmation.
2. Certificate: in eDavki request the certificate for fiscal verification of invoices, first the **test** one (for `blagajne-test.fu.gov.si`), later the production one. FURS issues a `.p12` and its password. Convert it on a trusted machine, keeping the key encrypted: `openssl pkcs12 -in najdimo.p12 -clcerts -nokeys -out furs-cert.pem` and `openssl pkcs12 -in najdimo.p12 -nocerts -out furs-key.pem` (set a new passphrase). Save the FURS CA chain of that environment (from the FURS developer pages) as `furs-ca.pem`.
3. Business premise: register it with FURS under the ID that goes into `FISCAL_PREMISE_ID` (letters and digits, at most 20, e.g. `SPLET`), either in eDavki or through the FURS API's business premise request signed with the same certificate. Online sales usually register a movable premise of type C (an individual electronic device for issuing invoices); the accountant confirms the type and the software supplier's tax number. A registered premise is changed by a new registration, never by editing old invoices.
4. Electronic device: FURS does not register devices separately. Pick `FISCAL_DEVICE_ID` (e.g. `API1`), unique within the premise and never reused for another series. Production uses its own `FISCAL_PREMISE_ID` / `FISCAL_DEVICE_ID`, never a pair that issued mock or test invoices (the series is keyed by premise and device only, so a shared pair would number live invoices after test ones): every invoice number carries it, and a new premise or device starts its own series at 1. With a FURS-certified provider instead (chosen with the client), register the premise and device in its portal and use its IDs; the adapter then needs that provider's credentials (needs-input).
5. Configure the API and worker (`/opt/zivali/<env>/.env`, mode 600): `FISCAL_PROVIDER=furs`, `FISCAL_TAX_NUMBER` (8 digits, the certificate's tax number), `FISCAL_PREMISE_ID`, `FISCAL_DEVICE_ID`, `FURS_CERT_PATH`, `FURS_KEY_PATH`, `FURS_KEY_PASSPHRASE`, `FURS_CA_PATH` (`FURS_URL` defaults to the test environment). The PEM files go into `/opt/zivali/<env>/furs/` (mode 600) and must be mounted read-only into the api and worker containers (compose change pending). Restart both.
6. Check on the test environment: a staging test payment gets a `VERIFIED` invoice with an EOR (`select number, status, eor from app.invoices order by created_at desc limit 5`) and the receipt email shows number, ZOI and EOR.
7. Retries and late submission (TASK-92.3): `payment.effects` retries a failed verification after 2 minutes, doubling up to 30 minutes (`app_config` `fiscal.retry`, `{"delay_minutes": 2, "max_delay_minutes": 30}`; delay 1–10, cap 1–30), and marks the invoice `FAILED` after the fifth failure (logged as `fiscal: verification failed, invoice FAILED`); the receipt still goes out with the ZOI. The hourly worker job `fiscal.resubmit` (minute 25, Europe/Ljubljana) sends every `FAILED` invoice, and every `PENDING` one older than 3 hours, to FURS again as a subsequent submission with its stored number, issue time and ZOI, well inside the 2 working days. An in-flight lease (`invoices.lease_until`, 2 minutes) keeps two attempts for one invoice from running at once. An invoice still unverified 24 hours after issue is logged as an error (`fiscal: invoices unverified 24 h after issue`) and emailed once to every admin with a confirmed address (subject `Davčno potrjevanje: nepotrjeni računi (n)`): check the FURS connection and the certificate. `select number, status, attempts, alerted_at from app.invoices where status <> 'VERIFIED'` lists them.
8. Refunds (TASK-92.4): refund in the Stripe Dashboard (full or partial). Each `charge.refunded` event raises `payments.refunded_cents` to the charge's `amount_refunded`, and `payment.effects` issues one credit note (dobropis) for what was refunded since the last note, from that stored total: the next number of the same series, negative amounts with the VAT at the invoice's rate (cumulative, so the notes of a full refund net the invoice exactly), referencing the invoice's number and issue time (FURS ReferenceInvoice), fiscalised like an invoice (same retries, `fiscal.resubmit` and alert) and rendered to `invoices/<id>.pdf` in the private bucket. `select number, gross_cents, refund_total_cents, status from app.invoices where reference_invoice_id is not null order by issued_at desc` lists them. Two refunds of one charge whose events arrive out of order get one credit note for both (the later total covers the earlier one). A refund whose `payment.effects` ran out of retries gets its note from the next `fiscal.resubmit` run 3 h later.

## 11. AI switch-on: only photos from after it (TASK-40.11)

Owner rule 2026-10-19: no photo uploaded before AI is switched on ever goes to Anthropic or Voyage. `app_config` `ai.photos_since` (not public) holds the switch-on instant. `ai.extract`, `photo.embed` and `embedding.backfill` (so also seeder `41-embedding-backfill`) handle only photos whose `created_at` is strictly after it, whatever queued the job (upload, report edit, retry, admin retry, `jobs:send`). Unset, not a JSON string in ISO 8601 with `Z` or an offset, or earlier than `2026-10-19T00:00:00Z`: no photo is sent at all (the worker logs `ai.extract.cutoff`, `photo.embed.cutoff`, `embedding.backfill.cutoff`).

The hosted database changes only through the deploy's migrations: nobody runs SQL on it. Migration `20261019100000_task_40_11_ai_photos_since` adds the key as `null`; migration `20261019110000_task_40_11_ai_switch_on` sets it to `now()` while it is still `null`. So **the deploy that first applies them is the switch-on** (every environment, local `db:reset` and CI included); a cutoff already set never moves.

Switch-on (TASK-40.7):

1. Privacy policy v0.8 live, in that deploy or an earlier one. In the same deploy, photos uploaded during the container swap (about a minute) are after the cutoff while the old page may still show.
2. The deploy with the two migrations runs (CI from `main`).
3. Providers in `/opt/zivali/<env>/.env`: `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, `EMBEDDER_PROVIDER=voyage`, `VOYAGE_API_KEY`; recreate api and worker (pilot runbook §2). Photos between 2 and 3 are not sent later either: their `ai.extract` ran with the provider off (`skipped_disabled`, no stored result), and only photos with a result are embedded.
4. Confirm without database access: the worker logs the cutoff it enforces at every start, `docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env logs worker | grep '"msg":"ai.photos_since"'` shows `"photos_since":"<deploy time>Z"` (`null`: nothing is sent; `ai.photos_since unreadable`: the database was not reachable at start). Then upload a test photo on the site: the worker logs `ai.extract.done` with `"outcome":"ok"` for it (`grep ai.extract`), and no `ai.extract.cutoff` line.
5. Later changes only by a new migration: never an instant earlier than the switch-on (that releases the photos in between; code refuses only values before 2026-10-19); `'null'::jsonb` stops all sending. Quick stop without a deploy: `AI_PROVIDER=off`, `EMBEDDER_PROVIDER=off`, recreate api and worker.
