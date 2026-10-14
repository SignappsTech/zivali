---
id: TASK-40
title: AI attribute extraction service
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-14 21:04'
labels:
  - story
  - 'req:FR-013'
  - 'req:NFR-AI'
milestone: m-2
dependencies:
  - TASK-6
  - TASK-14
priority: high
ordinal: 40000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Pre-filling breed, colour and size from the photo is what makes a 60-second found report possible; the service must be cheap, capped and replaceable.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Given a newly uploaded photo, when extraction is requested, then a vision model returns structured JSON (species, breed candidates with confidence, coat colours and pattern, size band, collar, distinguishing marks) validated against the contract schema, p95 under 6 s.
- [ ] #2 Given the same image hash, when requested again, then the cached result is used and no second model call is made.
- [ ] #3 Given cost controls (default 1 call per photo, 10 photos per anonymous device per day, monthly budget cap), when a limit is reached, then extraction returns not available and forms continue manually (fail open).
- [ ] #4 Given the model output, when returned, then it also carries a moderation signal (prominent human face, nudity, gore, no animal) stored for image screening without blocking the upload.
- [ ] #5 Given local development and tests, when no API key exists, then a deterministic mock returns fixture attributes.
- [ ] #6 Given privacy, when an image is sent to the provider, then EXIF is stripped, no user identifiers are included and the provider is listed in the privacy policy.
<!-- AC:END -->

## Packet

Unblocks on: attributes JSON schema (TASK-6); photo-uploaded hook (TASK-14)
