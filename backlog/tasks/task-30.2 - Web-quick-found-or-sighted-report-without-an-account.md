---
id: TASK-30.2
title: Web quick found or sighted report without an account
status: To Do
assignee:
  - '@frontend-dev'
created_date: '2026-10-14 22:14'
labels:
  - fe
  - 'est:M'
milestone: m-1
dependencies:
  - TASK-14.2
  - TASK-15.3
  - TASK-17.2
  - TASK-18.2
  - TASK-7.1
  - TASK-30.1
references:
  - docs/tech/frontend.md
  - docs/tech/contracts/C7-anonymous-manage-link.md
  - docs/design/pages/P7-report-found.md
  - docs/tech/contracts/C4-reports-and-pets.md
parent_task_id: TASK-30
priority: high
ordinal: 205000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Finders will not register; conversion depends on a found report taking under 60 seconds on a phone (FR-006, G-3).

## Packet

Unblocks on: Web PhotoPicker: resize, EXIF read and strip, drafts, upload with retry merged (TASK-14.2); Web LocationPicker: GPS, pin, search, radius, permission fallback merged (TASK-15.3); Web anonymous session, Turnstile captcha and manage-link page merged (TASK-17.2); Web report detail /r/[code]: SSR, slots, OG image, JSON-LD, 410 merged (TASK-18.2); packages/analytics: typed track(), event registry, consent store, adapters merged (TASK-7.1); Design: Report found or sighted (no account) and manage page (P7) approved (TASK-30.1)
Design: P7 docs/design/pages/P7-report-found.md (mockup docs/design/mockups/P7-report-found.html; TASK-30.1)
Copy: docs/content/pages/P7-*.md (content strategist; until it exists use clear SL and EN drafts and list the keys in your report)
Contracts: C7, C4 (in references); conventions in C1
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-30.2-found-web
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Report found follows the P7 sequence: photo, location pre-filled from GPS or EXIF, 'I have the animal' or 'I only saw it', optional note, optional email; it never asks where the animal is kept.
- [ ] #2 Submitting without an account uses the anonymous session (captcha when enabled), creates the report and shows the success screen with the private manage link (and email if given).
- [ ] #3 'I saw this pet' on a lost listing (sighting slot) creates a SIGHTED report linked to it.
- [ ] #4 Rate-limit and hold responses show friendly messages; report_found_start and report_found_submit fire with consent only; no ad slot in the flow.
- [ ] #5 A scripted Playwright run completes the flow in under 60 s on a mobile viewport; axe 0 violations.
<!-- AC:END -->
