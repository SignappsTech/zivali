source: docs/04-technical-design.md§External integrations, ADR-012, ADR-014, ADR-017, ADR-022; FR-013, FR-018 R-018.4, NFR-AI

# C19 AI attribute extraction (M3, TASK-40)

Claude vision suggests species, breed, colours, pattern, size and collar from a photo; the forms pre-fill from it (TASK-41). Cheap, capped, fail open: when anything is off, over a cap or failing, the form simply stays manual.

## Pipeline

1. `photo.process` accepts a photo (C5) and sends the `PHOTO_HOOKS` queues: in M3 only `ai.extract { photo_id }` (ids only), for every accepted photo, not only a form's first (C20 embeds only after this check).
2. `ai.extract` (`jobs/ai.extract.job.ts` → `AiDomain.extractPhoto`; retry 2× after 2 s, no backoff, local concurrency 4):
   0. **Cutoff** (TASK-40.11): the photo's `created_at` is not strictly after `ai.photos_since`, or that value is unset or invalid → nothing at all (no cache lookup, no `ai_calls` row, no `photo.embed`), log `ai.extract.cutoff`.
   1. Photo deleted or not `accepted`/`published` any more → done, nothing written.
   2. **Cache**: an `ai_results` row for the photo's `sha256` exists → outcome `cached`, no model call (same image, any owner).
   3. **Caps**, in order (outcome in brackets): `ai.enabled` false or `AI_PROVIDER=off` (`skipped_disabled`); this UTC calendar month's `ai_calls.cost_usd` sum of provider `anthropic` only ≥ `ai.monthly_budget_usd` (`skipped_budget`; Voyage has `embedding.monthly_budget_usd`, C20); the owner's provider calls in the last 24 h (outcomes `ok`, `refused`, `invalid`, `failed`; cache hits and skips do not count) ≥ `ai.daily_photos_anonymous` (anonymous owner) or `ai.daily_photos_user` (`skipped_limit`). An unset or unreadable budget or daily limit counts as reached (fail closed).
   4. **Call** the `ai` adapter with the `display.jpg` variant from `variants/<photo_id>/` (EXIF already stripped by `photo.process`), downscaled in memory with sharp to a 1024 px long edge, JPEG q80.
   5. Breeds and colour values are cut to 3 and marks to 5 (one extra item does not void the rest), then the reply is re-validated with `aiExtractionSchema` (`@zivali/validation/ai`); confidences clamped to 0…1; breed codes of another species dropped. Store `ai_results` (outcome `ok`). `stop_reason: "refusal"` → `refused`; schema failure → `invalid`. On the last attempt any error (provider, storage, sharp) is recorded as `failed` and the job completes instead of failing, so `photo.embed` is still sent (and skips: no result, C20); `ai.extract.done` then carries `error: <SDK error class>`. None of these store a result.
   6. Write one `ai_calls` row per photo, provider and model (unique `(photo_id, provider, model)`, as §Models) with the outcome, tokens, cost and latency. Skip and cache rows have 0 tokens and cost; the model is `AI_VISION_MODEL` (cache hits: the cached result's model); `latency_ms` is the whole job.
   7. Send `photo.embed { photo_id }` (C20) on every outcome, **except** when the stored or cached result has `moderation.person_prominent`, `moderation.nsfw`, or `animal` = `none` | `other`: those photos are never embedded (FR-014 edge case).

p95 from `ai.extract` queued to `ai_results` stored ≤ 6 s on staging (AC TASK-40 #1).

## Provider call (adapter `adapters/ai/anthropic.ts`, `@anthropic-ai/sdk`, ADR-012)

- `model` = `AI_VISION_MODEL` (default `claude-haiku-5-5`), `output_config: { effort: AI_VISION_EFFORT (default "low"), format: <aiExtractionJsonSchema> }`, thinking off (`{ type: "disabled" }`, allowed at effort ≤ high on Haiku 5.5; on `claude-sonnet-5-5` omit `thinking` and keep effort low), `max_tokens` 1024, no sampling parameters (Haiku 5.5 rejects them), no prefill.
- One user turn: the image (base64 JPEG) then a fixed instruction. Constant system prompt, versioned as `AI_PROMPT_VERSION` in code (`2026-10-19.1`) and stored on each result. No metadata, ids, location, user text or locale in the request.
- The prompt: describe only the main animal; never describe people, faces, clothing, places or text; report a prominent person, nudity, gore or visible contact details only through the `moderation` booleans; choose breeds only from the given codes, else `<species>.mixed` or `<species>.unknown`.
- Client: `maxRetries: 0` (pg-boss retries, so attempts cannot stack), 20 s timeout.
- Errors (typed SDK errors only, never message matching): 429, 5xx, connection errors (`APIConnectionTimeoutError` included) and other API errors → throw (retry). A rejected request (`BadRequestError` 400, `AuthenticationError` 401, `PermissionDeniedError` 403, `NotFoundError` 404, `UnprocessableEntityError` 422) → `failed` at once, no retry; `ai.extract.done` logs its class.
- Cost per call from `usage` × the price table in `domains/ai/pricing.ts` (USD per MTok, per model; it also lists `claude-opus-5-5` at USD 4 / 20, ADR-012, and a model missing there is booked at that rate), stored in `ai_calls.cost_usd`. USD is stricter than the EUR 0.05 per report of NFR-AI.

## Model output (`aiExtractionSchema`, zod; the JSON schema for `output_config.format` is generated from it)

```ts
type AiExtraction = {
  animal: 'dog' | 'cat' | 'other' | 'none';    // the main animal
  animal_count: 0 | 1 | 2;                      // literal set (2 = two or more); JSON schema enum [0, 1, 2]
  species_confidence: number;                   // 0…1
  breeds: { code: BreedCode; confidence: number }[];         // ≤ 3, same species, highest first
  colours: { values: Colour[]; confidence: number } | null;  // 1 to 3 values
  pattern: { value: Pattern; confidence: number } | null;
  size: { value: Size; confidence: number } | null;
  collar: { present: boolean; confidence: number };
  marks: string[];                               // ≤ 5 short English phrases, each ≤ 100 chars (white chest, torn left ear); stored, not shown in M3
  moderation: { person_prominent: boolean; nsfw: boolean; violence: boolean; text_contact_info: boolean };
};
```
`@zivali/validation/ai` exports `aiExtractionSchema` (also rejects breeds of another species and any breed when `animal` is `other`/`none`) and `aiExtractionJsonSchema` (`z.toJSONSchema` with every enum inlined, minus the keywords structured outputs reject: `minimum`/`maximum`, `maxItems`, `maxLength`; so `animal_count` is a literal set, a `max(2)` would be stripped and a 3 would void the whole reply). The worker re-validates every reply with `aiExtractionSchema`.

## Models (Prisma `prisma/schemas/ai.prisma`, schema `app`, RLS deny-all; TASK-40.1)

```sql
ai_results(sha256 text primary key, model text, prompt_version text, result jsonb,   -- AiExtraction without moderation
           moderation jsonb, created_at)                                             -- no user, photo or report id
create type ai_outcome as enum ('ok','cached','refused','invalid','failed','skipped_disabled','skipped_budget','skipped_limit');
ai_calls(id, photo_id uuid null → photos on delete set null, provider text check (provider in ('anthropic','voyage','mock')),
         model text, outcome ai_outcome, input_tokens int, output_tokens int, pixels bigint null, cost_usd numeric(10,6),
         latency_ms int, created_at, unique (photo_id, provider, model))
index ai_calls (provider, created_at)
```
`ai_calls` is also the Voyage ledger (C20; `mock` added by migration `task_42_3_ai_calls_mock`). A deleted photo's `ai_calls` row stays with `photo_id` null and still counts toward the caps and budgets. Retention (`retention.purge`): `ai_calls` rows older than 62 days; `ai_results` rows whose `sha256` no photo row has any more. Both in `data-inventory.json` (category photo-derived, no personal data in `ai_results`; `ai_calls` links to a photo, so personal: delete with the account through the photo cascade).

## REST (TASK-40.4)

| Method and path | Guards | Response | Errors |
|---|---|---|---|
| `GET /v1/photos/:id/attributes` | owner of the photo (user or anonymous); rate limit `photos.attributes` 600/h per user | `PhotoAttributes` | `NOT_FOUND` (unknown, not the owner's, or rejected), `RATE_LIMITED` |

```ts
type Suggestion<T> = { value: T | null; confidence: number };   // value null: confidence < ai.min_confidence (0.6)
type PhotoAttributes =
  | { status: 'pending' }        // photo not accepted yet, or no ai_calls row for it yet
  | { status: 'unavailable' }    // AI off, a cap, refused, invalid or failed, or the photo not created strictly after
                                 // ai.photos_since (or no valid cutoff; never 'pending' then): the form stays manual, no error shown
  | { status: 'ready';
      notice: null | 'no_animal' | 'other_animal' | 'multiple_animals';   // none / other / animal_count ≥ 2
      species: Suggestion<'dog' | 'cat'> | null;
      breed_codes: Suggestion<BreedCode[]> | null;   // codes ≥ min confidence, at most 2; confidence = the best one's
      colours: Suggestion<Colour[]> | null;
      pattern: Suggestion<Pattern> | null;
      size: Suggestion<Size> | null;
      collar: Suggestion<boolean> | null };         // true: hint "describe the collar"; the collar text is never filled
```
`null` field = the model saw nothing for it. Every filled value keeps its own `confidence` (the client derives the level shown, §Client rules). `moderation`, `marks` and `model` are never returned to clients. `ai.enabled` and `ai.min_confidence` are public config keys (C1 `GET /v1/config/public`), so clients skip the polling when AI is off.

## Client rules (TASK-41, web and mobile)

Owner answers of 2026-10-19 on wireframe M-ai-prefill (TASK-41.1): v1 approved with changes, v2 approved the same day (both in the TASK-41.1 notes). As built on web by TASK-41.2; mobile (TASK-41.3) follows the same rules.

- Polling is skipped when `ai.enabled` is false (C1 public config; it is also false while the AI adapter is off or there is no valid `ai.photos_since`, §Config keys).
- Only a **first photo uploaded in this form visit** is checked (also a cropped copy, §Crop); a saved pet photo reused in P6 is never polled. After its upload completes, poll `GET /v1/photos/:id/attributes` every 750 ms while `pending`, at most 10 s; stop on `ready` or `unavailable`.
- Fill only fields the user has not touched and that are empty; mark each filled field **Predlog / Suggested** until the user edits or confirms it; nothing is saved unconfirmed (the form's own save confirms). A suggestion that arrives after 3 s, or after the user touched the field, never overwrites the user's input.
- Fill only values the form offers for the species the user chose (none chosen yet: the suggested species, filled and marked): never a breed, pattern or size of the other species. After the user switches species, the empty, untouched fields take the values valid for the new one.
- After any change by the person (a field edited, confirmed or cleared), no new hint lines appear for that field. When a replaced first photo is checked (§Crop 6), a field still marked Predlog counts as untouched.
- `notice` `no_animal` or `other_animal` → nothing is filled, only the notice hint. `multiple_animals` fills as usual, with the "pick one animal" hint and "Obreži fotografijo" (§Crop). Copy: TASK-40.6.
- `value: null` → field stays empty with the low-confidence hint. Unknown breed → the form's Mixed / Unknown choice, never a guess. Breed labels from the `breeds` i18n namespace (SL, EN). A `species` that differs from the species the user chose is shown as a hint, never switched.
- **Confidence** (owner 2026-10-19, v2): every filled field shows its confidence as a whole percentage after the mark, never in words: `Predlog · 81 %` (`Intl.NumberFormat` `style: 'percent'`, `maximumFractionDigits: 0`, so the locale spacing applies: SL `81 %`, EN `81%`). `breed_codes` has one confidence (the best code's). The accessible label carries the percentage too (copy CH-597). No level cut or constant.
- **Found sentence** (P7 "Je to pravilno?"): names the breed when `breed_codes.value[0]` is a real breed (not `null`, `*.mixed` or `*.unknown`): "Pes, labradorec, črne barve". A breed the finder keeps is stored in the found report's `breed_codes` (C4 `ReportInput`, the same field lost reports use), like every other filled field: only through the form's own save.
- Announce arriving suggestions once in a polite live region. `unavailable` and errors show nothing extra.

## Crop (TASK-41.5 web, TASK-41.6 mobile; wireframe F11, F12; libraries per ADR-017)

1. **Where**: under every photo the form holds as a local file (picked in this form visit or restored from its draft) in P6, P7 and P8, also when `ai.enabled` is false (owner 2026-10-19: the crop is a photo tool, not an AI feature), and as "Obreži fotografijo" in the `multiple_animals` note. A saved photo (`SavedPhoto`: P8 edit, a pet photo reused in P6) has no local file, so it has no crop button in M3: remove it and add it again.
2. **On the client only**: the frame works on the prepared JPEG the form already holds (C5 `preparePhoto`: upright, long edge ≤ 1600, no EXIF). Free shape; no rotation, zoom or upscaling. The rectangle is in that image's pixels, whole numbers, inside the image. **Minimum: both sides ≥ 320 px** of the prepared image (`MIN_PHOTO_EDGE`, the C5 upload rule), so the copy always passes `POST /v1/photos` and the 1024 px model input keeps the animal's detail; the library gets it in shown pixels (`320 × shown / natural`). A photo with a 320 px short side can be cropped along its long side only.
3. **Encode**: the cropped region goes through the platform `preparePhoto` (JPEG ≤ 1 MiB, thumb, new `sha256`). It carries no EXIF, so no place or time is offered again.
4. **Uporabi**: the copy replaces the original in the same slot (same position) and uploads as a **new photo** (`uploadPhoto`: `POST /v1/photos` → PUT → `/complete`). Nothing is saved on the report or pet until the form's own save (`photo_ids` then lists the copy). A frame equal to the whole photo, or a copy whose `sha256` is already in the form, changes nothing. Not uploaded yet (mobile `kept`, offline): only the local file is replaced. **Prekliči**, Esc or the system back change nothing.
5. **The original** leaves the form like a removed photo: its running upload is aborted, no API call. It is unattached, so the 24 h purge (C5 `retention.purge`) deletes its row and objects; jobs already queued for it may still finish (no new call is made for it). Its `photo_embeddings` go with the row (cascade). Its `ai_calls` row stays with `photo_id` null and keeps counting toward the daily cap and the month's budget until the 62-day purge. Its `ai_results` row (keyed by `sha256`, no photo id) is purged once no photo has that hash, and stays as a cache entry while any photo does. The client forgets the original's answer at once.
6. **Extraction again**: the copy is a new accepted photo (created now, so after `ai.photos_since`), so `photo.process` sends `ai.extract` for it like any upload (every slot: C20 needs its safety check before it embeds). If it is the **first** photo, the client polls the copy from `pending` (750 ms, at most 10 s from its `/complete`). At Uporabi the notice goes and fields still marked Predlog are emptied back to untouched; the new result fills them as for a first photo; fields the user changed or confirmed stay. A new `multiple_animals` brings the note back. Other slots: no polling.
7. **Cost and caps**: no separate crop cap. Every copy that reaches the provider is one more call (about USD 0.0003 at the Haiku 5.5 rates in `pricing.ts`), counted toward the owner's daily cap (`ai.daily_photos_user` 30, anonymous 10) and the monthly budget like any upload (§Pipeline 3); a copy whose hash was seen before is a free cache hit. Over a cap → `unavailable` → the form stays manual, no error. The upload limit (60/hour, C5) bounds it too. Voyage embeds a clean copy under C20's budget.
8. **Accessibility**: web: a dialog (full screen at phone width) with focus kept inside, opening on the frame; five tab stops: the frame (arrows move it) and four corners (arrows resize from that corner), Shift for bigger steps; edge handles are pointer-only; Esc = Prekliči; focus returns to the crop button under the photo. Mobile: a full screen; the frame and corners are accessibility elements with move and resize actions for VoiceOver and TalkBack; 44 px targets. The help line is the frame's accessible description. After Uporabi one polite announcement "Fotografija je obrezana." Names and copy: CH-597.

## Mock (`AI_PROVIDER=mock`, the default locally and in CI)

`adapters/ai/mock.ts` runs only with `APP_ENV=local`. A fixture file is `{ "stop_reason"?: "refusal", "output"?: <raw model JSON> }` under `apps/api/test/fixtures/ai/` and goes through the same clamp, `isBreedOf` and `aiExtractionSchema` gate as a real reply; `fixtures/ai/index.json` maps sha256 → fixture name (only a 64-hex sha256 is looked up); fixtures `refusal`, `invalid` and `person` exercise the other outcomes. Without a fixture: a deterministic result derived from the hash (dog, one breed at 0.82, colours black + white at 0.9, size `m` at 0.4 so the low-confidence path is covered). The mock reports `AI_VISION_MODEL` as its model and 1500/200 tokens; cost 0 because the provider is the mock. Client fixtures: `packages/api/src/__fixtures__/ai.ts` (one per status and notice).

## Config keys (migration of TASK-40.1, `on conflict do nothing`)

`ai.enabled` true (public) · `ai.min_confidence` 0.6 (public) · `ai.monthly_budget_usd` 20 · `ai.daily_photos_anonymous` 10 · `ai.daily_photos_user` 30 · `ai.photos_since` null (not public; TASK-40.11 migration): a JSON string, ISO 8601 with `Z` or an offset, ≥ `2026-10-19T00:00:00Z`; only photos created strictly after it are ever sent (§Pipeline 2.0, C20).

**Switch-on** (TASK-40.11, TASK-40.7): migration `20261019110000_task_40_11_ai_switch_on` sets `ai.photos_since` to `now()` of the deploy that applies it, only while the value is still JSON `null` (a set value is never moved). No SQL by hand on hosted DBs: that deploy is the switch-on, and privacy policy v0.8 is live before or with it. The worker logs `ai.photos_since { photos_since }` at start (`null` when unset or invalid; `ai.photos_since unreadable` on a read error). `GET /v1/config/public` answers `ai.enabled: false` while the AI adapter is off or there is no valid cutoff, whatever the stored flag says. Env: `AI_PROVIDER` (`mock | anthropic | off`), `ANTHROPIC_API_KEY`, `AI_VISION_MODEL`, `AI_VISION_EFFORT`.

`AI_PROVIDER` unset = `mock` locally and `off` in staging and production (like `EMBEDDER_PROVIDER`, C20); `anthropic` only when set explicitly, and in production only with `ANTHROPIC_API_KEY` (else boot fails). `AI_PROVIDER=mock`, or `anthropic` without a key, is `off` outside `APP_ENV=local`: made-up clean results would become cache hits and let `photo.embed` embed unchecked photos.

## Privacy

Only the 1024 px re-encoded image goes to Anthropic: no EXIF, ids, location or user text. Nothing about people is extracted or stored beyond the four moderation booleans; flagged photos are never embedded. Results are keyed by image hash, not by user. Photos uploaded before the AI switch-on (`ai.photos_since`) never go to Anthropic, by any path (owner 2026-10-19). A crop happens on the device; the copy takes the same path as any upload. The provider is named in the privacy policy (TASK-40.6, legal review).

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
Shown for this answer: species `Predlog · 98 %`, breed `81 %`, colours `93 %`, pattern `77 %`, size empty with the low-confidence hint.

## Later (not in M3)

- **Focal point per photo** (CH-605, from TASK-114.43): the model could return the main animal's box, stored as `Photo.focus { x, y }` in % of the display image, so cover crops centre on the animal. Web would pass it as an inline `object-position` over the fixed `PHOTO_FOCUS` 50% 10% of `lib/photo.ts` (cards, OG image, `square.png`, poster); mobile as expo-image `contentPosition`. Needs a prompt version, a schema field and a C5 column; not planned until the fixed anchor proves too weak in use.

## Changelog

- 2026-10-18 (M3 breakdown): first version.
- 2026-10-19 (CH-601, TASK-40.11): `ai.photos_since` cutoff, step 2.0 and privacy line.
- 2026-10-19 (CH-612, CH-617, CH-619): owner v2 approved: confidence as a whole percentage (no words, no 0.85 cut), crop also with AI off; as built by TASK-40.11 (switch-on migration, worker log, `ai.enabled` false without a valid cutoff, `unavailable` before the cutoff) and TASK-41.2 (first photo of this visit only, species-valid pattern and size, no new hints after a change).
- 2026-10-19 (CH-564, CH-565, CH-567, CH-572 to CH-575, CH-596): as built by TASK-40.1 to 40.3 (caps and fail-closed limits, cut before validation, `failed` on the last attempt, `ai_calls` unique on photo, provider and model, SDK client settings and error classes, pricing, prompt version, `animal_count` literal set, `@zivali/validation/ai` exports, mock fixtures, `AI_PROVIDER` resolution). Client rules from the owner's answers on wireframe v1 (species-valid fill, no fill with `no_animal`/`other_animal`); v2 pending: confidence level, breed in the found sentence, §Crop (minimum 320 px, new photo per crop, re-extraction under the normal caps, the original's rows).
