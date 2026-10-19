---
id: TASK-18.10
title: >-
  Web /r/[code]: the detail ad's CTA runs 69-108 px past the viewport at 200%
  text (390 and 320 px)
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:19'
labels:
  - bug
  - 'est:S'
  - web
  - a11y
milestone: m-1
dependencies: []
parent_task_id: TASK-18
priority: medium
ordinal: 455200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: live najdimo.si (1ce206002ec1), Playwright Chromium and WebKit, viewport 390x844 and 320x844, add style html { font-size: 200% !important } (as apps/web/e2e/large-text.spec.ts), open /r/WD8k8UgN or /r/zvsmkB5v, then window.scrollTo(2000, 0).
Expected: no sideways scroll (WCAG 1.4.4, 1.4.10; DoD 320 px and 200% text).
Actual: the page scrolls sideways 69-108 px at 390 px and 129-178 px at 320 px. The only unclipped element past the edge is the house ad's CTA span (ad-view.tsx buttonClass 'inline-flex min-h-11 items-center -ml-3 px-3 ...', e.g. 'Več o oglaševanju', 'Poiščite zavetišče', 'Podprite nas'), left 272 px, right 449-498 px, inside a[aria-label^='Oglas:']. At 100% text no overflow. Header and the report action buttons fit (TASK-18.8 holds); e2e large-text.spec misses this because no ad renders there.
Hint: in the inline variant the rem-sized image box (size-24 = 192 px at 200%) plus p-4 and gap-4 leave ~60 px for the text column; the title/body clamp, the CTA does not.
Severity: minor.

## Packet

Unblocks on: -
Branch: agent/task-18.10-ad-200-text from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 At 390 and 320 px with root text at 200%, /r/<code> with the inline (detail) ad has no horizontal page scroll in Chromium and WebKit: the ad's CTA wraps or the image/text stack
<!-- AC:END -->
Branch: agent/task-18.10-r-200-text
