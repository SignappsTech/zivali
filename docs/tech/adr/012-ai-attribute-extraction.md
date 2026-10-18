# ADR-012: Attribute extraction with Claude vision, structured outputs, hard cost caps

- Status: Accepted (implementation in M3, TASK-40; contract C19) · Date: 2026-10-14 · Owner: Tech Lead
- Amended 2026-10-15 (ADR-020): runs in the Node worker (`ai.extract` job) with `@anthropic-ai/sdk`; `ANTHROPIC_API_KEY` is a VPS environment secret.
- Amended 2026-10-18 (M3 breakdown): default model `claude-haiku-5-5` instead of `claude-opus-5-5` (see Model decision); 1024 px input; caps and outcomes as in C19.
- Source: FR-013, FR-018 R-018.4, NFR-AI (≤ EUR 0.05 per report), R-009

## Model decision (2026-10-18)

The job is perception plus classification into our own enums (species, about 100 breed codes, colours, pattern, size, collar, four moderation booleans), one image in and about 300–400 output tokens out. It needs no reasoning, so thinking is off and effort is `low`.

Per photo at a 1024 px long edge (about 1.4k image tokens, about 1k prompt and schema tokens, about 400 output tokens; list prices of 2026-10-06):

| Model | USD / MTok in · out | ≈ USD per photo | 5-photo report | Within NFR-AI (≤ 0.05 per report)? | Notes |
|---|---|---|---|---|---|
| `claude-opus-5-5` | 4 · 20 | 0.018 | 0.09 | no | thinking cannot be disabled; best quality ceiling |
| `claude-sonnet-5-5` | 2 · 10 | 0.009 | 0.045 | just | server-side refusal fallback available |
| `claude-haiku-5-5` | 0.10 · 0.50 | 0.0005 | 0.003 | yes, 15× headroom | no server-side refusal fallback; built for high-volume extraction |

**Decision**: `AI_VISION_MODEL=claude-haiku-5-5`, `AI_VISION_EFFORT=low`, `thinking: { type: "disabled" }`. Opus is out: it alone breaks the cost requirement at 5 photos. Breed is the field where a smaller model loses most, and it degrades safely here: a breed below confidence 0.6 is left empty with a hint (FR-013 R-013.2), and the form falls back to Mixed or Unknown.

**Gate** (TASK-40.5): an extraction evaluation set of at least 40 labelled photos (dogs and cats, mixed breeds, poor light, a few with people or no animal), run once on Haiku and once on Sonnet. Haiku stays the default when it reaches: species ≥ 97 % correct, colours mean Jaccard ≥ 0.75, the true breed among the suggestions ≥ 60 % for pure breeds, wrong breed suggested ≥ 0.6 confidence ≤ 10 %, `person_prominent` recall ≥ 90 %, p95 latency ≤ 6 s, refusals ≤ 2 %. If it misses a bar, `AI_VISION_MODEL` moves to `claude-sonnet-5-5` (config only, no code change) and the result is recorded here. No silent switch either way.

Refusals: Haiku 5.5 has no server-side fallback; a refusal is outcome `refused` and the form stays manual (fail open). If Sonnet becomes the default, enabling `fallbacks: "default"` is a separate, recorded decision.

## Decision

- **Call**: official TypeScript SDK (`@anthropic-ai/sdk`, allowlisted in ADR-017) from the worker's `ai.extract` job (C19), never from clients. No sampling parameters, no prefill, `max_tokens` 1024.
- **Structured outputs**: JSON schema in `output_config.format`, generated from the zod schema `aiExtractionSchema` in `packages/validation` (species, breeds with confidence, colours, pattern, size band, collar, marks, `animal`, `animal_count`, moderation `{ person_prominent, nsfw, violence, text_contact_info }`), then re-validated with zod. Refusals, invalid output and failures fail open to manual entry.
- **Input hygiene**: the `display.jpg` variant (EXIF stripped by `photo.process`) downscaled in memory to 1024 px; no user identifiers, no location, no user text; a constant, versioned system prompt that describes the animal only. Prompt caching is not used: the prefix is small and caching would save well under USD 0.0001 per photo.
- **Caps** (all in `app_config`, C19): one call per image hash (cache `ai_results`, keyed by SHA-256, no user ids), at most 5 photos per report (C5), per anonymous user 10 photos a day and per signed-in user 30, monthly budget `ai.monthly_budget_usd` 20 tracked from `usage` in `ai_calls`; above any cap the job records a `skipped_*` outcome and the form stays manual (FR-013 AC#2). A kill switch `ai.enabled` is a public config key.
- **Mock** `ai` adapter returns deterministic fixtures by photo hash, so local dev and CI never call the API.

## Consequences

- Anthropic is a processor (privacy policy, TASK-40.6 with legal review). Photos may show people: the output has no person fields, only the moderation booleans, and flagged photos are never embedded (C20).
- `ANTHROPIC_API_KEY` is set in `.env.local`; staging gets it in TASK-40.7.
- Monthly cost at pilot volume (a few hundred photos) is cents; the budget cap is a safety net, not the expected spend.
