source: docs/04-technical-design.md (v0.5) §Architecture, §Data model, §Authentication, §Environments, §CI/CD, §Observability; docs/05-quality-security-plan.md (v0.5) §Security, §Privacy, §Definition of Done; ADR-020 (API, klikni conventions), ADR-021, ADR-022, ADR-023

# Backend slice (apps/api: Express + Prisma, worker; supabase/ local stack; scripts/)

Read this, your task packet and the contract(s) it references. Conventions for every endpoint, model, migration, job and seed are in **C1** (`docs/tech/contracts/C1-platform-conventions.md`). Never open the masters (`docs/0*.md`). If the packet is not enough, report `needs-input`.

## Stack

- **apps/api**: Node 22, TypeScript (repo version), ESM, **Express 5**, **Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg`, `prisma.config.ts`, multi-file schema in `prisma/schemas/`, TypedSQL in `prisma/sql/`), zod (`@zivali/validation`), pino + pino-http, helmet, cors, compression, express-rate-limit, `jose` (JWKS), **pg-boss** (jobs, ADR-022), `@aws-sdk/client-s3` + presigner (Cloudflare R2 / MinIO, ADR-014), sharp (worker), Stripe SDK, zod-to-openapi. Dev `tsx watch`, build `tsup`, tests **Vitest + Supertest** against the real local database.
- **Supabase** provides only Postgres 17 (PostGIS, pgvector), Auth (email, Google, Apple, anonymous, TOTP, Turnstile) and Realtime Broadcast (chat and inbox, ADR-023). No Edge Functions, no RPC-as-API, no Supabase Storage.
- **Database lockdown (ADR-021)**: all app tables in schema `app` (not exposed by PostgREST), no grants for `anon`/`authenticated`, RLS enabled with no policies on every table. Only `realtime.messages` has a policy (chat membership).
- Shared pure TypeScript (zod schemas and DTOs, chip normalisation, matching score) lives in `packages/validation` and is imported by the API and both apps.

## Repo map (your side), klikni style (ADR-020)

    apps/api/
      app.ts, server.ts (graceful shutdown), worker.ts (pg-boss handlers and schedules)
      routes/index.routes.ts (mounts /v1), routes/<feature>.routes.ts, routes/admin/<feature>.routes.ts
      controllers/<Feature>Controller.ts   thin: validated request → ctx → domain function → mapper → res.json (no try/catch)
      domains/<area>/<area>.domain.ts     ALL business logic: (input, ctx) → result; rules, permissions, ownership, transactions, jobs.send; throws AppError
      domains/<area>/<area>.dao.ts        Prisma only; every function takes tx?: Prisma.TransactionClient (const db = tx ?? prisma)
      domains/<area>/<area>.mapper.ts     Prisma payload → response DTO (parse with the DTO schema)
      domains/<area>/index.ts             public functions of the area
      middleware/ auth.ts, permission.ts, validate.ts, rateLimit.ts, idempotency.ts, requestId.ts, error.ts
      jobs/<queue>.job.ts                 export async function handle(data, ctx)
      lib/ config.ts (zod env, once), logger.ts, errors.ts (AppError), prisma-tx.ts, jobs.ts, s3.ts, realtime.ts, fuzz.ts, geo.ts, config-store.ts
      adapters/{ai,embedder,payments,email,push,captcha,storage}/{index,mock,<provider>}.ts
      prisma/ prisma.ts (singleton), schemas/*.prisma + migrations/, sql/*.sql (TypedSQL), includes/*.ts, seed.ts, seeders/, data-inventory.json
      test/ setup.ts, helpers/ (token factory, db reset, factories), routes/, domains/, jobs/, security/
      Dockerfile (multi-stage; one image for api and worker), tsup.config.ts, prisma.config.ts, vitest.config.ts, .env.example
    supabase/        config.toml (local Postgres, Auth, Realtime, mail catcher), templates/*.html (Auth emails), seed/geo/ (GURS data), README.md
    scripts/         deploy.mjs, geo-to-sql.mjs, admin-create.mjs
    deploy/          docker-compose.yml, Caddyfile, backup notes (TASK-5.1)
    docker-compose.dev.yml   MinIO for local R2

## Where does logic go

| Concern | Place |
|---|---|
| Request shape (body, query, params) | zod schema in `@zivali/validation`, applied by `validate()` in the route |
| Authentication, role, aal2, verified email, rate limit | route guards (middleware) |
| Ownership ("manager of this report", "participant of this conversation"), limits, state machines, any business rule | domain function (`domains/<area>/<area>.domain.ts`) |
| Database reads and writes | DAO in the same area (`tx ?? prisma`) |
| HTTP status, headers, cookies, redirects | controller only |
| Response shape | mapper in the area |
| Background work | job handler in `jobs/` calling domain functions |
| Scripts, seeders, admin tools, tests | call domain functions with a ctx (`systemCtx()` or `userCtx(user)`) |

A domain function never imports Express, never reads `req`/`res`, and never catches an error just to rethrow it. Catch locally only where you handle it (retry, fallback, mapping a unique violation to a domain error).

## Ownership and shared files

- **Prisma schema**: one file per domain in `prisma/schemas/`; a task adds models to its domain file or creates one. One migration per task (`prisma migrate dev --name <task-id>-<slug>`); never edit a merged migration. Conflicting migration timestamps on merge: re-run `prisma migrate dev` on the merged schema, never hand-merge `migration.sql`.
- **Routes**: each feature owns `routes/<feature>.routes.ts`; `routes/index.routes.ts` gets one mount line per feature (small, sequential merges are fine).
- **Jobs**: each queue owns `jobs/<queue>.job.ts`; the registry in `worker.ts` is created with stubs for all M2 queues by TASK-6.3.
- **Report creation** belongs to TASK-29.2 (`domains/reports/reports.domain.ts` `createReport`); the anonymous guard is `domains/reports/submission-guard.ts` (stub from TASK-29.2, rules from TASK-17.1).
- **Notifications**: `domains/notifications` `enqueueNotification(input, ctx)` exists as a stub from TASK-6.3 (sends `notify.send`, logged by the stub handler) so feature tasks can call it before TASK-22.3 merges.
- **Seeders**: own file `prisma/seeders/NN-<name>.seeder.ts`; fixture users from TASK-6.2.
- **app_config** keys: insert defaults in your migration or seeder (`on conflict do nothing`).

## Standards

- Route = `validate(schema, 'body'|'query'|'params')` → guards (`authMiddleware`/`optionalAuth`, `requireVerified`, `requireRole`, `requireAal2`, `rateLimit`) → controller. Validate body, query **and** params.
- Controllers stay thin; no try/catch (Express 5 forwards rejections); domains throw `AppError(code, message?, details?)`; the error middleware maps `AppError`, `ZodError` and known Prisma errors to `{ error: { code, message, details?, issues? } }` (C1).
- Every business rule lives in a domain function; every query goes through a DAO; multi-step writes use `prisma.$transaction(async (tx) => …)` and pass `tx` down; jobs that must exist only if the write commits are sent with the transaction client.
- Ownership checks in domains (`assertCanManageReport`, `assertParticipant`, …); never trust ids from the client for ownership.
- Responses are mapped DTOs, never raw Prisma rows: public serializers must never include `exact_point`, `chip_number`, `manage_token_hash`, emails, phone numbers or `created_by` (C4).
- Geo and vector queries only in TypedSQL files (`prisma/sql/*.sql`) or parameterised `$queryRaw`; never string-concatenated SQL.
- Jobs idempotent (unique keys, upserts); fan-outs in chunks of ≤ 500; no external calls inside DB transactions.
- Logs: pino JSON (`level, msg, req_id, user_id?, route, status, duration_ms`, job logs with `queue, job_id`); no PII or secrets; `console.*` is a lint error.
- Prettier and ESLint as configured at the root (klikni settings: tabs, width 120, single quotes).
- Every new model: `@@schema("app")`, RLS-enable line in the migration, an entry in `prisma/data-inventory.json`, permission tests for its endpoints.

## Error handling

Domains throw `AppError`; unknown errors become `INTERNAL` (500) with the request id logged. Prisma known errors are mapped in the error middleware (`P2002` → `CONFLICT`, `P2025` → `NOT_FOUND`). Jobs throw to retry (5 attempts with backoff, then failed state, visible in `GET /v1/admin/queues`).

## Environment variables (names only; `apps/api/.env.example`, values in `.env.local` or on the VPS)

| Variable | Notes |
|---|---|
| `APP_ENV` (`local`/`staging`/`production`), `APP_VERSION`, `PORT` (4000), `API_URL`, `APP_URL`, `WEB_ORIGINS` | runtime; `APP_VERSION` returned by health, default `dev` |
| `DATABASE_URL` (session pooler or direct, `?schema=app`), `DIRECT_URL` (migrations) | local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (Admin API only), `SUPABASE_JWT_SECRET` (local HS256 fallback) | JWKS at `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` |
| `FUZZ_SECRET`, `RATE_SALT`, `IDEMPOTENCY_KEY` | random 32-byte secrets per environment |
| `STORAGE_PROVIDER` (`minio`/`r2`/`memory`), `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_PRIVATE`, `R2_BUCKET_MEDIA`, `R2_BUCKET_BACKUPS`, `MEDIA_BASE_URL`, `S3_ENDPOINT` (MinIO locally) | ADR-014 |
| `PAYMENTS_PROVIDER` (`mock`/`stripe`), `STRIPE_SECRET_KEY` (sk_test only), `STRIPE_WEBHOOK_SECRET`, `MOCK_WEBHOOK_SECRET` | live keys rejected (C13) |
| `EMAIL_PROVIDER` (`mock`/`brevo`), `BREVO_API_KEY`, `EMAIL_FROM`, `LEADS_NOTIFY_EMAIL` | mock writes `email_outbox` |
| `PUSH_PROVIDER` (`mock`/`expo`), `EXPO_ACCESS_TOKEN` | |
| `CAPTCHA_PROVIDER` (`mock`/`turnstile`), `TURNSTILE_SECRET_KEY` | leads form; Auth captcha is configured in Supabase |
| `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_VISION_MODEL`, `AI_VISION_EFFORT` (M3); `EMBEDDER_PROVIDER`, `VOYAGE_API_KEY` (M3) | ADR-012, ADR-013 |
| `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_KEY_FILE` | partner-stats enrichment behind a flag; key file in `.secrets/` |
| Deploy (CI / `scripts/deploy.mjs`): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `HETZNER_HOST`, `HETZNER_SSH_KEY`, `GHCR_TOKEN`, `EXPO_TOKEN` | missing → `NEEDS-INPUT`, dry run |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/_SECRET`, `…_APPLE_…` (config.toml `env()`) | providers enabled only when set |

`lib/config.ts` validates all of them with zod at startup (fails with the variable name); adapters fall back to `mock` when their credentials are missing outside production.

## Commands

| Command | What |
|---|---|
| `pnpm bootstrap` | install, `supabase start`, MinIO up, `prisma migrate reset` (migrations + seed), build packages |
| `pnpm db:start` / `db:stop` | local Supabase (Postgres, Auth, Realtime, mail catcher) |
| `pnpm db:migrate` | `prisma migrate dev` (creates a migration from schema changes) |
| `pnpm db:reset` | `prisma migrate reset --force` (drop, migrate, seed) |
| `pnpm db:seed` | `prisma db seed` |
| `pnpm --filter api dev` | API on :4000 with tsx watch; `pnpm --filter api dev:worker` for the worker |
| `pnpm --filter api test` | Vitest + Supertest (needs `pnpm db:start`; resets the test schema) |
| `pnpm --filter api test:security` | ADR-021 exposure checks |
| `pnpm jobs:drain` | process all queued jobs once (tests, manual checks) |
| `pnpm --filter api build` | tsup → `dist/` |
| `pnpm admin:create <email>` | promote an existing local account to admin |
| `node scripts/deploy.mjs staging [--dry-run]` | build, push, migrate, deploy to the VPS (ADR-016) |
| `pnpm verify` | everything CI runs (required before reporting done) |

Local endpoints: API http://localhost:4000 (docs at /v1/docs), Supabase http://127.0.0.1:54321 (Auth, Realtime), Studio http://127.0.0.1:54323, mail catcher http://127.0.0.1:54324, DB `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, MinIO http://127.0.0.1:9000 (console :9001). Docker Desktop must be running (Windows).

Windows port clash: on some machines Hyper-V reserves TCP ports 54243–54342 (check with `netsh interface ipv4 show excludedportrange protocol=tcp`), so the default local Supabase ports fail to start. Override them with the `SUPABASE_*_PORT` variables described in `supabase/README.md`.

Credentials: staging credentials are in the gitignored `.env.local`; read them from the environment, never print or commit values. Local development and all tests stay offline on mocks. If a task needs a credential that is still missing (Hetzner, R2, Brevo, Turnstile, Voyage, FCM/APNs, GitHub Actions secrets), finish everything that works with mocks, then report `STATUS: needs-input` with the variable names.

## Git

Branch `agent/<task-id>-<slug>` from `main`; commits `<task-id>: <what>`; never merge.

## Definition of Done and gate checklist

- [ ] Acceptance criteria met and demonstrated (test output, example requests and responses)
- [ ] Contract followed exactly (paths, shapes, error codes); deviations reported as `CHANGE docs/tech/contracts/C<n>…`
- [ ] Domain functions tested against the local DB; routes tested with Supertest
- [ ] Permission tests for every new endpoint (anonymous visitor, anonymous user, owner/manager, other user, moderator aal1 and aal2, admin aal2)
- [ ] New models: `@@schema("app")`, RLS enabled in the migration, data-inventory entry; `pnpm --filter api test:security` green
- [ ] `pnpm db:reset` from zero works; migration header has the task id and rollback note
- [ ] `pnpm verify` passes (lint, typecheck, unit, API tests, build)
- [ ] No PII in logs; IPs and device ids hashed; secrets only from config
- [ ] Mocks keep everything working offline; missing credentials reported as `needs-input`, not failures
- [ ] No new dependency outside ADR-017; no unrelated changes; README updated where behaviour or commands changed
