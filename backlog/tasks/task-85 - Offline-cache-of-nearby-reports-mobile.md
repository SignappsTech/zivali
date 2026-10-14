---
id: TASK-85
title: Offline cache of nearby reports (mobile)
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 22:30'
labels:
  - story
  - 'req:FR-041'
  - 'req:NFR-OFFLINE'
milestone: m-1
dependencies:
  - TASK-6
  - TASK-12
  - TASK-31
priority: medium
ordinal: 258000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
People look for pets outdoors with poor signal; the mobile data layer must cache nearby active reports from the start so map and list keep working offline, using only public fuzzed data.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given the app is online, when it runs, then active lost and found reports around the home area and the current area are cached with thumbnails and public fuzzed locations only, within a size limit (default 50 MB) and age limit (default 7 days), refreshed in the background.
- [ ] #2 Given the device is offline, when the map or list opens, then cached reports show with a clear offline, last updated state and actions that need a connection explain why they are unavailable.
- [ ] #3 Given the cache, when inspected, then it never contains exact locations, chip numbers, contact data or chat content, and it is wiped on logout, account deletion and on user request in settings.
- [ ] #4 Given closed, hidden or expired reports, when the cache refreshes, then they are removed.
- [ ] #5 Given battery and data use, when refreshing, then it uses incremental sync, respects data saver and refreshes on Wi-Fi or at most every 15 minutes in the foreground.
<!-- AC:END -->

## Packet

Unblocks on: public report read model and viewport query (TASK-6); app shell and storage setup (TASK-12); map and list screens to show cached data (TASK-31)
