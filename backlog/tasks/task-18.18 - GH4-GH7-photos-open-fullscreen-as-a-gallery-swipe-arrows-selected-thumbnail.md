---
id: TASK-18.18
title: >-
  GH#4 + GH#7: photos open fullscreen as a gallery (swipe, arrows, selected
  thumbnail)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-20 13:41'
updated_date: '2026-10-20 14:12'
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
- [x] #1 On the report page a click (or Enter) on any photo opens a fullscreen gallery at that photo; swipe, arrow buttons and keyboard arrows move between photos; the selected thumbnail is highlighted; Escape/close returns focus to the thumbnail
- [ ] #2 Accessible: dialog role, labelled buttons (≥44 px), visible focus, axe clean in light and dark, works at 390 and 1200 px
- [x] #3 The same gallery opens from photos on the pet profile and the manage page; component tests cover open, next/previous, swipe and close
- [x] #4 No extra image bytes before the gallery opens (full-size variants load on open)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
CHANGE requests (not written to main backlog/changes.md: the run's rule 8 forbids main-checkout edits):
| - | - | docs/content/pages/P9-report-detail.md§Gallery | New client keys report.photo_open (SL 'Odpri čez cel zaslon' / EN 'Open full screen', hidden label after the photo's alt on the photo buttons) and report.photos_title (SL 'Fotografije' / EN 'Photos', the fullscreen gallery dialog's hidden title); drafts, please confirm | TASK-18.18 | open |
| - | - | docs/design/system.md§10.9 Gallery | Add the fullscreen gallery as built: opaque background surface, sr-only title, count + 44 px ghost close top bar, photo whole (contain), secondary 44 px prev/next over it, the 88x72 thumbs strip below (selected at 100 %, others 55 %), swipe + arrow keys; the photo, each thumb and pet/manage photos open it | TASK-18.18 | open |
| - | - | docs/tech/frontend.md§Repo map | components/photos/lightbox.tsx: Lightbox (controlled, index null = closed), Thumbs, PhotoFailed, openPhotoClass; used by report/gallery.tsx, pets/pet-detail.tsx, manage/manage-view.tsx | TASK-18.18 | open |
AC #2: axe light/dark and 390/1200 px not run here (no browser/Playwright allowed); DOM checks in lightbox.test.tsx cover dialog role, aria-modal, names, size-11 buttons, focus return.
<!-- SECTION:NOTES:END -->

## Packet

Branch: agent/TASK-18.18-photo-gallery
