---
id: TASK-36.9
title: >-
  Web AdSlot: AdUnit throws 'window is not defined' during streamed SSR (every
  slot)
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 09:16'
updated_date: '2026-10-16 09:45'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-36
ordinal: 355000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Linked to TASK-36 AC#3/AC#5 (no layout shift, silent behaviour) and the 'never on SSR' rule. Steps: renderToPipeableStream(<AdSlot slot=X/>) in node env with onAllReady (apps/web/components/ads/ad-slot.ssr.test.tsx, it.fails until fixed). Expected: no onError. Actual: ReferenceError window is not defined from useState(() => window.matchMedia?...) in apps/web/components/ads/ad-unit.tsx, for all four slots; Fizz drops to client rendering for the boundary and logs the error on every page with a slot (the existing renderToString test only sees the Suspense fallback so misses it). Severity: medium (no visible break, but error noise, lost SSR box and possible shift). Fix: guard typeof window, then flip it.fails to it in that test.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 AdUnit renders on the server without an error: no window access in render or state initialisers (read matchMedia in an effect), so the reserved box is server-rendered and the boundary does not fall back to client rendering
<!-- AC:END -->

Branch: agent/task-36.9-adunit-ssr
