---
id: TASK-62
title: Moderation queue and user management
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:05'
updated_date: '2026-10-14 23:08'
labels:
  - story
  - 'req:FR-018'
  - 'req:FR-019'
milestone: m-3
dependencies:
  - TASK-34
  - TASK-25
priority: high
ordinal: 62000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Without a queue, abuse reports pile up and scams stay visible; moderators need one place to review, decide and act.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given abuse reports, when a moderator opens the queue, then items are ordered by age and severity with the target (listing, image, message, user), reasons, reporter count and history.
- [ ] #2 Given an item, when reviewed, then the moderator can dismiss, hide or remove content with a reason, warn, suspend or ban the user, the target is notified and every action is audit-logged and reversible.
- [ ] #3 Given a suspended user, when they sign in, then they see the reason and cannot post or message and their listings are hidden.
- [ ] #4 Given items older than 24 h, when listed, then they are highlighted (target: 90 percent reviewed within 24 h).
- [ ] #5 Given an admin lookup of a user or listing, when searched, then status and actions taken are visible, and private chats only if they were reported.
- [ ] #6 Given listings or chat messages offering to sell or give away animals (such as podarim or prodam), when reported or detected, then moderators can remove them and the account is warned.
- [ ] #7 From the TASK-25.5 review: AbuseDomain.restoreReport (apps/api/domains/abuse) has no aal2 check of its own. The restore route must sit behind the moderator + aal2 guard (or the domain must check ctx.actor.aal), with a test that an aal1 moderator is refused.
<!-- AC:END -->

## Packet

Unblocks on: admin layout and audit log (TASK-34); abuse_reports data and report entry points (TASK-25)
