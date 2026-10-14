---
doc_id: DOC-04
title: Technical Design
version: 0.4
status: Draft
date: 2026-10-15
owner: Tech Lead
audience: Team, client IT
approvals:
  - Tech Lead | Claude | 2026-10-14 |
---

<!-- Owner: tech-lead. Master tech doc. Implementers read only docs/tech/frontend.md, backend.md and contracts/C*.md slices. "N/A — reason" for anything that does not apply. -->

# Architecture overview

    ┌──────────────────────┐   ┌──────────────────────────┐
    │ apps/web (Next.js 16)│   │ apps/mobile (Expo SDK 57)│
    │ RSC + client comps   │   │ Expo Router, dev builds  │
    │ shadcn/ui, TW4       │   │ RN Reusables, NativeWind │
    └─────────┬────────────┘   └────────────┬─────────────┘
              │  @zivali/api (supabase-js + TanStack Query), @zivali/validation (zod),
              │  @zivali/i18n, @zivali/analytics, @zivali/tokens
              ▼                              ▼
    ┌────────────────────────────────────────────────────────────┐
    │ Supabase (EU, Frankfurt)                                   │
    │  Auth (email, Google, Apple, anonymous, TOTP MFA, Turnstile)│
    │  Postgres 17 + PostGIS + pgvector + pgmq + pg_cron + pg_net │
    │   ├─ tables with RLS, RPC functions (domain writes, public  │
    │   │  read model), triggers → enqueue_job()                  │
    │   └─ queue "jobs" ──pg_cron/pg_net──► Edge Fn "worker"      │
    │  Storage: photos (private), public-photos, ad-images        │
    │  Realtime: messages, notifications (Postgres Changes)       │
    │  Edge Functions: worker, payments-checkout, stripe-webhook, │
    │                  submit-lead, health (+ M3: ai, imports)    │
    └───────┬───────────────┬──────────────┬──────────────┬──────┘
            ▼               ▼              ▼              ▼
     Expo Push / Brevo   Stripe (test)  Anthropic /     MapTiler / Photon
     (adapters, mock)    (adapter,mock) Voyage (M3)     (client geocoding)
    Web only: GA4 gtag (after consent) · Mobile: Firebase Analytics (after consent)
    Tiles: OpenFreeMap (no key) on both platforms

- **One backend**: Supabase is the API for both apps (ADR-003). RLS on every table authorises; RPC functions hold multi-step domain writes and the public read model (fuzzed location, no chip or contact data); Edge Functions exist only where secrets or external calls are needed.
- **Async work** goes through one pgmq queue and one `worker` Edge Function (ADR-004): matching, notifications, alert fan-out, photo publishing, lifecycle and retention.
- **Contracts first**: M1 publishes schemas, types, zod schemas, RPC signatures and seed data (TASK-6), so M2 stories build in parallel against them.
- **Local-first**: everything runs offline on `supabase start` with mock adapters (AI, embeddings, payments, email, push, captcha, analytics, geocoding). Cloud credentials only switch adapters (P-6).

# Technology stack

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Monorepo | pnpm workspaces + Turborepo | pnpm 11, turbo 2 | ADR-001; Node 22 LTS |
| Language | TypeScript, strict | version pinned by Expo SDK 57 template | one version workspace-wide |
| Web | Next.js App Router, React 19 | Next 16.x | RSC for reads, server actions not used for domain writes (RPC instead) |
| Web UI | shadcn/ui (Radix) + Tailwind CSS | Tailwind 4 | themed by `@zivali/tokens` (ADR-002) |
| Mobile | Expo + Expo Router, React Native (New Architecture) | SDK 57 / RN 0.86.3 (as pinned by the SDK 57 template; upgrade with the next Expo SDK, never ahead of it) | development builds (MapLibre, Firebase) |
| Mobile UI | React Native Reusables + NativeWind | NativeWind 4.2, Tailwind 3.4 | same component names and props as web |
| Tokens | `packages/tokens` generator from `docs/design/tokens.json` | - | CSS vars, TW4 theme, TW3 preset, TS values, contrast lint |
| Validation | zod | 4.x | shared with Edge Functions |
| Data fetching | supabase-js 2, `@supabase/ssr`, TanStack Query 5 | - | ADR-003 |
| Mobile offline store | expo-sqlite (drafts, outbox, public report cache), expo-network, expo-background-task, expo-task-manager + expo-location geofencing (M3) | SDK 57 | ADR-019, contract C17 |
| Forms | react-hook-form + zod resolver | - | both platforms |
| i18n | next-intl (web), use-intl (mobile), ICU catalogues | next-intl 4 | ADR-008 |
| Backend | Supabase: Postgres 17, PostGIS, pgvector, pgmq, pg_cron, pg_net, Auth, Storage, Realtime, Edge Functions (Deno) | CLI 2.x | EU Frankfurt (eu-central-1) |
| Maps | MapLibre GL / MapLibre React Native, OpenFreeMap tiles | 6.x / 11.x | ADR-007 |
| Geocoding | MapTiler Geocoding, Photon fallback | - | client-side, display only |
| Geo reference | GURS municipalities and statistical regions in PostGIS | - | ADR-006 |
| Payments | Stripe Checkout, test mode only | stripe-node in Deno | ADR-011 |
| Email | Brevo HTTP API (transactional), Brevo SMTP for Supabase Auth | - | ADR-010 |
| Push | Expo Push Service | - | ADR-010 |
| AI vision | Claude `claude-opus-5-5`, structured outputs | Anthropic TS SDK | M3, ADR-012 |
| Image embeddings | Voyage `voyage-multimodal-3` (1024-d) + pgvector HNSW | - | M3, ADR-013 |
| Captcha | Cloudflare Turnstile (Supabase Auth native) | - | ADR-005 |
| Hosting | Vercel (web), Supabase cloud, EAS Build (mobile) | - | ADR-016 |
| Email / forms | Partner leads via Edge Function `submit-lead` | - | captcha + rate limit |
| Analytics (consent-gated) | GA4 web (`G-PKY4SCX3RL`, property 559038055), Firebase Analytics mobile (project `zivali-bb123`) | - | basic Consent Mode v2, ADR-009 |
| Error tracking | Sentry (EU region), credential-gated | - | wired in M5 (TASK-70) |
| Tests | Vitest, pgTAP, Playwright + axe, Lighthouse CI, jest-expo, Maestro | - | ADR-015 |

Minimum OS versions (A-021): those of Expo SDK 57 (iOS 15.1+ and Android 7+ at SDK 52; re-check the SDK 57 release notes in TASK-3 and record them in `frontend.md`).

# Repository structure

    /
    ├─ apps/
    │  ├─ web/                 Next.js: app/[locale]/(public|app|admin|portal), app/r/…, app/a/[id] (ad click),
    │  │                       components/ui (shadcn), lib/, e2e/ (Playwright), content/ (MDX legal pages)
    │  └─ mobile/              Expo: app/ (Expo Router: (tabs), r/[code], m, report/…, settings/…),
    │                          components/ui (RN Reusables), lib/ (db/ local SQLite store, data/ report seam,
    │                          offline/ sync, outbox, geofence, wipe), e2e/ (Maestro flows)
    ├─ packages/
    │  ├─ tokens/              build.mjs → dist/{tokens,web,native}.css, tailwind-preset.cjs, values.ts
    │  ├─ types/               src/database.ts (generated), src/domain/*.ts (hand-written wire types)
    │  ├─ validation/          zod schemas + pure helpers (chip, enums, breeds, matching score) – Deno-safe
    │  ├─ api/                 typed data functions per domain (@zivali/api/reports …), geocoder, query keys
    │  ├─ i18n/                messages/{sl,en}/<namespace>.json, ICU helpers, key-parity check
    │  └─ analytics/           track(), event registry, consent store, adapters (ga4, firebase, mock)
    ├─ supabase/
    │  ├─ config.toml          local stack config (auth providers, anonymous sign-in, MFA, hooks)
    │  ├─ migrations/          timestamped SQL, forward-only, rollback note in header
    │  ├─ seed/                NN-*.sql seed files, geo/ (GURS GeoJSON + licence), photos/ (licensed fixtures)
    │  ├─ tests/               pgTAP: RLS matrix, RPCs, triggers, data inventory
    │  ├─ data-inventory.json  every table and bucket: category, personal data, retention, export, delete
    │  └─ functions/           Deno: _shared/ (env, log, errors, adapters), worker/ (handlers/<job>.ts),
    │                          payments-checkout/, stripe-webhook/, submit-lead/, health/, deno.json (import map)
    ├─ scripts/                deploy.mjs, seed-photos.mjs, admin-create.mjs, drain.mjs
    ├─ tests/quality/          quality kit (axe, visual, console errors)
    ├─ docs/                   masters, slices (docs/tech, docs/design, docs/content), ADRs
    └─ .github/                workflows (ci, deploy-staging), PR template

Module boundaries: apps never import each other; `packages/*` never import apps; `packages/validation` and `packages/types` have no runtime dependency except zod (so Deno can import them); Edge Functions import only `_shared` and `packages/validation`. Ownership: frontend tasks own `apps/*`, `packages/{api,i18n,analytics,tokens}`; backend tasks own `supabase/**` and the generated `packages/types/src/database.ts`; `packages/types/src/domain` and `packages/validation` are owned by the contracts task (TASK-6) and extended by later contract tasks.

# Data model

All tables in schema `public`, RLS enabled (ADR-003), `id uuid default gen_random_uuid()`, `created_at`/`updated_at timestamptz`. Contracts C1–C14 hold column-level detail.

| Entity | Fields (main) | Constraints / indexes | Sensitive? |
|---|---|---|---|
| profiles | id = auth.users.id, display_name, locale (sl/en), role, home_point, home_radius_km, phone (never public), is_anonymous, supporter_badge_visible | role enum; GiST(home_point) | Yes (phone, home) |
| pets | owner_id, species, name, breed_codes[], colours[], pattern, size, sex, birth_year, chip_number, chip_status, collar, notes, archived_at | chip normalised; index(chip_number) | Yes (chip) |
| photos | owner_id, storage_path, public_path, sha256, width, height, status (uploaded/accepted/rejected/published), pet_id / report_id, position | unique(sha256, owner_id); max 5 per parent | Medium (images) |
| reports | short_code, type (lost/found/sighted), status (open/matched/reunited/closed), close_reason, moderation_state (visible/held/hidden/removed), pet_id, species, attributes (as pets), chip_number, exact_point, requested_radius_m, public_point, public_radius_m, municipality_id, region_id, in_slovenia, event_at, circumstances, contact_pref, linked_report_id (sighting of a lost report), source (user/anonymous/organisation), organisation_id, boosted_until, manage_token_hash, first_match_at, reunited_at | short_code unique; GiST(public_point), GiST(exact_point); index(status, type, species, event_at) | Yes (exact point, chip, token hash) |
| report_managers | report_id, user_id, role (owner/finder) | pk(report_id, user_id) | Low |
| matches | lost_report_id, other_report_id, score, strength, chip_match, reasons jsonb, state (suggested/confirmed/rejected/closed), algo_version, rejected_reason | unique(lost_report_id, other_report_id) | Medium |
| conversations / conversation_participants / messages | report ids, match_id; participant user_id, last_read_at, blocked; message body, kind (text/location/system), has_link, created_at | index(conversation_id, created_at) | Yes (chat) |
| blocks | blocker_id, blocked_id | pk | Low |
| notifications | user_id, type, payload jsonb, read_at, dedupe_key | unique(user_id, dedupe_key) | Low |
| notification_prefs | user_id, type, push, email, in_app, quiet_from, quiet_to | pk(user_id, type) | Low |
| push_tokens | user_id, token, platform, last_seen_at | unique(token) | Low |
| alert_subscriptions | user_id, center_point, radius_km (1–25), species[], paused, daily_cap | GiST(center_point) | Yes (home area) |
| abuse_reports | reporter_id, target_type (report/message/profile), target_id, reason, note, weight | unique(reporter_id, target_type, target_id) | Medium |
| payments / payment_events | user_id, purpose, amount_cents, currency, status, provider, provider_session_id, refs; provider_event_id, type, payload | unique(provider_event_id) | Yes (payment metadata) |
| ads / ad_stats_daily | slot[], title, body, link_url (https), image_path, image_alt, locales[], region_ids[], municipality_ids[], species[], starts_at, ends_at, status, is_house, exclusive; day, ad_id, slot, region_id, impressions, clicks | pk(day, ad_id, slot, region_id) | No |
| leads | company, contact_name, email, region_interest, message, consent_at | rate limited | Yes (contact) |
| regions / municipalities | id, slug, name_sl, name_en, geom (multipolygon) | GiST(geom) | No |
| organisations / organisation_members | name, kind (shelter/vet/municipality), verified_at; user_id, role (owner/editor/viewer) | minimal in M2 (seed + intake exemption), full in M3 | Low |
| app_config | key, value jsonb, description | admin write | No |
| rate_limits | key (hashed), window_start, count | purged 48 h | Low (hashed IP) |
| audit_log | actor_id, action, target_type, target_id, diff jsonb, at | append-only | Medium |
| email_outbox | to_user_id, template, locale, status, provider_id, error | 30 days | Low |
| jobs (pgmq) / jobs_dead | type, payload, attempts, last_error | archive 7 days | Low |
| Planned M3–M4 | photo_embeddings, ai_results, ai_calls, intake_batches, chip_lookups (hash only), subscriptions and entitlements for owners (Premium, Podpornik) and for vet organisations only (Vet Partner, Stripe Billing with VAT invoices; shelters and municipalities stay free; QR/NFC tags out of scope, brief v0.7), rewards (Connect escrow), moderation_actions | defined as wire types in `packages/types/src/domain` in M1; migrations with their stories | - |

**Deletion and retention** (NFR-PRIV, proposals for legal review, A-012): chat deleted 6 months after report close; closed-report photos and exact locations deleted or nulled 12 months after close; payment records kept as legally required; IP hashes 48 h; anonymous auth users without a live report 30 days; orphan uploads 24 h. All by the `purge_retention` job. Device data (mobile, C17): public report cache ≤ 50 MB / 7 days, own drafts and outbox; wiped on sign-out, account deletion and on request; `client_requests` idempotency rows 24 h. Account deletion (M3, FR-034) closes open reports, anonymises messages and deletes personal rows per `supabase/data-inventory.json`; a pgTAP test fails when a table is missing from the inventory.

# Interfaces and contracts

| ID | Contract | Type | Slice |
|---|---|---|---|
| C1 | Platform conventions: migrations, RLS templates, RPC errors, app_config, rate limits, audit, job queue, data inventory, seed | data / hook | docs/tech/contracts/C1-platform-conventions.md |
| C2 | Design tokens package | data | docs/tech/contracts/C2-design-tokens.md |
| C3 | Auth, profiles, roles, sessions | API / data | docs/tech/contracts/C3-auth-profiles-roles.md |
| C4 | Reports and pets: schema, status machine, write RPCs, public read model, search | API / data | docs/tech/contracts/C4-reports-and-pets.md |
| C5 | Photos and storage | API / data | docs/tech/contracts/C5-photos-storage.md |
| C6 | Location, geo reference, fuzzing, geocoder, MapView/LocationPicker API | API / data / component | docs/tech/contracts/C6-location-geo-maps.md |
| C7 | Anonymous reporting and manage link | API | docs/tech/contracts/C7-anonymous-manage-link.md |
| C8 | Matching v1 | API / data | docs/tech/contracts/C8-matching.md |
| C9 | Chat | API / data / realtime | docs/tech/contracts/C9-chat.md |
| C10 | Notifications and nearby alerts | API / data | docs/tech/contracts/C10-notifications-alerts.md |
| C11 | Abuse reports | API | docs/tech/contracts/C11-abuse-reports.md |
| C12 | Analytics taxonomy and consent | API (client library) | docs/tech/contracts/C12-analytics-consent.md |
| C13 | Payments | API | docs/tech/contracts/C13-payments.md |
| C14 | Ads, partner stats and leads | API / data | docs/tech/contracts/C14-ads-partners.md |
| C15 | Routes, deep links, page slots, server endpoints | routes | docs/tech/contracts/C15-routes-deeplinks.md |
| C16 | i18n catalogues and formatting | data / library | docs/tech/contracts/C16-i18n.md |
| C17 | Mobile offline data layer: local schema, report cache sync, outbox, geofences, wipe | data (device) | docs/tech/contracts/C17-mobile-offline-data.md |
| C18+ | M3–M6 (AI extraction, embeddings, organisations (reunite features free for all), intake/CSV, chip lookup, export/delete, owner and Vet Partner subscriptions, escrow, moderation, sponsor invoices) | - | written at each milestone's breakdown |

**API standards**

- Base: `<SUPABASE_URL>/rest/v1` (tables, `rpc/<fn>`), `<SUPABASE_URL>/functions/v1/<name>`, `<SUPABASE_URL>/storage/v1`. Clients never build these by hand; they call `@zivali/api/<domain>` functions.
- Format: JSON, snake_case on the wire; `@zivali/api` maps to camelCase types.
- **Errors**: RPCs raise `P0001` with a JSON message `{"code":"RATE_LIMITED","message":"…","details":{…}}`; Edge Functions return HTTP status + `{ "error": { "code", "message", "details" } }`. Codes are stable (`VALIDATION`, `NOT_FOUND`, `GONE`, `FORBIDDEN`, `UNVERIFIED_EMAIL`, `RATE_LIMITED`, `CAPTCHA_FAILED`, `CONFLICT`, `DUPLICATE_OPEN_REPORT`, `MIN_AMOUNT`, `LIVE_MODE_FORBIDDEN`, `INTERNAL`). No stack traces or SQL to clients; clients map codes to localised messages (`errors` namespace).
- Pagination: keyset (`cursor` = last `(sort_key, id)`), `limit` ≤ 50.
- Idempotency: write RPCs accept `client_request_id uuid`; Edge Functions accept `Idempotency-Key`; webhooks dedupe by provider event id.

# Authentication and authorization

- Supabase Auth: email + password (email verification required before chat and alerts, not before drafts), Google and Apple (web OAuth redirect; mobile native ID token → `signInWithIdToken`), anonymous sign-in for finders (ADR-005), TOTP MFA for admins and moderators (ADR-018).
- Sessions: web cookies via `@supabase/ssr` (middleware refresh); mobile `supabase-js` with `expo-sqlite` localStorage; manage tokens in `expo-secure-store`. Same account works on both platforms (R-001.5).
- Roles: `user_role` JWT claim from `profiles.role` via the custom access token hook; `is_anonymous` and `aal` claims from Auth. RLS templates in C1; route guards in Next layouts and Expo Router layouts mirror them for UX only.
- Captcha: Turnstile on sign-up and anonymous sign-in (Auth-native), on lead form (adapter). Rate limits: Auth built-in (sign-in, OTP, anonymous per IP) + `check_rate_limit` in RPCs.

# Environments and infrastructure

| Env | URL | Purpose | Deploy |
|---|---|---|---|
| Local | web http://localhost:3000, Supabase http://127.0.0.1:54321 (Studio :54323, mail :54324), Expo dev client | development, tests, CI | `pnpm bootstrap` / `pnpm dev` |
| Staging | Vercel project for `apps/web` (team `primozbozics-projects`; Vercel URL until a domain exists), Supabase project `najdimo` (ref `omtpppzrugibquukhnyl`, eu-central-1), EAS profile `preview` | client preview, QA, pilot alpha | auto on merge to `main` |
| Production | domain TBD (Q-001), a second Supabase project in eu-central-1 created before public launch (until then `najdimo` serves staging and the pilot alpha), EAS profile `production` (no store submission) | live pilot | tagged release `vX.Y.Z` + manual approval (credential-gated until the production project exists) |

Configuration through environment variables only (names in `frontend.md` / `backend.md`, values never committed; `.env.local` and `.secrets/` are gitignored). Edge Function secrets via `supabase secrets set`. Storage: Supabase Storage (CDN). Queue: pgmq. Cache: HTTP caching on Vercel for public pages; no Redis. CDN: Vercel + Supabase Storage CDN.

**Credentials matrix** (R-001, Q-002, Q-007, Q-009)

| Credential | Provided by | Status (2026-10-14) | Blocks until provided |
|---|---|---|---|
| Supabase project `najdimo`: URL, publishable and secret keys (plus legacy anon/service role), DB password, access token | Client | **set** (2026-10-15) | - (production project still to be created) |
| Vercel token (team `primozbozics-projects`) | Client | **set**; project for `apps/web` created by the deploy task | - |
| GitHub repository `pbozic/zivali` (SSH remote `origin`) | Client | **set**; Actions secrets for CI and deploy still to be added | hosted CI runs once secrets are set (local `pnpm verify` always) |
| Stripe test sandbox "Najdimo sandbox" (SI): secret + publishable key | Client | **set**; webhook endpoint and secret created by the payments task | - (local and CI stay on the mock) |
| Expo token | Client | **set** | - (Android preview builds possible) |
| Apple Developer account, APNs key | Client | missing (Q-007) | iOS builds, iOS push, Sign in with Apple in production |
| FCM credentials in EAS | Client | Firebase project exists (`zivali-bb123`); FCM key not uploaded | Android push delivery |
| Firebase config files | Client | **present in `.secrets/`** | - |
| GA4 measurement id, property, service account | Client | **set** | - |
| MapTiler key | Client | **set** | - (Photon fallback otherwise) |
| Anthropic API key | Client | **set** | - (M3) |
| Voyage AI key | Client | missing (new) | M3 embeddings on staging |
| Brevo API key + SMTP credentials | Client | missing (new) | real email on staging (Auth emails capped by Supabase default SMTP) |
| Cloudflare Turnstile site + secret key | Client | missing (new) | captcha on staging (Turnstile test keys meanwhile) |
| Google OAuth client (web, Android, iOS) | Client | missing | Google sign-in on staging/mobile |
| Domain + DNS | Client (Q-001) | missing | universal links, email sender domain, production |
| Sentry DSN (EU) | Client | missing | error tracking (M5) |

# CI/CD

- **PR pipeline** (GitHub Actions `ci.yml`; locally `pnpm verify`): install (pnpm cache) → tokens build (contrast lint) → lint → typecheck → unit (Vitest, jest-expo) → i18n key check → `supabase start` + `db reset` + pgTAP (`supabase test db`) → Edge Function `deno check` + integration tests → web build + start → Playwright smoke + axe + quality kit → Lighthouse CI → mobile `expo export` check → secretlint → `pnpm audit --audit-level high`. Affected-only via `turbo --filter=...[origin/main]` where possible.
- **Deploy pipeline** (`deploy-staging.yml` on push to `main`): `scripts/deploy.mjs staging` (credential-gated, ADR-016) → migrations → functions → secrets → Vercel prebuilt deploy → smoke (`/api/health`, `functions/v1/health`) → EAS update for the `preview` channel (when configured). Production: tag → same steps against prod after manual approval → health checks.
- **Rollback**: web: Vercel instant rollback to the previous deployment. Functions: redeploy previous tag. DB: forward fix migration (rollback note in each migration header); restore from backup only for data loss (runbook).

# Observability

- Logs: JSON lines from Edge Functions (`level, msg, fn, job_type, request_id, duration_ms`), no secrets, no PII (user ids allowed, no emails, chips, coordinates, message bodies). Supabase log explorer (7 days on free tier), Vercel logs.
- Metrics in DB: queue depth and dead letters (`jobs_metrics` view), match latency (`first_match_at - created_at`), notification delivery outcomes, AI spend (`ai_calls`, M3). Admin KPI page reads them (M4).
- Errors: Sentry for web, mobile and functions with PII scrubbing, EU region, credential-gated (TASK-70, M5).
- Uptime: external checks on `/api/health` and `functions/v1/health` every 5 min with e-mail alert (TASK-70); alert within 5 min of outage (NFR-OBS).

# Backup and disaster recovery

- RPO ≤ 24 h, RTO ≤ 8 h (NFR-AVAIL).
- Production on Supabase Pro before public launch (R-015): daily backups retained 7 days (PITR optional). Until then and in addition: nightly `supabase db dump` (schema + data, roles) and Storage bucket sync to an encrypted EU object store (Cloudflare R2 EU or Backblaze EU) from a scheduled GitHub Action; 30-day retention.
- Restore procedure and a timed restore drill into a scratch project in M5 (TASK-70); results recorded in the runbook.

# External integrations

| Integration | Purpose | Auth | Limits | Failure behavior | Data stored |
|---|---|---|---|---|---|
| Supabase Auth providers (Google, Apple) | sign-in | OAuth client ids | provider limits | error message, email sign-in still works | provider id, email |
| Cloudflare Turnstile | captcha | site key / secret | free | fail closed, local draft auto-retry (ADR-005) | none |
| OpenFreeMap | map tiles | none | fair use | map shows error state, list view remains | none |
| MapTiler Geocoding | place search | public key (domain-restricted) | free tier 100k req/mo | fall back to Photon | none (query not stored) |
| Photon (komoot) | geocoding fallback | none | fair use | manual pin still works | none |
| Expo Push | push delivery | Expo access token (optional), FCM/APNs in EAS | Expo limits | in-app + email still delivered | push tokens |
| Brevo | transactional email + Auth SMTP | API key / SMTP creds | 300/day free | retry 5×, then dead letter; in-app remains | outbox rows |
| Stripe | checkout, webhooks | secret key, webhook secret | test mode only | user sees retry; webhook retries are idempotent | session/payment ids, amounts |
| Google Analytics 4 / Firebase | audience analytics | measurement id / config files | GA4 quotas | silently dropped | none in our DB |
| GA Data API (optional) | partner page enrichment | service account | quotas | DB-only stats (FR-032 edge) | cached aggregates |
| Anthropic (M3) | attribute extraction | API key | budget caps | manual form | AI results per photo hash |
| Voyage AI (M3) | image embeddings | API key | budget caps | v1 matching only | vectors |
| GURS open data | municipalities and regions | none (download) | - | static seed | boundaries |

# Architecture decisions

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | pnpm + Turborepo monorepo, TS source packages, ESLint + Prettier | Accepted |
| ADR-002 | Design tokens: `docs/design/tokens.json` → `packages/tokens` (CSS vars, TW4 theme for web, TW3 preset for NativeWind, TS values), contrast lint | Accepted |
| ADR-003 | Supabase is the API: RLS + RPC + Edge Functions; Realtime Postgres Changes; TanStack Query clients | Accepted |
| ADR-004 | Async jobs: pgmq queue + pg_cron + `worker` Edge Function | Accepted |
| ADR-005 | Anonymous finders: Supabase anonymous sign-in, manage token, Turnstile; captcha outage fails closed with local retry | Accepted |
| ADR-006 | Location privacy: exact point private, deterministic fuzz on write; GURS boundaries in PostGIS | Accepted |
| ADR-007 | MapLibre + OpenFreeMap; MapTiler geocoding with Photon fallback | Accepted |
| ADR-008 | i18n: next-intl / use-intl with shared ICU catalogues, SL unprefixed, EN `/en` | Accepted |
| ADR-009 | Analytics: typed `track()`, GA4 + Firebase adapters, basic Consent Mode v2 | Accepted |
| ADR-010 | Notifications: inbox + Expo Push + Brevo email | Accepted |
| ADR-011 | Payments: Stripe Checkout via Edge Functions, webhook ledger, mock provider, live-mode guard | Accepted |
| ADR-012 | AI extraction: Claude `claude-opus-5-5` (effort low), structured outputs, caps | Accepted (M3) |
| ADR-013 | Image embeddings: Voyage multimodal behind adapter, pgvector HNSW, evaluation gate | Accepted (M3) |
| ADR-014 | Photos: client resize and EXIF strip, private uploads, public copies on publish | Accepted |
| ADR-015 | Test toolchain: Vitest, pgTAP, Playwright + axe + LHCI, jest-expo, Maestro | Accepted |
| ADR-016 | Environments, credential-gated deploys, `pnpm verify` until a Git remote exists | Accepted |
| ADR-017 | Dependency allowlist | Accepted |
| ADR-018 | Roles in JWT claim; admins and moderators need TOTP (AAL2) | Accepted |
| ADR-019 | Mobile offline data layer: expo-sqlite store for drafts, public cache and outbox; incremental sync; OS geofences for local alerts; wipe on logout | Accepted |

Full records: `docs/tech/adr/NNN-*.md` (context, decision, alternatives, consequences).

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft (template) |
| 0.2 | 2026-10-14 | Full technical design: architecture, stack (versions checked 2026-10-14), repo map, data model, contracts C1–C16 for M1–M2, auth, environments with credentials matrix, CI/CD, observability, backup, integrations, ADR-001…018 |
| 0.3 | 2026-10-15 | Brief v0.7: Shelter Pro removed (organisations free), Vet Partner as the only B2B subscription (M4), QR/NFC tags out of scope; staging on Supabase `najdimo` + Vercel with credentials available; final Lagoon tokens (single theme), positron map style, Phosphor icons, bottom sheet; inbox routes aligned with design; M1/M2 task breakdown created |
| 0.4 | 2026-10-15 | Offline mode (FR-041..043, NFR-OFFLINE, NFR-BATT): ADR-019 and contract C17 (device store, sync RPC, outbox with server-side idempotent replay, geofences); content CHANGEs applied to C3, C9, C10, C14, C15 |
