---
id: TASK-40.6
title: >-
  AI disclosure copy, privacy policy and data table update (requires legal
  review)
status: To Do
assignee:
  - '@content-strategist'
created_date: '2026-10-18 21:23'
updated_date: '2026-10-18 21:29'
labels:
  - content
  - legal
  - 'est:S'
  - fe
  - no-design
milestone: m-2
dependencies: []
references:
  - docs/tech/contracts/C19-ai-extraction.md§Client rules
  - docs/tech/contracts/C19-ai-extraction.md§Privacy
  - docs/tech/contracts/C20-image-embeddings.md§Privacy
  - docs/content/legal/privacy-policy.md
parent_task_id: TASK-40
priority: high
ordinal: 376200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Users must know that suggestions come from AI and can be wrong, and the privacy policy must describe what goes to Anthropic and Voyage exactly as built, before real photos are sent (FR-013 R-013.5). Requires legal review.

## Packet

Unblocks on: - (no dependencies; C19 and C20 describe the behaviour)
Review: owner and lawyer review of the legal text (every claim marked [legal review]); no code.
Branch: agent/task-40.6-ai-copy-privacy
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 docs/content/pages/P7-report-found.md gets one shared section "AI pre-fill" (referenced from P6 and P8): the Suggested label, the low-confidence hint, "check before saving", the checking-photo status and its live-region text, the notices (no animal: retake; other animal; several animals: crop or pick one), the collar hint, SL and EN
- [ ] #2 docs/content/pages/P11-match-review.md gets the visual reason lines for very_similar, similar and some (SL and EN), with no claim of certainty
- [ ] #3 Privacy policy SL and EN (chapter 8 and the processor and data tables) as built: only the re-encoded 1024 px image goes to Anthropic and Voyage (no EXIF, ids, location), results keyed by image hash, no person attributes, flagged photos never embedded, vectors deleted with the photo, ai_calls kept 62 days, the transfer basis to the USA and the Voyage training opt-out as the owner confirms it
- [ ] #4 Every legal claim marked [legal review] and the new points added to docs/legal/lawyer-briefing.md; the owner's approval of the text is recorded in the task notes
<!-- AC:END -->
