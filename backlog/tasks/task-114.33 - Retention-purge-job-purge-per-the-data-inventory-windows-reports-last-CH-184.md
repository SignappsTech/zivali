---
id: TASK-114.33
title: >-
  Retention purge job: purge per the data-inventory windows, reports last
  (CH-184)
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-18 22:06'
updated_date: '2026-10-19 18:49'
labels:
  - be
  - 'est:M'
  - no-design
dependencies: []
references:
  - docs/tech/backend.md
  - docs/05-quality-security-plan.md
  - docs/tech/contracts/C4-reports-and-pets.md
parent_task_id: TASK-114
priority: medium
ordinal: 395200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
apps/api/jobs/retention.purge.job.ts purges rate limits, idempotency keys, chats, photos and device hashes, but not the rest of the data-inventory windows. Add them. Delete reports last: only after their conversations' 6-month window, because matches, conversations and alert_deliveries now cascade from reports (TASK-6.16).

## Packet

Unblocks on: nothing open (TASK-6.16, TASK-26.7 merged). Windows come from the data inventory in docs/05 section Security, privacy and compliance; ask the lead for any window the lawyer has not confirmed.
Review: tech-lead code review; run pnpm verify before reporting done.
Branch: agent/task-114.33-retention-purge
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 retention.purge purges every record class of the data inventory at its window (windows in app_config where a key exists); each class is idempotent, batched, and logs counts only.
- [ ] #2 Reports are deleted last, only once their conversations are past the 6-month read-only window; tests with a faked clock check cascade order (matches, conversations, alert_deliveries go with the report) and that nothing younger is touched.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
From the TASK-40.1 review: the purge must also own app.ai_calls (62 days) and app.ai_results (by photo hash, per data-inventory.json).

CHANGE rows for backlog/changes.md (the agent's worktree isolation blocked writing the main inbox; lead, please move them):

| - | - | docs/05-quality-security-plan.md§Data inventory (reports) + docs/content/legal/privacy-policy.md§14 | No deletion window for a closed or reunited report row is defined (inventory, contracts and policy §14 cover only its photos 12 months, chats 6 months, point blur 30 days). TASK-114.33 deletes reports last, once no conversation refers to them, only while app_config `retention.report_months` is set; unset = every report is kept. Decide N (proposal: 12, after the photo window), then add the key default in a migration and a §14 row | TASK-114.33 | open |
| - | - | docs/05-quality-security-plan.md§Data inventory (email_outbox) | data-inventory.json said email_outbox 90 d; privacy policy v0.8 §14 promises "Email delivery log: 30 days". TASK-114.33 purges at 30 days and updated data-inventory.json; align the master inventory (or say 90 and fix §14) | TASK-114.33 | open |
| - | - | docs/tech/contracts/C11-abuse-moderation.md§Models (abuse_reports) | abuse_reports retention is "12 months after resolution", but the model stores no resolution time (status only), so retention.purge cannot purge without deleting inside the window. Add `resolved_at timestamptz null` (set on dismiss/action), then the purge follows; until then abuse reports are kept | TASK-114.33 | open |
| - | - | docs/content/legal/privacy-policy.md§14 (Partner enquiries) | §14 keeps leads "24 months after the last contact", but leads store no last-contact time; retention.purge deletes them 24 months after creation (data-inventory.json). Reword §14 to "24 months after the enquiry" or add a last-contact column | TASK-114.33 | open |
| - | - | docs/tech/contracts/C1-platform-conventions.md§Jobs | retention.purge as built (TASK-114.33): payload `{ dry_run: true }` runs every step in a rolled-back transaction and logs exact counts (a non-boolean dry_run fails the job); every class deletes in batches of 500 (lib/purge.ts), its window re-checked on delete; order: rate limits, idempotency keys, chats, photos, device hashes, AI, email_outbox 30 d, partner_stats_snapshot 90 d, leads 24 months, resolved moderation_flags 12 months, reports last (retention.report_months). Not purged: audit_log (CH-153), abuse_reports (no resolved_at), payments and invoices (10 years, Q-012) | TASK-114.33 | open |
<!-- SECTION:NOTES:END -->
