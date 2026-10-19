---
id: TASK-112.1
title: 'Web: the consent banner is the LCP element on content pages'
status: In Progress
assignee:
  - '@frontend-dev'
created_date: '2026-10-19 11:17'
updated_date: '2026-10-19 12:05'
labels:
  - fe
  - 'est:S'
dependencies: []
references:
  - docs/tech/frontend.md
  - docs/design/system.md
parent_task_id: TASK-112
priority: medium
ordinal: 414200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
TASK-112 found that on content pages the LCP element is the consent banner (#consent-body). It paints after hydration, which pushes LCP past 2.5 s (also seen in TASK-115.6). Make the banner stop being the LCP element or paint it early: render its text on the server, or keep it out of the LCP candidates (e.g. a fixed small block that never outgrows the main content), without breaking consent gating (no analytics before consent).

## Packet

Unblocks on: - (TASK-112 merged or not; independent)
Design: docs/design/system.md consent banner; no visual change
Review: tech-lead code review (full mode); CI quality job shows the LCP
Branch: agent/task-112.1-consent-lcp
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 On the content pages the LCP element is page content, not the consent banner, and LCP is within the TASK-112 budget in the CI quality run
- [ ] #2 Consent gating unchanged: nothing loads analytics before consent; unit tests
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Banner moved first in the body (app/providers.tsx). Live /kako-deluje HTML: banner at byte 56 KB of 138, after header (27 KB), page and footer; it could paint frames after the page top, after scripts ran (Lantern then counts all JS for LCP). First in the HTML it paints in the first frame; no visual change (fixed). Its heading focus is deferred a microtask so page mount-focus (payment-return) still loses to it, as before. Hydration test shows the SSR banner is kept in place (no mismatch re-render). Not measurable locally (no build/Lighthouse in worktrees): CI quality run decides AC#1. Where the banner text is larger than the page's content it may stay the LCP element, but at first paint.
<!-- SECTION:NOTES:END -->
