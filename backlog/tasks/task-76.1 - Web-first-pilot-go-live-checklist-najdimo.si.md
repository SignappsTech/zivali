---
id: TASK-76.1
title: Web-first pilot go-live checklist (najdimo.si)
status: In Progress
assignee: []
created_date: '2026-10-16 10:29'
updated_date: '2026-10-16 12:58'
labels:
  - launch
dependencies: []
parent_task_id: TASK-76
priority: high
ordinal: 359000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Client decision 2026-10-16 (CH row 'web-first pilot'): launch the web app for the pilot before the mobile apps. Lead prepares, owner approves go-live. Items: production environment next to staging (Hetzner compose, production Supabase project or schema and keys, R2 bucket and media origin, SMTP sender, secrets), domain najdimo.si DNS and TLS, production deploy workflow with manual approval, production DB migrations and the reference seed (GURS, directory), Stripe left in test mode or payments disabled behind a flag until fiscal (TASK-92.x) is cleared, house ads only, GA4 production stream with consent, error monitoring, backups and restore drill (TASK-70 subset), robots/sitemap on the production URL, legal pages with the lawyer review (TASK-91) and real imprint data, copy sign-off (TASK-27.5), contact mailbox live (owner), smoke test on production (core loop by hand), rollback plan.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Production web environment runs the M2 build on najdimo.si with TLS, migrations and the reference seed, with payments off or in test mode
- [ ] #2 Legal review, imprint data, copy sign-off and the contact mailbox done; owner approves go-live after a production smoke test of the core loop
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Prep by tech-lead (files only; no hosted change). Branch: agent/task-76.1-prod-prep. Scope per owner 2026-10-16: one pilot environment (the staging stack on najdimo.si), payments ON in Stripe test mode with FISCAL_PROVIDER=mock. Built: payments-off switch for later (API PAYMENTS_PROVIDER=off, reported as payments.enabled in GET /v1/config/public and followed by web and app; overrides PAYMENTS_ENABLED (web runtime) and EXPO_PUBLIC_PAYMENTS_ENABLED (app build)); SEARCH_INDEXING (web runtime; X-Robots-Tag noindex on every page, no sitemap; default off on APP_ENV=staging); API hosts always noindex (nginx). Runbook: docs/tech/pilot-runbook.md (hosts, env vars, Stripe test mode and the switch to live, noindex, rollback, backups, smoke test, go-live order, split before launch, owner actions).

2026-10-16 12:45 (lead): pilot live on https://najdimo.si (deploy of 7debfff6, the staging stack). Done:
- DNS: proxied A records @, www, api to the VPS (owner-approved, CLOUDFLARE_API_TOKEN).
- edge.env: STAGING_WEB_HOST=najdimo.si, STAGING_ALIAS_HOSTS=www.najdimo.si staging.najdimo.si (301, path and query kept), STAGING_API_HOST=api.najdimo.si api-staging.najdimo.si, production names parked on .invalid.
- staging/.env: API_URL/APP_URL on najdimo.si, WEB_ORIGINS both origins (drop staging after a day), PAYMENTS_PROVIDER=stripe with the sandbox sk_test key and a new test webhook https://api.najdimo.si/v1/webhooks/stripe (scripts/stripe-webhook.mjs), FISCAL_PROVIDER=mock, EMAIL_PROVIDER=brevo from podpora@najdimo.si (mailbox later: replies bounce), LEADS_NOTIFY_EMAIL=info@signapps.si. web.env: SEARCH_INDEXING=false.
- GitHub repo variables WEB_HOST=najdimo.si, API_HOST=api.najdimo.si.
- Supabase Auth: site_url https://najdimo.si (the allow list already had najdimo.si and www); email_change template brought in line with the repo (the anonymous-to-account copy, TASK-17.12).
- Smoke (curl): home 200 with x-robots-tag noindex, no sitemap in robots.txt, /api/health version 7debfff65593, www and staging 301, api.najdimo.si and api-staging ready, API noindex, CORS for najdimo.si, payments.enabled true, canonical https://najdimo.si.
- CI: main had been red since early 2026-10-16 (no deploys): fixed the reunited ad test (payments flag), the quality mock's map 404s and Lighthouse's Chrome sandbox. Lighthouse now runs; its performance budgets fail (TASK-112; the quality job is continue-on-error).
Open for #2 and go-live: the manual core-loop smoke (runbook §7: sign-up email, lost report with photos, anonymous sighting with Turnstile, chat, poster, reunited and a Stripe test payment with the mock invoice email, leads form, admin console), legal company data (branch in progress; share capital 7.500,00 EUR), lawyer review (TASK-91), copy sign-off (TASK-27.5, house ads via /admin/oglasi, TASK-27.4), mailbox, Supabase Pro or written backup-risk acceptance, uptime monitors, restore drill (TASK-70), GA4 stream URL.
<!-- SECTION:NOTES:END -->
