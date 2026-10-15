---
id: TASK-51
title: Export my data and delete my account
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-15 23:34'
labels:
  - story
  - 'req:FR-034'
milestone: m-2
dependencies:
  - TASK-9
  - TASK-6
priority: high
ordinal: 51000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
GDPR gives users access and erasure rights and the pilot will hold real personal data and locations; self-service export and deletion must exist before launch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in user, when they request an export, then a downloadable JSON or ZIP of profile, pets, photos, reports, sent messages, notification settings, payment metadata and consents is ready within 5 minutes.
- [ ] #2 Given a confirmed deletion with re-authentication, when processed, then the account is disabled at once, personal data and photos are erased or anonymised within 30 days, open reports are closed and legal retention exceptions (payment records) are minimal and documented.
- [ ] #3 Given the data inventory register, when a data store is not covered by export and delete, then a test fails.
- [ ] #4 Given an anonymous reporter, when they use their manage link, then they can delete their report and data without an account.
- [ ] #5 Given an organisation owner, when they delete their account, then they must transfer or delete the organisation first.
- [ ] #6 From TASK-17.2: an anonymous finder can delete their report data from the manage page (/m) per R-034.4.
- [ ] #7 From the TASK-22.5 review: account deletion on mobile unregisters the device push token (unregisterPush, as in beforeSignOut) before the session is wiped, and account deletion and the anonymous manage-link deletion remove the user's push_tokens rows server-side, with a test.
<!-- AC:END -->

## Packet

Unblocks on: session and re-authentication (TASK-9); data inventory register (TASK-6)
