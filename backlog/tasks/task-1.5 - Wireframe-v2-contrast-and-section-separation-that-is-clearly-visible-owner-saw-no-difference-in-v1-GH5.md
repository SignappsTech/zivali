---
id: TASK-1.5
title: >-
  Wireframe v2: contrast and section separation that is clearly visible (owner
  saw no difference in v1, GH#5)
status: In Progress
assignee:
  - '@design-lead'
created_date: '2026-10-20 15:29'
updated_date: '2026-10-20 15:49'
labels:
  - design
  - 'est:S'
dependencies: []
references:
  - docs/design/wireframes/M-contrast-separation.html
  - docs/design/system.md
parent_task_id: TASK-1
priority: high
ordinal: 547200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner feedback 2026-10-20 on docs/design/wireframes/M-contrast-separation.html v1 (TASK-1.4): 'I see no difference in contrasts'. v1 kept every text pair (already AA) and only nudged dark surfaces (card 1.10:1 -> small step), so the change is invisible to the owner. Make v2 a clearly visible step: noticeably lighter card and section surfaces in dark (and clearer separation in light), visible 1 px edges, filled or boxed input fields that read as inputs at a glance, section dividers; show current and proposed side by side on the same screen (not only a toggle), in light and dark, at 390 and 1200 px, on home, a report-lost form step and report detail. Include the textarea decision (GH#3: keep 96 px as a boxed field). Keep WCAG AA. No implementation until the owner approves v2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 v2 in docs/design/wireframes/ shows current and proposed side by side so the difference is obvious at a glance, light and dark, 390 and 1200 px
- [x] #2 Contrast table for every changed pair (AA or better) and the token diff vs today
- [ ] #3 Owner approval (who, date, version) recorded before any implementation task starts
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Wireframe v2 (2026-10-20, design-lead): docs/design/wireframes/M-contrast-separation-v2.html (v1 file left as it was). Now (system v0.19) and Proposed side by side on every frame in light and dark at once, no switch: at-a-glance matrix of the five changes, then F1/F2 home 390/1200, F3 P6 step 3 filling in 390, F4 P6 error 1200, F5/F6 P9 visitor 390/1200, F7 component sheet; 4 panes each, scroll in step, numbered change markers on the proposed panes.
Bigger steps than v1: dark card night.650 #1E363C (1.10 -> 1.44:1 on the page), popover/muted/accent night.550 #2A474E (1.85:1), border night.500 (dark, 2.28:1 on page) and mist.350 #A6B5B8 (light, 2.07:1 on card), input mist.400 (dark), new field token (paper / night.800), dark primary lagoon.250 #90CCD2 (teal text keeps 7:1 on the lighter card), secondary lagoon.200 light (hover lagoon.250) and lagoon.700 dark (label lagoon.50, pressed lagoon.900), dark sidebar family lagoon.900/800 (closing band). Four new primitives. Contrast table of every changed pair computed in the page: 56 of 56 meet their minimum, all AA. Token diff listed. Six owner questions; rules for system.md v0.20 listed. No token or code change.
GH#3 (TASK-1.3): textarea stays 96 px as a boxed field (option b), shown in F7.
APPROVAL: WAITING FOR OWNER APPROVAL of v2. No person has approved this wireframe yet. Record who, the date and the version approved here when they do. No mockup or implementation task starts before that.
<!-- SECTION:NOTES:END -->
