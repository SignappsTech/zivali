---
id: TASK-109
title: >-
  API tests: purge finished pg-boss jobs before the run so the shared local DB
  does not slow the job-drain tests
status: To Do
assignee: []
created_date: '2026-10-16 06:44'
labels:
  - tech
  - test
dependencies: []
priority: high
ordinal: 350000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On 2026-10-16 the shared local DB held 51,085 pgboss.job rows (50,628 completed, 48,159 of them notify.send), all residue of test runs: pg-boss maintenance never runs in tests. The job-drain tests (reports.write 'after the jobs are drained', webhooks mock provider end to end, matching.qa) query pgboss.job by data->>'report_id' (no index) and timed out at 30 s under load, failing most batch verifies. The lead deleted the completed rows by hand (567 left). Make it permanent: in apps/api/test/global-setup.ts delete completed/cancelled jobs (and failed older than a day) before the run, or scope the tests' job queries by name plus a created_on lower bound; keep it local-only (refuse on a non-local DATABASE_URL).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 global-setup purges finished pg-boss jobs on a local database only (guarded by host), with a test or a dry-run log line
- [ ] #2 The job-drain tests stay under 10 s each on a DB that held 50k completed jobs before the run
<!-- AC:END -->
