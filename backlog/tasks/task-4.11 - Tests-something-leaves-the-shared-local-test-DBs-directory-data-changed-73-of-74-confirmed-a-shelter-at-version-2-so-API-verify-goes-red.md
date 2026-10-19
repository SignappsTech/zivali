---
id: TASK-4.11
title: >-
  Tests: something leaves the shared local test DB's directory data changed (73
  of 74 confirmed, a shelter at version 2), so API verify goes red
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-19 21:51'
updated_date: '2026-10-19 22:09'
labels:
  - bug
  - 'est:S'
  - tech
dependencies: []
references:
  - apps/api/test/global-setup.ts
parent_task_id: TASK-4
priority: medium
ordinal: 474200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Seen 2026-10-19 night: after the content batch invalidated turbo's api test cache, 13 directory tests failed on main against the shared DB (seeder expects 74 confirmed, finds 73; idempotency and import dry runs see a change). The lead switched the merge chain to a fresh scratch DB (task_verify_main) as a workaround. Not a product bug.

## Packet
Unblocks on: -
Branch: agent/task-4.11-verify-scratch-db
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Find the test or script that left app.municipality_shelters / app.shelters changed in the shared local DB (127.0.0.1:55322/postgres) on 2026-10-19 and make it clean up (or run in its own transaction)
- [ ] #2 pnpm verify (and merge.mjs) runs the API suites on a fresh scratch DB by default (e.g. TEST_DATABASE_URL task_verify_<n>, dropped before each run), so shared-DB drift can't turn main red
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-19 night (lead): cause found. apps/api/test/seeders/seed.test.ts beforeAll (l.76-80) sets the ljubljana shelter phone +38610000000 and v2 and the ljubljana assignment UNCONFIRMED v2; afterAll (l.106-115) restores a COPY of the live row (l.73) and deletes every v2 shelter change. Two overlapping runs on the shared DB (the lead ran an API suite next to a merge recheck) made the drift permanent. Restored by hand (2 targeted UPDATEs on the local DB). Fix: restore from the seed CSV values, not a live copy; and keep one API suite per shared DB at a time (verify lock) or move verify to a scratch DB that has the auth schema.
<!-- SECTION:NOTES:END -->
