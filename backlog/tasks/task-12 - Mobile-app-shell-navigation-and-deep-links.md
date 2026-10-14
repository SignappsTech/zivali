---
id: TASK-12
title: 'Mobile app shell, navigation and deep links'
status: To Do
assignee:
  - '@design-lead'
created_date: '2026-10-14 21:01'
labels:
  - story
  - 'req:FR-037'
milestone: m-0
dependencies:
  - TASK-8
  - TASK-10
priority: medium
ordinal: 12000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
The Expo app needs tab navigation, permission explainers and deep links (listing links from WhatsApp and poster QR codes) before feature screens can be built.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the app, when launched signed in or out, then bottom tabs (Map, Report, Inbox, Profile) and a prominent Report action are available.
- [ ] #2 Given a listing link or poster QR, when opened on a phone with the app, then it deep-links to the report screen, and without the app it opens the web page (universal and app link configuration verified in dev builds).
- [ ] #3 Given camera, location and notifications, when first needed, then a plain-language explainer precedes the OS prompt and a denial leaves a working fallback (manual location, gallery).
- [ ] #4 Given an EAS development build, when run, then the push token registration code path exists and uses a mock until Firebase and APNs credentials arrive (Q-007).
<!-- AC:END -->

## Packet

Unblocks on: primitives (TASK-8); message catalogue API (TASK-10)
