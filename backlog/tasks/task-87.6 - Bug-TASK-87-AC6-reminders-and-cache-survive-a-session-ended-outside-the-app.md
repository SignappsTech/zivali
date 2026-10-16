---
id: TASK-87.6
title: >-
  Bug (TASK-87 AC#6): reminders and cache survive a session ended outside the
  app
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 03:35'
updated_date: '2026-10-16 03:36'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-87
priority: low
ordinal: 343000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Story AC#6 (TASK-87): the cache and geofences are wiped on logout. Found in QA TASK-87.3.

Steps: 1. Sign in on the phone, turn on Nearby reminders. 2. On the web, delete the account or sign out everywhere (or reset the password), so the phone's refresh token is revoked. 3. Open the app: it shows signed out.

Expected: the same wipe as the in-app sign-out (C17 Wipe): geofencing stopped, reports_cache, geofences, geofence_events, cached quiet hours and own report ids cleared.

Actual: only signOutAndWipe (Profile, in-app sign-out) calls wipeLocalData; nothing reacts to a SIGNED_OUT from packages/api/src/auth.ts onAuthStateChange, so OS geofences keep running on Always location and the cached data stays. The Nearby reminders switch is rendered only with a profile (apps/mobile/app/settings/alerts.tsx redirects to /profile), so the user cannot turn the reminders off without signing in again or revoking location in the phone settings.

Severity: low (rare trigger; the cached data is public plus the user's own ids, but the reminders keep using background location after the account is gone).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When the session ends without the in-app sign-out (Supabase SIGNED_OUT after a revoked refresh token: sign out everywhere, password reset, account deleted on the web), the app runs the sign-out wipe (wipeLocalData reason sign_out: geofences stopped, cache, quiet hours and own report ids cleared); a jest test covers it.
<!-- AC:END -->
