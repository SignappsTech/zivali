# Izgubljene živali

Lost pet finder for Slovenia (dogs and cats), on the web and on mobile. Owners report a lost pet, finders and shelters report found or sighted animals, and the system matches the two sides by chip number, photo, location, time and attributes.

Product: [`docs/01-project-brief.md`](docs/01-project-brief.md). Architecture: [`docs/04-technical-design.md`](docs/04-technical-design.md). Implementers work from the slices [`docs/tech/frontend.md`](docs/tech/frontend.md) and [`docs/tech/backend.md`](docs/tech/backend.md) and the contracts in [`docs/tech/contracts/`](docs/tech/contracts/).

## Workspace

pnpm 11 workspaces and Turborepo 2 ([ADR-001](docs/tech/adr/001-monorepo-and-tooling.md)). Packages are scoped `@zivali/*`.

| Path                                                          | What                                                                 |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/web`                                                    | Next.js (App Router) + shadcn/ui                                     |
| `apps/mobile`                                                 | Expo Router + React Native Reusables (NativeWind)                    |
| `packages/{tokens,types,validation,api,i18n,analytics}`       | shared code; packages export TypeScript source by subpath            |
| `supabase/`                                                   | local stack config, migrations, seed, pgTAP tests                    |
| `supabase/functions`                                          | Edge Functions (Deno), also the workspace package `functions`        |
| `scripts/`                                                    | Node scripts behind the root commands                                |
| `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json` | shared TypeScript (strict), ESLint (flat) and Prettier configuration |
| `turbo.json`                                                  | `build`, `dev`, `lint`, `typecheck`, `test`, `gen:types` pipelines   |

A new package gets a `package.json` with whichever of `build`, `dev`, `lint`, `typecheck` and `test` it needs (Turbo runs only the scripts that exist) and a `tsconfig.json` that extends `../../tsconfig.base.json`. Apps that need a framework ESLint preset add their own `eslint.config.mjs` that spreads the root one. Dependencies come only from [ADR-017](docs/tech/adr/017-dependency-allowlist.md).

## Bootstrap (target: under 15 minutes from a fresh clone)

Prerequisites: Git, Node 22 (`.nvmrc`), Corepack (ships with Node) and Docker Desktop running. The Supabase CLI and Deno are dev dependencies, so there is nothing else to install globally.

```sh
git clone <repo> izgubljene-zivali
cd izgubljene-zivali
corepack enable          # uses the pnpm version pinned in package.json
pnpm bootstrap           # install, local Supabase, migrations + seed, seed photos, tokens and i18n builds
pnpm dev                 # web on http://localhost:3000
```

Rough budget: install 2 to 3 minutes, the first `supabase start` 5 to 8 minutes (Docker image pulls; later starts take seconds), the rest under a minute. No cloud credential is needed: every integration (AI, payments, email, push, captcha, analytics) runs on its mock adapter when its variables are empty.

Mobile: `pnpm --filter mobile start` starts the Expo dev server for the development build.

## Commands

Root scripts. Until the piece a script needs is merged, it prints which task adds it and exits cleanly.

| Command                     | What                                                                            | Active from |
| --------------------------- | ------------------------------------------------------------------------------- | ----------- |
| `pnpm bootstrap`            | install, `db:start`, `db:reset`, seed photos, build packages (tokens, i18n)     | now         |
| `pnpm dev`                  | `turbo run dev` (web on :3000, packages in watch)                               | TASK-3.3    |
| `pnpm build`                | `turbo run build`                                                               | now         |
| `pnpm lint`                 | ESLint on root scripts, then `turbo run lint`                                   | now         |
| `pnpm typecheck`            | `turbo run typecheck`                                                           | now         |
| `pnpm test`                 | `turbo run test` (Vitest, jest-expo)                                            | now         |
| `pnpm format`               | Prettier write; `pnpm format:check` checks only                                 | now         |
| `pnpm verify`               | every gate, required before reporting a task done (see below)                   | now         |
| `pnpm quality`              | quality kit: axe, console errors, visual, Lighthouse CI, links → quality-report | TASK-4.1    |
| `pnpm db:start` / `db:stop` | local Supabase stack lifecycle                                                  | TASK-3.2    |
| `pnpm db:reset`             | rebuild the local database from migrations and seed                             | TASK-3.2    |
| `pnpm db:test`              | pgTAP (`supabase test db`)                                                      | TASK-3.2    |
| `pnpm db:lint`              | `supabase db lint`                                                              | TASK-3.2    |
| `pnpm db:drain`             | run the job worker until the queue is empty                                     | TASK-6.3    |
| `pnpm gen:types`            | regenerate `packages/types/src/database.ts` (Turbo task)                        | TASK-6.5    |
| `pnpm functions:serve`      | serve Edge Functions with `supabase/functions/.env.local`                       | TASK-3.2    |
| `pnpm functions:check`      | `deno check` all Edge Functions                                                 | TASK-3.2    |
| `pnpm admin:create <email>` | promote an existing local account to admin                                      | TASK-34.2   |

Per package: `pnpm --filter <name> <script>`, for example `pnpm --filter web e2e` or `pnpm --filter @zivali/i18n check`. Supabase CLI directly: `pnpm exec supabase <command>`.

## The `pnpm verify` rule

`pnpm verify` runs the same gates CI will run ([ADR-016](docs/tech/adr/016-environments-hosting-cicd.md)); there is no hosted CI until the GitHub repository exists. Every implementer runs it on their branch and it must pass before the task is reported done. Today it runs the Prettier check, lint, typecheck, unit tests and builds; TASK-4.2 extends it to the full pipeline (tokens contrast, i18n parity, pgTAP, `deno check`, Playwright smoke, quality kit, secretlint, `pnpm audit`).

## Environment variables

Names only; values never go into Git. [`.env.example`](.env.example) lists every name, grouped by the gitignored file that holds it locally. Local development needs only the local Supabase URL and keys (`pnpm exec supabase status` prints them); staging credentials live in the root `.env.local` on the team machine.

| File                            | Variables                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/.env.local`           | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `APP_ENV`, `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GEOCODER`, `NEXT_PUBLIC_MAPTILER_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `SUPABASE_SECRET_KEY` (server only)                                                                                        |
| `apps/mobile/.env.local`        | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_APP_URL`, `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_ANALYTICS_PROVIDER`, `EXPO_PUBLIC_GEOCODER`, `EXPO_PUBLIC_MAPTILER_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST` (EAS file secrets; locally from `.secrets/`)          |
| `supabase/functions/.env.local` | `APP_URL`, `APP_ENV`, `PAYMENTS_PROVIDER`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MOCK_WEBHOOK_SECRET`, `EMAIL_PROVIDER`, `BREVO_API_KEY`, `EMAIL_FROM`, `LEADS_NOTIFY_EMAIL`, `PUSH_PROVIDER`, `EXPO_ACCESS_TOKEN`, `CAPTCHA_PROVIDER`, `TURNSTILE_SECRET_KEY`, `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `AI_VISION_MODEL`, `AI_VISION_EFFORT`, `EMBEDDER_PROVIDER`, `VOYAGE_API_KEY` |
| `supabase/.env`                 | `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, `SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET`                                                                                                                                                                                                                        |
| `.env.local` (root)             | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (legacy), `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `EXPO_TOKEN`, `STRIPE_SECRET_KEY` (test keys only)                                                                        |

Database Vault secrets (`worker_url`, `worker_key`, `fuzz_secret`, `rate_salt`) are set by a migration locally and by `scripts/deploy.mjs` in the cloud.

## Branches and commits

- Base branch `main`. One branch per task: `agent/<task-id>-<slug>`, for example `agent/task-3.2-sb`.
- Commit messages: `<task-id>: <what>`, for example `TASK-3.2: local Supabase config and first migration`.
- Implementers never merge their own branch; merges happen after tech-lead review.
- Tasks live in Backlog.md (`backlog/`); change them only through the `backlog` CLI.

## Windows notes

- Docker Desktop (WSL 2 backend) must be running before `pnpm bootstrap` or `pnpm db:start`.
- The repository uses LF line endings (`.gitattributes`, `.editorconfig`). Run `git config core.autocrlf false` in the clone so Git does not convert them.
- Root scripts are plain Node, so they work the same in PowerShell, cmd and Git Bash.
- Maestro flows for mobile need the Android emulator from Android Studio.
