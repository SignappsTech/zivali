---
id: TASK-28.10
title: >-
  Cookie policy §3 misses the admin key zivali-admin-activity and calls the
  IndexedDB report draft local storage
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-19 20:33'
labels:
  - bug
  - 'est:XS'
  - web
milestone: m-1
dependencies: []
parent_task_id: TASK-28
priority: low
ordinal: 469200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: list the non-test browser storage writes in apps/web (localStorage, sessionStorage, idb-keyval) and compare them with /piskotki and /en/cookies §3 "Items on the website".
Expected: every item the web app stores is listed with purpose and duration (TASK-28 AC#2).
Actual:
- apps/web/components/admin/idle-timeout.tsx writes localStorage "zivali-admin-activity" (time of the last activity for the staff idle sign-out; admin area only, strictly necessary): not listed.
- The row "Report draft (local storage)" / "Osnutek prijave (lokalna shramba)" is IndexedDB (idb-keyval "draft:<kind>:<id>", apps/web/components/report-lost/lost-flow.tsx and the found flow; photos under the same name), not local storage.
Everything else matches the code and the live browser: zz_consent 400 days (packages/analytics/src/consent.ts), sb-…-auth-token, NEXT_LOCALE session cookie, manage:<id>, manage_token, zz_support:*, device_id; live najdimo.si sets only NEXT_LOCALE before consent and zz_consent after "Sprejmi vse".
Severity: low.

## Packet

Unblocks on: -
Branch: agent/task-28.10-cookie-list-admin-key from main
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cookie policy §3 (master, SL and EN MDX) lists zivali-admin-activity (local storage, admin area) with purpose and duration, and names the report draft store as the browser database (IndexedDB)
<!-- AC:END -->
