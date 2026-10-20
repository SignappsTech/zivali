---
id: TASK-30.12
title: >-
  Main red: outbox retry re-uploads its photo and now gets a fresh row (201),
  breaking retry idempotency (after TASK-30.10)
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-20 13:49'
updated_date: '2026-10-20 13:57'
labels:
  - bug
  - be
  - 'est:S'
dependencies: []
references:
  - docs/tech/contracts/C5-photos-storage.md
  - docs/tech/backend.md
parent_task_id: TASK-30
priority: high
ordinal: 543200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After the TASK-30.10 merge (photo re-use: POST /v1/photos dedupes by (owner, sha256) only to a row another report can take, else creates a fresh pending row; unique (owner_id, sha256) dropped by migration 20261020132149), the full API suite has exactly 1 failure: test/routes/outbox.qa.routes.test.ts › 'outbox retry against the API (C17, C1) › a lost response and the full retry give one found report, the same manage token and the capture time': AssertionError expected 201 to be 200. The outbox retry re-uploads the same photo, which is now on the report the first (lost-response) attempt created, so upsertByHash (apps/api/domains/photos/photos.dao.ts ~23) makes a fresh row. Required: an outbox retry stays idempotent (C17/C1): exactly one found report, same manage token and capture time, no duplicate photo row or upload. Keep the owner rule that re-using a photo for a NEW report works (lost-pet-photos.routes.test.ts scenarios). Pick the smallest correct rule from how C17's outbox and the idempotency middleware actually work; only change the test's expectation if C17 allows a 201 on retry AND the end state (one report, one photo row, same token) is still asserted.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 outbox.qa.routes.test.ts passes unchanged, or with a changed expectation C17 allows while still asserting one report, one photo row and the same token
- [ ] #2 lost-pet-photos.routes.test.ts and photos.routes tests still pass (re-use for a new report works)
- [ ] #3 The full API suite passes in the Project Lead's merge verify
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Packet
Branch: agent/TASK-30.12-outbox-retry-photo
Rule (C17 §Outbox + C1 idempotency): the outbox uploads only photos not yet uploaded and resends the stored photo_ids, so the retry body (hash in the idempotency route) is unchanged and replays. The test re-registered an uploaded photo, which C17 does not do; POST /v1/photos cannot tell a retry from a re-pick for a new report (lost-pet-photos), so no server change. Test now models C17 and asserts one report, one photo row, same body/token, capture time. CH-699 (C5 §Client offline line). Not verified in apps/mobile (read limits): if lib/offline re-registers photos with uploaded=1, that client needs the fix.
<!-- SECTION:NOTES:END -->
