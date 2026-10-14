---
id: TASK-5.2
title: 'EAS build profiles, mobile env per environment, Firebase config as secrets'
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
labels:
  - tech
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-3.4
references:
  - docs/tech/frontend.md
  - docs/tech/adr/016-environments-hosting-cicd.md
parent_task_id: TASK-5
priority: medium
ordinal: 120000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile builds need development, preview and production profiles; the Expo token exists so Android preview builds can start now, iOS waits for Q-007.

## Packet

Unblocks on: Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4)
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-5.2-eas
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 eas.json has development, preview (internal distribution, Android APK) and production (no submit) profiles with EXPO_PUBLIC_* values per profile.
- [ ] #2 Firebase config files are supplied as EAS file secrets (GOOGLE_SERVICES_JSON, GOOGLE_SERVICE_INFO_PLIST) and read from .secrets/ for local builds; they are never committed.
- [ ] #3 An Android preview build pointing at the staging Supabase project succeeds with the existing EXPO_TOKEN and installs on a device or emulator; iOS builds are documented as blocked by Q-007.
- [ ] #4 EAS Update channels per profile are configured or explicitly documented as off.
<!-- AC:END -->
