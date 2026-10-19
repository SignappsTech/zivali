---
id: TASK-117.1
title: 'Wireframe: report statistics view (approval gate)'
status: In Progress
assignee:
  - '@design-lead'
created_date: '2026-10-19 14:35'
labels:
  - design
  - wireframe
  - 'est:S'
dependencies: []
references:
  - docs/02-product-requirements.md
  - docs/03-design-specification.md
  - docs/design/system.md
  - docs/design/pages/P9-report-detail.md
parent_task_id: TASK-117
priority: medium
ordinal: 422200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Wireframe of the report statistics view (TASK-117, FR-026 R-026.6), web 1440 and mobile 390, in docs/design/wireframes/ (file name per the design lead's page id): where it opens from the owner's report page; totals (views, shares, alerts sent), per-day chart since creation with a table alternative, shares by channel (WhatsApp, Facebook, copy link, native sheet, poster download), alerts by channel (push, email, in-app) with Boost reach marked; the note that on-device proximity alerts are not counted; the free owner's single quiet Premium link (no pop-up); the locked state after a lapse; the organisation portal variant (free, no upgrade prompt). Real labels from FR-026 until the content slice exists.

**Gate (owner rule 2026-10-16):** a wireframe confirmed by a person (the owner, or someone they name) comes first. Low-fidelity (layout, sections, order, content blocks; grey boxes, real labels) or a mock from our real components, whichever is less or equal work; HTML in docs/design/wireframes/. Record the approval in this task's notes (who, date, version approved). No mockup or implementation task for the statistics view starts before it.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The statistics view wireframe (desktop and mobile, owner and organisation variants) is in docs/design/wireframes/ and linked from this task, with the data each block needs
- [ ] #2 A person approved it; their name, the date and the approved version are in this task's notes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Wireframe v1 (2026-10-19): awaiting the owner's approval

- File: docs/design/wireframes/P25-report-statistics.html (page id P25 proposed; P24 is the Premium plan page, TASK-54.1).
- Web only. Desktop 1200 (per the lead's brief; at 1440 the same column stays centred) and Mobile 390 (web at phone width). Slovenian copy in the frames: FR-026 labels where named ("Statistika s Premium", channel names), the rest proposals (dotted underline); the "Kako štejemo?" text is a privacy claim (wavy: owner and lawyer confirm).
- Frames: F1 entry on the P9 owner view (Premium: row with the totals; free: the one quiet link), F2 Premium view (chart, table alternative, "Kako štejemo?"), F3 locked (free preview, after a lapse), F4 organisation portal (no entitlement, no upgrade prompt), F5 new report, older than counting, loading, error.
- "Blocks and the data each one needs" table in the file: per-block data for the statistics C-contract (CH-636).
- Open questions at the top of the file: 1 free owner: locked preview or straight to the plan page (rec. locked preview, same screen as the lapse); 2 Premium entry as a row with totals (rec.); 3 one chart with a switch (rec.); 4 weekly bars after 60 days (rec.); 5 no numbers after a lapse (rec.); 6 link to the search plan heatmap, TASK-83 (rec.); 7 portal per report only for now (rec.).
- Approval: NOT recorded. The owner (or a person they name) records who, date and version here. No mockup or implementation task for the statistics view before that.
- After approval (design lead): add P25 to 03 §Page inventory and write docs/design/pages/P25-report-statistics.md (rules section of the wireframe). CHANGEs to file then: content strategist (P25 copy slice from the wireframe's Copy table; the P9 copy slice has no statistics labels yet although CH-640 is done) and tech lead (route /r/<code>/statistika, noindex, 404 for others; contract fields: access state, counting_since, boosts[], per-channel Boost split, delivery vs person count).
<!-- SECTION:NOTES:END -->
