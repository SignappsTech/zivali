---
id: TASK-3.4
title: >-
  Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables,
  tokens, dev build
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:11'
updated_date: '2026-10-15 04:39'
labels:
  - tech
  - 'est:M'
milestone: m-0
dependencies:
  - TASK-3.1
  - TASK-1.1
  - TASK-3.8
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C2-design-tokens.md
  - docs/tech/contracts/C15-routes-deeplinks.md
  - docs/tech/contracts/C16-i18n.md
parent_task_id: TASK-3
priority: high
ordinal: 115000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
All mobile stories need one Expo app with the token theme, routing, Supabase session storage and test runners; MapLibre and Firebase require development builds.

## Packet

Unblocks on: Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1); Tokens pipeline: packages/tokens generated from docs/design/tokens.json merged (TASK-1.1); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8)
Contracts: C2, C15, C16 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-3.4-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 apps/mobile (Expo SDK 57, Expo Router, TypeScript strict, New Architecture) starts with `pnpm --filter mobile start` and an Android development build installs and opens (EAS cloud with the existing EXPO_TOKEN, or a local build).
- [ ] #2 NativeWind 4.2 with Tailwind 3.4 uses the @zivali/tokens tailwind preset and native.css; React Native Reusables is initialised; brand fonts load through @expo-google-fonts; light and dark follow the OS.
- [ ] #3 app.config.ts sets the working app name, bundle id and Android package si.signapps.zivali, scheme zivali and expo-dev-client; eas.json has development and preview profiles with no submit.
- [ ] #4 lib/supabase uses supabase-js with expo-sqlite localStorage, lib/env validates EXPO_PUBLIC_* variables with zod, and the root layout provides use-intl with a placeholder catalogue; TanStack Query is not used (RTK Query is the client, ADR-020): the Redux store Provider and generated api come with the mobile RTK follow-up (TASK-3.13) and the scaffold leaves a TODO where the Provider goes.
- [ ] #5 jest-expo with Testing Library runs one component test; `tsc` and `expo export --platform android` pass; Metro resolves @zivali/* workspace packages.
<!-- AC:END -->
