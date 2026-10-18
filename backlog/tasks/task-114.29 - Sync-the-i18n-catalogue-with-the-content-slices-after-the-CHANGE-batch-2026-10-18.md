---
id: TASK-114.29
title: >-
  Sync the i18n catalogue with the content slices after the CHANGE batch
  (2026-10-18)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:08'
updated_date: '2026-10-18 21:38'
labels:
  - fe
  - 'est:S'
  - no-design
dependencies: []
references:
  - docs/content/glossary.md
parent_task_id: TASK-114
priority: medium
ordinal: 369200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The content strategist's CHANGE batch (merge a6de0812, commit 6f7dc6c0) changed slice copy that the code catalogue (packages/i18n/messages/{sl,en}) doesn't match yet. Bring the catalogue and the code that uses it in line with the slices, for these points from the batch report: (1) CH-150: header label short 'Moje živali', new key nav.my_pets_reports_full for the long form; (2) CH-261: 'Objava'/'Listing' become the glossary's 'Prijava'/'Report'; (3) CH-166: new key location.no_results_list; (4) the reopen window in lifecycle.close_body and report.owner_disagree now takes a {days} parameter (pass the configured window); (5) CH-308a: the public collar value is 'opisana'; (6) CH-254/CH-264: 'Podpora za Najdimo'; (7) CH-343: the 'mistake' close reason maps to other; (8) CH-344: the row reuses report.since_{type}. Use git show 6f7dc6c0 to see exactly what changed in docs/content. Web and mobile both use the catalogue: check both. Flag (don't decide) CH-318: the slice and the catalogue disagree on whether the clear-offline dialog mentions drafts.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every catalogue key named in the listed CHANGEs matches its slice in SL and EN; i18n check passes
- [ ] #2 Code passes {days} to lifecycle.close_body and report.owner_disagree; unit tests updated
- [ ] #3 Web and mobile render the new keys where the slices place them
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Packet
Branch: agent/TASK-114.29-content-sync

AC2: close_body gets {days: REOPEN_DAYS} on web and mobile. report.owner_disagree has no consumer on web or mobile (only the catalogue takes {days}), so the {days} part of AC2 applies when the owner-disagree banner is built. AC3: nav.my_pets_reports_full (menu sheet), report.collar_described, report.contact_limited and report_found.resend_done_manager render. location.no_results_list is in the catalogue but has no placement: the mobile home area uses the map picker since TASK-23.3 (CHANGE filed on main, backlog/changes.md). The account menu has no my-pets row, so the full label shows only in the menu sheet. AC2 and AC3 are left unticked for those gaps.
<!-- SECTION:NOTES:END -->
