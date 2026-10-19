# Pilot runbook: the web-first pilot on najdimo.si (TASK-76.1)

<!-- Owner: tech-lead. Client decisions 2026-10-16 (CH-199): web first; the pilot runs as ONE environment; payments stay ON in Stripe test mode. Values never go into Git, chat or logs. -->

The current staging stack becomes the pilot: the Compose project `zivali-staging` (`APP_ENV=staging`) on the Hetzner CAX11 serves `najdimo.si`, keeps deploying itself from `main` after CI (`.github/workflows/deploy.yml`, job `staging`) and uses the Supabase project `najdimo`, the R2 buckets `zivali-*` and `media.najdimo.si`. The tag-based `production` job stays unused until the split before the public launch (section 9). VPS, TLS, R2, Supabase settings, logs and restore details: `deploy/README.md`.

`APP_ENV` stays `staging`: it also names the env files and network aliases in `deploy/docker-compose.yml` (`./staging/.env`, `staging-web`), so it cannot be changed on this stack. Consequences on the pilot: payments can only run in Stripe test mode (live keys are refused outside `APP_ENV=production`), the payment asks show the test note ("Testno plačilo: s kartice se ne bremeni denar."), and the dev pages (`/dev/kit`, `/dev/map`, …: UI samples, noindex) and the API's Swagger UI (`/docs`, the public `openapi.json`) stay reachable.

## 1. Hosts

| Hostname                 | Serves                                                            | Where it is set                                                     |
| ------------------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| `najdimo.si`             | web (`staging-web`)                                               | `/opt/zivali/edge.env` `STAGING_WEB_HOST`                           |
| `www.najdimo.si`         | 301 to `https://najdimo.si` (same path and query)                 | nginx: `edge.env` `STAGING_ALIAS_HOSTS`                             |
| `staging.najdimo.si`     | 301 to `https://najdimo.si` (same path and query)                 | nginx: `edge.env` `STAGING_ALIAS_HOSTS`                             |
| `api.najdimo.si`         | API (`staging-api`)                                               | `edge.env` `STAGING_API_HOST=api.najdimo.si api-staging.najdimo.si` |
| `api-staging.najdimo.si` | the same API: the Stripe test webhook and the Android preview app | the same line (nginx takes several names)                           |
| `media.najdimo.si`       | public photos (R2 custom domain on `zivali-media`), unchanged     | Cloudflare R2                                                       |

`edge.env` on the VPS for the pilot (mode 600, owner `deploy`; the production names are parked on reserved `.invalid` names so their server blocks can never match):

```
CERT_NAME=najdimo.si
STAGING_WEB_HOST=najdimo.si
STAGING_ALIAS_HOSTS=www.najdimo.si staging.najdimo.si
STAGING_API_HOST=api.najdimo.si api-staging.najdimo.si
PRODUCTION_WEB_HOST=production.invalid
PRODUCTION_API_HOST=api.production.invalid
```

The redirects are done in nginx, not with Cloudflare Redirect Rules. An nginx server block, added by the lead's change to `deploy/nginx/templates/zivali.conf.template`, answers the names in `STAGING_ALIAS_HOSTS` with a 301 to `https://${STAGING_WEB_HOST}`, keeping the path and query; so `STAGING_WEB_HOST` holds exactly one name. `STAGING_ALIAS_HOSTS` must be in `edge.env` before a deploy renders that block, and never empty (nginx refuses an empty `server_name`, the deploy stops at the config test): park it on `alias.invalid` when no name redirects. The certificate `najdimo.si` already covers `najdimo.si`, `www`, `api`, `staging` and `api-staging` (deploy/README.md §2). DNS: A (and AAAA) records for `@`, `www` and `api` pointing at the VPS, **proxied**, next to the existing `staging` and `api-staging`. nginx is re-rendered on every deploy. By hand: `docker compose -p zivali-edge --env-file staging/.env --env-file staging/release.env up -d nginx` (a changed `edge.env` recreates it).

## 2. Environment variables (pilot values; names only here)

| Service and file                                                         | Variables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| api and worker, `/opt/zivali/staging/.env` (runtime)                     | changes: `API_URL=https://api.najdimo.si`, `APP_URL=https://najdimo.si` (email links, Checkout return URLs), `WEB_ORIGINS=https://najdimo.si` (add `,https://staging.najdimo.si` only until the redirect is live). Payments as today (section 3): `PAYMENTS_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FISCAL_PROVIDER=mock`. Must be real for the pilot: `EMAIL_PROVIDER=brevo` with `BREVO_API_KEY`, `EMAIL_FROM`, `LEADS_NOTIFY_EMAIL`; `CAPTCHA_PROVIDER=turnstile` with `TURNSTILE_SECRET_KEY`. Unchanged: `APP_ENV=staging`, `DATABASE_URL`/`DIRECT_URL` (session pooler), `SUPABASE_*`, `R2_*`, `MEDIA_BASE_URL=https://media.najdimo.si`, `RATE_SALT`, `IDEMPOTENCY_KEY`, `FUZZ_SECRET`, the other adapters (`PUSH_PROVIDER` stays `expo` for the Android preview testers, if set) |
| web server, `/opt/zivali/staging/web.env` (runtime)                      | `APP_ENV=staging`, `R2_UPLOAD_ORIGIN`, `MEDIA_BASE_URL`; **`SEARCH_INDEXING=false`**; `PAYMENTS_ENABLED` unset (section 3)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| web build, GitHub environment `staging` variables (baked into the image) | `WEB_HOST=najdimo.si` and `API_HOST=api.najdimo.si` (become `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_API_URL`; the deploy's smoke checks use them too), `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_ANALYTICS_PROVIDER=ga4`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_GOOGLE_SIGN_IN`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_test, optional: Checkout is created by the API)                                                                                                                   |
| deploy, GitHub environment `staging` secrets                             | unchanged: `HETZNER_*`, `CERTBOT_CLOUDFLARE_TOKEN`, `R2_*`, `SUPABASE_ACCESS_TOKEN` (deploy/README.md §5)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| app, EAS environment (build time)                                        | nothing new; `EXPO_PUBLIC_PAYMENTS_ENABLED` stays unset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

A change to `.env` or `web.env` needs no rebuild, only the containers recreated (`docker compose -p zivali-staging --env-file staging/.env --env-file staging/release.env up -d api worker web`) or the next deploy. `WEB_HOST`/`API_HOST` and the `NEXT_PUBLIC_*` variables are build time (GitHub variables, then a deploy).

## 3. Payments: Stripe test mode on the pilot

The pilot keeps payments **on in Stripe test mode**, to test the tip, contribution and support flows and the invoices:

- `PAYMENTS_PROVIDER=stripe` with `STRIPE_SECRET_KEY` = the `sk_test_` key of the **"Najdimo sandbox"** account (`acct_1UQa5wAbrzQytqtO`; from the root `.env.local`, never the claude.ai Stripe connector, which points at another account) and `STRIPE_WEBHOOK_SECRET` from `node scripts/stripe-webhook.mjs staging`: it creates (once, idempotently) the test-mode endpoint `https://<API_HOST>/v1/webhooks/stripe` and writes its signing secret to the root `.env.local` without printing it; copy that line into `/opt/zivali/staging/.env`. The existing endpoint on `api-staging.najdimo.si` keeps working (the pilot API answers on both names); moving it to `api.najdimo.si` is optional (`API_HOST=api.najdimo.si node scripts/stripe-webhook.mjs staging`, then replace the secret and delete the old endpoint in the Stripe dashboard).
- `FISCAL_PROVIDER=mock` until the accountant answers Q-012: every succeeded test payment gets a mock invoice (test ZOI and EOR, "Testni račun" on the PDF) and the receipt email; `app_config` `payments.live_allowed` stays `false`.
- Users see the test note under every ask; real cards are declined in test mode, Stripe's test cards (`4242 4242 4242 4242`, any future date, any CVC) succeed. Tell the pilot users the payment is a test, or decide (owner) to hide the asks with the switch below.

**Switch to live** (only after the accountant has answered and the owner approves; needs the split first, since live keys are refused outside `APP_ENV=production`): activate the Stripe account (company, bank, branding, Stripe Tax); `STRIPE_SECRET_KEY` = `sk_live_`; a new live webhook endpoint created in the Stripe dashboard (the script is test-mode only) with its signing secret; `FISCAL_PROVIDER=furs` with the production FURS certificate and CA (`FURS_CERT_PATH`, `FURS_KEY_PATH`, `FURS_KEY_PASSPHRASE`, `FURS_CA_PATH`, premise and device registered for production, deploy/README.md §10; the FURS production endpoint is still refused in code until the live-payments task), or the accountant's recorded `fiscal.required = false` with `FISCAL_PROVIDER=off`; then `payments.live_allowed = true` (C13 live gate).

**Payments-off switch** (exists for later, e.g. production before the fiscal questions are cleared; nothing on the pilot sets it):

| Switch                                | Read by                                 | Effect                                                                                                                                                                                                                  |
| ------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PAYMENTS_PROVIDER=off`               | api and worker (`.env`)                 | checkout and the Stripe webhook answer 503 `SERVICE_UNAVAILABLE`, no payment row; `GET /v1/config/public` reports `payments.enabled: false`, so the web and the app hide the tip, the contribution row and the support card by themselves. Also the default when `APP_ENV=production` has no provider set. |
| `PAYMENTS_ENABLED=false`              | web server (`web.env`, per request)     | the asks are left out of the server render too (no flash before the config arrives), whatever the API says. Unset = follow the API.                                                                                      |
| `EXPO_PUBLIC_PAYMENTS_ENABLED=false`  | app (EAS build env, build time)         | the same for an app build. Unset = follow the API.                                                                                                                                                                      |

`PAYMENTS_PROVIDER=off` alone is enough; add `PAYMENTS_ENABLED=false` for a clean first paint. With payments off the reunited ad shows at once; payment history (`/racun/placila`) stays readable.

House ads only: no sponsor ads in the admin console during the pilot. Check: `select title, status, is_house, house_kind from app.ads where deleted_at is null and status = 'active';` lists house ads only. Their copy is still the seeder's placeholder; it is part of the copy sign-off.

## 4. Search engines (noindex until the public launch)

Before TASK-76.1 nothing kept search engines away: `robots.txt` allowed everything and named the sitemap on every environment, and only private pages (account, admin, sign-in, manage link, dev pages) carried a noindex meta tag. Now:

- Web, `SEARCH_INDEXING=false` (`web.env`; unset = off on `APP_ENV=staging`, on elsewhere): every page sends `X-Robots-Tag: noindex, nofollow` (`apps/web/proxy.ts`), and `robots.txt` names no sitemap. Crawling stays allowed on purpose: a crawler must fetch a page to see its noindex; a `Disallow` would let shared links get indexed without content.
- API hosts: nginx adds `X-Robots-Tag: noindex, nofollow` to every API response, in every environment (`deploy/nginx/templates/zivali.conf.template`).
- Photos on `media.najdimo.si` (optional): a Cloudflare Transform Rule (response header `X-Robots-Tag: noindex` for `media.najdimo.si`) keeps them out of image search.
- Check: `curl -sI https://najdimo.si/ | grep -i x-robots-tag` prints `noindex, nofollow`; `curl -s https://najdimo.si/robots.txt` has no `Sitemap:` line. No host is hard-coded: the URLs come from `NEXT_PUBLIC_APP_URL` (canonical, sitemap, hreflang, JSON-LD) and the flag from `web.env`.
- Public launch: `SEARCH_INDEXING=true` (or unset on `APP_ENV=production` after the split), then submit `https://najdimo.si/sitemap.xml` in Google Search Console.

Hard-coded values found: house ad links and the support address point at the final domain (`https://najdimo.si/...` in `apps/api/prisma/seeders/30-commerce.seeder.ts`, `podpora@najdimo.si` in `apps/web/components/content/article.tsx`), right for the pilot. The EAS `preview` profile (`apps/mobile/eas.json`) names `https://staging.najdimo.si` and the Supabase project; universal links on that host stop working once it redirects (Apple and Android do not follow redirects for their association files), the `zivali://` scheme keeps working.

## 5. Rollback

- Automatic: a deploy whose containers do not become healthy, or whose smoke checks fail, starts the running release again (`deploy/remote.sh rollback`).
- One release back, on the VPS as `deploy`: `cd /opt/zivali && cp staging/release.env.prev staging/release.env && sh remote.sh rollback staging`.
- Any earlier commit: GitHub, Actions, workflow `deploy`, open the `staging` run of that commit, **Re-run jobs** (the job deploys the commit of the CI run that started it). From a workstation: `git checkout <sha>` on a clean tree, `node scripts/deploy.mjs staging --deploy`.
- The database only moves forward: a bad migration is fixed with a new one; restore (section 6) only for data loss.

## 6. Backups and restore

- Nightly 02:00 Europe/Ljubljana, the worker's `db.backup`: `pg_dump` of schema `app` to `zivali-backups/db/staging/<YYYY-MM-DD>.dump` (pilot data lands under `staging/`), 30-day expiry. RPO 24 h.
- Not in the dump: the Supabase Auth accounts. On Supabase Free the pilot's accounts have no backup of ours: move the project to **Pro** (daily backups) before inviting pilot users, or accept the risk in writing (R-015). Owner decision.
- Restore: deploy/README.md §8, with `db/staging/<date>.dump`. Drill once before go-live (TASK-70): restore yesterday's dump into a scratch database, time it, note it in the TASK-70 notes.
- Check daily for the first week: R2 lists today's object; `GET /v1/admin/queues` shows no failed `db.backup`.

## 7. Smoke test of the core loop (by hand, on `https://najdimo.si`)

1. `curl -sI https://najdimo.si/` 200 with `x-robots-tag: noindex, nofollow`; `https://www.najdimo.si/faq` and `https://staging.najdimo.si/faq` 301 to `https://najdimo.si/faq`; `https://api.najdimo.si/v1/health/ready` 200.
2. Consent banner: no Google Analytics request before consent; accept, GA4 Realtime shows the visit.
3. Sign up with a new email (Turnstile shows), the confirmation email arrives from the Brevo sender with a link to `najdimo.si`, sign in. Google sign-in, if enabled.
4. Report a lost dog with two photos and a location: the confirmation shows next steps, the responsible shelter, the poster and the contribution row (test note). The report page shows the photos from `media.najdimo.si` and the blurred area.
5. In a private window, anonymous: report a sighting of a similar dog near the same place (Turnstile). The owner gets the match or alert in the in-app inbox and by email.
6. Owner and finder exchange chat messages (live), the unread badge updates.
7. Download the poster PDF; share the report link (preview image and title).
8. Mark the report as reunited: story switch, the tip ask with the test note, "Končano". Pay 5 € with the test card: back on the return page, the payment shows as succeeded in `/racun/placila`, the receipt email arrives with the mock invoice PDF ("Testni račun"), the Stripe dashboard (test mode) shows the payment and a delivered webhook.
9. Profile (`/racun`): the support card is there; the partners page leads form (Turnstile) reaches `LEADS_NOTIFY_EMAIL` and the admin console.
10. Admin console with TOTP: the report is listed; `/admin/oglasi` shows house ads only.
11. Legal pages (privacy, cookies, terms, imprint, accessibility) show the reviewed text and the real imprint data; the contact address receives mail.
12. Next morning: the backup object for the day exists.

## 8. Go-live order

1. Owner items done (section 10, items 1 to 6); the copy and legal texts merged.
2. This branch merged: it deploys to the current staging host by itself. In `staging/web.env` set `SEARCH_INDEXING=false`; recreate the web container (section 2); check on `staging.najdimo.si` that the noindex header is there and the asks still show.
3. Supabase Auth (project `najdimo`): Site URL `https://najdimo.si`; Redirect URLs add `https://najdimo.si/**` (keep `zivali://**`; `https://staging.najdimo.si/**` until the redirect is live).
4. Cloudflare DNS: `@`, `www`, `api` proxied to the VPS. On the VPS, `edge.env` as in section 1 and in `staging/.env` `API_URL`, `APP_URL`, `WEB_ORIGINS` (both origins for the first day: during the deploy the old nginx still serves `staging.najdimo.si` for a minute). Nothing changes yet: the running nginx and containers keep their old values until the next deploy.
5. GitHub environment `staging`: `WEB_HOST=najdimo.si`, `API_HOST=api.najdimo.si`; re-run the latest `staging` deploy (or push to `main`). That one deploy switches everything: the web image is built for `najdimo.si`, the api and worker restart with the new `.env`, nginx renders `edge.env` (`staging.najdimo.si` and `www` now 301 to `najdimo.si`). Its smoke checks must pass on `najdimo.si`.
6. A day later: `WEB_ORIGINS=https://najdimo.si` (recreate api and worker) and remove the staging redirect URL from Supabase.
7. Uptime monitors on `https://api.najdimo.si/v1/health/ready` and `https://najdimo.si/` (deploy/README.md §9); the GA4 web stream URL set to `https://najdimo.si`.
8. Manual smoke test (section 7); results in the TASK-76.1 notes.
9. Owner approves go-live; pilot users are invited. Error tracking (Sentry, TASK-70) is not wired yet: until then container logs (deploy/README.md §9) and the uptime alerts are the monitoring.

## 9. Split before the public launch

The pilot's data (Supabase project `najdimo`, buckets `zivali-*`) becomes production, so nothing has to be migrated; staging gets new resources.

1. New staging resources: a Supabase project (e.g. `najdimo-staging`, settings as deploy/README.md §4 and supabase/README.md, Auth for `staging.najdimo.si`), R2 buckets `zivali-staging-private`, `-media` (custom domain `media-staging.najdimo.si`), `-backups` with their own token, a Turnstile widget if wanted.
2. `/opt/zivali/production/.env` and `web.env`: the pilot's current `staging/.env` and `web.env` with `APP_ENV=production` (keep the pilot's `RATE_SALT`, `IDEMPOTENCY_KEY` and `FUZZ_SECRET`: blur circles stay consistent). Payments: `PAYMENTS_PROVIDER=off` until the switch to live (section 3; test payments do not belong in production), or left unset (off is its production default). `SEARCH_INDEXING=true` only at the public launch.
3. `/opt/zivali/staging/.env` and `web.env` rewritten for the new resources (new secrets, `staging.najdimo.si`, `api-staging.najdimo.si`, `media-staging.najdimo.si`), Stripe test mode and `FISCAL_PROVIDER=mock` as on the pilot.
4. GitHub: environment `production` (required reviewers, deployment tags `v*`) with the pilot's values and `WEB_HOST=najdimo.si`, `API_HOST=api.najdimo.si`; environment `staging` back to `staging.najdimo.si`, `api-staging.najdimo.si` and the new project's keys.
5. Order: tag `vX.Y.Z` and approve the production deploy (migrations are a no-op, the seed keeps admin edits). Switch `edge.env` to `STAGING_WEB_HOST=staging.najdimo.si`, `STAGING_API_HOST=api-staging.najdimo.si`, `PRODUCTION_WEB_HOST=najdimo.si`, `PRODUCTION_API_HOST=api.najdimo.si`. Set `STAGING_ALIAS_HOSTS=alias.invalid` (never empty, section 1), or delete the pilot's alias block from the template together with the variable: `staging.najdimo.si` is served by `STAGING_WEB_HOST` again and the production block redirects `www`. Recreate nginx; deploy staging on the new resources; smoke both. Backups then go to `db/production/` (and the new staging bucket).
6. EAS `production` profile env (Supabase URL and key, API URL), store builds (TASK-75.1).

## 10. Owner actions (all hosted; nothing here is done by the team)

1. Lawyer review of the legal pages (TASK-91, `docs/legal/najdimo-pravni-pregled.docx`) and the final texts merged (TASK-71).
2. Imprint data: company, address, registration and VAT number, contact addresses.
3. Copy sign-off (TASK-27.5), including the house ads.
4. Contact mailbox live (`podpora@najdimo.si`; the others named on the imprint) and `LEADS_NOTIFY_EMAIL`.
5. Supabase: Pro plan or a written acceptance of the Auth backup risk (section 6); Auth URLs (section 8, step 3); Brevo SMTP and the `email_sent` rate limit (supabase/README.md).
6. Brevo: sender domain authenticated (DKIM, DMARC), `EMAIL_FROM` and the API key in `staging/.env`.
7. Stripe test mode: the sandbox webhook endpoint and secret in place (section 3); decide whether pilot users see the test-mode asks.
8. Cloudflare: DNS `@`, `www`, `api` proxied; optional media noindex rule. The redirects themselves come from nginx (`STAGING_ALIAS_HOSTS`).
9. VPS: `edge.env` (section 1), `staging/.env` and `web.env` values (section 2), containers recreated.
10. GitHub `staging` environment variables `WEB_HOST`, `API_HOST` (and the GA4 and Turnstile variables), then a deploy.
11. Admin console: house ads only, no sponsor ads.
12. GA4: web stream URL `https://najdimo.si`, internal-traffic filter.
13. Uptime monitors with e-mail alerts.
14. Restore drill (TASK-70) and the manual smoke test witnessed.
15. Go-live approval. Later: the accountant's answer (Q-012) and the owner's approval before the switch to live payments.

## 11. AI switch-on (TASK-40.7, TASK-40.11)

Only photos uploaded after the switch-on go to Anthropic or Voyage (owner, 2026-10-19). The switch-on instant is `app_config` `ai.photos_since`, a JSON string in ISO 8601 (`Z` or an offset), set once on the pilot database: `update app.app_config set value = to_jsonb(now()), updated_at = now() where key = 'ai.photos_since';` after privacy policy v0.8 is live. Then `AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, `EMBEDDER_PROVIDER=voyage`, `VOYAGE_API_KEY` in `staging/.env` and the api and worker recreated (section 2). Unset or invalid: nothing is sent. Never set it earlier than the switch-on. Details and checks: deploy/README.md §11.
