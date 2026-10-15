# apps/api

Express 5 + Prisma 7 REST API and the pg-boss worker, in the client's klikni layout ([ADR-020](../../docs/tech/adr/020-api-architecture.md)). Supabase provides only Postgres, Auth and Realtime; every business rule and permission check lives here. Conventions for endpoints, errors, migrations, jobs and seeds: [C1](../../docs/tech/contracts/C1-platform-conventions.md) and [backend.md](../../docs/tech/backend.md).

## Layout (no `src/`)

```
app.ts                      Express app, middleware in ADR-020 order (request id → pino-http → helmet → cors →
                            compression → json 1 MB → global rate limit → /ping, /v1 → 404 → error middleware)
server.ts                   HTTP entry; SIGTERM/SIGINT: stop accepting, finish requests, disconnect Prisma
worker.ts                   worker entry, same image (`node dist/worker.js`); pg-boss arrives with TASK-6.3
routes/index.ts             the /v1 router: one mount line per area
routes/<area>.routes.ts     one Router per area, routes declared with apiRoutes() (validation + OpenAPI, below)
openapi.json                generated, committed OpenAPI 3.1 document (`gen:openapi`); RTK Query codegen input
controllers/<area>.controller.ts   thin: req → ctx → domain → mapper → res (no try/catch)
domains/<area>/             all business logic, HTTP-agnostic
  <thing>.domain.ts           (input, ctx) → result; rules, permissions, ownership, transactions; throws AppError
  <area>.dao.ts               Prisma only; every function takes tx?: Prisma.TransactionClient
  <area>.mapper.ts            domain/Prisma result → response DTO, parsed with the DTO schema
  index.ts                    the area's public functions (the DAO stays private)
middleware/<name>.middleware.ts    requestId, validate (body, query, params), error (+ auth, rateLimit, … later)
lib/                        config.ts (zod env, read once), logger.ts (pino), errors.ts (AppError + C1 codes),
                            ctx.ts (requestCtx, systemCtx), openapi.ts (apiRoutes over the @zivali/validation registry)
scripts/gen-openapi.ts      writes openapi.json; `--check` fails when it is stale (part of `lint`)
prisma/                     prisma.ts (client singleton), schemas/*.prisma + schemas/migrations/, sql/ (TypedSQL),
                            seed.ts (runs seeders/NN-<name>.seeder.ts in order)
generated/                  Prisma client output (gitignored, never edited; `prisma generate` rebuilds it)
test/                       routes/, middleware/, lib/, security/, helpers/ (signTestToken), setup.ts, global-setup.ts
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
| Scripts, seeders, admin tools, tests                                                                       | call domain functions with `systemCtx()`                                    |

A domain function never imports Express, never reads `req`/`res`, and never catches an error just to rethrow it. Catch locally only where you handle it (retry, fallback, mapping a unique violation to a domain error); `getReadiness` is the example.

Errors: throw `new AppError(code, message?, details?)`. The error middleware renders `{ error: { code, message, details?, issues? } }` with the C1 status; `ZodError` → `VALIDATION` with dotted-path `issues`, Prisma `P2002` → `CONFLICT`, `P2025` → `NOT_FOUND`, anything else → `INTERNAL` (logged with `req_id`, nothing leaked).

Logs (pino, `lib/logger.ts`): one line per request with `req_id`, `route` (method and pattern, e.g. `GET /v1/reports/:id`), `status` and `duration_ms`. URLs, query strings, headers and bodies are never logged, and the keys `lat`, `lng`, `point`, `near`, `location`, `body` and `query` are removed from any log line (C1, C6). Log through `ctx.logger` or `req.log`; `console.*` is a lint error.

## Database (ADR-021)

- `DATABASE_URL` and `DIRECT_URL` must end with `?schema=app`; `lib/config.ts` and `prisma.config.ts` refuse anything else. Prisma then keeps its migrations table in `app`, and `migrate reset` drops only `app`, never Supabase's `public`.
- Models: one file per domain in `prisma/schemas/`, `@@schema("app")` on every model, RLS enabled in the migration.
- The first migration (`TASK-3.7`) creates schemas `app` and `pgboss`, enables `postgis`, `vector` and `pgcrypto` in `extensions`, and revokes everything on `app` and `pgboss` from `public`, `anon` and `authenticated`.
- Prisma 7 no longer generates on `migrate dev`: run `pnpm --filter api exec prisma generate` after schema changes (`pnpm install` also does).
- TypedSQL is enabled (`prisma/sql/`); `prisma generate --sql` needs the database running.

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

Endpoints: `GET /ping` → `{ "message": "pong" }`; `GET /v1/health/ready` → `{ ok, version, db, queue_lag_s }` (503 when the database is down; `queue_lag_s` is `null` until pg-boss, TASK-6.3). Every response, errors included, carries `x-request-id`. The OpenAPI document is the committed `openapi.json` (Swagger UI at `/docs` is a later task).

Moved Supabase ports (Windows Hyper-V, [supabase/README.md](../../supabase/README.md)): change the port in `DATABASE_URL` and `DIRECT_URL` in `.env.local` too.

Coding agents: Prisma refuses `migrate reset` when it detects an AI agent unless the user consents, so agents check "from zero" with `prisma migrate deploy` and `prisma db seed` on a scratch database and leave `pnpm db:reset` to a person.

## Tests

`test/helpers/token.ts` signs Supabase-style access tokens with the local `SUPABASE_JWT_SECRET` (HS256, audience `authenticated`): `await signTestToken({ sub, aal: 'aal2', is_anonymous })`. Test files run one at a time against the shared local database; `test/global-setup.ts` applies pending migrations (never resets).
