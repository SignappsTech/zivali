---
id: TASK-1.1
title: 'Tokens pipeline: packages/tokens generated from docs/design/tokens.json'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:11'
updated_date: '2026-10-14 23:11'
labels:
  - tech
  - 'est:S'
milestone: m-0
dependencies: []
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C2-design-tokens.md
  - docs/design/system.md
parent_task_id: TASK-1
priority: high
ordinal: 111000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Web (shadcn, Tailwind 4) and mobile (RN Reusables, NativeWind 4) must be themed from the one token file the design lead owns. This package generates every platform output and enforces contrast, so a token change reaches both apps without component edits (ADR-002).

## Packet

Unblocks on: nothing (ready now)
Contracts: C2 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-1.1-tokens
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 `pnpm --filter @zivali/tokens build` reads docs/design/tokens.json (single theme, v0.2.0) and writes dist/tokens.css, web.css, native.css, tailwind-preset.cjs, values.ts and map-style.ts with the package exports listed in contract C2.
- [x] #2 Every declared contrast pair is checked in light and dark; a pair below its minimum or pointing at a missing token fails the build with the pair, ratio and minimum in the message (test with a failing fixture).
- [x] #3 An unexpected tokens.json shape fails with the offending JSON path; snapshot tests cover the generated CSS and preset.
- [x] #4 The Tailwind 3.4 preset nests shadcn pairs (primary.DEFAULT, primary.foreground) and exposes app tokens flat; web.css maps every semantic token to --color-<token> inside @theme inline for Tailwind 4; tokens.css has :root, .light and .dark.
- [x] #5 buildMapStyle('light'|'dark') returns a MapLibre style based on OpenFreeMap positron with the map-* tokens and the calm layer set of docs/design/system.md §9 (structural test on layer ids and paint colours).
- [x] #6 The package has no runtime dependencies, builds with plain `node build.mjs` on Node 22, and its README explains outputs and how the design lead regenerates after editing tokens.json.
<!-- AC:END -->
