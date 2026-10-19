# Najdimo

Najdimo (working name Izgubljene živali) is a lost pet finder for Slovenia (dogs and cats), on the web and on mobile. Owners report a lost pet, finders and shelters report found or sighted animals, and the system matches the two sides by chip number, photo, location, time and attributes.

Product: [`docs/01-project-brief.md`](docs/01-project-brief.md). Architecture: [`docs/04-technical-design.md`](docs/04-technical-design.md). Implementers work from the slices [`docs/tech/frontend.md`](docs/tech/frontend.md) and [`docs/tech/backend.md`](docs/tech/backend.md) and the contracts in [`docs/tech/contracts/`](docs/tech/contracts/).

## Workspace

pnpm 11 workspaces and Turborepo 2 ([ADR-001](docs/tech/adr/001-monorepo-and-tooling.md)). Packages are scoped `@zivali/*`.

| Path                                                                           | What                                                                                                                                                                         |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api`                                                                     | Express 5 + Prisma 7 API and pg-boss worker (ADR-020); package `api`                                                                                                         |
| `apps/web`                                                                     | Next.js (App Router) + shadcn/ui; package `web`                                                                                                                              |
| `apps/mobile`                                                                  | Expo Router + React Native Reusables (NativeWind); package `mobile`                                                                                                          |
| `packages/{tokens,types,validation,api,i18n,analytics}`                        | shared code; packages export TypeScript source by subpath                                                                                                                    |
| `supabase/`                                                                    | local stack config (Postgres, Auth, Realtime, mail catcher), Auth templates, geo seed data                                                                                   |
| `scripts/`                                                                     | Node scripts behind the root commands                                                                                                                                        |
| `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`, `.editorconfig` | shared TypeScript (strict), ESLint (flat, `import-x/order`, eslint-config-prettier) and Prettier configuration (klikni style: tabs, width 4, print width 120, single quotes) |
| `.husky/pre-commit`                                                            | runs lint-staged: `eslint --fix` and `prettier --write` on staged files                                                                                                      |
| `turbo.json`                                                                   | `build`, `dev`, `dev:worker`, `lint`, `typecheck`, `test` pipelines                                                                                                          |

A new package gets a `package.json` with whichever of `build`, `dev`, `lint`, `typecheck` and `test` it needs (Turbo runs only the scripts that exist) and a `tsconfig.json` that extends `../../tsconfig.base.json`. Apps that need a framework ESLint preset add their own `eslint.config.mjs` that spreads the root one. Dependencies come only from [ADR-017](docs/tech/adr/017-dependency-allowlist.md).

## Bootstrap (target: under 15 minutes from a fresh clone)

Prerequisites: Git, Node 22 (`.nvmrc`), Corepack (ships with Node) and Docker Desktop running. The Supabase CLI is a dev dependency, so there is nothing else to install globally. `pnpm install` also sets up the Git hooks (husky).

```sh
git clone <repo> izgubljene-zivali
cd izgubljene-zivali
corepack enable          # uses the pnpm version pinned in package.json
pnpm bootstrap           # install, local Supabase, MinIO, migrations + seed, seed photos, tokens and i18n builds
pnpm dev                 # API on http://localhost:4000, worker, web on http://localhost:3000
```

Rough budget: install 2 to 3 minutes, the first `supabase start` 5 to 8 minutes (Docker image pulls; later starts take seconds), the rest under a minute. No cloud credential is needed: every integration (AI, payments, email, push, captcha, analytics) runs on its mock adapter when its variables are empty.

Mobile: `pnpm --filter mobile start` starts the Expo dev server for the development build.

## Commands

Root scripts. Until the piece a script needs is merged, it prints which task adds it and exits cleanly.

| Command                                         | What                                                                                                              | Active from                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `pnpm bootstrap`                                | install, `db:start`, MinIO up, `db:reset`, seed photos, build packages (tokens, i18n)                             | now                                    |
| `pnpm dev`                                      | `turbo run dev dev:worker`: API on :4000, worker, web on :3000, packages in watch; starts whichever of them exist | TASK-3.3 (web), TASK-3.7 (api, worker) |
| `pnpm build`                                    | `turbo run build`                                                                                                 | now                                    |
| `pnpm lint`                                     | ESLint on root scripts, then `turbo run lint`                                                                     | now                                    |
| `pnpm typecheck`                                | `turbo run typecheck`                                                                                             | now                                    |
| `pnpm test`                                     | `turbo run test` (Vitest, jest-expo)                                                                              | now                                    |
| `pnpm format`                                   | Prettier write; `pnpm format:check` checks only                                                                   | now                                    |
| `pnpm verify`                                   | every gate of the CI `verify` job, required before reporting a task done (see below)                              | now                                    |
| `pnpm quality`                                  | build + serve web on :8080 (`QUALITY_PORT`): axe, console, consent, visual, Lighthouse CI, links → quality-report | now                                    |
| `pnpm images`                                   | Docker builds of the api and web images for this machine's platform, as the CI `images` job                       | now                                    |
| `node scripts/deploy.mjs <staging\|production>` | checks + dry run; with `--deploy` deploys to the Hetzner VPS (arm64 images, migrations, smoke checks, rollback)   | now                                    |
| `pnpm db:start` / `db:stop`                     | local Supabase stack lifecycle                                                                                    | TASK-3.2                               |
| `pnpm db:migrate`                               | `prisma migrate dev` in apps/api (new migration from schema changes)                                              | TASK-3.7                               |
| `pnpm db:reset`                                 | `prisma migrate reset --force`, then `prisma db seed`                                                             | TASK-3.7                               |
| `pnpm db:seed`                                  | `prisma db seed`                                                                                                  | TASK-3.7                               |
| `pnpm jobs:drain`                               | process all queued jobs once (`apps/api/scripts/jobs-drain.ts`)                                                   | TASK-6.3                               |
| `pnpm admin:create <email>`                     | promote an existing local account to admin                                                                        | TASK-34.2                              |

Per package: `pnpm --filter <name> <script>`, for example `pnpm --filter web e2e` or `pnpm --filter @zivali/i18n check`. Supabase CLI directly: `pnpm exec supabase <command>`.

Web: the app refuses to start without `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local` and names the missing one. `pnpm --filter web e2e` builds and starts the app on :3000 (or reuses a running `pnpm dev`); before the first run, `pnpm --filter web exec playwright install chromium`.

## The `pnpm verify` rule

`pnpm verify` is the full local gate ([ADR-016](docs/tech/adr/016-environments-hosting-cicd.md)): Prettier check, root lint and script tests, secretlint (source roots), `turbo run lint typecheck test build` (tokens contrast, i18n parity, unit tests, API and ADR-021 security tests against the local database, web build, mobile `expo export`). merge.mjs runs it again before every merge to main, so CI does not repeat lint, typecheck or the tests: the CI `verify` job (`.github/workflows/ci.yml`) runs `pnpm verify:static`, the web build, `pnpm audit --audit-level high` and the Playwright e2e (`pnpm --filter web e2e`); run those two locally when dependencies or web pages change. Every implementer runs it on their branch and it must pass before the task is reported done. It needs the local database (`pnpm db:start`; with moved ports set `DATABASE_URL` and `DIRECT_URL`, which win over `apps/api/.env.local`) (the smoke also needs Playwright's Chromium: `pnpm exec playwright install chromium`, once). CI runs `pnpm quality` nightly and on demand (`quality.yml`) and `pnpm images` when Docker-relevant files change (`images.yml`); run them locally when web pages, a Dockerfile or dependencies change. Branch protection for main requires `verify` only ([docs/04 §CI/CD](docs/04-technical-design.md)).

## Environment variables

Names only; values never go into Git. [`.env.example`](.env.example) lists every name, grouped by the gitignored file that holds it locally. Local development needs only the local Supabase URL and keys (`pnpm exec supabase status` prints them); staging credentials live in the root `.env.local` on the team machine.

| File                     | Variables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/.env.local`    | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `APP_ENV`, `NEXT_PUBLIC_ANALYTICS_PROVIDER`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `GA_PROPERTY_ID` and `GA_SERVICE_ACCOUNT_KEY_FILE` (the last two server only)                                                                                                                                                                                                                                                                                                                                                                  |
| `apps/mobile/.env.local` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_APP_URL`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_ANALYTICS_PROVIDER`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `GOOGLE_SERVICES_JSON`, `GOOGLE_SERVICE_INFO_PLIST` (EAS file secrets; locally from `.secrets/`)                                                                                                                                                                                                                                                                                                                                                                    |
| `apps/api/.env.local`    | runtime (`APP_ENV`, `APP_VERSION`, `PORT`, `API_URL`, `APP_URL`, `WEB_ORIGINS`), database and Supabase (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`), secrets (`FUZZ_SECRET`, `RATE_SALT`, `IDEMPOTENCY_KEY`), storage (`STORAGE_PROVIDER`, `R2_*`, `MEDIA_BASE_URL`, `S3_ENDPOINT`) and the adapters (`PAYMENTS_PROVIDER`, `STRIPE_*`, `MOCK_WEBHOOK_SECRET`, `EMAIL_PROVIDER`, `BREVO_API_KEY`, `EMAIL_FROM`, `LEADS_NOTIFY_EMAIL`, `PUSH_PROVIDER`, `EXPO_ACCESS_TOKEN`, `CAPTCHA_PROVIDER`, `TURNSTILE_SECRET_KEY`, `AI_*`, `ANTHROPIC_API_KEY`, `EMBEDDER_PROVIDER`, `VOYAGE_API_KEY`, `GA_*`); full list in `.env.example` and [backend.md](docs/tech/backend.md) |
| `supabase/.env`          | `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`, `SUPABASE_AUTH_EXTERNAL_APPLE_CLIENT_ID`, `SUPABASE_AUTH_EXTERNAL_APPLE_SECRET`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `.env.local` (root)      | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`, `HETZNER_HOST`, `HETZNER_SSH_KEY`, `HETZNER_KNOWN_HOSTS`, `WEB_HOST`, `API_HOST`, `CERTBOT_CLOUDFLARE_TOKEN`, `EXPO_TOKEN`, `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` (test keys only), `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_KEY_FILE`                                                                                                                                                                                                                                                                                                                             |

## Environments and credentials

| Environment | Where                                                                                                                                 | Deployed by                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| local       | your machine: local Supabase, MinIO, `pnpm dev`; every adapter on its mock                                                            | -                                                  |
| staging     | Hetzner CAX11 (Arm64), Docker Compose, nginx + certbot; Supabase `najdimo` (Free); R2; `staging.najdimo.si`, `api-staging.najdimo.si` | every push to `main` that passes CI (`deploy.yml`) |
| production  | the same VPS under its own Compose project and its own Supabase project; `najdimo.si` (+ `www`), `api.najdimo.si`                     | a version tag `vX.Y.Z` after manual approval       |

Images are `linux/arm64` (the CAX11 is an Ampere server) and go from the build machine straight to the VPS (`docker save | zstd | ssh docker load`, no registry): the workflow builds them on `ubuntu-24.04` with Buildx, where only the api image's runtime stage runs under QEMU; GitHub's `ubuntu-24.04-arm` runner is an alternative that builds natively without QEMU. A workstation needs `zstd` and Docker with Arm64 emulation (Docker Desktop; if a build fails with `exec format error`, register it once with `docker run --privileged --rm tonistiigi/binfmt --install arm64`).

`node scripts/deploy.mjs <staging|production> --deploy` deploys from a workstation and is what the workflow runs. Without `--deploy` it only checks and runs the dry run, writing nothing outside the machine; without a credential it prints `NEEDS-INPUT` with the variable names (never values) and runs the dry run (arm64 image builds, migrations from zero on a scratch local database with `prisma migrate diff`, the ADR-021 security tests) instead. Runbook (VPS setup, firewall, DNS and certificates, R2 buckets, Supabase settings, rollback, restore): [`deploy/README.md`](deploy/README.md).

| Credential (names only)                                                                                                              | Who provides it                                                              | Monthly cost                                                                                                   | Blocked without it                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `HETZNER_HOST`, `HETZNER_SSH_KEY`, `HETZNER_KNOWN_HOSTS`; for CI also `HETZNER_API_TOKEN`, `HETZNER_FIREWALL_ID`                     | client: Hetzner Cloud project, CAX11 server, Cloud Firewall                  | CAX11 about €7.31 incl. VAT with the public IPv4 (resize to CAX21 for production if needed); no backups add-on | any deploy (dry run only); CI deploys without the API token (port 22 is admin-IP only) |
| `WEB_HOST`, `API_HOST` (per environment); `CERTBOT_CLOUDFLARE_TOKEN` (Zone DNS Edit on `najdimo.si` only)                            | client: domain `najdimo.si` on Cloudflare (DNS, proxy, TLS mode Full strict) | domain about €15–20/year; Cloudflare free plan; Let's Encrypt free                                             | HTTPS hostnames (certbot DNS-01), Auth redirect URLs, e-mail sender, store builds      |
| Repository variable `DEPLOY_ENABLED`, environments `staging` and `production` (required reviewers), their secrets and variables      | client: GitHub repository `SignappsTech/zivali` settings                     | €0 (Actions minutes of the plan)                                                                               | automatic deploys (a workstation deploy still works)                                   |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`; buckets in the EU jurisdiction (created), `media.najdimo.si`            | client: Cloudflare account with R2                                           | €0 within the free tier (10 GB, 1M writes, 10M reads)                                                          | photo uploads and publishing, nightly backups                                          |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, the session pooler URL (`DATABASE_URL`) | client (project `najdimo` exists); the dashboard settings in the runbook     | €0 (Free); Pro about $25 when limits or backups require it                                                     | sign-in, the database, the ADR-021/ADR-023 settings check                              |
| `BREVO_API_KEY`, `EMAIL_FROM`                                                                                                        | client: Brevo account, sender domain                                         | €0 (300 e-mails/day)                                                                                           | alert and notification e-mails (`EMAIL_PROVIDER=off`)                                  |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                                                             | client: Cloudflare Turnstile widget                                          | €0                                                                                                             | captcha on anonymous reports and the leads form                                        |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY` (test keys only)                                              | team: Stripe sandbox account                                                 | fees per payment only                                                                                          | payments (`PAYMENTS_PROVIDER=off`)                                                     |
| `EXPO_TOKEN`, `EXPO_ACCESS_TOKEN`                                                                                                    | client: Expo account                                                         | €0 (EAS free tier)                                                                                             | mobile builds, push notifications                                                      |

Running cost at start: about €7–8/month (VPS) plus the domain; everything else stays in free tiers until usage grows. Server, database and storage are in the EU (Hetzner Germany/Finland, Supabase Frankfurt, R2 EU jurisdiction).

## Branches and commits

- Base branch `main`. One branch per task: `agent/<task-id>-<slug>`, for example `agent/task-3.2-sb`.
- Commit messages: `<task-id>: <what>`, for example `TASK-3.2: local Supabase config and first migration`. The pre-commit hook fixes lint and formatting on staged files; it does not check the message.
- Implementers never merge their own branch; merges happen after tech-lead review.
- Tasks live in Backlog.md (`backlog/`); change them only through the `backlog` CLI.

## Windows notes

- Docker Desktop (WSL 2 backend) must be running before `pnpm bootstrap` or `pnpm db:start`.
- The repository uses LF line endings (`.gitattributes`, `.editorconfig`). Run `git config core.autocrlf false` in the clone so Git does not convert them.
- Root scripts are plain Node, so they work the same in PowerShell, cmd and Git Bash.
- Maestro flows for mobile need the Android emulator from Android Studio.
