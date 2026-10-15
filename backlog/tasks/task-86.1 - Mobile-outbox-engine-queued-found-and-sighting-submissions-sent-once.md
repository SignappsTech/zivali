---
id: TASK-86.1
title: 'Mobile outbox engine: queued found and sighting submissions sent once'
status: Done
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:39'
updated_date: '2026-10-15 21:24'
labels:
  - fe
  - 'est:M'
  - no-design
milestone: m-1
dependencies:
  - TASK-12.5
  - TASK-6.9
  - TASK-17.3
  - TASK-14.3
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C17-mobile-offline-data.md
  - docs/tech/contracts/C7-anonymous-manage-link.md
  - docs/tech/contracts/C5-photos-storage.md
parent_task_id: TASK-86
priority: medium
ordinal: 265000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
A finder may have no signal exactly where the animal is; the report must be stored with photo, GPS and capture time and sent later exactly once (FR-042).
## Packet
Unblocks on: Mobile local data layer: expo-sqlite store, local migrations, network state, wipe merged (TASK-12.5); REST clients in @zivali/api: auth, me, pets, reports, photos, geocode, matches merged (TASK-6.9); Mobile anonymous session, captcha WebView and manage-link screen merged (TASK-17.3); Mobile PhotoPicker: camera/gallery, resize, EXIF, drafts, upload with retry merged (TASK-14.3)
Design: none (no UI of its own)
Contracts: C17, C7, C5 (in references); ADR-019
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-86.1-outbox
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 submitReport() writes an outbox row (id = client request id, payload, captured_at, photos copied to documentDirectory/outbox/<id>/) and returns immediately; online it is sent at once.
- [x] #2 The single-flight sender runs on launch, resume and reconnect in the foreground: anonymous session (Turnstile WebView when enabled, needs_action if interaction is required), register_photo and upload, then create_report with p_client_request_id and event_at = captured_at; the result and manage token are stored (token in secure store).
- [x] #3 Errors are classified per C17 (network → backoff 1/5/15/60 min, RATE_LIMITED → wait retry_after, CAPTCHA and VALIDATION → needs_action or failed with the reason); nothing is deleted without the user.
- [x] #4 jest tests with the mock client prove: offline submit → queued; app kill and restart → still queued and sent; a lost response then retry → one report and the same manage token; rate limit → waits and shows the reason.
<!-- AC:END -->
