---
id: TASK-12.3
title: 'Deep links (App Links, universal links) and push token registration path'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 14:04'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-0
dependencies:
  - TASK-12.2
  - TASK-3.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/tech/contracts/C10-notifications-alerts.md
parent_task_id: TASK-12
priority: medium
ordinal: 141000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Listing links from WhatsApp and poster QR codes must open in the app when installed and on the web otherwise (FR-037).

## Packet

Unblocks on: Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3)
Design: none (no UI of its own)
Contracts: C15, C10 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-12.3-deeplinks
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Android App Links (assetlinks.json) and iOS universal links (apple-app-site-association) are served from apps/web/public/.well-known for /r/*, /en/r/*, /m, /en/m and /payments/*, with zivali:// as fallback; a listing link on an Android dev build opens app/r/[code] (screenshot); iOS verification is documented as blocked by Q-007.
- [ ] #2 Without the app installed the same links open the web page.
- [ ] #3 After the notifications primer the push token is obtained with expo-notifications and passed to registerPushToken (C10), using the mock path until the backend and FCM/APNs credentials exist (Q-007).
<!-- AC:END -->
