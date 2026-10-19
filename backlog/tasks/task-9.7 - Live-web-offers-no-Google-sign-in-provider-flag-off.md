---
id: TASK-9.7
title: Live web offers no Google sign-in (provider flag off)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 15:05'
labels:
  - bug
  - ops
  - 'est:XS'
  - no-design
dependencies: []
references:
  - docs/tech/frontend.md
  - apps/web/lib/auth.ts
parent_task_id: TASK-9
priority: medium
ordinal: 427200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found in QA TASK-9.5 (2026-10-19, read-only on live). Steps: open https://najdimo.si/vpis (or /registracija, /en/sign-in, /en/sign-up) in Chromium or WebKit at 1440/390/320 px. Expected: email form plus 'ali' and a Google provider button (P16, story TASK-9 AC#1; CH-186 says deploy sets NEXT_PUBLIC_GOOGLE_SIGN_IN=true, hosted Auth has Google on). Actual: only the email form; the page buttons are 'Pokazi geslo' and 'Vpisi se', no provider block. ProviderButtons renders only when NEXT_PUBLIC_GOOGLE_SIGN_IN === 'true' (apps/web/lib/auth.ts:23), a build-time variable from the GitHub environment 'staging' (deploy.yml:87,149), so it is unset or not 'true' there. Fix: confirm the hosted Google provider and its redirect URLs, set the variable to true, redeploy, check the button. Code and unit tests for the Google path are fine (lib/auth.test.ts 'starts Google over OAuth', callback route.test.ts). Severity: Medium (a story provider is missing on the pilot).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 https://najdimo.si/vpis, /registracija, /en/sign-in, /en/sign-up and the contextual gate show the 'ali' line and a Google provider button; Apple stays hidden until the Apple Developer account exists
- [ ] #2 Hosted Supabase Auth (najdimo) has Google enabled with an OAuth client whose redirect covers https://najdimo.si/auth/callback and /en/auth/callback; a manual Google sign-in on najdimo.si lands signed in with a profile (owner or lead, recorded in notes)
- [ ] #3 docs/tech/pilot-runbook.md step 3 drops 'if enabled' or records the decision
<!-- AC:END -->
