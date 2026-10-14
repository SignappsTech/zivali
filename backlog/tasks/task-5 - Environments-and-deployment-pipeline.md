---
id: TASK-5
title: Environments and deployment pipeline
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:NFR-AVAIL'
milestone: m-0
dependencies:
  - TASK-3
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Continuous delivery needs staging and production for web, database and mobile builds; cloud credentials (Q-002, Q-007) are pending, so the pipeline must work in dry-run until they arrive.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given merged code on main, when the pipeline runs, then web deploys to Vercel staging and migrations apply to the staging Supabase project (EU Frankfurt) once credentials exist, and passes in dry-run mode until then.
- [ ] #2 Given a migration, when applied, then it is reversible or has a documented rollback and runs in CI against a clean local database.
- [ ] #3 Given EAS, when a developer runs a build profile, then development and preview profiles exist (no store submission).
- [ ] #4 Given the environments, when documented, then a runbook lists required credentials, who provides them and which features stay blocked without them.
<!-- AC:END -->

## Packet

Unblocks on: buildable apps/web, apps/mobile and supabase/ folder merged (TASK-3)
