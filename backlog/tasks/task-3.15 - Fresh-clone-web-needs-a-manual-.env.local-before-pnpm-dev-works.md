---
id: TASK-3.15
title: 'Fresh clone: web needs a manual .env.local before pnpm dev works'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 15:01'
updated_date: '2026-10-19 18:38'
labels:
  - bug
  - fe
  - 'est:XS'
milestone: m-0
dependencies: []
parent_task_id: TASK-3
priority: medium
ordinal: 424200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by QA TASK-3.6 (story TASK-3 AC#1).

Steps: fresh clone; corepack enable; pnpm bootstrap; pnpm dev; open http://localhost:3000.
Expected: web app serves pages, as the README Bootstrap block says (pnpm dev -> web on :3000), with no cloud credentials.
Actual: nothing creates apps/web/.env.local. apps/api has .env.example plus a postinstall env-sync (scripts/env-sync.mjs) that writes apps/api/.env.local, but apps/web has no .env.example and no env-sync. apps/web/lib/env.ts parseEnv() gives local defaults for NEXT_PUBLIC_API_URL, NEXT_PUBLIC_APP_URL, R2_UPLOAD_ORIGIN and MOCK_WEBHOOK_SECRET only, so NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are missing and every page throws 'Invalid environment ... Set it in apps/web/.env.local'. README line 67 and 75 mention the file and supabase status, but the Bootstrap block does not.
Severity: minor (developer experience; workaround: write the two values from pnpm exec supabase status into apps/web/.env.local).

Options: an apps/web/.env.example with the local Supabase URL and the CLI's local publishable key plus a web postinstall env-sync like apps/api, or a bootstrap step that writes them from supabase status -o env. apps/mobile/.env.local has the same gap (mobile deferred in the web-only pilot).

## Packet

Branch: agent/TASK-3.15-web-env-sync
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On a fresh clone, corepack enable, pnpm bootstrap, pnpm dev serves http://localhost:3000 with HTTP 200 and no 'Invalid environment' error, with no manual env step and no cloud credentials
- [ ] #2 apps/web/.env.local is created (or local defaults apply) for NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, using local Supabase values only and never overwriting existing lines
- [ ] #3 The README Bootstrap block lists every step a developer must run; a root script test covers the new env setup
<!-- AC:END -->
