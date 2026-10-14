# ADR-012: Attribute extraction with Claude vision, structured outputs, hard cost caps

- Status: Accepted (implementation in M3, TASK-40) · Date: 2026-10-14 · Owner: Tech Lead
- Amended 2026-10-15 (ADR-020): runs in the Node worker (`ai.extract` job) with `@anthropic-ai/sdk`; `ANTHROPIC_API_KEY` is a VPS environment secret.
- Source: FR-013, FR-018 R-018.4, NFR-AI (≤ EUR 0.05 per report), R-009

## Decision

- **Model**: `claude-opus-5-5` (current default Claude model, $4 / $20 per million input/output tokens) with `output_config: { effort: "low" }`, configurable through `AI_VISION_MODEL` and `AI_VISION_EFFORT`. Called with the official TypeScript SDK (`npm:@anthropic-ai/sdk`) from the `worker` Edge Function (`ai_extract` job), never from clients.
- **Structured outputs**: JSON schema in `output_config.format` (species, breeds with confidence, colours, pattern, size band, collar, distinctive marks, `multiple_animals`, `not_an_animal`, moderation signal `{ nsfw, violence, person_prominent, text_contact_info }`), parsed and re-validated with the zod schema from `packages/validation`. Refusals (`stop_reason: "refusal"`) and failures fail open to manual entry. Server-side refusal fallback (`fallbacks: "default"` beta) is enabled.
- **Input hygiene**: the 1024 px public variant (EXIF already stripped), no user identifiers, no location; the system prompt is constant and cached.
- **Caps** (all in `app_config`): one call per photo hash (cache table `ai_results` keyed by SHA-256), at most 5 photos per report, per-device daily limit for anonymous users (default 10 photos), monthly budget in EUR tracked from `usage` tokens in `ai_calls`; above any cap the job is skipped and the form stays manual (FR-013 AC#2).
- **Cost estimate** (to be measured in TASK-40): ~1.4k input tokens per image + ~0.7k cached system prompt + ~400 output tokens at low effort ≈ USD 0.01 per photo, so a 5-photo report is around EUR 0.05, at the cap. If measured cost exceeds the cap, the client decides whether to lower the photo count or move `AI_VISION_MODEL` to a cheaper model after the evaluation set confirms quality (decision logged as a new ADR; no silent downgrade).
- **Mock** `ai` adapter returns deterministic fixtures by photo hash, so local dev and CI never call the API.

## Consequences

- Anthropic is a processor (privacy policy). Photos may show people; the moderation signal flags prominent people for FR-014 and FR-018.
- `ANTHROPIC_API_KEY` exists in `.env.local`; it is set as an Edge Function secret only in staging and production.
