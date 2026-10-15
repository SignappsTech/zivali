# supabase/

Local Supabase stack. Supabase holds only the **database** (Postgres 17 with PostGIS and pgvector), **Auth** and **Realtime** (ADR-020, ADR-021, ADR-023). The API is Express + Prisma in `apps/api`; Prisma owns the schema, migrations and seed. There are no Edge Functions, no Supabase Storage (photos live in Cloudflare R2, MinIO locally) and no SQL migrations here. Everything runs offline on Docker with no cloud credentials.

## Start and stop

```sh
pnpm db:start                 # supabase start; the first run pulls the images (several minutes)
pnpm exec supabase status     # URLs and local keys (local demo keys only)
pnpm db:reset                 # Prisma: migrate reset + seed (apps/api)
pnpm db:stop
```

## Local endpoints

| Service                                                                    | URL                                                       |
| -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Supabase API (Auth `/auth/v1`, Realtime `/realtime/v1`)                    | http://127.0.0.1:54321                                    |
| Studio                                                                     | http://127.0.0.1:54323                                    |
| Mail catcher (Mailpit): Auth emails (confirm, magic link, reset) land here | http://127.0.0.1:54324                                    |
| Postgres                                                                   | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

## What config.toml sets up

- **Database**: Postgres 17. PostgREST exposes only `public`, which stays empty; app tables live in schema `app` and pg-boss in `pgboss`, neither exposed nor granted to `anon`/`authenticated` (ADR-021). Seeding and migrations are Prisma's (`supabase/seed/geo/` holds source GeoJSON only).
- **Auth**: email sign-up with confirmations (confirm links go to the mail catcher), anonymous sign-ins, TOTP MFA (required as aal2 for moderators and admins, enforced by the API). Captcha (Turnstile) is off locally; staging and production enable it. Details below.
- **Realtime**: Broadcast on private channels for chat and inbox, authorised by the RLS policy on `realtime.messages` (ADR-023).
- **Off**: Storage (R2/MinIO instead, ADR-014), the Edge Runtime and Analytics (its log collector crash-loops on Windows without the Docker daemon on tcp://localhost:2375; API logs come from pino).

## Auth (C3)

Staging and production mirror these settings in the Supabase dashboard (Authentication); `config.toml` is the source.

### Emails

`templates/*.html` with the copy of `docs/content/notifications-and-emails.md` §3: `confirmation`, `recovery`, `magic_link`, `email_change`, `reauthentication` and the `identity_linked` security notice. Language comes from `user_metadata.locale` (set by the clients at sign-up): `"en"` is English, anything else Slovenian (formal). Subjects are Go templates as well. Locally every email lands in the mail catcher. The magic-link copy is not in the content doc yet (derived from §3.1/§3.2, pending content review). The support and company addresses are still the client markers.

Changing the locale in `PATCH /v1/me` also updates `user_metadata.locale` in Auth (API, Admin API with the server-only `SUPABASE_SERVICE_ROLE_KEY`), so Auth emails follow; clients do nothing extra.

### Sign-in providers

Email + password and anonymous sign-ins are always on. Google and Apple stay off until the client provides credentials. To turn one on, put all three in `supabase/.env` (or export them) and restart with `pnpm db:start`:

```sh
SUPABASE_AUTH_EXTERNAL_GOOGLE_ENABLED=true
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=…
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=…
# Apple: the same with APPLE; CLIENT_ID is comma-separated (web Services ID, iOS bundle id)
```

`_ENABLED` overrides `enabled = false` in `config.toml`; the CLI refuses to start a provider that is enabled without a client id. Redirect URLs allowed after sign-in: `http://127.0.0.1:3000/**`, `http://localhost:3000/**` (APP_URL locally), `zivali://**` (the app) and `exp://**` (Expo dev). `exp://**` is local and staging only: production allows just `https://<APP_URL>/**` and `zivali://**`. Provider callback: `<SUPABASE_URL>/auth/v1/callback`.

### Rate limits

| Limit                                         | Value                  | Setting                                              |
| --------------------------------------------- | ---------------------- | ---------------------------------------------------- |
| Sign-in and sign-up requests                  | 30 per 5 min per IP    | `auth.rate_limit.sign_in_sign_ups`                   |
| OTP and magic-link verifications              | 30 per 5 min per IP    | `auth.rate_limit.token_verifications`                |
| Anonymous sign-ins                            | 30 per hour per IP     | `auth.rate_limit.anonymous_users`                    |
| Token refreshes                               | 150 per 5 min per IP   | `auth.rate_limit.token_refresh`                      |
| Password reset (and confirmation) per address | 1 per 60 s (else 429)  | `auth.email.max_frequency`                           |
| Auth emails, project-wide                     | `email_sent` per hour  | `auth.rate_limit.email_sent` (only with custom SMTP) |
| Bots on sign-up, anonymous sign-in, reset     | Turnstile (cloud only) | `auth.captcha`                                       |

Cloud with Brevo SMTP: set `email_sent` in the dashboard (Authentication > Rate Limits) to the Brevo plan's hourly budget.

### Account linking

Automatic identity linking (Supabase default): when someone signs in with Google or Apple and the provider's verified email equals the confirmed email of an existing account, the new identity joins that account (same user id, same `app.profiles` row) and the `identity_linked` notice tells the owner. An unconfirmed email is never trusted for linking: Supabase removes the unverified identity when a verified one with the same address signs in, so nobody can pre-register someone else's address. Manual linking (`linkIdentity`) stays off (`enable_manual_linking = false`).

## Docker Desktop on Windows

- Start Docker Desktop before `pnpm db:start`; give it at least 4 GB memory (Settings → Resources).
- Keep line endings LF (`git config core.autocrlf false`); CRLF breaks SQL and shell scripts in the containers.
- Slow first start is normal (image pulls). If a container is stuck, `pnpm exec supabase stop --no-backup` and start again.

### Port clash with Hyper-V reserved ranges

`ports are not available … An attempt was made to access a socket in a way forbidden by its access permissions` on a 5432x port means Hyper-V reserved that range (often 54243–54342). Check with:

```powershell
netsh interface ipv4 show excludedportrange protocol=tcp
```

Fix it once (admin PowerShell): `net stop winnat`, then reserve the range so it cannot be taken again with `netsh int ipv4 add excludedportrange protocol=tcp startport=54320 numberofports=10`, then `net start winnat`.

Without admin rights, move the ports for your shell instead. Every `supabase` command must see the same variables, and your env files (`DATABASE_URL`, `SUPABASE_URL`) must use the new ports:

```powershell
$env:SUPABASE_API_PORT = 55321; $env:SUPABASE_DB_PORT = 55322; $env:SUPABASE_DB_SHADOW_PORT = 55320
$env:SUPABASE_STUDIO_PORT = 55323; $env:SUPABASE_LOCAL_SMTP_PORT = 55324
$env:SUPABASE_DB_POOLER_PORT = 55329
pnpm db:start
```

```sh
export SUPABASE_API_PORT=55321 SUPABASE_DB_PORT=55322 SUPABASE_DB_SHADOW_PORT=55320 SUPABASE_STUDIO_PORT=55323 \
  SUPABASE_LOCAL_SMTP_PORT=55324 SUPABASE_DB_POOLER_PORT=55329
pnpm db:start
```
