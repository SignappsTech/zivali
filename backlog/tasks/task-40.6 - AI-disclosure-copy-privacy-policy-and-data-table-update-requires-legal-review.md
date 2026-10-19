---
id: TASK-40.6
title: >-
  AI disclosure copy, privacy policy and data table update (requires legal
  review)
status: In Progress
assignee:
  - '@content-strategist'
created_date: '2026-10-18 21:23'
updated_date: '2026-10-19 14:26'
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
- [x] #1 docs/content/pages/P7-report-found.md gets one shared section "AI pre-fill" (referenced from P6 and P8): the Suggested label, the low-confidence hint, "check before saving", the checking-photo status and its live-region text, the notices (no animal: retake; other animal; several animals: crop or pick one), the collar hint, SL and EN
- [x] #2 docs/content/pages/P11-match-review.md gets the visual reason lines for very_similar, similar and some (SL and EN), with no claim of certainty
- [x] #3 Privacy policy SL and EN (chapter 8 and the processor and data tables) as built: only the re-encoded 1024 px image goes to Anthropic and Voyage (no EXIF, ids, location), results keyed by image hash, no person attributes, flagged photos never embedded, vectors deleted with the photo, ai_calls kept 62 days, the transfer basis to the USA and the Voyage training opt-out as the owner confirms it
- [ ] #4 Every legal claim marked [legal review] and the new points added to docs/legal/lawyer-briefing.md; the owner's approval of the text is recorded in the task notes
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
2026-10-18 content-strategist:
- AC1 done: P7 §3a "AI pre-fill" (namespace ai_prefill, SL/EN), P6 §3 and P8 §2 point to it. Strings marked † (ai_prefill.info_body) make privacy claims: owner + lawyer approve with privacy 0.8.
- AC2 done: P11 §3 reason_visual_very_similar / _similar / _some, visual_caveat, visual_pair_a11y (no certainty claim).
- AC3 drafted, waiting for the owner: privacy policy 0.8 (ch. 1, 3, 4, 6, 8, 12, 14, 16) as built per C19/C20 §Privacy. Location USA for both (no other region in C19/C20/04). Not claimed: provider retention, training, contracting entities, transfer basis -> [naročnik: …]/[client: …] markers, questions in privacy note 23. Voyage FAQ (read 2026-10-18): data stored and used for training unless the org opts out (needs payment method + Admin, irreversible, gives zero-day retention).
- AC4 partly done: every new claim marked [pravni pregled]/[legal review]; lawyer pack EN+SL v0.4 (LQ-36/37 changed, new LQ-68..71, F-05, §5.2, D-06, §8, §9.1, CD-08). Open: owner approval of the text (who, date, version) still to be recorded here. najdimo-pravni-pregled.docx not rebuilt (rebuild after approval).
- Port to apps/web legal MDX only after approval, with all markers removed (dev task, not created).

APPROVED IN ADVANCE: Primož Božič (owner), 2026-10-19, in chat: 'auto accept privacy text for now, we will fix it later if needed'. Covers the privacy policy v0.8 AI section with the provider blanks filled from published terms (content-strategist run of 2026-10-19), for publishing on najdimo.si before AI goes on. The lawyer review (LQ-36, 37, 68-71) stays open and may change the text later.

2026-10-19 content-strategist:
- Owner decision 2026-10-19: publish privacy 0.8 before AI is switched on for najdimo.si; lawyer review continues (LQ-36, 37, 68-71 open). Owner facts: Voyage payment method added, training opt-out on; only photos uploaded after AI switch-on are sent (TASK-40.11).
- AC3 done: client markers in ch. 8 and 12 filled from the providers' published documents (sources with URL and read date in privacy note 23). Anthropic Ireland, Limited is the contracting party for EEA customers; Anthropic stores in the USA, may also process in selected countries in Europe, Asia and Australia (C19 sets no inference_geo); no training on our data (Commercial Terms); 30-day deletion, longer if flagged (2 y / scores 7 y) or by law; Voyage AI Innovations, Inc., opt-out -> deleted once processed; SCCs in both DPAs. Unknown, not claimed: DPF listings (list loads only by script), Anthropic ZDR, subprocessor locations, our workspace inference geo.
- Master keeps [pravni pregled]/[legal review]; lawyer docx not rebuilt. Ported only the 0.8 changes to apps/web/content/legal/{sl,en}/privacy.mdx without markers, updated 2026-10-19. ai_prefill.info_body is not on the site yet; unchanged.
- AC4: owner approval in advance is recorded above (not ticked by me). The lawyer pack (lawyer-briefing EN/SL, LQ-36) does not yet carry the filled provider facts of note 23; update it with the docx rebuild after the lawyer round.

Lead 2026-10-19: privacy v0.8 (AI section) published on the web after an Opus fact-check against 12 provider pages and the owner's advance acceptance. Stays In Progress for the lawyer review (LQ-36, 37, 68-71) and the owner checks: Console org billed in the EEA, Voyage opt-out screenshot, default_inference_geo.
<!-- SECTION:NOTES:END -->
