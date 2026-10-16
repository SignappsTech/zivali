---
id: TASK-114.22
title: >-
  Matching too loose: species, distance and time alone make a "possible" match;
  require evidence
status: To Do
assignee:
  - '@backend-dev'
created_date: '2026-10-16 16:25'
labels:
  - be
  - matching
  - 'est:M'
dependencies: []
parent_task_id: TASK-114
priority: high
ordinal: 362200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Owner, 2026-10-16 (screenshot, /r/UqKZV7V7/ujemanja): a lost grey large male cat (Šiška) got a "Mogoče" match with a sighted cat (Bežigrad, 3–10 km) that has no photo, size, colour or sex. A match only because it is a cat gets boring fast for people looking for their animal and gives false hope; tighten it.

Why it matches (packages/validation src/matching.ts `scoreMatch`, apps/api/domains/matching/matching.domain.ts, contract C8): score = 0.4·D + 0.2·T + 0.4·A with D = exp(−km/3), T ≈ 1 within the first day, and A = mean(size, colour, sex, pattern) where every UNKNOWN attribute counts 0.5. Here D ≈ 0.26 (≈4 km) → 0.105, T ≈ 1 → 0.2, A = 0.5 (nothing known) → 0.2: score ≈ 0.51 ≥ `matching.threshold` 0.5, stored as `possible`. Notification needs `good` (≥ 0.65), but every `possible` lands in the owner's Možna ujemanja list. No photo similarity in v1 (no embeddings in the matching domain).

Changes (C8 contract update via a tech-lead CHANGE row):
1. Evidence rule: no suggestion unless a chip matches or at least one attribute is known on both sides and agrees (colour overlap > 0, size equal or adjacent, sex equal, pattern equal). Unknowns stop adding score: A is the mean over the attributes known on both sides, weighted by how many are known (e.g. A × known/4), so missing data lowers the score instead of padding it.
2. Contradiction veto (unless a chip matches): known sex differs, size two steps apart, or colours with no overlap → no suggestion.
3. Distance and time cannot reach the threshold alone; re-tune `threshold` and the strength bands on the fixture set (the test fixtures in matching tests plus a few realistic pairs: same colour 2 km, different colour 1 km, no data 4 km, chip far away), documented in C8 with the examples.
4. Existing `possible` suggestions that fail the new rules: hide them from the owner's list (re-score on deploy via the match.report job, or a one-off cleanup migration), not notifications already sent.
5. Interim lever, no deploy: `app_config` `matching.threshold` (e.g. 0.6) via the admin console, if the owner wants fewer weak matches before this ships.
Follow-ups to note, not in scope: photo similarity (pgvector embeddings, EMBEDDER_PROVIDER) as a fourth feature when both reports have photos; a separate "Opažanja v bližini" list for evidence-free sightings (a layout change: person-approved wireframe first).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 A pair with no attribute known on both sides and no chip creates no suggestion (unit test with the screenshot's case)
- [ ] #2 Known contradictions (sex, size two steps, no colour overlap) veto a non-chip pair; a chip match still always matches
- [ ] #3 Unknown attributes no longer add score; thresholds and bands re-tuned on the fixture set and documented in C8 with examples
- [ ] #4 Existing weak suggestions are re-scored or hidden; no new notifications are sent by the re-score
- [ ] #5 Matching route and QA tests (matching.qa.routes.test.ts) updated; the mobile and web match lists need no change
<!-- AC:END -->
