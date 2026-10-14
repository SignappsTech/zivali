---
doc_id: DOC-05
title: Quality and Security Plan
version: 0.2
status: Draft
date: 2026-10-14
owner: Tech Lead
audience: Team, client on request
approvals:
  - Tech Lead | Claude | 2026-10-14 |
---

<!-- Owner: tech-lead (QA contributes test results). The DoD and gates are copied into docs/tech/frontend.md and backend.md for implementers. -->

# Quality gates (automated, on every PR)

Run by GitHub Actions once a remote exists; until then `pnpm verify` runs the same list locally and is part of the DoD (ADR-016).

| Gate | Tool | Threshold | Blocks merge |
|---|---|---|---|
| Lint / format | ESLint 10 flat config, Prettier check | 0 errors | Yes |
| Typecheck | `tsc --noEmit` per package, `deno check` for Edge Functions | 0 errors | Yes |
| Unit / component tests | Vitest (packages, web, function logic), jest-expo + RNTL (mobile) | all pass; new logic covered | Yes |
| Database tests | pgTAP (`supabase test db`): RLS matrix, RPCs, triggers, RLS-on-every-table, data-inventory coverage | all pass | Yes |
| i18n completeness | `@zivali/i18n` check | 0 missing keys, SL plurals complete | Yes |
| Token contrast | `@zivali/tokens` build | every declared pair ≥ its minimum (body 7:1 target, AA floor 4.5:1, UI 3:1) | Yes |
| End-to-end smoke | Playwright against local stack (SL and EN) | all pass | Yes |
| Performance | Lighthouse CI, mobile preset | perf ≥ 90 (map page ≥ 80), LCP < 2.5 s, CLS < 0.1, initial JS < 250 KB gz (map route excluded), total page weight warn > 1 MB | Yes |
| Accessibility | axe (Playwright, WCAG 2.0/2.1/2.2 A+AA tags) + Lighthouse | 0 violations, Lighthouse a11y ≥ 95 | Yes |
| SEO | Lighthouse | ≥ 95 on public pages (home, detail, partners, legal) | Yes |
| HTML validity | N/A — server-rendered React; covered by axe, Lighthouse and React's own checks | - | - |
| Links | linkinator on the running web app | 0 broken internal links | Yes |
| No ads in protected flows | Playwright route test: report-lost, report-found, sign-in, chat, payment routes contain no `[data-ad-slot]` | 0 | Yes |
| Analytics without consent | Playwright: no request to `*.google-analytics.com` / `googletagmanager.com`, no `_ga` cookie before consent | 0 | Yes |
| Mobile build health | `expo export` (web + native bundles) and `tsc` | success | Yes |
| Visual | Playwright screenshots vs approved mockups | ≤ 2 % pixel diff | Review (design lead) |
| Security | secretlint, `pnpm audit --audit-level high`, tech-lead security review on est:M/L PRs | no high/critical, no secrets | Yes |

# Testing strategy

- **Unit**: zod schemas, chip normalisation, fuzz-independent helpers, matching score (≥ 30 synthetic pairs, TASK-19), analytics allowlist, i18n plurals, formatting, payment amount rules, ad rotation and slot rules.
- **Database (pgTAP)**: one file per domain. The **RLS matrix** tests every table for anon, anonymous-signed-in, user (owner / non-owner), report manager, moderator (aal1 and aal2), admin (aal2): select, insert, update, delete expectations. Plus: a test that fails if any `public` table lacks RLS; a test that fails if any table or bucket is missing from `supabase/data-inventory.json`; RPC behaviour (status transitions, rate limits, chip match, rejected pairs, fuzz determinism and bounds).
- **Integration**: Edge Functions against the local stack (`payments-checkout` + mock webhook, `submit-lead`, worker handlers via `pnpm db:drain`), with mock adapters.
- **End-to-end (web)**: Playwright flows per story QA; the core-loop suite (TASK-39) runs lost → anonymous found → match → confirm → chat → reunited in SL and EN, with consent denied and granted.
- **Mobile**: component tests (jest-expo); Maestro smoke on an Android dev build for found report and match confirm (TASK-39).
- **Performance**: Lighthouse CI on home, report detail, map, partners; a seeded 500-report viewport test for the map (FR-007 AC#1); fan-out test of 1000 recipients < 60 s (FR-010); embedding search at 50k photos < 300 ms (M3).
- **Manual QA**: per story against acceptance criteria (qa agent); mobile, keyboard-only and screen-reader spot checks (VoiceOver, TalkBack, NVDA); outdoor contrast check on a phone at full brightness for key screens.
- **Cross-browser** (NFR-BROWSER): latest 2 versions of Chrome, Edge, Firefox, Safari (desktop + iOS Safari), Android Chrome; spot checks per milestone, full pass in M5.
- **Usability** (G-3): found report < 60 s median with 5 participants on phones (TASK-30 QA, again with AI in M3).

# Security

- **Threats in scope**: XSS (chat, listings, ads), CSRF (cookie session on web), SQL injection (RPC parameters), SSRF (CSV photo URLs in M3, geocoder proxying: none), open redirect (ad click route), insecure uploads (type, size, EXIF), spam and abuse on anonymous endpoints, **scams in chat** (R-007), **location leakage** (fuzz bypass, averaging, distance triangulation; R-011), **chip enumeration** (lookup throttling M3; chip never in public read model), account takeover, privilege escalation via RLS gaps, webhook forgery, secret leakage, API key misuse (M4).
- **Input**: zod at every client boundary and again in RPCs/Edge Functions; SQL only through parameters (PL/pgSQL `format()` with `%L`/`%I` when dynamic); chat and listing text rendered as text (React escaping), URLs in chat not linkified (FR-009); ad links must be `https://` and are only reachable through `/a/[id]` which redirects to the stored URL (no user-supplied redirect targets).
- **AuthZ**: RLS on every table (test-enforced); `security definer` functions set `search_path = ''`, check `auth.uid()` and role claims explicitly, and return whitelisted columns; service role key only in Edge Functions and scripts, never in clients.
- **Secrets**: env vars and Supabase secrets only; `.env.local` and `.secrets/` gitignored; secretlint in CI; keys rotatable (documented in the runbook); Stripe live keys rejected by code.
- **Headers** (Next middleware/config): CSP with nonces (`script-src 'self' 'nonce-…'` + `https://www.googletagmanager.com` only after consent, `https://challenges.cloudflare.com`; `connect-src` Supabase, OpenFreeMap, MapTiler, Photon, GA endpoints; `img-src` self, Supabase Storage, tiles, data:, blob:; `worker-src blob:` for MapLibre; `frame-src https://challenges.cloudflare.com`; `frame-ancestors 'none'`), HSTS (preload), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, geolocation self only).
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
- **Dependencies**: pinned through the lockfile, audited, minimal (ADR-017).
- **Review**: tech-lead code review with security checklist on est:M/L tasks (lean mode); `security-review` pass and abuse tests in M5 (TASK-68); RLS matrix reviewed at every schema change.

# Privacy and compliance

- **Data inventory**: `supabase/data-inventory.json` lists every table and bucket with category (account, pet, photo, location, chat, payment, ads aggregate, analytics none), personal data flag, lawful basis, retention, export and delete handling. CI fails on a missing entry (FR-034 R-034.3).
- **Lawful bases** (proposal for legal review): contract (account, reports, chat, payments), legitimate interest (fraud and abuse prevention, aggregate ad counts), consent (analytics, success stories, partner contact), legal obligation (payment records).
- **Data minimisation**: no camera originals or EXIF stored; exact location private and purged on retention; chip numbers never public; IPs only as keyed hashes for 48 h; analytics events contain enums and slugs only; ad counting cookieless and aggregate (A-016).
- **Consent**: no analytics script, request or cookie before opt-in (basic Consent Mode v2, ADR-009); choice, version and timestamp stored first-party; withdrawal as easy as giving; re-ask after 12 months or version change.
- **Retention** (NFR-PRIV): chat 6 months after close; closed-report photos and locations 12 months; payment records as legally required; implemented by `purge_retention`.
- **Rights**: export and delete (M3, FR-034); anonymous reporters delete via manage link.
- **Processors and transfers** (for the privacy policy, TASK-28): Supabase (EU, Frankfurt), Vercel (EU/US edge), Stripe, Brevo (EU), Cloudflare (Turnstile), Expo (push), Google (GA4, Firebase), MapTiler (EU) or komoot Photon, Anthropic (M3), Voyage AI (M3), Sentry (EU, M5). DPAs to be signed by the client before production.
- **Accessibility**: WCAG 2.2 AA (EAA); axe in CI from M1; formal audit in M5 before the accessibility statement is finalised.
- **Cookies**: strictly necessary (`sb-*` auth, `NEXT_LOCALE`, `zz_consent`, device id in localStorage); analytics `_ga`, `_ga_<id>` only after consent; cookie policy drafted in TASK-28.

# Definition of Done

- [ ] Acceptance criteria of the task met and demonstrated (screenshot or test output in the report)
- [ ] Follows the architecture, contracts and conventions in the slice (`frontend.md` / `backend.md`, contract C-files)
- [ ] Tests added or updated, and passing (unit; pgTAP for every new table, policy or RPC; e2e for new routes)
- [ ] `pnpm verify` passes locally (lint, typecheck, unit, i18n, tokens, pgTAP, build, e2e smoke, quality gates for touched pages)
- [ ] Quality gates pass for touched pages (performance, a11y, SEO, links, no ads in protected flows, no analytics before consent)
- [ ] SL and EN strings complete; no hard-coded user-facing text
- [ ] Security implications reviewed (RLS, validation, rate limits, secrets, PII in logs and analytics); error cases handled with stable codes
- [ ] Data inventory updated for any new table or bucket; migration has a rollback note
- [ ] No unrelated changes; docs (README, package README) updated where needed; no new dependency outside ADR-017
- [ ] Commit messages `<task-id>: <what>`; branch `agent/<task-id>-<slug>`; report includes screenshots for UI
- [ ] No known critical or high issues

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | | Initial draft (template) |
| 0.2 | 2026-10-14 | Gates with thresholds from NFRs, testing strategy incl. RLS matrix and protected-flow tests, security (threats, CSP, rate limits), privacy (inventory, processors, retention), DoD |
