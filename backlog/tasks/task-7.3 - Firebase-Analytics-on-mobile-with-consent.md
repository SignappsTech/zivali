---
id: TASK-7.3
title: Firebase Analytics on mobile with consent
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-0
dependencies:
  - TASK-7.1
  - TASK-12.2
  - TASK-5.2
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C12-analytics-consent.md
parent_task_id: TASK-7
priority: high
ordinal: 140000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Mobile analytics must use the same taxonomy in the same GA4 property and stay off until consent; the Firebase project zivali-bb123 config exists in .secrets/.

## Packet

Unblocks on: packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Mobile shell: tabs, Report action, permission primer, settings stack merged (TASK-12.2); EAS build profiles, mobile env per environment, Firebase config as secrets merged (TASK-5.2)
Design: none (no UI of its own)
Contracts: C12 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-7.3-analytics-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 @react-native-firebase/app and analytics are configured through the config plugin with firebase.json defaults (auto collection off, all consent signals denied) and config files from .secrets/ or EAS secrets.
- [ ] #2 On grant setConsent and collection are enabled; on withdraw both are reversed immediately; screen_view uses Expo Router path templates (mounted in the shell root layout).
- [ ] #3 With EXPO_PUBLIC_ANALYTICS_PROVIDER=mock or without Firebase config the app builds and uses the mock adapter.
- [ ] #4 Events are verified in GA4 DebugView from an Android development build (screenshot), or the task reports needs-input naming the missing access (Q-009).
<!-- AC:END -->
