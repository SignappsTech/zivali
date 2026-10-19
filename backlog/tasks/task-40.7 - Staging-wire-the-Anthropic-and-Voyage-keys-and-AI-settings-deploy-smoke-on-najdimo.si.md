---
id: TASK-40.7
title: >-
  Staging: wire the Anthropic and Voyage keys and AI settings, deploy, smoke on
  najdimo.si
status: In Progress
assignee:
  - '@tech-lead'
created_date: '2026-10-18 21:25'
updated_date: '2026-10-19 14:44'
labels:
  - tech
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-40.3
  - TASK-42.1
  - TASK-42.3
  - TASK-40.6
  - TASK-40.11
references:
  - docs/tech/pilot-runbook.md
  - docs/tech/contracts/C19-ai-extraction.md§Config keys
  - docs/tech/contracts/C20-image-embeddings.md§Config keys
  - docs/tech/adr/013-image-embeddings.md§Consequences
parent_task_id: TASK-40
priority: high
ordinal: 388200
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Staging (the pilot) runs the real providers only once the code, the privacy text and the owner confirmations are in place; until then it stays on AI off.

## Packet

Unblocks on: ai.extract merged (TASK-40.3); photo.embed merged (TASK-42.1); backfill merged (TASK-42.3); privacy-policy text approved and published (TASK-40.6); owner actions recorded in this task's notes: Voyage payment method added, Voyage training opt-out and retention confirmed
Review: owner sign-off in the notes; no code review (config and docs).
Branch: agent/task-40.7-staging-ai
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 /opt/zivali/staging/.env gets AI_PROVIDER=anthropic, ANTHROPIC_API_KEY, AI_VISION_MODEL, AI_VISION_EFFORT, EMBEDDER_PROVIDER=voyage and VOYAGE_API_KEY over SSH, values never printed or committed and no .env file copied; api and worker recreated; deploy/README.md and docs/tech/pilot-runbook.md list the names
- [ ] #2 Smoke on staging: one uploaded photo gets an ai_calls ok row and ai_results within 6 s and a photo_embeddings row within 60 s; GET /v1/photos/:id/attributes answers ready; the backfill logged done
- [ ] #3 Pilot budgets set (ai.monthly_budget_usd, embedding.monthly_budget_usd, embedding.backfill_per_minute 300 after Tier 1); ai.enabled false checked to give unavailable with the form still manual
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Owner, 2026-10-19 (Primož Božič), in chat: Voyage payment method added; Voyage training opt-out is on ('It's already on'); go to switch AI on for najdimo.si today, after privacy policy v0.8 is approved and live ('Publish v0.8 first'). Backfill: new photos only. No photo uploaded before the switch-on goes to Anthropic or Voyage (TASK-40.11).

Owner 2026-10-19: privacy text v0.8 accepted in advance ('auto accept for now'); switch-on proceeds once the v0.8 web port and TASK-40.11 are live.

Lead 2026-10-19 16:46 CEST: AI switched on for najdimo.si. The deploy of 69d07c97 (TASK-40.6 privacy v0.8 live + TASK-40.11 cutoff migration) set ai.photos_since = 2026-10-19T14:43:40.224Z (worker startup log). Then AI_PROVIDER=anthropic, ANTHROPIC_API_KEY, AI_VISION_MODEL=claude-haiku-5-5, AI_VISION_EFFORT=low, EMBEDDER_PROVIDER=voyage, VOYAGE_API_KEY were written to /opt/zivali/staging/.env over SSH (values never printed; backup .env.bak-ai, mode 600) and api + worker recreated (healthy). GET /v1/config/public: ai.enabled true. Budgets: migration defaults (ai.monthly_budget_usd 20, embedding.monthly_budget_usd 5, daily caps 10/30, backfill 6/min, new photos only). AC2 smoke: waiting for the owner's test upload; the lead checks the worker logs (ai.extract.done, photo.embed) without DB access.
<!-- SECTION:NOTES:END -->
