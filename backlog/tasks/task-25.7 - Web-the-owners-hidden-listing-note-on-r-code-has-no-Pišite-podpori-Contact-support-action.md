---
id: TASK-25.7
title: >-
  Web: the owner's hidden-listing note on /r/[code] has no "Pišite podpori"
  (Contact support) action
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 20:13'
updated_date: '2026-10-19 20:16'
labels:
  - bug
  - 'est:XS'
  - web
milestone: m-1
dependencies: []
references:
  - docs/design/pages/P10-report-abuse.md
  - docs/content/pages/P9-report-detail.md
parent_task_id: TASK-25
priority: low
ordinal: 452200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by QA TASK-25.6 (web only), main c2040993, live najdimo.si 1ce206002ec1 (no abuse/slot diff vs main).

Steps: as the manager of a listing that 3 weighted abuse reports auto-hid (C11 auto-hide, moderation_state hidden), open /r/<code> (or /en/r/<code>). Code: apps/web/components/report/slots/matches-note.tsx renders the hidden variant.
Expected: P10 §States "Listing hidden after three reports: owner sees a note on the detail page and in the inbox that the listing is under review, with a text button 'Contact support'"; P9 content slice keys report.owner_hidden + report.owner_hidden_contact ("Pišite podpori" / "Contact support").
Actual: the note shows report.owner_hidden only; report.owner_hidden_contact is in the catalogues but used nowhere in apps/web, so an owner hit by malicious mass reports has no path to support from the page. The /my-reports under-review note has no support action either.
Severity: Low (owner is told; the action is missing). Not visible live to QA (no hidden listing and no owner session); confirmed from code.

## Packet

Unblocks on: - (ready now)
Branch: agent/TASK-25.7-hidden-note-support
Review: local
Files: apps/web/components/report/slots/matches-note.tsx, its test in apps/web/components/matches/match-review.test.tsx (or a new matches-note.test.tsx); SUPPORT_EMAIL from apps/web/components/content/article.tsx
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When the signed-in manager opens their listing that abuse reports hid (moderation_state hidden), the P9 matches-note shows report.owner_hidden plus a text button report.owner_hidden_contact ("Pišite podpori" / "Contact support") that opens mailto:podpora@najdimo.si (SUPPORT_EMAIL), SL and EN.
- [ ] #2 A unit test covers the hidden variant of MatchesNote (text and the support action); today only the held variant is tested (match-review.test.tsx).
<!-- AC:END -->
