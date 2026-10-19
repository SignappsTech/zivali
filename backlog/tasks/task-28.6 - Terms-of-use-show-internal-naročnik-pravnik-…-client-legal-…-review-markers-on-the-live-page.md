---
id: TASK-28.6
title: >-
  Terms of use show internal [naročnik/pravnik: …] / [client/legal: …] review
  markers on the live page
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-19 20:25'
labels:
  - bug
  - 'est:XS'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-28
priority: medium
ordinal: 461200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: live najdimo.si (/api/health ee189f86e027), open /pogoji-uporabe and /en/terms, search the page text for "[naročnik" / "[client".
Expected: no internal review markers on the live pages, as for privacy 0.8 (owner decision 2026-10-19); the master docs/content/legal/terms-of-use.md keeps them for the lawyer pack. The page-level draft note already says the text needs review.
Actual: three markers render as body text in both languages (source apps/web/content/legal/{sl,en}/terms.mdx):
- §7 Finders: "[naročnik/pravnik: Q-006 – potrditi pravila o najdenih živalih in rokih hrambe.]" / "[client/legal: Q-006 – confirm the rules on found animals and holding periods.]"
- §10 Paid options: "[naročnik/pravnik: preveriti pravico potrošnika do odstopa od pogodbe (14 dni) ...]" / "[client/legal: check the consumer right of withdrawal (14 days) ...]"
- §17 Disputes: "[naročnik/pravnik: določiti izvajalca po ZIsRPS ...]" / "[client/legal: name the provider under ZIsRPS ...]"
The other nine legal pages show no markers. Lawyer review itself is TASK-40.6 (LQ items), not this bug.
Severity: medium (internal notes shown publicly on the production domain).

## Packet

Unblocks on: -
Branch: agent/task-28.6-terms-markers from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /pogoji-uporabe and /en/terms on main render no [naročnik…], [client…], [pravni pregled] or [legal review] markers; the rest of the text is unchanged and the master keeps its markers
<!-- AC:END -->
