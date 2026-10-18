---
doc_id: HO-03
title: Deployment Runbook
version: 1.1
status: Draft
date: YYYY-MM-DD
owner: Tech Lead
audience: Client IT, maintainers
approvals:
  - Client | | |
  - Tech Lead | | |
---

# Environments

| Env | URL | Host | Access (who / how, no secrets here) |
|---|---|---|---|

# Prerequisites

Tools, versions, required environment variables (names only).

# Deploy

Step-by-step commands for staging and production.

# Rollback

Step-by-step, with how to verify it worked.

# Launch checklist

- [ ] DNS / TLS
- [ ] 301 redirects from the old URLs live and tested
- [ ] Analytics behind consent; Search Console and sitemap submitted
- [ ] Backups scheduled and a restore tested
- [ ] Uptime monitoring and alerts on
- [ ] Legal pages live (privacy, cookies, imprint, accessibility statement)
- [ ] Supabase auth (najdimo) set for production: `site_url` = `https://najdimo.si` (auth emails use it as the default link base; since 2026-10-15 it is `https://staging.najdimo.si`). Redirect allow list stays `https://staging.najdimo.si/**`, `https://najdimo.si/**`, `https://www.najdimo.si/**`, `zivali://**` (CH-210). Cloudflare SSL is Full (strict) since 2026-10-15
- [ ] Auth email sender: since 2026-10-15 hosted Supabase Auth sends through Brevo SMTP (`smtp-relay.brevo.com:587`, key `BREVO_SMTP_KEY`) as "Najdimo <noreply@najdimo.si>"; repo templates and subjects from `supabase/config.toml` are uploaded, `rate_limit_email_sent` is 30/h. najdimo.si has no mailboxes yet: once a monitored mailbox exists (e.g. podpora@), make it the auth sender and the api `EMAIL_FROM`. Re-upload the templates whenever `supabase/templates` changes (Management API PATCH config/auth) (CH-219)
- [ ] Q-012 decision recorded and `fiscal.required` set; fiscal and live-payment steps in `deploy/README.md` §10 (CH-292)

# Credentials handover

What the client receives and how (password manager share; never by email or in this document).

# Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-210, CH-219, CH-292: launch checklist items (auth site_url, auth email sender, fiscal decision) |
