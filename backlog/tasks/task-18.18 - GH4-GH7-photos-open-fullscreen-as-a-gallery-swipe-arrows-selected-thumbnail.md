---
id: TASK-18.18
title: >-
  GH#4 + GH#7: photos open fullscreen as a gallery (swipe, arrows, selected
  thumbnail)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:41'
updated_date: '2026-10-20 13:54'
labels:
  - fe
  - 'est:M'
  - no-design
dependencies: []
references:
  - docs/design/system.md
  - docs/tech/frontend.md
parent_task_id: TASK-18
priority: high
ordinal: 538200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GitHub #4 (owner) and #7 (tester), owner decision 2026-10-20: build straight from the #4 description, no wireframe (new component, not a rework). Clicking a photo on the report page opens it fullscreen; the whole set works as a gallery: swipe left/right on touch, left/right arrow buttons and keyboard arrows on the big image, Escape and a close button, the selected thumbnail highlighted, the image count shown. Use the existing design-system tokens and shadcn Dialog (focus trap, aria-modal, focus returns to the clicked thumbnail); no new dependency unless an allowlisted one fits. Reuse the same gallery wherever photos are shown read-only (report detail, pet profile, manage page) so #7 'nothing happens when clicking a photo' is fixed everywhere. Load full-size variants only when opened; keep the page's LCP image unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On the report page a click (or Enter) on any photo opens a fullscreen gallery at that photo; swipe, arrow buttons and keyboard arrows move between photos; the selected thumbnail is highlighted; Escape/close returns focus to the thumbnail
- [ ] #2 Accessible: dialog role, labelled buttons (≥44 px), visible focus, axe clean in light and dark, works at 390 and 1200 px
- [ ] #3 The same gallery opens from photos on the pet profile and the manage page; component tests cover open, next/previous, swipe and close
- [ ] #4 No extra image bytes before the gallery opens (full-size variants load on open)
<!-- AC:END -->
