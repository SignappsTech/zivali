---
id: TASK-17.11
title: >-
  EAS preview profile lacks EXPO_PUBLIC_CAPTCHA while staging Auth requires
  Turnstile
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 00:25'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-17
ordinal: 336000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story TASK-17 AC#1 (QA TASK-17.4, code reading of the TASK-17.3 work). apps/mobile/eas.json: production sets EXPO_PUBLIC_CAPTCHA=true, preview (staging, EXPO_PUBLIC_SUPABASE_URL = project najdimo) does not. supabase/README.md says staging and production enable Turnstile for anonymous sign-in. Expected: a staging build gets a token and signs in. Actual (by reading; needs a device): ensureSession() skips the captcha and calls signInAnonymously without a token, which Supabase refuses, so the finder's report waits in the outbox retry loop. Not a bypass: Supabase enforces the captcha server-side. Severity: minor (staging testing of the anonymous flow).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Staging (preview) mobile builds solve Turnstile through the /captcha WebView before anonymous sign-in, as production does (EXPO_PUBLIC_CAPTCHA=true in the preview profile, or a documented reason it stays off)
<!-- AC:END -->
