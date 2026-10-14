---
id: TASK-10.2
title: >-
  Web i18n: next-intl with shared catalogues, localised pathnames, hreflang,
  switcher
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
  - TASK-10.1
  - TASK-3.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C16-i18n.md
  - docs/tech/contracts/C15-routes-deeplinks.md
parent_task_id: TASK-10
priority: high
ordinal: 136000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Public URLs must be language-aware with hreflang, and the choice must persist on device and profile (FR-036).

## Packet

Unblocks on: packages/i18n: ICU catalogues, key-parity and plural check, formatting helpers merged (TASK-10.1); Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3)
Design: none (no UI of its own)
Contracts: C16, C15 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-10.2-i18n-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 next-intl loads the @zivali/i18n catalogues and the pathnames table from C15 (SL unprefixed, EN under /en); every public page emits hreflang alternates.
- [ ] #2 useLocaleSwitch() moves to the same page in the other language and persists NEXT_LOCALE; for signed-in users the profile locale is updated and wins after sign-in.
- [ ] #3 Pages format dates, numbers and EUR through @zivali/i18n/format; a test renders the SL dual plural on a page.
<!-- AC:END -->
