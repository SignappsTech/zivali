---
id: TASK-10.3
title: >-
  Mobile i18n: use-intl with shared catalogues, SL plural support, persisted
  choice
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 04:45'
labels:
  - fe
  - 'est:S'
  - no-design
milestone: m-0
dependencies:
  - TASK-10.1
  - TASK-3.4
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C16-i18n.md
parent_task_id: TASK-10
priority: high
ordinal: 137000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The app must switch between SL and EN with correct Slovenian plurals on Hermes and keep the choice (FR-036).

## Packet

Unblocks on: packages/i18n: ICU catalogues, key-parity and plural check, formatting helpers merged (TASK-10.1); Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4)
Design: none (no UI of its own)
Contracts: C16 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-10.3-i18n-mob
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 use-intl loads the @zivali/i18n catalogues; the default is SL unless the stored choice, the profile or an en* device language says otherwise.
- [ ] #2 Intl.PluralRules support for 'sl' is checked at startup and the @formatjs polyfill loads only if missing; a test renders the 1, 2, 3 and 5 forms correctly.
- [ ] #3 setLocale() switches the UI immediately and persists locally and, when signed in, to the profile.
<!-- AC:END -->
