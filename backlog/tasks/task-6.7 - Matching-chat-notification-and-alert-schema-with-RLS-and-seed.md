---
id: TASK-6.7
title: 'Matching, chat, notification and alert models with seed'
status: Done
assignee:
  - '@backend-dev'
created_date: '2026-10-14 22:12'
updated_date: '2026-10-15 13:31'
labels:
  - be
  - 'est:S'
milestone: m-0
dependencies:
  - TASK-6.6
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C8-matching.md
  - docs/tech/contracts/C9-chat.md
  - docs/tech/contracts/C10-notifications-alerts.md
parent_task_id: TASK-6
priority: high
ordinal: 127000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Match review, chat, notifications and alerts build in parallel against agreed tables and seeded rows.

## Packet

Unblocks on: Reports, pets and photos models, deterministic fuzz, public report endpoint, seed merged (TASK-6.6)
Contracts: C8, C9, C10 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-6.7-collab-schema
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Prisma models matches, match_feedback, conversations, conversation_participants, messages, blocks, notifications, notification_prefs, push_tokens, alert_subscriptions, alert_deliveries and email_outbox per C8–C10 (GiST on alert centres), with RLS enabled and data-inventory entries.
- [x] #2 Seeder 20-collab creates suggested and confirmed matches, one conversation with messages, notifications and alert subscriptions for fixture users.
- [x] #3 The ADR-021 security tests stay green.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Migration 20261015090920_task_6_7_collab. FKs to reports (matches.lost/other_report_id, conversations.*_report_id, alert_deliveries.report_id) and alert_subscriptions.species -> SPECIES[] are a follow-up migration once TASK-6.6 merges (steps in the migration header). Seeder 20-collab reads reports by C4 columns via SQL; verified against TASK-6.6's schema and seed (2 pairs, idempotent); its runIf test runs once reports exist.
<!-- SECTION:NOTES:END -->

### Review fixes (round 2)
- Merged main (TASK-88.2, 9.2, 6.3); data-inventory.json and seeders/README.md keep both blocks. Migration timestamp unchanged.
- email_outbox retention set to 90 d (the purge job itself is not built here).
- alert_subscriptions_species_check now rejects NULL and '{}'; the column stays nullable (Prisma list columns are); test: apps/api/test/security/alert-species-check.test.ts.
- Migration follow-up note points at TASK-6.16 (report FKs, ON DELETE CASCADE).
- CH-136: packages/types and validation: dropped 'you' (SENDER_ALIAS_KEYS/SenderAliasKey), sender_alias_key is AliasKey, ConversationSummary has my_alias_key (C9 1.2).
- Scratch DB task_6_7 recreated (edited migration checksum), migrate deploy ok, migrate diff empty. users.seeder.test.ts fails on scratch DBs (auth.mfa_factors missing): environmental.
