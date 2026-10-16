---
id: TASK-76.1
title: Web-first pilot go-live checklist (najdimo.si)
status: To Do
assignee: []
created_date: '2026-10-16 10:29'
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
- [ ] #1 Production web environment runs the M2 build on najdimo.si with TLS, migrations and the reference seed, with payments off or in test mode
- [ ] #2 Legal review, imprint data, copy sign-off and the contact mailbox done; owner approves go-live after a production smoke test of the core loop
<!-- AC:END -->
