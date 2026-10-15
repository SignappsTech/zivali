# ADR-020: Express + Prisma API in `apps/api`, following the client's klikni conventions

- Status: Accepted · Date: 2026-10-15 · Owner: Tech Lead · Supersedes ADR-003
- Source: brief v1.0 §Technical (client decision 2026-10-15), reference project `klikni-be` (the client's Express backend), ADR-021, ADR-022, ADR-023

## Context

The client wants to own the backend in a stack they know: Express + Prisma, the way klikni is built. Supabase stays only for Postgres (PostGIS, pgvector), Auth (email, Google, Apple, anonymous finders, Turnstile) and Realtime. All business logic and permission checks move into one REST API used by web and mobile. klikni is much bigger and has known inconsistencies, so we mirror its shape and keep the good parts, and simplify the rest.

## Decision

**Stack**: Node 22, TypeScript (repo version), ESM (`"type": "module"`), **Express 5** (native async error handling), **Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg`, `prisma.config.ts`, multi-file schema, TypedSQL), **zod** (shared `@zivali/validation`), **pino** + pino-http, helmet, cors, compression, express-rate-limit, `jose` (JWKS), pg-boss (ADR-022), `@aws-sdk/client-s3` for R2 (ADR-014), Stripe SDK. Dev with **tsx** watch, build with **tsup**, tests with **Vitest + Supertest** against the local database.

**Layout** (klikni style: no `src/`, folders at the app root):

    apps/api/
      app.ts               builds the Express app (middleware order below), exports app
      server.ts            http server, graceful shutdown (SIGTERM: stop accepting, drain, prisma.$disconnect)
      worker.ts            pg-boss worker entry (same image, second process)
      routes/              index.ts (mounts /v1), <area>.routes.ts (one Router per area)
      controllers/         <area>.controller.ts – thin: read the validated request, build ctx, call the domain, map the result, respond
      domains/<area>/      ALL business logic, HTTP-agnostic (client decision 2026-10-15):
                             <area>.domain.ts   functions (input, ctx) → result; permission and ownership checks; transactions; jobs.send; throw AppError
                             <area>.dao.ts      Prisma access only; every function takes tx?: Prisma.TransactionClient (const db = tx ?? prisma)
                             <area>.mapper.ts   Prisma payload → response DTO (validated with the DTO schema)
                             index.ts           exports the domain functions (klikni's newer domains/ style)
                           areas: users, reports, pets, photos, geo, matching, chat, notifications, alerts, abuse, payments, ads, partners, directory, organisations, admin, sync
      middleware/          auth.ts, permission.ts, validate.ts, rateLimit.ts, idempotency.ts, error.ts, requestId.ts
      jobs/                <queue>.job.ts handlers (ADR-022)
      lib/                 config.ts (zod env, loaded once), logger.ts, errors.ts (AppError), s3.ts, jobs.ts, realtime.ts, fuzz.ts, …
      adapters/            ai/, embedder/, payments/, email/, push/, captcha/ – interface + mock + provider (ported from the TASK-3.2 branch)
      prisma/              prisma.ts (client singleton), schemas/*.prisma (by domain) + migrations/, sql/*.sql (TypedSQL), includes/*.ts, seed.ts, seeders/
      test/                setup.ts, helpers (auth token factory, db reset), routes/*.routes.test.ts, domains/*.test.ts, jobs/*.test.ts, security/*.test.ts
      Dockerfile, tsup.config.ts, prisma.config.ts, vitest.config.ts, .env.example

**Conventions**
- Functions, not classes: each controller, domain and DAO module exports named async functions plus `export default { … }`; imported as `ReportsDomain.createReport(…)`, `ReportsDao.getById(…)`.
- **Where logic goes**: routes declare validation and guards; controllers only translate HTTP ↔ domain (`req` → `(input, ctx)` → mapper → `res`); **domains hold every rule** (permissions, ownership, state machines, limits, transactions, job sends) and know nothing about Express; DAOs only talk to Prisma. The same domain functions are called by worker jobs, seeders, admin scripts and tests. `ctx = { actor: { user_id, role, is_anonymous, aal, email_verified } | null, locale, device_hash?, ip_hash?, tx?, now, jobs, logger, adapters }`.
- **File naming (client convention)**: routes `<area>.routes.ts` (one Router each, mounted by `routes/index.ts`); suffixes `.controller.ts`, `.domain.ts`, `.dao.ts`, `.middleware.ts`, `.schema.ts`, `.job.ts`, `.test.ts`; details in `docs/tech/backend.md` §Naming.
- Errors: domains throw typed `AppError(code, message?, details?)`; the central Express 5 error middleware maps `AppError`, `ZodError` and known Prisma errors (`P2002` → `CONFLICT`, `P2025` → `NOT_FOUND`) to `{ error: { code, message, … } }`. No boilerplate try/catch in controllers; a local try/catch only where an error is actually handled (retry, fallback, translating a unique violation into a domain error).
- Route pattern: `router.post('/', authMiddleware, validate(CreateReportSchema), requireVerified, ReportsController.create)`; guards: `authMiddleware` (required), `optionalAuth`, `requireRole('moderator'|'admin')`, `requireAal2`, `requireVerified`; ownership and manager checks live in services.
- **Prisma naming (mirrors klikni)**: snake_case plural model names without `@@map` (`reports`, `report_managers`), snake_case columns, `id String @id @default(uuid()) @db.Uuid`, `created_at DateTime @default(now()) @db.Timestamptz(6)`, `updated_at @updatedAt`, enums in SCREAMING_SNAKE, `/// @namespace` doc comments; plus `@@schema("app")` on every model (ADR-021). Include constants with `GetPayload` types in `prisma/includes/`. No `$extends` that rewrite results.
- Geo and vector queries: TypedSQL files in `prisma/sql/` (`geoLookup.sql`, `searchReports.sql`, `matchCandidates.sql`, `alertRecipients.sql`, `syncReports.sql`), generated with `prisma generate --sql`.
- **HTTP**: base path `/v1`, kebab-case plural nouns, no verb routes except clear actions as sub-resources (`POST /v1/matches/:id/confirm`). Responses without an envelope (klikni style): single resources as objects, lists as `{ items, next_cursor }` (keyset). Errors always `{ error: { code, message, details?, issues? } }` with stable codes (C1).
- Config read once from `lib/config.ts` (zod-validated, fails at start with the variable name); no `dotenv` calls in modules.
- Logging with pino (JSON in production, pretty locally), request id per request, no PII; `console.*` is a lint error in `apps/api`.
- OpenAPI from the zod schemas with `@asteasolutions/zod-to-openapi` (the registry part of klikni's pipeline only), served at `/v1/docs` outside production.
- Middleware order in `app.ts`: request id → pino-http → helmet → cors (allowlist: web origins; requests without Origin allowed for mobile) → compression → `express.json({ limit: '1mb' })` (raw body kept only on the Stripe webhook route) → rate limit (global soft limit) → `/ping` and `/v1` routers → 404 → error middleware.
- Auth: Supabase access token in `Authorization: Bearer`; verified with `jose.jwtVerify` against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (asymmetric keys; locally `SUPABASE_JWT_SECRET` HS256 fallback), audience `authenticated`. `req.user = { user_id, role, is_anonymous, aal, email_verified }`; role read from `app.profiles` (cached 60 s).

### klikni patterns: adopt, simplify or skip

| klikni pattern | Verdict | Why |
|---|---|---|
| pnpm monorepo, `apps/api`, ESM, no `src/` folder | Adopt | Same shape as their repo, fits our workspace |
| Router → controller → domain → DAO, plain function modules with default-export objects | Adopt | The client's daily pattern, with the domain layer in between |
| `tx ?? prisma` transaction client in every DAO | Adopt | Clean transactions across DAOs |
| `domains/<area>/` layer (`*.domain.ts`, `*.dao.ts`, `*.mapper.ts`) holding all business logic | Adopt (client decision) | klikni's own refactor plan and newer `domains/` folders; HTTP-agnostic functions reused by controllers, jobs, scripts and tests instead of big `lib/*Helpers` |
| `validate(schema, source)` zod middleware with dotted-path issues | Adopt | Also validate params and query, not only body |
| Shared zod DTO package (Base/Ref/Detail, mappers with `Schema.parse`) | Simplify | One file per domain in `@zivali/validation` instead of per-model folders and generated enums |
| `requirePermission('resource:action')` with DB roles, scopes and business headers | Simplify | A role enum + `requireRole`/`requireAal2` guards + ownership checks in services is enough here |
| Own JWT, session tables, Redis jti blacklist, Google/Apple verification | Skip | Supabase Auth issues and revokes tokens; we only verify via JWKS |
| `authMiddleware` / optional auth naming and `req.user` | Adopt | Familiar names |
| Prisma 7 `prisma-client` generator, adapter-pg, `prisma.config.ts`, multi-file `schemas/`, TypedSQL in `prisma/sql` | Adopt | Same tooling; TypedSQL covers our PostGIS and pgvector queries |
| snake_case plural models without `@@map`, snake_case columns, Timestamptz, SCREAMING_SNAKE enums | Adopt | Matches their database style |
| Generated client in a separate `packages/db` + enum copy scripts + `run-prisma.js` | Skip | Default output inside `apps/api`; standard Prisma CLI |
| Prisma `$extends` rewriting every query (password stripping, S3 links) | Skip | Slow and surprising; explicit `select`/`omit` and mappers instead |
| `prisma/includes/<model>.ts` with `GetPayload` types | Adopt | Typed includes reused by DAOs and mappers |
| `prisma migrate deploy` in the start script; seeders called from `prisma/seed.ts` | Simplify | Seeders adopted; migrations run once per deploy in a one-off container, not on every start |
| try/catch in every controller, mixed `{error}`/`{message}` bodies, DAOs re-wrapping errors | Skip | Typed `AppError` from domains, Express 5 async errors, one error middleware and body shape; local try/catch only where an error is handled |
| `dotenv.config()` in many modules, `ENVIRONMENT` vs `NODE_ENV` | Skip | One validated `lib/config.ts`, `APP_ENV` + `NODE_ENV` defined once |
| pino logger (present but unused), morgan | Simplify | Use pino + pino-http for real; drop morgan |
| node-cron inside the web process, no locking | Skip | pg-boss worker process with schedules (client decision, ADR-022) |
| R2 through `@aws-sdk/client-s3` in `lib/s3.ts`, presigned GET | Adopt | Same library and provider |
| Base64 uploads in JSON with a 512 MB body limit | Skip | Presigned PUT to R2, 1 MB JSON limit |
| `lib/emailSender` (nodemailer + Resend, pug templates) | Simplify (client confirmed) | Same adapter idea; provider Brevo (EU, ADR-010), Resend stays an easy adapter swap; templates from i18n strings, no pug |
| Payment provider adapter + Stripe adapter + webhook handler | Adopt | Same shape; domain-event dispatcher skipped (single flow) |
| Socket.IO + Redis adapter | Skip | Supabase Realtime Broadcast (ADR-023), no Redis |
| Jest + ts-jest + Supertest with Prisma fully mocked, generated test suites | Simplify | Supertest kept; Vitest (repo standard) against the real local Postgres; no generated mock suites |
| zod-to-openapi registry + JSDoc comment parser + RTK codegen + Insomnia + Docusaurus | Simplify | zod-to-openapi registry only, docs at `/v1/docs`; thin hand-written client in `packages/api` |
| No response envelope; keyset `next_cursor` pagination | Adopt | Lists as `{ items, next_cursor }` everywhere |
| Mixed URL casing and verb routes, `/api` without version | Skip | `/v1`, kebab-case plural nouns |
| tsx for dev, tsup for build | Adopt | Same toolchain (tsx watch instead of nodemon) |
| ESLint flat + import/order + prettier plugin; Prettier tabs (width 4), print width 120, single quotes, trailing commas es5 | Adopt (client confirmed), two tool swaps | Same Prettier settings and import groups, applied repo-wide once (TASK-3.8); `eslint-plugin-import-x` for import order (klikni's plugin lacks ESLint 10 support) and Prettier run on its own with `eslint-config-prettier` instead of the prettier plugin (ADR-017) |
| husky + lint-staged; commitlint | Adopt / Skip | Hooks adopted; commit format stays `<task-id>: <what>` |
| CI without lint, types or tests; pm2 + rsync deploy | Skip | Full gates in CI; Docker Compose + Caddy on Hetzner (client decision) |
| Path aliases in tsconfig, tsup, jest and shell profiles | Skip | Package subpath exports and relative imports |
| `.github/copilot-instructions.md` style conventions file | Simplify | `docs/tech/backend.md` is the conventions file for agents |

Security note for the client: klikni's `apps/api/pool/pool.js` contains hard-coded database credentials in git; rotate that password.

## Alternatives

- Keep Supabase as the API (ADR-003): rejected by the client (ownership, familiarity).
- NestJS / Fastify: more structure or speed, but not what the client knows.

## Consequences

- Every endpoint enforces permissions in code; the database is locked down (ADR-021) and tests cover both.
- One more deployable (api + worker image); the VPS hosts it (ADR-016).
- `packages/api` becomes a thin fetch client over REST; `@zivali/validation` holds the request schemas and response DTOs shared with the API.
