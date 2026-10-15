---
id: TASK-3.11
title: >-
  Web scaffold hardening from the TASK-3.3 review: env default, 404 nonce,
  Playwright standalone, nonce e2e
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-15 01:35'
updated_date: '2026-10-15 03:30'
labels:
  - fe
  - 'est:S'
  - no-design
dependencies:
  - TASK-3.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-3
priority: medium
ordinal: 297000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Follow-ups the tech lead found reviewing TASK-3.3.
## Packet

Unblocks on: Web app scaffold merged (TASK-3.3)
Design: none (no UI of its own)
Contracts: C15 (in references)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-fe-web-hardening
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 lib/env.ts does not default NEXT_PUBLIC_API_URL to localhost unless APP_ENV=local; a missing value outside local fails fast naming the variable, and .env.example documents it.
- [ ] #2 app/[locale]/[...rest]/page.tsx calls notFound() so 404 pages are rendered under the locale layout and get the CSP nonce.
- [ ] #3 Playwright starts the standalone server (next build output) instead of next dev.
- [ ] #4 The e2e CSP test anchors the script-src regex and asserts the nonce differs between two requests.
<!-- AC:END -->

Branch: agent/task-fe-web-hardening
