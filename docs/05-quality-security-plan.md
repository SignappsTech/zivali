---
doc_id: DOC-05
title: Quality and Security Plan
version: 0.10
status: Draft
date: 2026-10-15
owner: Tech Lead
audience: Team, client on request
approvals:
  - Tech Lead | Claude | 2026-10-14 |
---

<!-- Owner: tech-lead (QA contributes test results). The DoD and gates are copied into docs/tech/frontend.md and backend.md for implementers. -->

# Quality gates (automated, on every PR)

Run by GitHub Actions (`.github/workflows/ci.yml`, jobs `verify`, `quality`, `images`; docs/04 §CI/CD) once the remote exists; locally `pnpm verify` runs the same list and is part of the DoD (ADR-016). The web gates (performance, accessibility, SEO, links, ads, consent, visual) live in the quality kit, `lighthouserc.json` and `tests/quality/`, which `pnpm quality` runs against a production build on :8080 (TASK-4.1).

| Gate | Tool | Threshold | Blocks merge |
|---|---|---|---|
| Lint / format | ESLint 10 flat config, Prettier check | 0 errors | Yes |
| Typecheck | `tsc --noEmit` per package (incl. `apps/api` and the Prisma client) | 0 errors | Yes |
| Unit / component tests | Vitest (packages, web, function logic), jest-expo + RNTL (mobile) | all pass; new logic covered | Yes |
| API tests | Vitest + Supertest against the local Supabase Postgres: domain functions, endpoints, permission matrix per endpoint, jobs, data-inventory coverage | all pass | Yes |
| Database exposure (ADR-021) | `apps/api/test/security`: every `app`/`pgboss` table has RLS on and no policies, no grants to `anon`/`authenticated`, PostgREST exposes no app table | 0 findings | Yes |
| i18n completeness | `@zivali/i18n` check | 0 missing keys, SL plurals complete | Yes |
| Token contrast | `@zivali/tokens` build | every declared pair ≥ its minimum (body 7:1 target, AA floor 4.5:1, UI 3:1) | Yes |
| End-to-end smoke | Playwright against local stack (SL and EN) | all pass | Yes |
| Performance | Lighthouse CI, mobile preset | perf ≥ 90 (map page ≥ 80), LCP < 2.5 s, CLS < 0.1, initial JS < 250 KB gz (map route excluded), total page weight warn > 1 MB, best practices ≥ 90 | Yes |
| Accessibility | axe (Playwright, WCAG 2.0/2.1/2.2 A+AA tags) + Lighthouse | 0 violations, Lighthouse a11y ≥ 95 | Yes |
| SEO | Lighthouse | ≥ 95 on public pages (home, detail, partners, legal) | Yes |
| HTML validity | N/A — server-rendered React; covered by axe, Lighthouse and React's own checks (html-validate dropped from the quality kit) | - | - |
| Links | linkinator on the running web app | 0 broken internal links | Yes |
| No ads in protected flows | Playwright `expectNoAdSlots(page)` (`tests/quality/guards.mjs`): report-lost, report-found, sign-in, chat, payment routes contain no `[data-ad-slot]` | 0 | Yes |
| Analytics without consent | Playwright `expectNoAnalyticsBeforeConsent(page)`: no request to `*.google-analytics.com` / `googletagmanager.com` / `analytics.google.com`, no `_ga*` cookie before consent | 0 | Yes |
| Mobile build health | `expo export` (web + native bundles) and `tsc` | success | Yes |
| Offline cache privacy (NFR-OFFLINE) | jest test dumps the local SQLite schema and rows | only C17 public columns; 0 exact coordinates, chips, contacts, chat | Yes |
| Offline queue idempotency | jest (outbox) + API test (`Idempotency-Key` replay) | a replayed submission yields 1 report and the same manage token | Yes |
| Visual | Playwright screenshots (390 and 1440 px) vs baselines committed once the design lead approves the build against the mockup | ≤ 2 % pixel diff | Review (design lead) |
| Security | secretlint, `pnpm audit --audit-level high`, tech-lead security review on est:M/L PRs | no high/critical, no secrets | Yes |

# Testing strategy

- **Unit**: zod schemas, chip normalisation, fuzz-independent helpers, matching score (≥ 30 synthetic pairs, TASK-19), analytics allowlist, i18n plurals, formatting, payment amount rules, ad rotation and slot rules.
- **API (Vitest + Supertest, real local Postgres)**: one test file per route module and per domain. The **permission matrix** calls every endpoint as anonymous visitor (no token), anonymous user, owner or manager, other user, moderator (aal1 and aal2) and admin (aal2) and asserts status and body. Plus: domain behaviour (status transitions, rate limits, idempotent replays, chip match, rejected pairs, fuzz determinism and bounds); the exposure tests of ADR-021; a test that fails if a Prisma model or R2 bucket is missing from `apps/api/prisma/data-inventory.json`; jobs drained with `drain()`.
- **Integration**: API + worker against the local stack (checkout + mock webhook, leads, photo upload to MinIO + `photo.process`, notifications via the mock adapters, Realtime Broadcast delivery between two clients), `pnpm jobs:drain`.
- **End-to-end (web)**: Playwright flows per story QA; the core-loop suite (TASK-39) runs lost → anonymous found → match → confirm → chat → reunited in SL and EN, with consent denied and granted.
- **Mobile**: component tests (jest-expo); offline tests for the cache (airplane mode, eviction, wipe), the outbox (kill and restart, duplicate send, rate limit) and geofences (mocked task manager, caps, quiet hours); Maestro smoke on an Android dev build for found report and match confirm (TASK-39).
- **Performance**: Lighthouse CI on home, report detail, map, partners; a seeded 500-report viewport test for the map (FR-007 AC#1); fan-out test of 1000 recipients < 60 s (FR-010); embedding search at 50k photos < 300 ms (M3).
- **Manual QA**: per story against acceptance criteria (qa agent); mobile, keyboard-only and screen-reader spot checks (VoiceOver, TalkBack, NVDA); outdoor contrast check on a phone at full brightness for key screens.
- **Cross-browser** (NFR-BROWSER): latest 2 versions of Chrome, Edge, Firefox, Safari (desktop + iOS Safari), Android Chrome; spot checks per milestone, full pass in M5.
- **Usability** (G-3): found report < 60 s median with 5 participants on phones (TASK-30 QA, again with AI in M3).

# Security

- **Threats in scope**: XSS (chat, listings, ads), CSRF (cookie session on web), SQL injection (TypedSQL and raw queries), SSRF (CSV photo URLs in M3; the geocoder makes no outbound calls), open redirect (ad click endpoint), insecure uploads (type, size, EXIF), spam and abuse on anonymous endpoints, **scams in chat** (R-007), **location leakage** (fuzz bypass, averaging, distance triangulation, points in URLs or logs: geocoder points travel only in POST bodies and are never logged or stored; R-011), **chip enumeration** (lookup throttling M3; chip never in public read model), account takeover, privilege escalation via missing API checks or an exposed table, webhook forgery, secret leakage, API key misuse (M4).
- **Input**: zod at every client boundary and again in the API (`validate()` on body, query and params); SQL only through Prisma, TypedSQL parameters or `$queryRaw` tagged templates (never string concatenation); chat and listing text rendered as text (React escaping), URLs in chat not linkified (FR-009); ad links must be `https://` and are only reachable through `GET /v1/ads/:id/click` which redirects to the stored URL (no user-supplied redirect targets).
- **AuthZ**: every endpoint has explicit guards and every rule lives in a domain function (ADR-020), covered by the permission matrix; the database is unreachable for clients (schema `app` not exposed, no grants, deny-all RLS, ADR-021); the only policy is the Realtime membership policy (ADR-023); the Supabase secret key is used only by the API for Admin API calls, never in clients.
- **Secrets**: env vars only (VPS `.env` files mode 600, GitHub Actions secrets); `.env.local` and `.secrets/` gitignored; secretlint (recommended preset, masked output) in the pre-commit hook on staged files, in `pnpm verify` and in CI; keys rotatable (documented in the runbook); Stripe live keys rejected by code.
- **Headers** (Next config for web, helmet + Caddy for the API): CSP with nonces (`script-src 'self' 'nonce-…'` + `https://www.googletagmanager.com` only after consent, `https://challenges.cloudflare.com`; `connect-src` the API origin, Supabase (Auth, Realtime websocket), OpenFreeMap, GA endpoints, the R2 upload endpoint `https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com` (presigned PUT); no geocoder origin (our API); `img-src` self, the R2 media domain, the R2 EU endpoint (presigned GET of private photos), tiles, data:, blob:; `worker-src blob:` for MapLibre; `frame-src https://challenges.cloudflare.com`; `frame-ancestors 'none'`), HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, geolocation self only).
- **Rate limiting / anti-spam** (defaults in `app_config`):

| Action | Limit | Key |
|---|---|---|
| Anonymous report submit | 5/hour, 20/day | IP hash and device id |
| Anonymous sign-in | Supabase Auth default (30/hour) | IP |
| Abuse report | 10/hour | user (anonymous included) and IP hash |
| Chat message | 30/minute, 500/day | user |
| Partner lead | 3/hour | IP hash |
| Password reset / OTP | Supabase Auth defaults | email / IP |
| Contact from listing (new conversation) | 10/day | user |
| Chip lookup (M3) | 30/hour/member | member |

- **Abuse**: holds for anonymous patterns, auto-hide at 3 weighted abuse reports (accounts younger than 24 h count 0.5), duplicate-photo detection, chat safety banner, block, moderation queue (M4).
- **Dependencies**: pinned through the lockfile, minimal (ADR-017), audited by `pnpm audit --audit-level high` in `pnpm verify` and CI. An advisory without a usable fix is accepted only in `pnpm-workspace.yaml` `auditConfig.ignoreGhsas` with a one-line reason why it is unreachable here (accepted 2026-10-15: 8 high, all in build or dev tooling: `@lhci/cli`/Lighthouse, the Prisma CLI, the Expo CLI, Metro); entries are re-checked on every dependency upgrade and dropped once fixed. CI actions are pinned to commit SHAs.
- **Review**: tech-lead code review with security checklist on est:M/L tasks (lean mode); `security-review` pass and abuse tests in M5 (TASK-68); permission matrix and exposure tests reviewed at every schema change.

# Privacy and compliance

- **Data inventory**: `apps/api/prisma/data-inventory.json` lists every model and R2 bucket with category (account, pet, photo, location, chat, payment, ads aggregate, analytics none), personal data flag, lawful basis, retention, export and delete handling. CI fails on a missing entry (FR-034 R-034.3).
- **Lawful bases** (proposal for legal review): contract (account, reports, chat, payments), legitimate interest (fraud and abuse prevention, aggregate ad counts), consent (analytics, success stories, partner contact), legal obligation (payment records).
- **Device data** (ADR-019, C17): only public fuzzed report data, thumbnails and the user's own drafts and outbox on the device; no query persister; wiped on sign-out, account deletion and on request; background location only after explicit opt-in (M3) and never uploaded.
- **Data minimisation**: no camera originals or EXIF stored; exact location never stored in public reads (a coarsened point of 20-30 m is what is shown, the raw point stays private) and the stored point is blurred 30 days after closure (LQ-19, N=30); chip numbers never public; IPs only as keyed hashes for 48 h; analytics events contain enums and slugs only; ad counting cookieless and aggregate (A-016).
- **Consent**: no analytics script, request or cookie before opt-in (basic Consent Mode v2, ADR-009); choice, version and timestamp stored first-party; withdrawal as easy as giving; re-ask after 12 months or version change.
- **Retention** (NFR-PRIV): chat 6 months after close; closed-report photos and locations 12 months; payment records as legally required; implemented by `purge_retention`.
- **Retention for `audit_log` and the `zivali-backups` bucket** (proposal, confirm with the lawyer pack LQ list): `audit_log` rows kept 12 months, then deleted; `zivali-backups` objects kept 30 days rolling. Both go into `data-inventory.json` (currently "not defined yet") and `purge_retention`.
- **Rights**: export and delete (M3, FR-034); anonymous reporters delete via manage link.
- **Processors and transfers** (for the privacy policy, TASK-28): Supabase (EU, Frankfurt), Hetzner (EU, hosting), Cloudflare (R2 storage in the EU jurisdiction, Turnstile), Stripe, Brevo (EU), Expo (push), Google (GA4, Firebase), Anthropic (M3), Voyage AI (M3), Sentry (EU, M5). DPAs to be signed by the client before production.
- **Accessibility**: WCAG 2.2 AA (EAA); axe in CI from M1; formal audit in M5 before the accessibility statement is finalised.
- **Cookies**: strictly necessary (`sb-*` auth, `NEXT_LOCALE`, `zz_consent`, device id in localStorage); analytics `_ga`, `_ga_<id>` only after consent; cookie policy drafted in TASK-28.

# Definition of Done

- [ ] Acceptance criteria of the task met and demonstrated (screenshot or test output in the report)
- [ ] Follows the architecture, contracts and conventions in the slice (`frontend.md` / `backend.md`, contract C-files)
- [ ] Tests added or updated, and passing (unit; domain and Supertest permission tests for every new endpoint; e2e for new routes)
- [ ] `pnpm verify` passes locally (lint, typecheck, unit, i18n, tokens, API and security tests, build, e2e smoke, quality gates for touched pages)
- [ ] Quality gates pass for touched pages (performance, a11y, SEO, links, no ads in protected flows, no analytics before consent)
- [ ] SL and EN strings complete; no hard-coded user-facing text
- [ ] Security implications reviewed (guards, ownership rules in the domain, validation, rate limits, secrets, PII in logs and analytics, no exposed tables); error cases handled with stable codes
- [ ] Data inventory updated for any new table or bucket; migration has a rollback note
- [ ] No unrelated changes; docs (README, package README) updated where needed; no new dependency outside ADR-017
- [ ] Commit messages `<task-id>: <what>`; branch `agent/<task-id>-<slug>`; report includes screenshots for UI
- [ ] No known critical or high issues

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft (template) |
| 0.2 | 2026-10-14 | Gates with thresholds from NFRs, testing strategy incl. RLS matrix and protected-flow tests, security (threats, CSP, rate limits), privacy (inventory, processors, retention), DoD |
| 0.3 | 2026-10-15 | Tag-address retention removed (tags out of scope, brief v0.7); protected flows include inbox and conversations |
| 0.4 | 2026-10-15 | Offline mode: cache-privacy and idempotency gates, device-data privacy rules |
| 0.5 | 2026-10-15 | Brief v1.0: pgTAP replaced by API tests with a permission matrix and the ADR-021 exposure tests; security and processors updated for the Express API, R2 and Hetzner |
| 0.6 | 2026-10-15 | Own geocoder (ADR-007 revised): MapTiler and Photon removed from CSP and processors, geocoder points never in URLs or logs; R2 in the EU jurisdiction |
| 0.7 | 2026-10-15 | Data minimisation line aligned with the coarsened point and 30-day post-closure blur; CH-32 handed to a validation task (opt-in OpenAPI extension) |
| 0.8 | 2026-10-15 | Quality kit in place (TASK-4.1): where the web gates live, best-practices threshold, guard helpers named, visual baselines approved by the design lead, html-validate dropped |
| 0.9 | 2026-10-15 | CH-104: retention proposal for audit_log (12 months) and zivali-backups (30 days), pending lawyer confirmation |
| 0.10 | 2026-10-15 | TASK-4.2: CI runs the gates (`ci.yml`); secretlint also pre-commit; accepted audit advisories and their rule (§Security) |
