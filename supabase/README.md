# supabase/

Local Supabase stack, migrations, pgTAP tests and Edge Functions. Everything runs offline on Docker with mock adapters; no cloud credentials are needed (ADR-003, P-6). Conventions: `docs/tech/contracts/C1-platform-conventions.md`.

## Requirements

- Docker Desktop running (Windows: WSL 2 backend).
- Node 22 (`npx supabase …` until the workspace root pins the CLI; then `pnpm db:*`).
- Deno 2 for `deno check` (`winget install DenoLand.Deno`, or run it as `npx deno …`).

## Start, reset, test

```sh
npx supabase start          # first run pulls the images (several minutes)
npx supabase db reset       # re-applies migrations/ and seed/*.sql
npx supabase test db        # pgTAP suite in tests/
npx supabase status         # URLs and local keys (local demo keys only)
npx supabase stop
```

## Local endpoints

| Service | URL |
|---|---|
| API (REST, Auth, Storage, Realtime) | http://127.0.0.1:54321 |
| Edge Functions | http://127.0.0.1:54321/functions/v1/<name> |
| Studio | http://127.0.0.1:54323 |
| Mail catcher (Mailpit): Auth emails (confirm, magic link, reset) land here | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

Health check: `curl http://127.0.0.1:54321/functions/v1/health` → `{"ok":true,"version":"dev","env":"local"}` (`version` from `APP_VERSION`, `env` from `APP_ENV`).

## What config.toml sets up

- Auth: email sign-up with confirmations (confirm links go to the mail catcher), anonymous sign-ins, TOTP MFA. Captcha (Turnstile) is off locally; staging and production enable it.
- Storage buckets (C5): `photos` (private, `image/jpeg`, 1 MB), `public-photos` (public), `ad-images` (public, jpeg/png/webp, 300 KB).
- Seed: every `seed/*.sql` file, in name order (`NN-<task-id>-<slug>.sql`, one per task).

## Edge Functions

```sh
cp supabase/functions/.env.example supabase/functions/.env.local    # once
npx supabase functions serve --env-file supabase/functions/.env.local
cd supabase/functions && deno check .                                # type-check all functions
cd supabase/functions && npx vitest run                              # unit tests (*.test.ts, pure modules)
```

- `deno.json` is the shared import map (`@zivali/validation/`, `zod`, `@supabase/supabase-js`). `deno.lock` pins versions; on a merge conflict delete it and run `deno check .` again.
- `_shared/`: `env.ts` (env reader, injectable in tests), `log.ts` (JSON lines `{ level, msg, fn, request_id, … }`, primitives only, no PII), `errors.ts` (`AppError`, `json`, `errorResponse`, `parseInput` with zod → `{ error: { code, message, details } }`), `supabase.ts` (service-role client, server side only).
- `_shared/adapters/<kind>/`: `index.ts` (interface + factory), `mock.ts`, later `<provider>.ts`. Each factory reads `<KIND>_PROVIDER`; unset, `mock`, or a provider whose credentials are missing gives the mock (a warning names the missing variables). An unknown provider name throws.

| Adapter | Variable | Real provider (credentials) | Mock behaviour |
|---|---|---|---|
| ai | `AI_PROVIDER` | anthropic (`ANTHROPIC_API_KEY`) | fixture by photo hash |
| embedder | `EMBEDDER_PROVIDER` | voyage (`VOYAGE_API_KEY`) | deterministic unit vector from the image hash |
| payments | `PAYMENTS_PROVIDER` | stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) | checkout at `APP_URL/dev/checkout?payment_id=…`; webhooks signed with hex HMAC-SHA256 of the body using `MOCK_WEBHOOK_SECRET` |
| email | `EMAIL_PROVIDER` | brevo (`BREVO_API_KEY`) | sends nothing, logs `email mocked` |
| push | `PUSH_PROVIDER` | expo (`EXPO_ACCESS_TOKEN`) | every message ok |
| captcha | `CAPTCHA_PROVIDER` | turnstile (`TURNSTILE_SECRET_KEY`) | any non-empty token passes except `fail` |

## Docker Desktop on Windows

- Start Docker Desktop before `supabase start`; give it at least 4 GB memory (Settings → Resources).
- Keep the repo on a local NTFS drive and line endings LF (`git config core.autocrlf false`); CRLF breaks SQL and shell scripts in the containers.
- `ports are not available … forbidden by its access permissions` on 5432x: Hyper-V reserved that port range. Check with `netsh int ipv4 show excludedportrange protocol=tcp`. Fix (admin PowerShell): `net stop winnat; net start winnat`. To keep it from coming back, reserve the range while winnat is stopped: `netsh int ipv4 add excludedportrange protocol=tcp startport=54320 numberofports=10`. Quick workaround without admin: override ports for your shell, e.g. `SUPABASE_API_PORT=55321 SUPABASE_DB_PORT=55322 SUPABASE_DB_SHADOW_PORT=55320 SUPABASE_STUDIO_PORT=55323 SUPABASE_LOCAL_SMTP_PORT=55324 SUPABASE_ANALYTICS_PORT=55327 SUPABASE_DB_POOLER_PORT=55329 npx supabase start` (use the same variables for every CLI command, and the new URLs in your env files).
- Slow first start is normal (image pulls). If a container is stuck, `npx supabase stop --no-backup` and start again.
