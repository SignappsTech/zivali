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
- **Auth**: email sign-up with confirmations (confirm links go to the mail catcher), anonymous sign-ins, TOTP MFA (required as aal2 for moderators and admins, enforced by the API). Captcha (Turnstile) is off locally; staging and production enable it.
- **Realtime**: Broadcast on private channels for chat and inbox, authorised by the RLS policy on `realtime.messages` (ADR-023).
- **Off**: Storage (R2/MinIO instead, ADR-014), the Edge Runtime and Analytics (its log collector crash-loops on Windows without the Docker daemon on tcp://localhost:2375; API logs come from pino).

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
