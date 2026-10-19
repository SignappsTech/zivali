---
doc_id: DOC-04
title: Technical Design
version: 0.15
status: Draft
date: 2026-10-19
owner: Tech Lead
audience: Team, client IT
approvals:
  - Tech Lead | Claude | 2026-10-15 |
---

<!-- Owner: tech-lead. Master tech doc. Implementers read only docs/tech/frontend.md, backend.md and contracts/C*.md slices. "N/A — reason" for anything that does not apply. -->

# Architecture overview

    ┌──────────────────────┐   ┌──────────────────────────┐
    │ apps/web (Next.js 16)│   │ apps/mobile (Expo SDK 57)│
    │ standalone container │   │ dev builds, offline store│
    │ shadcn/ui, TW4       │   │ RN Reusables, NativeWind │
    └───┬──────────────┬───┘   └────┬───────────────┬─────┘
        │ REST /v1 via @zivali/api  │               │ supabase-js: Auth session + Realtime only
        ▼                           ▼               ▼
    ┌────────────────────────────────────┐   ┌──────────────────────────────────────────┐
    │ apps/api (Express 5 + Prisma 7)    │   │ Supabase Free (EU, Frankfurt)            │
    │ routes → controllers → domains/    │   │  Auth: email, Google, Apple, anonymous,  │
    │   (all business logic) → DAOs      │   │        TOTP, Turnstile                   │
    │ JWT check via Supabase JWKS        │◄──┤  Postgres 17 + PostGIS + pgvector        │
    │ worker.ts: pg-boss jobs + schedules│──►│   schema app (not exposed, RLS deny-all) │
    └──────┬──────────────┬──────────────┘   │   schema pgboss (jobs)                   │
           │              │                  │  Realtime Broadcast (private channels)   │
           ▼              ▼                  └──────────────────────────────────────────┘
     Cloudflare R2   Adapters (mock by default): Stripe (test), Brevo email, Expo push,
     photos, backups Turnstile, Anthropic + Voyage (M3)
    Hosting: one Hetzner VPS, Docker Compose: caddy (TLS) → web, api; worker. EAS for mobile builds.
    Web: GA4 after consent · Mobile: Firebase Analytics after consent · Tiles: OpenFreeMap · Geocoding: own, GURS data in Postgres (API)

- **One API**: an Express + Prisma service (`apps/api`, ADR-020) holds all business logic and permission checks in an HTTP-agnostic **domain layer** (`domains/<area>/`), reused by controllers, worker jobs, scripts and tests. Web and mobile call it over REST with the Supabase access token.
- **Supabase for what it is good at**: Postgres (PostGIS, pgvector), Auth, Realtime Broadcast. The database is locked down: app tables live in schema `app`, not exposed by PostgREST, with no grants and deny-all RLS (ADR-021).
- **Async work** in a pg-boss worker process in the same Postgres (ADR-022): matching, notifications, alert fan-out, photo processing, lifecycle, retention, backups, keep-alive.
- **Contracts first**: M1 publishes zod schemas and DTOs, Prisma models, REST endpoint contracts and seed data (TASK-6), so M2 stories build in parallel; the frontend codes against `@zivali/api` with fixtures until an endpoint lands.
- **Local-first**: `supabase start` (Postgres, Auth, Realtime) + MinIO + mock adapters (AI, embeddings, payments, email, push, captcha, analytics); no cloud credentials needed (P-6).
- **Budget**: about €5–10/month at start (Hetzner VPS ~€4–5, Supabase Free, R2 free tier, EAS free tier).

# Technology stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pnpm 11, turbo 2 | ADR-001; Node 22 LTS |
| Language | TypeScript, strict | repo version (TS 6.0) | one version workspace-wide |
| Formatting | Prettier (tabs, width 4, print width 120, single quotes, trailing commas es5), ESLint flat + `import-x/order` + eslint-config-prettier; husky + lint-staged on commit | - | klikni style (ADR-020, ADR-017) |
| Web | Next.js App Router, React 19, `output: 'standalone'` | Next 16.x | server components read through the API with the session token |
| Web UI | shadcn/ui (Radix) + Tailwind CSS | Tailwind 4 | themed by `@zivali/tokens` (ADR-002) |
| Mobile | Expo + Expo Router, React Native (New Architecture) | SDK 57 / RN 0.86.3 (pinned by the template) | development builds (MapLibre, Firebase) |
| Mobile UI | React Native Reusables + NativeWind | NativeWind 4.2, Tailwind 3.4 | same component names and props as web |
| Mobile offline store | expo-sqlite (drafts, outbox, public report cache), expo-network, expo-background-task, expo-task-manager + expo-location geofencing (M3) | SDK 57 | ADR-019, C17 |
| Tokens | `packages/tokens` generator from `docs/design/tokens.json` | - | CSS vars, TW4 theme, TW3 preset, TS values, map style, contrast lint |
| Validation and DTOs | zod in `@zivali/validation` | 4.x | shared by the API and both apps |
| Client data | `@zivali/api` (RTK Query + `@rtk-query/codegen-openapi` over REST, Redux store); supabase-js / `@supabase/ssr` for Auth sessions and Realtime only | - | ADR-020, ADR-023 |
| Forms | react-hook-form + zod resolver | - | both platforms |
| i18n | next-intl (web), use-intl (mobile and worker), ICU catalogues | next-intl 4 | ADR-008 |
| API | Express 5, Prisma 7 (`prisma-client`, adapter-pg, TypedSQL), pino, helmet, `jose`, zod-to-openapi (spec to `apps/api/openapi.json`); tsx (dev), tsup (build) | - | ADR-020, klikni conventions |
| Jobs | pg-boss in schema `pgboss` | 12.x | ADR-022 |
| Database and auth | Supabase Free: Postgres 17, PostGIS, pgvector, Auth, Realtime | CLI 2.x | EU Frankfurt; DB lockdown ADR-021 |
| Realtime | Supabase Realtime Broadcast on private channels | - | ADR-023 |
| Files | Cloudflare R2 (S3 API, presigned URLs), sharp in the worker; MinIO locally | - | ADR-014 |
| Maps | MapLibre GL / MapLibre React Native, OpenFreeMap tiles | 6.x / 11.x | ADR-007 |
| Geocoding | own: GURS settlements, districts, streets and house numbers in Postgres (`pg_trgm`, PostGIS), `POST /v1/geo/search` and `/v1/geo/reverse` | - | ADR-007 (revised), C6; no third party, display only |
| Geo reference | GURS municipalities and statistical regions in PostGIS (TypedSQL lookups) | - | ADR-006 |
| Shelter directory | 212 municipalities → 17 registered shelters, versioned | - | C18 (FR-044) |
| Payments | Stripe Checkout, test mode only (Node SDK in the API) | - | ADR-011, C13 |
| Email | Brevo HTTP API (adapter; Resend is a drop-in swap), Brevo SMTP for Supabase Auth | - | ADR-010 |
| Push | Expo Push Service | - | ADR-010 |
| AI vision | Claude `claude-haiku-5-5` (effort low, thinking off; `claude-sonnet-5-5` if the evaluation set needs it, config only), structured outputs (worker) | Anthropic TS SDK | M3, ADR-012, C19 |
| Image embeddings | Voyage `voyage-multimodal-3.5` (1024-d, plain `fetch`) + pgvector HNSW (worker) | - | M3, ADR-013, C20 |
| Captcha | Cloudflare Turnstile (Supabase Auth native; adapter for the lead form) | - | ADR-005 |
| Hosting | Hetzner VPS (Docker Compose + Caddy) for web, api, worker; Supabase Free; R2; EAS Build | - | ADR-016 |
| Analytics (consent-gated) | GA4 web (`G-PKY4SCX3RL`, property 559038055), Firebase Analytics mobile (project `zivali-bb123`) | - | basic Consent Mode v2, ADR-009 |
| Error tracking | Sentry (EU region), credential-gated | - | wired in M5 (TASK-70) |
| Tests | Vitest (+ Supertest for the API, against the real local DB), Playwright + axe, Lighthouse CI, jest-expo, Maestro | - | ADR-015 |

Minimum OS versions (A-021): those of Expo SDK 57 (recorded in `frontend.md` by the mobile scaffold task).

# Repository structure

    /
    ├─ apps/
    │  ├─ api/                 Express + Prisma (ADR-020): app.ts, server.ts, worker.ts, routes/, controllers/,
    │  │                       domains/<area>/{<area>.domain.ts, <area>.dao.ts, <area>.mapper.ts, index.ts},
    │  │                       middleware/, jobs/, lib/, adapters/, prisma/{schemas/*.prisma, migrations/, sql/, includes/, seeders/},
    │  │                       test/, Dockerfile
    │  ├─ web/                 Next.js: app/[locale]/(public|app|admin|portal), app/r/…, components/ui (shadcn), lib/, e2e/, content/ (MDX)
    │  └─ mobile/              Expo: app/ (Expo Router), components/ui (RN Reusables), lib/ (db/, data/, offline/), e2e/ (Maestro)
    ├─ packages/
    │  ├─ tokens/              build.mjs → dist/{tokens,web,native}.css, tailwind-preset.cjs, values.ts, map-style.ts
    │  ├─ types/               src/domain/*.ts (wire types and enums shared by API and apps)
    │  ├─ validation/          zod request schemas and response DTOs per domain + pure helpers (chip, breeds, matching score)
    │  ├─ api/                 REST client: createApiClient, ApiError, one file per domain (@zivali/api/reports …), geocoder
    │  ├─ i18n/                messages/{sl,en}/<namespace>.json, ICU helpers, key-parity check
    │  └─ analytics/           track(), event registry, consent store, adapters (ga4, firebase, mock)
    ├─ supabase/               config.toml (local Postgres, Auth, Realtime, mail catcher), templates/ (Auth emails), seed/geo/ (GURS data), README.md
    ├─ deploy/                 docker-compose.yml, Caddyfile, .env template for the VPS
    ├─ docker-compose.dev.yml  MinIO (local R2)
    ├─ scripts/                deploy.mjs, geo-to-sql.mjs, admin-create.mjs
    ├─ tests/quality/          quality kit (axe, visual, console errors)
    ├─ docs/                   masters, slices (docs/tech, docs/design, docs/content), ADRs
    └─ .github/                workflows (ci, deploy), PR template

Module boundaries: apps never import each other; `packages/*` never import apps; `packages/validation` and `packages/types` depend only on zod. Ownership: frontend tasks own `apps/web`, `apps/mobile`, `packages/{api,i18n,analytics,tokens}`; backend tasks own `apps/api`, `supabase/`, `deploy/`; `packages/types` and `packages/validation` are owned by the contracts task (TASK-6.5) and extended by later contract tasks.

# Data model

All tables in schema `app` as Prisma models (snake_case plural names, `id uuid`, `created_at`/`updated_at timestamptz`), RLS enabled with no policies, accessed only by the API (ADR-021). Contracts C3–C18 hold field-level detail.

| Entity | Fields (main) | Constraints / indexes | Sensitive? |
|---|---|---|---|
| profiles | id = Supabase auth user id, display_name, locale (sl/en), role, home_point, home_radius_km, phone (never public), is_anonymous, supporter_badge_visible, quiet_from/to | role enum; GiST(home_point) | Yes (phone, home) |
| pets | owner_id, species, name, breed_codes[], colours[], pattern, size, sex, birth_year, chip_number, chip_status, chip_registered_crhz, ear_tip, lifestyle, collar, notes, archived_at | chip normalised; index(chip_number) | Yes (chip) |
| photos | owner_id, pet_id / report_id, position, sha256, width, height, bytes, status, public URLs | unique(owner_id, sha256); max 5 per parent | Medium (images) |
| reports | short_code, type, status, close_reason, moderation_state, pet_id, species, attributes, chip_number, ear_tip, lifestyle, exact_point (the coarsened private point, never the raw one: ADR-006), requested_radius_m, public_point, public_radius_m, municipality_id, region_id, in_slovenia, event_at, circumstances, contact_pref, linked_report_id, source, organisation_id, boosted_until, manage_token_hash, first_match_at, reunited_at | short_code unique; GiST(public_point), GiST(exact_point); index(status, type, species, event_at) | Yes (exact point, chip, token hash) |
| report_managers, report_contacts | report_id, user_id, role; report_id, email | pk | Low / Yes (email) |
| matches, match_feedback | lost_report_id, other_report_id, score, strength, chip_match, reasons, state; verdicts | unique(lost_report_id, other_report_id) | Medium |
| conversations, conversation_participants, messages, blocks | report ids, match_id; participant role, last_read_at; body, kind, has_link | index(conversation_id, created_at) | Yes (chat) |
| notifications, notification_prefs, push_tokens, email_outbox | inbox rows, per-type channels, Expo tokens, email log | unique(user_id, dedupe_key), unique(token) | Low |
| alert_subscriptions, alert_deliveries | center_point, radius_km, species, paused, daily_cap | GiST(center_point) | Yes (home area) |
| abuse_reports, moderation_flags | reporter, target, reason, weight; flags | unique(reporter_id, target_type, target_id) | Medium |
| payments, payment_events | user_id, purpose, amount_cents, status, provider ids; provider_event_id | unique(provider_event_id) | Yes (payment metadata) |
| ads, ad_stats_daily, leads, partner_stats_snapshot | ad content and targeting; aggregates; enquiries (interest) | pk(day, ad_id, slot, region_id) | No / Yes (lead contact) |
| regions, municipalities | id, slug, names, geom | GiST(geom) | No |
| geo_places, geo_addresses | GURS settlements, districts, streets (name, normalised search text, point, simplified polygon); house numbers (place, number, suffix, point); about 60 MB | GIN trigram(search), GiST(geom), pk(place_id, number, suffix) | No |
| shelters, municipality_shelters, directory_changes | responsible-shelter directory (C18) | unique(slug); one row per municipality | No (public data) |
| organisations, organisation_members | minimal in M2 (seed, intake exemption), full in M3 | - | Low |
| app_config, rate_limits, idempotency_keys, audit_log | config; hashed counters (48 h); stored responses (24 h, secrets encrypted); staff actions | - | Low / Medium |
| pgboss.* | pg-boss tables (jobs, schedules, archive) | managed by pg-boss | Low |
| ai_results, ai_calls, photo_embeddings (M3, `prisma/schemas/ai.prisma`) | extraction result per image hash (no user or photo id); per-photo AI and embedding ledger (outcome, tokens, pixels, cost; 62 days); one 1024-d vector per photo and model | pk(sha256); unique(photo_id, provider, model), (provider, created_at); pk(photo_id, model), HNSW cosine | Low (no person data; photo-linked ledger) |
| report_stats_daily, message_translations, search_plan_heatmaps (M4 Premium) | per report, day, metric, channel and Boost flag counts (C21); per message and language translation (C9); heatmap cache per lost report (C6) | pk(report_id, day, metric, channel, boosted); pk(message_id, lang); pk(report_id) | No (aggregates) / Yes (chat text) / Low |
| Planned M3–M4 | intake_batches, chip_lookups (hash only), subscriptions and entitlements (owners: Premium, Podpornik; vets: Vet Partner), moderation_actions | wire types in `packages/types` from M1; models with their stories | - |

**Deletion and retention** (NFR-PRIV, proposals for legal review, A-012): chat deleted 6 months after report close; closed-report photos and stored locations deleted or nulled 12 months after close, and the stored point replaced by the blurred public point `retention.exact_point_blur_days` (30, lawyer to confirm) after close (`retention.blur_location` job, ADR-006); raw points are never stored (coarsened 20–30 m at write, device and server); payment records kept as legally required; IP and device hashes 48 h; idempotency rows 24 h; anonymous auth users without a live report 30 days (Supabase Admin API); orphan uploads 24 h. All by the `retention.purge` job. Device data (mobile, C17): public cache ≤ 50 MB / 7 days, own drafts and outbox; wiped on sign-out, account deletion and on request. Account deletion (M3, FR-034) is one domain function that deletes or anonymises rows per `apps/api/prisma/data-inventory.json` and deletes the Supabase user; a test fails when a model is missing from the inventory.

# Interfaces and contracts

| ID | Contract | Type | Slice |
|---|---|---|---|
| C1 | API and platform conventions: REST, errors, auth guards, idempotency, rate limits, Prisma schema `app`, lockdown, jobs, seed, data inventory | API / data | docs/tech/contracts/C1-platform-conventions.md |
| C2 | Design tokens package | data | docs/tech/contracts/C2-design-tokens.md |
| C3 | Auth, profiles, roles, sessions (`/v1/me`) | API / data | docs/tech/contracts/C3-auth-profiles-roles.md |
| C4 | Reports and pets: models, status machine, endpoints, public read model, search, sync feed | API / data | docs/tech/contracts/C4-reports-and-pets.md |
| C5 | Photos: R2 presigned uploads, processing, publishing | API / data | docs/tech/contracts/C5-photos-storage.md |
| C6 | Location, geo reference, fuzzing, geocoder, MapView/LocationPicker API | API / data / component | docs/tech/contracts/C6-location-geo-maps.md |
| C7 | Anonymous reporting and manage link | API | docs/tech/contracts/C7-anonymous-manage-link.md |
| C8 | Matching: attribute scorer v2 (as built), visual similarity v3 (M3) | API / data | docs/tech/contracts/C8-matching.md |
| C9 | Chat (REST + Realtime Broadcast) | API / data / realtime | docs/tech/contracts/C9-chat.md |
| C10 | Notifications and nearby alerts | API / data | docs/tech/contracts/C10-notifications-alerts.md |
| C11 | Abuse reports | API | docs/tech/contracts/C11-abuse-reports.md |
| C12 | Analytics taxonomy and consent | client library | docs/tech/contracts/C12-analytics-consent.md |
| C13 | Payments | API | docs/tech/contracts/C13-payments.md |
| C14 | Ads, partner stats and leads | API / data | docs/tech/contracts/C14-ads-partners.md |
| C15 | Routes, deep links, page slots, web server endpoints | routes | docs/tech/contracts/C15-routes-deeplinks.md |
| C16 | i18n catalogues and formatting | data / library | docs/tech/contracts/C16-i18n.md |
| C17 | Mobile offline data layer | data (device) | docs/tech/contracts/C17-mobile-offline-data.md |
| C18 | Responsible-shelter directory | API / data | docs/tech/contracts/C18-shelter-directory.md |
| C19 | AI attribute extraction: `ai.extract`, caps, `GET /v1/photos/:id/attributes`, client pre-fill rules (M3) | API / data / job | docs/tech/contracts/C19-ai-extraction.md |
| C20 | Image embeddings: `photo.embed`, backfill and model change, similarity and nearest queries (M3) | data / job | docs/tech/contracts/C20-image-embeddings.md |
| C21 | Report statistics: cookieless view and share counters, alert rollup, Premium read endpoint (M4, TASK-117) | API / data / job | docs/tech/contracts/C21-report-statistics.md |
| C21+ | M3–M6 (organisations, intake/CSV, chip lookup, export/delete, owner and Vet Partner subscriptions, moderation, sponsor invoices, fiscal invoices) | - | written at each milestone's breakdown |

**API standards**: see C1: `API_URL/v1`, Bearer Supabase token, `x-device-id`, JSON snake_case, no envelope, lists `{ items, next_cursor }`, errors `{ error: { code, message, details?, issues? } }` with stable codes, `Idempotency-Key` on retryable writes, OpenAPI spec at `apps/api/openapi.json` (Swagger UI deferred). Webhooks dedupe by provider event id.

# Authentication and authorization

- Supabase Auth: email + password (verification required before chat and alerts, not before drafts), Google and Apple (web OAuth redirect; mobile native ID token → `signInWithIdToken`), anonymous sign-in for finders (ADR-005), TOTP MFA for admins and moderators (ADR-018). Turnstile on sign-up and anonymous sign-in.
- Sessions: web cookies via `@supabase/ssr`; mobile supabase-js with `expo-sqlite` localStorage; manage tokens in `expo-secure-store`.
- **API**: verifies the access token with `jose` against the Supabase JWKS (`/auth/v1/.well-known/jwks.json`), builds the actor from the token and `app.profiles` (role), and enforces route guards (`authMiddleware`, `optionalAuth`, `requireVerified`, `requireRole`, `requireAal2`, rate limits) plus ownership rules in the domain layer. Web route guards and Expo Router layouts mirror them for UX only.
- **Database**: no client ever reaches app tables (schema `app` not exposed, no grants, RLS deny-all; ADR-021). The only database policy is on `realtime.messages` for private chat and inbox channels (ADR-023).

# Environments and infrastructure

| Env | URL | Purpose | Deploy |
|---|---|---|---|
| Local | web http://localhost:3000, API http://localhost:4000, Supabase http://127.0.0.1:54321 (Studio :54323, mail :54324), MinIO :9000, Expo dev client | development, tests, CI | `pnpm bootstrap` / `pnpm dev` |
| Staging | Hetzner VPS (Compose: caddy, web, api, worker) at `staging.<domain>` / `api.staging.<domain>` (sslip.io name until a domain exists); Supabase project `najdimo` (ref `omtpppzrugibquukhnyl`, eu-central-1, Free); R2 buckets `zivali-*` (EU jurisdiction); EAS profile `preview` | client preview, QA, pilot alpha | GitHub Actions on merge to `main` |
| Production | same VPS, separate Compose project and hostnames; a second Supabase project in eu-central-1 before public launch; EAS profile `production` (no store submission) | live pilot | tagged release `vX.Y.Z` + manual approval |

**Web-first pilot (CH-199, TASK-76.1):** until the public launch the pilot is ONE environment: the staging stack (`zivali-staging`, `APP_ENV=staging`, auto-deployed from `main`) serves `najdimo.si` and `api.najdimo.si`; `www` and `staging.najdimo.si` redirect to `najdimo.si` (nginx, `STAGING_ALIAS_HOSTS` in `edge.env`). Payments stay on in Stripe test mode with `FISCAL_PROVIDER=mock` (live only after the split, the accountant's answer and the owner's approval); a payments-off switch exists for later (`PAYMENTS_PROVIDER=off`, which the web and the app follow through `payments.enabled` in the public config, plus `PAYMENTS_ENABLED` / `EXPO_PUBLIC_PAYMENTS_ENABLED` overrides; C13). The site stays out of search results (`SEARCH_INDEXING=false`: `X-Robots-Tag: noindex, nofollow` on every page; API hosts always noindex). Before the public launch the pilot's data (project `najdimo`, buckets `zivali-*`) becomes production and staging gets new resources. Runbook: `docs/tech/pilot-runbook.md`.

**Shared Supabase project (until launch):** staging and production share Supabase project `najdimo` until a separate production project exists. Create that project before public launch (client to-do) and set its URL and keys in the EAS `production` environment.

Configuration through environment variables only (names in `frontend.md` / `backend.md`; values never committed; `.env.local` and `.secrets/` are gitignored; on the VPS `/opt/zivali/<env>/.env`, mode 600). Cache: HTTP caching (Caddy, `Cache-Control` on public endpoints); no Redis. CDN: Cloudflare in front of the R2 media bucket.

**Credentials matrix** (R-001, Q-002, Q-007, Q-009)

| Credential | Provided by | Status (2026-10-15) | Blocks until provided |
|---|---|---|---|
| Supabase project `najdimo`: URL, publishable and secret keys, JWT settings, DB password, access token | Client | **set** | - (production project later) |
| Hetzner project + API token (or SSH to a provisioned VPS) | Client | missing (new) | staging and production deploy (dry-run until then) |
| Cloudflare R2: account id, access key id and secret, the three buckets created with **EU jurisdiction** (ADR-014), media domain | Client | missing (new) | photos on staging, nightly backups (MinIO locally) |
| Domain + DNS (Cloudflare) | Client (Q-001) | missing | real hostnames, universal links, email sender domain |
| GitHub repository `SignappsTech/zivali` (SSH; moved from `pbozic/zivali` 2026-10-19) + Actions secrets | Client | repo **set**; secrets missing | hosted CI and deploy (local `pnpm verify` always) |
| Stripe test sandbox "Najdimo sandbox" (SI) | Client | **set** | - (webhook endpoint created by the payments task) |
| Expo token | Client | **set** | - |
| Apple Developer account, APNs key | Client | missing (Q-007) | iOS builds, iOS push, Sign in with Apple |
| FCM credentials in EAS | Client | Firebase project exists; key not uploaded | Android push delivery |
| Firebase config files | Client | **present in `.secrets/`** | - |
| GA4 measurement id, property, service account | Client | **set** | - |
| MapTiler key | Client | set but **no longer used** (ADR-007 revised: own geocoder) | - |
| Anthropic API key | Client | **set** in `.env.local` | M3 extraction on staging until wired (TASK-40.7) |
| Voyage AI key | Client | **set** in `.env.local` (owner, checked 2026-10-18); not yet on staging | M3 embeddings on staging until wired (TASK-40.7); a payment method on the Voyage account for Tier 1 rate limits; training opt-out and retention to confirm before real photos go to Voyage (ADR-013) |
| Brevo API key + SMTP | Client | missing | real email on staging |
| Cloudflare Turnstile keys | Client | missing | captcha on staging (test keys meanwhile) |
| Google OAuth clients (web, Android, iOS) | Client | missing | Google sign-in |
| Sentry DSN (EU) | Client | missing | error tracking (M5) |
| Vercel token | Client | set but **no longer used** (brief v1.0) | - |

# CI/CD

- **Split of the gates** (TASK-4.6, owner 2026-10-19; goal: a push to main live on staging in about 12–15 minutes). The full `pnpm verify` (format, lint, typecheck, unit, i18n, tokens, API and ADR-021 security tests against the local database, every build) runs locally: by each implementer before reporting done, and by merge.mjs before every merge to main. CI does not repeat lint, typecheck or the unit and API tests; it runs what the local merge gate does not, or what must also hold on a clean runner. All workflows run on `ubuntu-24.04` with actions pinned to commit SHAs, no secrets outside deploy.yml, and cancel a superseded run of the same ref (`concurrency`, `cancel-in-progress: true`).
  - `ci.yml`, job `verify` (every pull request; pushes to main except those that touch only `docs/**`, `backlog/**` or `**/*.md`; `docs/design/tokens.json` and the e2e photo fixture under `docs/design/directions/img/` still count): install (pnpm store cached) → Playwright Chromium (browser dir cached on the lockfile hash; a hit runs only `playwright install-deps chromium`) → `pnpm verify:static` (Prettier check, root ESLint, root script tests, secretlint on the source roots) → `turbo run build --filter='web^...'` (the packages web builds on, the tokens contrast lint among them; Turbo local cache `.turbo/cache` cached) → `pnpm audit --audit-level high` → the web e2e (`pnpm --filter web e2e --workers=4`: its web server runs the standalone web build against the C18 mock API, so no database; 4 workers for the runner's 4 vCPUs, retries as configured).
  - `mobile.yml`, job `mobile`: lint, typecheck, jest-expo tests and `expo export` of apps/mobile (Turbo `--filter=mobile`, which builds the shared packages it needs), on pull requests and pushes to main that touch the app, the packages, the tokens source or the root config (Markdown-only changes excluded). Not a required check and not waited for by the staging deploy: the app ships through EAS (owner, 2026-10-16).
  - `quality.yml`, job `quality`: nightly at 02:30 UTC and on demand (`workflow_dispatch`), no longer on pushes or pull requests. Install → Playwright Chromium → `pnpm quality` (axe, console, consent and ad guards, visual, Lighthouse CI, links on the production web build at `QUALITY_PORT`, default 8080); `quality-report/` uploaded as an artifact. Non-blocking (`continue-on-error`) until TASK-90.7 AC#3. Public pages do not call the API on the server yet; the steps that start Supabase and the API are commented in the workflow until one does.
  - `images.yml`, job `images`: `pnpm images` (Docker builds of the api image, also the worker, and the web image for amd64), only when a Dockerfile or its `.dockerignore`, `deploy/**`, a `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`, `scripts/deploy.mjs` or the workflow changes. The deploy builds the same Dockerfiles for arm64, so a broken image also stops a deploy before anything switches.
  - Locally: `pnpm verify` on every task (with `pnpm db:start` running), `pnpm audit --audit-level high` and `pnpm --filter web e2e` when dependencies or web pages change, `pnpm quality` when web pages change, `pnpm images` when a Dockerfile or dependencies change. Accepted `pnpm audit` advisories live in `pnpm-workspace.yaml` `auditConfig.ignoreGhsas`, each with its reason (docs/05 §Security). secretlint also runs on staged files in the pre-commit hook.
- **Branch protection** (repository `SignappsTech/zivali`; Settings → Branches, or the command below): main requires the status check `verify` on an up-to-date branch (`quality` and `images` no longer run on every push or pull request, so they are not required), pull requests for everyone else, no force pushes, no deletion. While reviews are local (CLAUDE.md `Review: local`) admins are not enforced, so the owner can push locally reviewed merges; those pushes run `ci` (unless docs-only) and deploy. Set `enforce_admins` to `true` when reviews move to pull requests.

  ```sh
  gh api -X PUT repos/SignappsTech/zivali/branches/main/protection --input - <<'EOF'
  {"required_status_checks":{"strict":true,"contexts":["verify"]},"enforce_admins":false,
   "required_pull_request_reviews":{"required_approving_review_count":0},"restrictions":null,
   "allow_force_pushes":false,"allow_deletions":false}
  EOF
  ```
- **Deploy** (`.github/workflows/deploy.yml`, TASK-5.1; off until the repository variable `DEPLOY_ENABLED` is `true`): staging on `workflow_run` of `ci` completed on main, only when that run succeeded and was a push (a cancelled, failed or skipped `ci` deploys nothing; a docs-only push starts no `ci`, so no deploy); production on version tags after a reviewer approves the `production` environment. Both run `scripts/deploy.mjs <env> --deploy --strict`: build the linux/arm64 images on the runner (BuildKit layer cache in the Actions cache, `type=gha`, mode=min, one scope per image and environment, TASK-4.6) → stream them to the VPS (`docker save | zstd | ssh docker load`, no registry) → one-off `prisma migrate deploy` and the seed → up and healthy → smoke (`/ping`, `/v1/health/ready`, the web version, web home, ADR-021 exposure), else back to the running release (ADR-016 §As built). A workstation deploy runs the same script without the cache.
- **Rollback**: redeploy the previous image tag (`docker compose` with the old tag); database fixes are forward migrations; restore from backup only for data loss (runbook).

# Observability

- Logs: pino JSON from api and worker (`level, msg, req_id, user_id?, route, status, duration_ms`; jobs with `queue, job_id`), no secrets, no PII; Docker log rotation on the VPS; Supabase logs for Auth and Postgres (Free tier retention).
- Health: `/ping` (liveness), `/v1/health/ready` (DB and queue lag), web `/api/health`.
- Metrics in DB: pg-boss queue counts and failed jobs (admin queue page), match latency (`first_match_at - created_at`), notification delivery outcomes, AI spend (`ai_calls`, M3). Admin KPI page reads them (M4).
- Errors: Sentry for web, mobile, api and worker with PII scrubbing, EU region, credential-gated (TASK-70, M5).
- Uptime: external checks every 5 min on `/v1/health/ready` and the web home (also keeps Supabase Free awake) with e-mail alert (TASK-70); alert within 5 min of outage (NFR-OBS).

# Backup and disaster recovery

- RPO ≤ 24 h, RTO ≤ 8 h (NFR-AVAIL).
- Nightly `db.backup` job: `pg_dump` (schema `app`, `pgboss` excluded, plus Supabase `auth` users via `pg_dump -n auth` where permitted) compressed to the R2 `zivali-backups` bucket, 30-day lifecycle. Photos live in R2 (11 nines durability; versioning optional).
- Supabase Free has no point-in-time recovery; upgrade to Pro when the pilot goes public or limits are reached (R-015).
- Restore procedure (new Supabase project or local Postgres → `pg_restore` → `prisma migrate deploy` → smoke) and a timed drill in M5 (TASK-70); results in the runbook.

# External integrations

| Integration | Purpose | Auth | Limits | Failure behavior | Data stored |
|---|---|---|---|---|---|
| Supabase Auth (+ Google, Apple) | sign-in | project keys; OAuth client ids | Free tier MAU limits | error message, email sign-in still works | auth users |
| Supabase Realtime | chat and inbox live updates | user JWT, private channels | Free: 200 concurrent, 2M messages/month | clients re-fetch on reconnect; push covers offline | none (transient) |
| Cloudflare R2 (EU jurisdiction) | photos, backups | access keys; endpoint `<account>.eu.r2.cloudflarestorage.com` | free tier 10 GB, 1M writes, 10M reads/month | uploads retry; detail pages show placeholders | images, dumps |
| Cloudflare Turnstile | captcha | site key / secret | free | fail closed, local draft auto-retry (ADR-005) | none |
| OpenFreeMap | map tiles | none | fair use | map error state, list view remains | none |
| Expo Push | push delivery | Expo access token, FCM/APNs in EAS | Expo limits | in-app + email still delivered | push tokens |
| Brevo | transactional email + Auth SMTP | API key / SMTP creds | 300/day free | job retries 5×; in-app remains | email_outbox rows |
| Stripe | checkout, webhooks | secret key, webhook secret | test mode only | user sees retry; webhook retries idempotent | payment ids, amounts |
| Google Analytics 4 / Firebase | audience analytics | measurement id / config files | GA4 quotas | silently dropped | none in our DB |
| GA Data API (optional) | partner page enrichment | service account | quotas | DB-only stats | cached aggregates |
| Anthropic (M3; M4 chat translation, ADR-024) | attribute extraction (C19); chat translation (C9) | API key | 1 call per image hash; 10 (anonymous) / 30 photos per user a day; `ai.monthly_budget_usd` 20 | manual form (fail open) | results per image hash, usage ledger |
| Voyage AI (M3) | image embeddings (C20) | API key | 1 vector per photo and model, hash reuse; `embedding.monthly_budget_usd` 5; rate limits low until a payment method is added | v2 attribute matching (no visual term) | vectors per photo and model, usage ledger |
| GURS open data (CC BY 4.0) | municipalities and regions; settlements, districts, streets and house numbers for our geocoder | none | - | static seed, refreshed by the generators | boundaries, names, points |
| UVHVVR register + municipal reports | shelter directory sources | none | yearly refresh | admin edits | directory rows with source |
| Hetzner Cloud | VPS | API token / SSH | one VPS | Compose restart policies; uptime alert | - |

# Architecture decisions

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | pnpm + Turborepo monorepo, TS source packages, ESLint + Prettier | Accepted |
| ADR-002 | Design tokens: `docs/design/tokens.json` → `packages/tokens`, contrast lint | Accepted |
| ADR-003 | Supabase as the API (RLS + RPC + Edge Functions) | **Superseded by ADR-020** |
| ADR-004 | Async jobs with pgmq + Edge Function worker | **Superseded by ADR-022** |
| ADR-005 | Anonymous finders: Supabase anonymous sign-in, manage token, Turnstile; captcha outage fails closed (amended: guard in the API) | Accepted |
| ADR-006 | Location privacy: raw point never stored (20–30 m coarsening at write, device and server); deterministic public blur from the coarsened point; blur 30 days after closure; GURS boundaries in PostGIS | Accepted |
| ADR-007 | MapLibre + OpenFreeMap; own geocoder on GURS address data in Postgres | Accepted (revised) |
| ADR-008 | i18n: next-intl / use-intl with shared ICU catalogues | Accepted |
| ADR-009 | Analytics: typed `track()`, GA4 + Firebase adapters, basic Consent Mode v2 | Accepted |
| ADR-010 | Notifications: inbox + Expo Push + Brevo email (amended: worker job) | Accepted |
| ADR-011 | Payments: Stripe Checkout, webhook ledger, mock provider, live-mode guard (amended: Express routes; reward escrow dropped) | Accepted |
| ADR-012 | AI extraction: Claude `claude-haiku-5-5` (amended from Opus on cost, gated by an evaluation set), structured outputs, caps (worker) | Accepted (M3, amended) |
| ADR-013 | Image embeddings: Voyage `voyage-multimodal-3.5` behind adapter, chained after extraction, pgvector HNSW (worker) | Accepted (M3, amended) |
| ADR-014 | Photos on R2 (EU jurisdiction): client resize, presigned uploads, sharp re-encode, public copies on publish | Accepted (revised) |
| ADR-015 | Test toolchain: Vitest + Supertest, Playwright + axe + LHCI, jest-expo, Maestro | Accepted (amended) |
| ADR-016 | Hetzner VPS with Docker Compose + Caddy; Supabase Free; R2; GitHub Actions | Accepted (revised) |
| ADR-017 | Dependency allowlist | Accepted (revised) |
| ADR-018 | Roles from `app.profiles`, admins and moderators need TOTP (AAL2) | Accepted (amended) |
| ADR-019 | Mobile offline data layer (expo-sqlite, sync, outbox, geofences) | Accepted |
| ADR-020 | Express + Prisma API with a domain layer, following the client's klikni conventions | Accepted |
| ADR-021 | Supabase for DB and Auth only; app tables in a non-exposed schema with deny-all RLS; tested | Accepted |
| ADR-022 | Jobs with pg-boss in the same Postgres; one worker process | Accepted |
| ADR-023 | Live chat and inbox with Supabase Realtime Broadcast on private channels | Accepted |
| ADR-024 | Chat translation with Claude Haiku through the existing AI SDK, async job, masked contact data, mock in CI | Accepted (M4) |

Full records: `docs/tech/adr/NNN-*.md` (context, decision, alternatives, consequences).

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft (template) |
| 0.2 | 2026-10-14 | Full technical design: architecture, stack, repo map, data model, contracts C1–C16, auth, environments, CI/CD, observability, backup, integrations, ADR-001…018 |
| 0.3 | 2026-10-15 | Brief v0.7: Shelter Pro removed, Vet Partner only B2B subscription, QR/NFC tags out of scope; final Lagoon tokens; M1/M2 breakdown |
| 0.4 | 2026-10-15 | Offline mode (FR-041..043): ADR-019, C17; content CHANGEs to C3, C9, C10, C14, C15 |
| 0.5 | 2026-10-15 | Brief v1.0 architecture: Express + Prisma API with a domain layer (ADR-020, klikni conventions), DB lockdown (ADR-021), pg-boss (ADR-022), Realtime Broadcast chat (ADR-023), R2 photos (ADR-014), Hetzner + Docker Compose + Caddy (ADR-016); ADR-003/004 superseded; contracts rewritten from RPC to REST; C18 shelter directory (FR-044); CRHŽ instead of CRPsi; SEO hub routes |
| 0.6 | 2026-10-15 | TASK-3.8: formatting tools (import-x, eslint-config-prettier, husky + lint-staged; ADR-017), root scripts for Prisma and jobs, no Edge Functions in the workspace |
| 0.7 | 2026-10-15 | Own geocoder on GURS data in Postgres replaces MapTiler/Photon (ADR-007 revised: MapTiler Free is non-commercial, LQ-21 privacy; about 60 MB), `MAPTILER_API_KEY` no longer needed; R2 buckets in the EU jurisdiction (ADR-014); reward escrow dropped (brief v1.1): no Stripe Connect, payouts or platform fee, display-only reward on lost reports (C4) |
| 0.8 | 2026-10-15 | Client decision: klikni API toolchain (zod-to-openapi spec, RTK Query + codegen replace TanStack Query; Swagger UI deferred); Next 16 proxy.ts, APP_VERSION, x-request-id (C1), proxy matcher (C15); ADR-008 server text via Node worker; ADR-017 rows |
| 0.9 | 2026-10-15 | Client decision (CH-25, CH-24): raw GPS never stored, 20–30 m coarsening once at write on device and server, public blur from the coarsened point, post-closure blur job (ADR-006, C6); C4 models/DTOs/limits/query encoding confirmed from TASK-6.5; ADR-017 rows (CH-15, CH-28) |
| 0.10 | 2026-10-15 | CH-109: §Environments notes that staging and production share Supabase project `najdimo` until a separate production project exists |
| 0.11 | 2026-10-15 | TASK-4.2: CI in `ci.yml` (jobs verify, quality, images; deploy placeholder), full `pnpm verify` (secretlint, API tests; `pnpm audit` and the Playwright smoke as separate CI steps), `pnpm images`, branch protection for main, Turbo passes `DATABASE_URL`/`DIRECT_URL` through |
| 0.12 | 2026-10-16 | TASK-76.1 (CH-199): §Environments web-first pilot as one environment on the staging stack; pilot payments in Stripe test mode; payments-off switch for later (`PAYMENTS_PROVIDER=off`, off by default in `APP_ENV=production`, reported as `payments.enabled` in the public config; `PAYMENTS_ENABLED`, `EXPO_PUBLIC_PAYMENTS_ENABLED` overrides) and `SEARCH_INDEXING` (noindex); `docs/tech/pilot-runbook.md` |
| 0.13 | 2026-10-18 | M3 AI breakdown: AI vision default `claude-haiku-5-5` (ADR-012 amended), `voyage-multimodal-3.5` (ADR-013 amended, CH-541); data model rows ai_results, ai_calls, photo_embeddings; contracts C19 (AI extraction) and C20 (embeddings), C8 renamed (v2 as built, v3 planned); Voyage key set locally; integration limits and fallbacks |
| 0.14 | 2026-10-19 | TASK-4.6: §CI/CD split of the gates: CI `verify` = `verify:static`, web build, audit, e2e with 4 workers (lint, typecheck, unit and API tests stay in the local `pnpm verify` and merge.mjs), no database in CI; superseded runs cancelled; docs-only pushes skip `ci` and `mobile` (and so the deploy); `quality` nightly and on demand (`quality.yml`), `images` on Docker-relevant changes (`images.yml`); branch protection requires `verify` only; deploy builds use the BuildKit gha cache; deploy bullet as built. CH-633: repository `SignappsTech/zivali` (§Accounts, branch protection, ADR-016, README) |
| 0.15 | 2026-10-19 | Premium (owner 2026-10-19): C21 report statistics (CH-636), ADR-024 chat translation (CH-637), C6 sightings heatmap (CH-638), C13 prices and entitlements (CH-635); data model rows for the M4 Premium tables |
