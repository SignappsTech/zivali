---
id: TASK-99
title: 'Env sync: postinstall appends missing .env.example keys to .env.local'
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-15 05:42'
labels:
  - be
  - 'est:XS'
  - trivial
dependencies: []
ordinal: 313000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
From CH-110 (origin TASK-6.2). Today new env vars (SUPABASE_URL in TASK-6.2) never reach existing .env.local files and turn tests red. Scope: apps/api postinstall (env sync).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 postinstall appends keys present in .env.example but missing from .env.local, with the example values
- [ ] #2 Honour SUPABASE_*_PORT moved ports from supabase/README.md (do not overwrite a port the developer already moved)
- [ ] #3 postinstall prints the names of the keys it added
- [ ] #4 Existing keys in .env.local are never overwritten or removed
<!-- AC:END -->
Branch: agent/TASK-99-env-sync
