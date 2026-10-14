---
id: TASK-44
title: 'Organisations, members and verification'
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
updated_date: '2026-10-14 22:02'
labels:
  - story
  - 'req:FR-015'
milestone: m-2
dependencies:
  - TASK-9
  - TASK-6
  - TASK-34
priority: high
ordinal: 44000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Shelters, vets and municipalities need a shared organisation account with roles, and owners need to trust that a shelter is real (verified badge).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a signed-in user, when they register an organisation (shelter, vet or municipality) with name, address, contact and proof (document or official website), then it is created as pending and visible only to its members.
- [ ] #2 Given an admin, when they review it in the admin console, then they can verify, reject with a reason or request more information, the action is audit-logged and verified organisations show a badge on their listings.
- [ ] #3 Given an organisation owner, when they invite colleagues by email, then members join with roles (owner, editor, viewer) and RLS limits data to the organisation.
- [ ] #4 Given an unverified organisation, when it publishes listings, then they are held for moderation until it is verified.
- [ ] #5 Given a pilot shelter onboarded by hand, when an admin acts on its behalf, then the admin can create and verify the organisation.
- [ ] #6 Given any organisation type (shelter, vet, municipality), when its verified members use the portal, bulk and CSV upload, matches, chip lookup, API keys, analytics and adoption page, then all are free forever: there is no plan, quota-for-payment, entitlement check or upgrade prompt for organisations.
<!-- AC:END -->

## Packet

Unblocks on: role claims (TASK-9); organisation and membership schema (TASK-6); admin layout and audit log for the verification screen (TASK-34)
