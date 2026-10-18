source: docs/04-technical-design.md§External integrations, ADR-012, ADR-014, ADR-022; FR-013, FR-018 R-018.4, NFR-AI

# C19 AI attribute extraction (M3, TASK-40)

Claude vision suggests species, breed, colours, pattern, size and collar from a photo; the forms pre-fill from it (TASK-41). Cheap, capped, fail open: when anything is off, over a cap or failing, the form simply stays manual.

## Pipeline

1. `photo.process` accepts a photo (C5) and sends the `PHOTO_HOOKS` queues: in M3 only `ai.extract { photo_id }` (ids only).
2. `ai.extract` (`jobs/ai.extract.job.ts` → `AiDomain.extractPhoto`; retry 2× after 2 s, no backoff, local concurrency 4):
   1. Photo not `accepted`/`published` any more → done, nothing written.
   2. **Cache**: an `ai_results` row for the photo's `sha256` exists → outcome `cached`, no model call (same image, any owner).
   3. **Caps**, in order (outcome in brackets): `ai.enabled` false or `AI_PROVIDER=off` (`skipped_disabled`); this month's `ai_calls.cost_usd` sum ≥ `ai.monthly_budget_usd` (`skipped_budget`); the owner's `ok` calls in the last 24 h ≥ `ai.daily_photos_anonymous` (anonymous owner) or `ai.daily_photos_user` (`skipped_limit`).
   4. **Call** the `ai` adapter with the `display.jpg` variant from `variants/<photo_id>/` (EXIF already stripped by `photo.process`), downscaled in memory with sharp to a 1024 px long edge, JPEG q80.
   5. Parse and re-validate with `aiExtractionSchema` (`@zivali/validation/ai`); clamp confidences to 0…1; drop breed codes of another species. Store `ai_results` (outcome `ok`). `stop_reason: "refusal"` → `refused`; schema failure → `invalid`; the last retry failing → `failed`. None of these store a result.
   6. Write one `ai_calls` row per photo (unique `(photo_id, provider)`) with the outcome, tokens, cost and latency.
   7. Send `photo.embed { photo_id }` (C20) on every outcome, **except** when the stored or cached result has `moderation.person_prominent`, `moderation.nsfw`, or `animal` = `none` | `other`: those photos are never embedded (FR-014 edge case).

p95 from `ai.extract` queued to `ai_results` stored ≤ 6 s on staging (AC TASK-40 #1).

## Provider call (adapter `adapters/ai/anthropic.ts`, `@anthropic-ai/sdk`, ADR-012)

- `model` = `AI_VISION_MODEL` (default `claude-haiku-5-5`), `output_config: { effort: AI_VISION_EFFORT (default "low"), format: <JSON schema from aiExtractionSchema> }`, thinking off (`{ type: "disabled" }`, allowed at effort ≤ high on Haiku 5.5; on `claude-sonnet-5-5` omit `thinking` and keep effort low), `max_tokens` 1024, no sampling parameters (Haiku 5.5 rejects them), no prefill.
- One user turn: the image (base64 JPEG) then a fixed instruction. Constant system prompt, versioned as `AI_PROMPT_VERSION` in code and stored on each result. No metadata, ids, location, user text or locale in the request.
- The prompt: describe only the main animal; never describe people, faces, clothing, places or text; report a prominent person, nudity, gore or visible contact details only through the `moderation` booleans; choose breeds only from the given codes, else `<species>.mixed` or `<species>.unknown`.
- Errors: `RateLimitError`, 5xx, connection → throw (retry). `BadRequestError` → `failed` (no retry). Typed SDK errors only, never message matching.
- Cost per call from `usage` × the price table in `domains/ai/pricing.ts` (USD per MTok, per model), stored in `ai_calls.cost_usd`. USD is stricter than the EUR 0.05 per report of NFR-AI.

## Model output (`aiExtractionSchema`, zod; the JSON schema for `output_config.format` is generated from it)

```ts
type AiExtraction = {
  animal: 'dog' | 'cat' | 'other' | 'none';    // the main animal
  animal_count: number;                         // 0, 1, 2 (2 = two or more)
  species_confidence: number;                   // 0…1
  breeds: { code: BreedCode; confidence: number }[];         // ≤ 3, same species, highest first
  colours: { values: Colour[]; confidence: number } | null;  // ≤ 3 values
  pattern: { value: Pattern; confidence: number } | null;
  size: { value: Size; confidence: number } | null;
  collar: { present: boolean; confidence: number };
  marks: string[];                               // ≤ 5 short English phrases (white chest, torn left ear); stored, not shown in M3
  moderation: { person_prominent: boolean; nsfw: boolean; violence: boolean; text_contact_info: boolean };
};
```

## Models (Prisma `prisma/schemas/ai.prisma`, schema `app`, RLS deny-all; TASK-40.1)

```sql
ai_results(sha256 text primary key, model text, prompt_version text, result jsonb,   -- AiExtraction without moderation
           moderation jsonb, created_at)                                             -- no user, photo or report id
create type ai_outcome as enum ('ok','cached','refused','invalid','failed','skipped_disabled','skipped_budget','skipped_limit');
ai_calls(id, photo_id uuid null → photos on delete set null, provider text check (provider in ('anthropic','voyage')),
         model text, outcome ai_outcome, input_tokens int, output_tokens int, pixels bigint null, cost_usd numeric(10,6),
         latency_ms int, created_at, unique (photo_id, provider, model))
index ai_calls (provider, created_at)
```
`ai_calls` is also the Voyage ledger (C20). Retention (`retention.purge`): `ai_calls` rows older than 62 days; `ai_results` rows whose `sha256` no photo row has any more. Both in `data-inventory.json` (category photo-derived, no personal data in `ai_results`; `ai_calls` links to a photo, so personal: delete with the account through the photo cascade).

## REST (TASK-40.4)

| Method and path | Guards | Response | Errors |
|---|---|---|---|
| `GET /v1/photos/:id/attributes` | owner of the photo (user or anonymous); rate limit `photos.attributes` 600/h per user | `PhotoAttributes` | `NOT_FOUND` (unknown, not the owner's, or rejected), `RATE_LIMITED` |

```ts
type Suggestion<T> = { value: T | null; confidence: number };   // value null: confidence < ai.min_confidence (0.6)
type PhotoAttributes =
  | { status: 'pending' }        // photo not accepted yet, or no ai_calls row for it yet
  | { status: 'unavailable' }    // AI off, a cap, refused, invalid or failed: the form stays manual, no error shown
  | { status: 'ready';
      notice: null | 'no_animal' | 'other_animal' | 'multiple_animals';   // none / other / animal_count ≥ 2
      species: Suggestion<'dog' | 'cat'> | null;
      breed_codes: Suggestion<BreedCode[]> | null;   // codes ≥ min confidence, at most 2; confidence = the best one's
      colours: Suggestion<Colour[]> | null;
      pattern: Suggestion<Pattern> | null;
      size: Suggestion<Size> | null;
      collar: Suggestion<boolean> | null };         // true: hint "describe the collar"; the collar text is never filled
```
`null` field = the model saw nothing for it. `moderation`, `marks` and `model` are never returned to clients. `ai.enabled` and `ai.min_confidence` are public config keys (C1 `GET /v1/config/public`), so clients skip the polling when AI is off.

## Client rules (TASK-41, web and mobile)

- After a photo upload completes, poll `GET /v1/photos/:id/attributes` every 750 ms for the **first** photo of the form while `pending`, at most 10 s; stop on `ready` or `unavailable`.
- Fill only fields the user has not touched and that are empty; mark each filled field **Predlog / Suggested** until the user edits or confirms it; nothing is saved unconfirmed (the form's own save confirms). A suggestion that arrives after 3 s, or after the user touched the field, never overwrites the user's input.
- `value: null` → field stays empty with the low-confidence hint. Unknown breed → the form's Mixed / Unknown choice, never a guess. Breed labels from the `breeds` i18n namespace (SL, EN).
- `notice` → the retake or "pick one animal" hint (copy: TASK-40.6); `species` that differs from the species the user chose is shown as a hint, never switched.
- Announce arriving suggestions once in a polite live region. `unavailable` and errors show nothing extra.

## Mock (`AI_PROVIDER=mock`, the default locally and in CI)

`adapters/ai/mock.ts` returns `apps/api/test/fixtures/ai/<sha256>.json` when present, else a deterministic result derived from the hash (dog, one breed at 0.82, colours black + white at 0.9, size `m` at 0.4 so the low-confidence path is covered). Fixture names `refusal`, `invalid` and `person` (by a sha256 listed in `fixtures/ai/index.json`) exercise the other outcomes. Usage tokens are fixed, cost 0. Client fixtures: `packages/api/src/__fixtures__/ai.ts` (one per status and notice).

## Config keys (migration of TASK-40.1, `on conflict do nothing`)

`ai.enabled` true (public) · `ai.min_confidence` 0.6 (public) · `ai.monthly_budget_usd` 20 · `ai.daily_photos_anonymous` 10 · `ai.daily_photos_user` 30. Env: `AI_PROVIDER` (`mock | anthropic | off`), `ANTHROPIC_API_KEY`, `AI_VISION_MODEL`, `AI_VISION_EFFORT`.

## Privacy

Only the 1024 px re-encoded image goes to Anthropic: no EXIF, ids, location or user text. Nothing about people is extracted or stored beyond the four moderation booleans; flagged photos are never embedded. Results are keyed by image hash, not by user. The provider is named in the privacy policy (TASK-40.6, legal review).

## Example

```json
{ "status": "ready", "notice": null,
  "species": { "value": "dog", "confidence": 0.98 },
  "breed_codes": { "value": ["dog.labrador_retriever"], "confidence": 0.81 },
  "colours": { "value": ["black"], "confidence": 0.93 },
  "pattern": { "value": "solid", "confidence": 0.77 },
  "size": { "value": null, "confidence": 0.41 },
  "collar": { "value": true, "confidence": 0.88 } }
```

## Changelog

- 2026-10-18 (M3 breakdown): first version.
