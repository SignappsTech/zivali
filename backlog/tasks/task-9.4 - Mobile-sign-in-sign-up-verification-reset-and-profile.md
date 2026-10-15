---
id: TASK-9.4
title: 'Mobile sign-in, sign-up, verification, reset and profile'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 15:37'
labels:
  - fe
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-12.2
  - TASK-6.9
  - TASK-9.1
  - TASK-12.5
references:
  - docs/tech/frontend.md
  - docs/design/pages/P16-auth.md
  - docs/tech/contracts/C3-auth-profiles-roles.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-9
priority: high
ordinal: 144000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The same account works on mobile with native Google/Apple when configured and email otherwise (FR-001).

## Packet

Unblocks on: Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); Contract clients in @zivali/api: auth, profiles, pets, reports, photos, geocode, matches merged (TASK-6.9); Design: Sign in, account creation and gates (P16) approved (TASK-9.1); Mobile local data layer merged (TASK-12.5)
Design: P16 docs/design/pages/P16-auth.md (mockup docs/design/mockups/P16-auth.html; TASK-9.1)
Copy: docs/content/pages/P16-auth.md
Contracts: C3, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-9.4-auth-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sign up, sign in, verify-email prompt, password reset and sign-out work in the app in SL and EN per P16; the session persists across restarts.
- [x] #2 Google (native ID token) and Apple (iOS) sign-in use signInWithIdToken when client ids are configured, otherwise the buttons are hidden; email confirmation and reset links deep-link back into the app.
- [x] #3 The contextual sign-in gate (bottom sheet) keeps the user's draft and returns them to the flow.
- [x] #4 The profile screen edits name, language, home area, alert radius and optional phone.
- [ ] #5 TalkBack labels, focus order and 44 px targets are verified on Android (screenshots).
- [ ] #6 Sign-out (and account deletion) call signOutAndWipe() from the local data layer (C17): pending outbox items are offered first, then cache, drafts and geofences are wiped.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Branch agent/task-9.4-auth-mob. Mobile auth: app/auth/{sign-in,sign-up,check-email,forgot-password,new-password,callback}, AuthGate sheet (components/auth/gate.tsx), account + home-area settings. AC5 (TalkBack screenshots on an Android device) and the AC6 pending-outbox prompt (TASK-86.2) / account deletion (M3, FR-034) remain; sign-out already calls signOutAndWipe(). Google needs a dev build with the new native module and EXPO_PUBLIC_GOOGLE_* set; Apple behind EXPO_PUBLIC_APPLE_SIGN_IN=false.
<!-- SECTION:NOTES:END -->
