---
id: TASK-114.29
title: >-
  Sync the i18n catalogue with the content slices after the CHANGE batch
  (2026-10-18)
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-18 21:08'
updated_date: '2026-10-18 21:11'
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
- [ ] #1 Every catalogue key named in the listed CHANGEs matches its slice in SL and EN; i18n check passes
- [ ] #2 Code passes {days} to lifecycle.close_body and report.owner_disagree; unit tests updated
- [ ] #3 Web and mobile render the new keys where the slices place them
<!-- AC:END -->
