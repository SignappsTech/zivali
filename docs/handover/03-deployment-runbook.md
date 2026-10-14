---
doc_id: HO-03
title: Deployment Runbook
version: 1.0
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

# Credentials handover

What the client receives and how (password manager share; never by email or in this document).
