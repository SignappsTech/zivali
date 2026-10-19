---
id: TASK-24.5
title: >-
  Facebook kit shows no regional groups and no Radio Aktual form: share.* public
  config keys are never created
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-19 19:47'
labels:
  - bug
  - 'est:XS'
  - web
dependencies: []
parent_task_id: TASK-24
ordinal: 449200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Steps: (1) Code on main e778c604: no migration inserts the app_config keys `share.facebook_groups` or `share.radio_form_url` (only C1 §app_config / CH-337 define them), and the API has no config write route (apps/api/routes/config.routes.ts is GET /v1/config/public only), so nothing can supply them. (2) Live najdimo.si (version 030da43f, 2026-10-19): the public config that the site itself loads in the browser (watched on /prijava/izgubljena-zival, no calls of our own) has 5 keys and no `share.*` key.
Expected: the owner of an open lost report opens the Facebook kit and gets the regional Facebook lost-pet groups (names supplied by the client) as links, the report's region first, plus the Radio Aktual announcement form row (TASK-24 AC#7, FR-011 R-011.2).
Actual: share-kit.tsx hides the group list and the radio row when the keys are absent, so on staging/production the kit shows only the post text, the square image, the intro and the search hint. The code and unit tests are fine; the data is missing.
Severity: major (an AC part of TASK-24 is missing in production; web and app read the same keys).

## Packet

Unblocks on: the client's list of groups (name, https URL, C6 region slugs) and the Radio Aktual form URL, from the lead
Branch: agent/<id>-share-config
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given staging or production, when GET /v1/config/public is read, then it has share.radio_form_url (Radio Aktual form, https) and share.facebook_groups with the client's groups (name, https url, regions), inserted by a migration with is_public = true (on conflict do nothing)
- [ ] #2 Given the owner of an open lost report on najdimo.si, when the Facebook kit opens, then the groups show as links (the report's region first) and the Radio Aktual form row shows
<!-- AC:END -->
