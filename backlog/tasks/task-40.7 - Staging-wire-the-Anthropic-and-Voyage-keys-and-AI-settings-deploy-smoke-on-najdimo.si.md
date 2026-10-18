---
id: TASK-40.7
title: >-
  Staging: wire the Anthropic and Voyage keys and AI settings, deploy, smoke on
  najdimo.si
status: To Do
assignee:
  - '@tech-lead'
created_date: '2026-10-18 21:25'
updated_date: '2026-10-18 21:29'
labels:
  - tech
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-40.3
  - TASK-42.1
  - TASK-42.3
  - TASK-40.6
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
