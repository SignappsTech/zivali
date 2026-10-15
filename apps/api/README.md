# apps/api

Express 5 + Prisma 7 REST API and the pg-boss worker, in the client's klikni layout ([ADR-020](../../docs/tech/adr/020-api-architecture.md)). Supabase provides only Postgres, Auth and Realtime; every business rule and permission check lives here. Conventions for endpoints, errors, migrations, jobs and seeds: [C1](../../docs/tech/contracts/C1-platform-conventions.md) and [backend.md](../../docs/tech/backend.md).

## Layout (no `src/`)

```
app.ts                      Express app, middleware in ADR-020 order (request id → pino-http → helmet → cors →
                            compression → json 1 MB → global rate limit → /ping, /v1 → 404 → error middleware)
server.ts                   HTTP entry; SIGTERM/SIGINT: stop accepting, finish requests, disconnect Prisma
worker.ts                   worker entry, same image (`node dist/worker.js`): pg-boss, schedules, the jobs/ handlers
jobs/<queue>.job.ts         one handler per queue, `handle(data, ctx)`; jobs/index.ts is the queue registry (runJob)
routes/index.ts             the /v1 router: one mount line per area
routes/<area>.routes.ts     one Router per area, routes declared with apiRoutes() (validation + OpenAPI, below)
openapi.json                generated, committed OpenAPI 3.1 document (`gen:openapi`); RTK Query codegen input
controllers/<area>.controller.ts   thin: req → ctx → domain → mapper → res (no try/catch)
domains/<area>/             all business logic, HTTP-agnostic
  <thing>.domain.ts           (input, ctx) → result; rules, permissions, ownership, transactions; throws AppError
  <area>.dao.ts               Prisma only; every function takes tx?: Prisma.TransactionClient
  <area>.mapper.ts            domain/Prisma result → response DTO, parsed with the DTO schema
  index.ts                    the area's public functions (the DAO stays private)
middleware/<name>.middleware.ts    requestId, validate, error, auth, permission, rateLimit, idempotency (below)
lib/                        config.ts (zod env, read once), logger.ts (pino), errors.ts (AppError + C1 codes),
                            ctx.ts (userCtx, systemCtx), jobs.ts (pg-boss: QUEUES, SCHEDULES, jobs.send, drain), config-store.ts (app_config, 60 s), crypto.ts, openapi.ts (apiRoutes over the @zivali/validation registry)
scripts/gen-openapi.ts      writes openapi.json; `--check` fails when it is stale (part of `lint`)
scripts/admin-create.ts     `pnpm admin:create <email>`: promotes a confirmed account to ADMIN (local stack only, else
                            `--i-know-this-is-production` + typing the email again); never an HTTP endpoint (ADR-018)
scripts/jobs-drain.ts       `pnpm jobs:drain`: runs queued jobs through the registry until the queues are empty
prisma/                     prisma.ts (client singleton), schemas/*.prisma + schemas/migrations/,
                            seed.ts (runs seeders/NN-<name>.seeder.ts in order)
generated/                  Prisma client output (gitignored, never edited; `prisma generate` rebuilds it)
test/                       routes/, middleware/, lib/, jobs/, security/, helpers/ (signTestToken), setup.ts, global-setup.ts
```

`domains/health` is the sample area: `GET /v1/health/ready` → `HealthController.ready` → `HealthDomain.getReadiness` → `HealthDao.pingDatabase` → `HealthMapper.toReadyDto`.

## Declaring a route (validation and OpenAPI in one place)

Every route goes through `apiRoutes(router, '/v1/<area>')` in its `routes/<area>.routes.ts`. One declaration adds `validate()` for the request schemas in Express (params, query, body; then your guards and the controller) and registers the same schemas in the OpenAPI registry, so the docs cannot drift from the validation:

```ts
const router = Router();
const route = apiRoutes(router, '/v1/reports');

route(
	{
		method: 'get',
		path: '/:id',
		operationId: 'getReport',
		summary: 'One public report',
		description: 'Fuzzed location only; the exact point is never returned (C4).',
		request: { params: ReportIdParams },
		responses: { 200: { description: 'The report', schema: ReportDetailSchema } },
		errors: ['NOT_FOUND', 'GONE'],
	},
	optionalAuth,
	ReportsController.getById
);
```

- `operationId`: stable, unique (checked at startup), camelCase verb + noun (`getReport`, `createLostReport`, `listNearbyReports`). The RTK Query codegen (`@rtk-query/codegen-openapi`) turns it into the endpoint and hook name (`useGetReportQuery`); renaming it renames the client hook.
- Tag: the area (`reports`), from the base path; the codegen groups endpoints by it.
- Errors: list the C1 codes the route can return besides the automatic `VALIDATION` (when it has request schemas), `RATE_LIMITED` and `INTERNAL`; they are documented per HTTP status with the `ApiErrorBody` schema from `@zivali/validation`.
- Named types: shared request and response schemas live in `@zivali/validation` with `.openapi('ReportDetail')` and are registered as components automatically; an API-only schema gets `.meta({ id: 'HealthReady' })`. Unnamed schemas end up as inline shapes in the generated client.
- After changing a route or schema, run `pnpm --filter api gen:openapi` and commit `openapi.json`; `pnpm verify` fails while it is stale.

## Where does logic go

| Concern                                                                                                    | Place                                                                       |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Request shape (body, query, params)                                                                        | zod schema (`@zivali/validation` once it exists), `validate()` in the route |
| Authentication, role, aal2, verified email, rate limit                                                     | route guards (middleware)                                                   |
| Ownership ("manager of this report", "participant of this conversation"), limits, state machines, any rule | domain function                                                             |
| Database reads and writes                                                                                  | DAO in the same area (`tx ?? prisma`)                                       |
| HTTP status, headers, cookies, redirects                                                                   | controller only                                                             |
| Response shape                                                                                             | mapper in the area                                                          |
| Background work                                                                                            | job handler in `jobs/` calling domain functions                             |
| Scripts, seeders, admin tools, tests                                                                       | call domain functions with `systemCtx()` or `userCtx(actor)`                |

A domain function never imports Express, never reads `req`/`res`, and never catches an error just to rethrow it. Catch locally only where you handle it (retry, fallback, mapping a unique violation to a domain error); `getReadiness` is the example.

Errors: throw `new AppError(code, message?, details?)`. The error middleware renders `{ error: { code, message, details?, issues? } }` with the C1 status; `ZodError` → `VALIDATION` with dotted-path `issues`, Prisma `P2002` → `CONFLICT`, `P2025` → `NOT_FOUND`, anything else → `INTERNAL` (logged with `req_id`, nothing leaked).

Logs (pino, `lib/logger.ts`): one line per request with `req_id`, `route` (method and pattern, e.g. `GET /v1/reports/:id`), `status` and `duration_ms`. URLs, query strings, headers and bodies are never logged, and the keys `lat`, `lng`, `point`, `near`, `location`, `body` and `query` are removed from any log line (C1, C6). Log through `ctx.logger` or `req.log`; `console.*` is a lint error.

## Database (ADR-021)

- `DATABASE_URL` and `DIRECT_URL` must end with `?schema=app`; `lib/config.ts` and `prisma.config.ts` refuse anything else. Prisma then keeps its migrations table in `app`, and `migrate reset` drops only `app`, never Supabase's `public`.
- Models: one file per domain in `prisma/schemas/`, `@@schema("app")` on every model, RLS enabled in the migration.
- The first migration (`TASK-3.7`) creates schemas `app` and `pgboss`, enables `postgis`, `vector` and `pgcrypto` in `extensions`, and revokes everything on `app` and `pgboss` from `public`, `anon` and `authenticated`.
- Platform models (`TASK-6.2`): `profiles` (`users.prisma`, C3), `app_config`, `audit_log`, `rate_limits`, `idempotency_keys` (`platform.prisma`, C1). Every table in `app` and `pgboss` has RLS enabled and no policies; `test/security` proves it, plus no grants and no PostgREST exposure.
- PostGIS types are schema-qualified in `Unsupported(...)` (`extensions.geography(Point,4326)`): with `?schema=app` the search path does not include `extensions`.
- Every new model gets an entry in `prisma/data-inventory.json` (with each R2 bucket); `test/security/data-inventory.test.ts` fails otherwise.
- Seed: fixture users, password and the local TOTP secret for mod and admin are in [prisma/seeders/README.md](prisma/seeders/README.md).
- Prisma 7 no longer generates on `migrate dev`: run `pnpm --filter api exec prisma generate` after schema changes (`pnpm install` also does).
- Geo reference (`TASK-6.4`, `geo.prisma`): `regions` and `municipalities` (GURS, GiST on `geom`), loaded by seeder `01-geo` in every environment. `GeoDomain.lookup({ lat, lng }, ctx)` (`lib/geo.ts`, one raw PostGIS query) returns the municipality and region ids and slugs, or `in_slovenia: false`.
- Commerce and moderation (`TASK-6.8`): `abuse_reports`, `moderation_flags` (`abuse.prisma`, C11), `payments`, `payment_events` (`payments.prisma`, C13), `ads`, `ad_stats_daily`, `partner_stats_snapshot`, `leads` (`ads.prisma`, C14), `organisations`, `organisation_members` (`organisations.prisma`). Value lists, https ad links, ad alt text 5–140 and the EUR 2.00 minimum are database checks; `app_config` `payments.prices` (cents) and `payments.live_allowed` (false) come with the migration. Seeder `30-commerce` loads the house ads everywhere and local fixtures (sponsor ads, a verified shelter).
- Staging and prod geo data: after `prisma migrate deploy`, run `pnpm --filter api db:seed` from a checkout with that `DATABASE_URL`. Reference data (`01-geo`) loads everywhere; fixture seeders skip themselves via `APP_ENV`.
- Reports, pets, photos (`TASK-6.6`, `reports.prisma`, `photos.prisma`): the points are `geography` columns, written and read only in `domains/reports/reports.dao.ts` (`$queryRaw`). Every report location write goes through `ReportsDomain.insertReport` / `updateReportLocation`: `coarsenPoint()` once (20–30 m, random; the received point is never stored), then the public circle from `lib/fuzz.ts` (HMAC with `FUZZ_SECRET` over the report id and the stored point, offset from the type's minimum radius only, minima and grid from `app_config` `fuzz.*`) and the geo lookup of the circle's centre (municipality, region and `in_slovenia` are public). A radius-only change keeps `public_point` and updates `public_radius_m`. `GET /v1/reports/:code` maps through `ReportsMapper` (PublicReport, or ReportOwnerView for managers).
- Photos (`TASK-14.1`, C5, ADR-014, `domains/photos`): `POST /v1/photos` returns a 5-minute presigned PUT (image/jpeg, length pinned) to `uploads/<owner>/<id>.jpg` in the private bucket; `/complete` queues `photo.process` (size, JPEG magic bytes, SHA-256, then sharp: EXIF orientation applied, all metadata dropped, `variants/<id>/{display.webp,display.jpg,thumb.webp}`; the upload is deleted). `photo.publish { report_id }` copies accepted variants of a visible report to the media bucket (`r/<report>/<photo>/…`, URLs under `MEDIA_BASE_URL`, locally the MinIO bucket URL) and deletes them when the report is held, hidden, removed, expired or closed > 30 days: send it from every write that changes a report's visibility or photos. `retention.purge` removes photos unattached for 24 h (`updated_at` is the clock; deleted pets detach theirs) and photos of reports ended 12 months ago. `PHOTO_HOOKS` (empty) lists the queues each accepted photo is sent to (M3). Tests run on the in-memory storage adapter (`vitest.config.ts`).
- `FUZZ_SECRET` rotation: only on a suspected leak (whoever holds the key can search a circle for the stored point that yields its centre). Existing circles stay as they are, because `public_point` is stored; the new key applies to new reports and moved locations. Never log the secret or put it in job payloads.

## Commands

| Command                                                                  | What                                                                                                  |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `pnpm install`                                                           | also creates `apps/api/.env.local` from `.env.example` (if missing) and generates the Prisma client   |
| `pnpm db:start`                                                          | local Supabase (Postgres, Auth, Realtime)                                                             |
| `pnpm db:migrate`                                                        | `prisma migrate dev`: new migration from schema changes (`--name <task-id>-<slug>`)                   |
| `pnpm db:reset`                                                          | `prisma migrate reset --force`, then `prisma db seed`                                                 |
| `pnpm db:seed`                                                           | `prisma db seed`                                                                                      |
| `pnpm --filter api dev` / `dev:worker`                                   | API on :4000 / worker, `tsx watch`                                                                    |
| `pnpm --filter api test`                                                 | Vitest + Supertest against the local database (applies pending migrations first)                      |
| `pnpm --filter api test:security`                                        | ADR-021 lockdown checks                                                                               |
| `pnpm --filter api build`                                                | tsup → `dist/server.js`, `dist/worker.js`                                                             |
| `pnpm --filter api gen:openapi`                                          | write `openapi.json` from the route declarations (`lint` checks it is current)                        |
| `docker build -f apps/api/Dockerfile -t zivali-api .`                    | one image (repo root as context); `node dist/worker.js` for the worker                                |
| `docker run --rm -e DATABASE_URL=… zivali-api npx prisma migrate deploy` | migrations, one-off per deploy                                                                        |
| `docker compose -f docker-compose.dev.yml up -d`                         | MinIO (S3 :9000, console :9001) with `zivali-private`, `zivali-media` (public read), `zivali-backups` |

Endpoints: `GET /ping` → `{ "message": "pong" }`; `GET /v1/health/ready` → `{ ok, version, db, queue_lag_s }` (503 when the database is down; `queue_lag_s`: seconds the oldest due job has waited, `null` when unreadable); `GET /v1/config/public` → public `app_config` flags as `{ key: value }` (`Cache-Control: public, max-age=300`). Every response, errors included, carries `x-request-id`. The OpenAPI document is the committed `openapi.json` (Swagger UI at `/docs` is a later task).

Moved Supabase ports (Windows Hyper-V, [supabase/README.md](../../supabase/README.md)): change the port in `DATABASE_URL` and `DIRECT_URL` in `.env.local` too.

Coding agents: Prisma refuses `migrate reset` when it detects an AI agent unless the user consents, so agents check "from zero" with `prisma migrate deploy` and `prisma db seed` on a scratch database and leave `pnpm db:reset` to a person.

## Auth and platform middleware (C1, C3)

```ts
route(
	spec,
	authMiddleware,
	rateLimit('reports.create', { limit: 10, window: 3600, key: 'user' }),
	requireVerifiedOrAnonymous,
	idempotency({ required: true }), // last, right before the controller
	ReportsController.create
);
route(spec, authMiddleware, requireRole('moderator'), requireAal2, AdminController.list);
```

- `authMiddleware` verifies the Supabase access token with `jose` against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (audience `authenticated`, issuer, exp); the HS256 `SUPABASE_JWT_SECRET` is accepted only when `APP_ENV=local`. It sets `req.user = { user_id, role, is_anonymous, aal, email_verified, locale }` with role and locale from `app.profiles` and `email_verified` from `auth.users.email_confirmed_at` (never from `user_metadata`, which users can write), cached 60 s (`invalidateProfile(id)` after a role change), and creates a missing profile (`ensureProfile`). `optionalAuth` never answers 401.
- Guards (`permission.middleware.ts`): anonymous finders count as signed out (`UNAUTHENTICATED`) except in `requireVerifiedOrAnonymous`; `requireVerified` → `UNVERIFIED_EMAIL`, `requireRole('moderator' | 'admin')` → `FORBIDDEN`, `requireAal2` → `AAL2_REQUIRED`, `rejectAnonymous`.
- `rateLimit(name, { limit, window (s), key: 'user' | 'ip' | 'device' })`: fixed window in `app.rate_limits`, IPs and `x-device-id` stored as HMAC (`RATE_SALT`); `key: 'user'` counts anonymous finders per device (else IP), signed-out callers per IP; `app_config` `rate.<name>` = `{ limit, window }` overrides the code values (positive integers, window ≤ 172 800 s, else ignored); 429 with `Retry-After`.
- `idempotency({ required })` last, right before the controller (after auth and guards): same user + key + route + body (canonical JSON, SHA-256) within 24 h replays the stored response (`Idempotent-Replayed: true`); another user, route or body, or a running first request → 409 `CONFLICT`; bodies stored encrypted (`IDEMPOTENCY_KEY`); 5xx, 429, 401 and 403 are not stored.
- Staff and destructive services write `AuditDao.write(tx, { actor_id, action, target_type, target_id, diff, note })` (`domains/platform`). `PlatformDao.purgeExpired(now)` is for the retention job.
- Jobs (ADR-022): `ctx.jobs.send(queue, data, { tx?, singletonKey?, startAfter? })`, with `tx` the job exists only if the transaction commits; every queue retries 5 times with backoff, then `failed`. Schedules (Europe/Ljubljana) are created by the worker. Tests call `drain(runJob)` (retries and deferred jobs run at once). `NotificationsDomain.enqueueNotification({ user_id, type, payload: { template, report_id?, … }, dedupe_key? }, ctx)` sends `notify.send` (ids and a template key only, it is stored in `pgboss.job`); the handler loads the copy variables from those ids through the type's source in `domains/notifications/sources.ts` (the feature that owns the data adds it), then stores the inbox row, broadcasts `notification.created` on `user:<id>`, and sends push and email in `profiles.locale` (C10). `sendManageLink` emails the finder's private link directly (the token never goes into a job).
- `startJobs()` (API and worker) starts pg-boss, creates the queues, then `lockDownPgboss()` (`lib/pgboss-lockdown.ts`) enables RLS on the tables pg-boss created (CH-106); if it fails, the API and the worker log `fatal` and exit 1.

## Chat and Realtime (C9, ADR-023)

- `/v1/conversations` (`routes/conversations.routes.ts`, `domains/chat`): participants only. `sendMessage` stores the message, broadcasts `message.created` on `conversation:<id>` and `conversation.updated` on each other participant's `user:<id>` with `realtime.send` in the same transaction (`lib/realtime.ts`), and queues `chat_message` (`{ template, thread_id, message_id }`, dedupe key `chat:<id>:<5-minute window>`) for participants who are not muted and have not read the conversation in the last 2 minutes (online).
- `app.can_join_topic(uid, topic)` (security definer, EXECUTE for `authenticated` only, no usage on `app`) backs the one policy on `realtime.messages`. The migration skips the policy where `realtime.messages` does not exist (shadow databases): a scratch database for the chat tests needs a Realtime server attached before migrating.
- `ChatDomain.closeForReport({ report_id }, ctx)` makes the report's conversations read-only (call it inside the close transaction); `retention.purge` deletes them with their messages `retention.chat_months` (6) after close.
- `test/routes/conversations.realtime.test.ts` (two WebSocket clients, p95 < 2 s) runs only when a Realtime server is attached to the test database (schema `_realtime`). `REALTIME_URL` overrides `${SUPABASE_URL}/realtime/v1`, e.g. `ws://realtime-dev.localhost:<port>/socket` for a Realtime container started against a scratch database.

## Tests

**Scratch DB for migration work (TASK-101).** From a worktree (path contains `.claude/worktrees/`), `test/global-setup.ts` refuses to migrate the shared DB (`127.0.0.1:55322/postgres`) when your branch has migration folders missing from `app._prisma_migrations`, and names them. Use a scratch DB: `psql postgresql://postgres:postgres@127.0.0.1:55322/postgres -c "create database task_<id>"`, then `TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55322/task_<id>?schema=app" pnpm --filter api test` (it overrides DATABASE_URL and DIRECT_URL and migrates that DB). The base checkout (merge verify) and worktrees with nothing pending still use the shared DB. Humans can bypass with `ALLOW_SHARED_DB_MIGRATE=1`.

`test/helpers/token.ts` signs Supabase-style access tokens with the local `SUPABASE_JWT_SECRET` (HS256, audience `authenticated`): `await signTestToken({ sub, aal: 'aal2', is_anonymous })`. A verified email needs a real `auth.users` row: `sub = await createAuthUser({ email_verified, is_anonymous })`, cleaned up with `deleteAuthUsers(ids)`. Test files run one at a time against the shared local database; `test/global-setup.ts` applies pending migrations (never resets). `test/security` and `test/seeders` also call the local Supabase at `SUPABASE_URL` (PostgREST, Auth): an `.env.local` copied before TASK-6.2 needs that line from `.env.example`, and one copied before TASK-6.12 needs `RATE_SALT` and `IDEMPOTENCY_KEY`.
