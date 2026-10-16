---
id: TASK-75.1
title: >-
  Owner: D-U-N-S for Signapps d.o.o., then Apple Developer (organisation) and
  Google Play Console (organisation) accounts
status: To Do
assignee: []
created_date: '2026-10-16 10:25'
labels:
  - owner
  - launch
dependencies: []
parent_task_id: TASK-75
priority: medium
ordinal: 358000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Signapps is a d.o.o., so both stores use organisation accounts under Signapps: seller name is the company, the EU DSA trader address comes from the D-U-N-S record (not a home address), Google's 12-tester closed-test rule applies only to new personal accounts, and the team can add members. Do not use the owner's existing Apple team (it belongs to another org). Steps: (1) request a D-U-N-S number for Signapps d.o.o. (free; days to weeks); (2) enrol Apple Developer Program as Organization (Account Holder with authority to sign for Signapps); (3) create the Google Play Console account as Organization with the same D-U-N-S and complete identity verification; (4) then hand the lead the Apple Team ID (for apple-app-site-association and push / Sign in with Apple keys) and the Play app signing SHA-256 (ANDROID_CERT_SHA256 for app links). Store submissions themselves stay with the owner.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 D-U-N-S issued for Signapps d.o.o.
- [ ] #2 Apple Developer (Organization) and Google Play Console (Organization) accounts active; Team ID and Play signing SHA-256 handed to the lead
<!-- AC:END -->
