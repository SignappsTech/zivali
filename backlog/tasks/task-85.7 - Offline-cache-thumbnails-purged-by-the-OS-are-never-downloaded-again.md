---
id: TASK-85.7
title: 'Offline cache: thumbnails purged by the OS are never downloaded again'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-16 02:44'
updated_date: '2026-10-16 02:58'
labels:
  - bug
  - 'est:XS'
dependencies: []
parent_task_id: TASK-85
ordinal: 342000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Found by TASK-85.4 (QA), AC #1 (cached with thumbnails), ADR-019 (thumbnails in FileSystem.cacheDirectory/thumbs/, purgeable). Steps: 1) sync on Wi-Fi: thumbnails land in Paths.cache/thumbs and thumb_path/thumb_bytes are set; 2) the OS purges the cache folder (Android/iOS storage pressure; simulate by deleting the folder); 3) sync again on Wi-Fi. Expected: the missing thumbnails are downloaded again and the size used drops until they are. Actual: downloadThumbs() selects only rows with thumb_path null, so nothing is re-fetched; enforceLimits() returns early when the folder is gone; thumb_bytes keeps counting in cache.max_mb and Settings → Offline data; offline the list rows point at a missing file (fromRow prefers thumb_path) and show an empty muted square. Severity: Low (offline photos lost until the report's photo changes or the row is evicted).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 When a cached row's thumb_path file no longer exists (the OS cleared Paths.cache/thumbs, ADR-019 purgeable), the next sync on Wi-Fi (or mobile data when allowed) downloads it again and cacheBytes() no longer counts the missing bytes; offline rows without a file fall back to the placeholder instead of a dead file URI; the QA test.failing 'a thumbnail the OS purged is downloaded again on the next Wi-Fi sync' in apps/mobile/__tests__/offline-sync.test.ts passes as a plain test
<!-- AC:END -->
