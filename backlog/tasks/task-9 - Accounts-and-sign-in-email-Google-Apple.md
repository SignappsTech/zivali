---
id: TASK-9
title: 'Accounts and sign-in (email, Google, Apple)'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:FR-001'
milestone: m-0
dependencies:
  - TASK-6
  - TASK-8
priority: high
ordinal: 9000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owners and shelter staff need an account for alerts, chat and pet profiles, but sign-up must stay quick for people in a hurry and the same session must work on web and mobile.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a visitor, when they register with email and password or sign in with Google or Apple, then an account and profile are created and they are signed in on web and mobile.
- [ ] #2 Given a new email account, when registered, then email verification is required before alerts or chat but not before saving a report draft.
- [ ] #3 Given a signed-in user, when they edit their profile, then name, language (SL or EN), home area, default alert radius and optional phone can be saved and the phone is never shown publicly.
- [ ] #4 Given the roles user, shelter_member, moderator and admin, when a request is made, then RLS and route guards enforce them and a test proves a user cannot read another profile.
- [ ] #5 Given a forgotten password, when the user requests a reset, then a localised email link resets it and repeated requests are rate limited.
- [ ] #6 Given the auth screens, when used with keyboard and screen reader, then they meet WCAG 2.2 AA.
<!-- AC:END -->

## Packet

Unblocks on: profiles and roles contract plus useSession helper merged (TASK-6); form primitives Input, Button, FormField (TASK-8)
