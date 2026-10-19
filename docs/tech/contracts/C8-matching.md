source: docs/04-technical-design.md§Data model (matches), ADR-022, ADR-013; FR-008, FR-014, NFR-LAT

# C8 Matching (attribute scorer v2 and visual similarity v3, as built)

## Models (Prisma `prisma/schemas/matching.prisma`, schema `app`)

```sql
create type match_state as enum ('suggested','confirmed','rejected','closed');
matches(id, lost_report_id → reports, other_report_id → reports,   -- other = found or sighted
        score numeric(4,3), strength text check (strength in ('strong','good','possible')),
        chip_match boolean, reasons jsonb, state match_state default 'suggested',
        algo_version text default 'v1',   -- the engine writes 'v2' (TASK-114.22); 'v1' rows counted unknown attributes 0.5
        rejected_reason text null, notified_at, created_at, updated_at,
        unique (lost_report_id, other_report_id))
match_feedback(match_id, user_id, verdict text ('confirm'|'reject'), reason text null, created_at)
```
Access only through the API: managers of the lost report read and act on its suggestions; the other side sees only that a match was confirmed (C9); staff read all. RLS deny-all (ADR-021).

## Engine (pg-boss job `match.report { report_id }`, owned by TASK-19.1)

1. **Chip**: if the report has a valid chip, any open report of the opposite side with the same chip → score 1.000, `chip_match = true`, `strength = 'strong'`, immediate `notify` type `match_chip` to the lost report's managers (bypasses quiet hours). A sighting with a chip match is still a chip match; its reason is `chip_sighting` **instead of** `chip` (tells the owner the animal may have moved; the P11 line would repeat otherwise).
2. **Candidates** (parameterised `$queryRaw` with `Prisma.sql` in `domains/matching/matching.dao.ts`; TypedSQL needs a live database at build time, CH-117; the GiST indexes are used in both directions): opposite side (lost ↔ found|sighted), status open/matched, moderation visible or held for an organisation (`moderation_state = 'held'` and `source = 'organisation'`), same species, distance ≤ `matching.max_distance_km` (30) from **`lost.exact_point` to `other.public_point`** (the finder's exact point is never used, CH-148), time window: other.event_at ∈ [lost.event_at − 12 h, lost.event_at + `matching.max_days` (30) d], not previously rejected for the pair, excluding sex conflict (both known and different).
3. **Score** (TS `scoreMatch(features, config)` in `@zivali/validation/matching`, `MatchScore | null`; null = no suggestion; `MATCH_ALGO_VERSION` = `'v2'`):
   - `D = exp(−distance_km / matching.distance_scale_km (3))`
   - `T = 1 − min(1, max(0, Δhours) / (24 × 30))`
   - Similarities, only for an attribute known on both sides: `size_sim` 1 equal, 0.5 adjacent, 0 two or more steps apart; `colour_jaccard`; `sex_sim` 1 equal, 0 different (`unknown` counts as not known); `pattern_sim` 1 equal, 0 different.
   - `A = (sum of the similarities of the attributes known on both sides) / 4`, i.e. their mean × known / 4: an unknown attribute adds nothing.
   - Without a chip match: **veto**, no suggestion, when a known sex differs, the sizes are two or more steps apart, or the colours share none; **evidence rule**: at least one attribute known on both sides must agree (A > 0), so species, distance and time alone never make a match. A chip match always matches (1.000, strong), whatever the attributes say.
   - `score = wD·D + wT·T + wA·A` with defaults `wD 0.4, wT 0.2, wA 0.4`. Keep `score ≥ matching.threshold (0.5)`; top `matching.top_n (10)` per lost report.
   - `strength`: chip → strong; ≥ 0.8 strong; ≥ 0.65 good; else possible.
   - Threshold and bands were re-tuned on the fixture set (42 pairs, `apps/api/test/domains/matching.fixtures.test.ts`) and kept: a complete report scores as before; each attribute unknown on either side costs 0.05. On the same day, with full agreement on each known attribute: 1 attribute lists within about 2 km (good within 0.4 km), 2 within 4 km (good 1.4 km), 3 within 16 km (good 3 km), all 4 anywhere within the 30 km limit (good 6 km).
   - Examples (defaults, 6 h apart):

     | Pair | Score | Result |
     |---|---|---|
     | Same colour only, 2 km | 0.504 | possible |
     | Same colour and size, 3 km | 0.545 | possible |
     | Same colour only, 3 km | 0.445 | none (below 0.5) |
     | All four the same, 1 km | 0.885 | strong |
     | Another colour, 1 km | - | none (veto) |
     | Nothing known, 4 km (was 0.51 possible) | - | none (no evidence) |
     | Same chip, 25 km, nothing known | 1.000 | strong |
4. Upsert suggestions (idempotent on the unique pair; never resurrect `rejected`); `top_n` counts the lost report's existing suggested + confirmed rows and never evicts one; set `first_match_at` on the **lost** report only, if null; notify lost managers once per new suggestion with `strength ≥ good` (`match_suggested` notification, quiet hours apply); notification jobs carry ids only. New lost reports run against open found/sighted; new found/sighted reports run in reverse. After its upserts, match.report re-scores the report's other suggested rows without a chip (either side): a row that no longer passes (veto, no evidence, below the threshold) is deleted, so it leaves the managers' list until match.report finds the pair again; the rest get the new score, strength and `algo_version`. No notification either way. Deploy one-off per algorithm version: seeder `40-matching-rescore` re-scores the same way the suggested rows without a chip whose `algo_version` is not the current one (v1 rows, also those an old worker writes during the deploy window). Rows of the current version are never re-scored by a deploy, so a `matching.threshold` raised by an admin never deletes them. A failure is logged and does not stop the deploy; the next deploy retries it. Notifications already sent stay.

`reasons` shape (no exact data; bands only: distance `lt1 | 1to3 | 3to10 | gt10`, hours `lt24 | 24to72 | gt72`, glossary §9). Reasons are written only for positive signals: `size` equal or adjacent, `colour` overlap > 0, `sex` equal, `pattern` equal; `distance` and `time` always.
```json
[{ "code": "chip" }, { "code": "distance", "band": "1to3" }, { "code": "time", "hours_band": "lt24" },
 { "code": "size", "match": "equal" }, { "code": "colour", "overlap": 0.67 }, { "code": "sex", "match": "equal" }]
```

## REST (owned by TASK-20.2)

| Method and path | Guards | Request | Response |
|---|---|---|---|
| `GET /v1/reports/:code/matches` | manager of the lost report | `?state=suggested,confirmed` | `{ items: MatchSuggestion[] }` ranked by score |
| `POST /v1/matches/:id/confirm` | manager of the lost report, verified email | - | `{ conversation_id }`; state → confirmed, lost status → matched, conversation created (C9), other side notified; idempotent |
| `POST /v1/matches/:id/reject` | manager of the lost report | `{ reason? }` | `204`; state → rejected, `match_feedback` row; never shown again |

```ts
type MatchSuggestion = { id; score; strength; chip_match; reasons; state;
  other: Pick<PublicReport,'id'|'short_code'|'type'|'species'|'breed_codes'|'colours'|'size'|'sex'|'photos'|'event_at'|'area'> }
```
Errors: `FORBIDDEN`, `CONFLICT` (already confirmed/rejected), `UNVERIFIED_EMAIL` (confirm opens chat).

**Verdict state matrix** (as built, TASK-20.2):

| Call | suggested | confirmed | rejected | closed |
|---|---|---|---|---|
| confirm | → confirmed, `{ conversation_id }` | same `conversation_id`, no second `match_confirmed` | `CONFLICT` | `CONFLICT` |
| reject | → rejected, `204` | `CONFLICT` | no-op `204` | `CONFLICT` |

- Confirm on a closed or reunited lost report is `GONE` (from C9 openConversation; the whole verdict rolls back). Unknown match id or report code: `NOT_FOUND`.
- GET never lists rejected pairs (also not with `?state=rejected`) and drops pairs whose other report is hidden, removed or closed > 30 days; held for an organisation stays, as in the engine.
- Guards are manager-of-the-lost-report only: staff without a `report_managers` row get `FORBIDDEN`.
- Both verdicts write `match_feedback` (one row per manager, verdict `confirm` or `reject`). Confirm and reject share the rate limit `matches.verdict` 60/h per user (`RATE_LIMITED`).
- `match_confirmed` job payload is ids only: `{ template, match_id, thread_id: conversation_id }`, to the other report's managers.

**Who sees what**: `score`, `strength`, `reasons` and every band are for the lost report's managers only (distance and bands derive from `lost.exact_point`), never shown to the other side, also not after confirm (C9 shows the conversation only). Neither side sees contact data before confirmation (FR-008 R-008.5); after confirmation only what C9 exposes.

## Visual similarity (algo v3, M3, TASK-43)

Photo vectors come from C20 (`EmbeddingsDomain.similarity`, current `embedding.model` only). Photos C19 flags (prominent person, nsfw, no animal) or never checked have no vector, so they never count (FR-014 edge case).

Types (`@zivali/validation/matching`, TASK-40.2 and 43.1): `MatchReason` = `AttributeMatchReason` (the v2 codes) | `VisualMatchReason`; `MATCH_REASON_CODES` includes `visual`. `features.visual?: { V, lost_photo_id, other_photo_id } | null` (left out = null) and `MatchScoreConfig.weights_visual?` (left out = the exported `VISUAL_WEIGHTS`, the start values below); `visualSimilarity(cos, floor, ceiling)` (step 2) and `visualBand(V)` are exported; the engine config must keep `visual_floor < visual_ceiling`.

1. **Best pair**: `cos` = the highest cosine similarity over the lost report's photos × the other report's photos (≤ 5 × 5), with `lost_photo_id` and `other_photo_id` of that pair. No vector on either side → no V for that pair (the `matching done` log counts pairs with V as `visual`).
2. **Normalise** per embedding model: `V = clamp((cos − matching.visual_floor) / (matching.visual_ceiling − matching.visual_floor), 0, 1)`. Start values 0.70 / 0.95 stay placeholders until step 9 picks values.
3. **Score**: `scoreMatch(features, config)` gets `features.visual`.
   - `null`: exactly the v2 score of §Engine 3 (weights `matching.weights`, same veto and evidence rule, same reasons). This is the **fallback** when vectors are missing, the embedder is off, or the similarity query fails.
   - present: `score = wD·D + wT·T + wA·A + wV·V` with `matching.weights_visual` (start `{"distance":0.3,"time":0.15,"attributes":0.25,"visual":0.3}`).
   - Evidence rule: A > 0 **or** V ≥ 0.5.
   - Veto: a known sex that differs always vetoes. Sizes two or more steps apart, or no shared colour, veto unless V ≥ 0.8 (the descriptions differ, the photos agree: the FR-014 story).
   - Geo-time fit (as built, TASK-43.1): a geo-time fit is a distance band `lt1`/`1to3` **and** an hours band `lt24`/`24to72`. Without one, V never raises `strength` above the pair's v2 strength (the v2 score with `matching.weights`), and the strength is `possible` when v2 gives no suggestion (visual-only evidence, or a veto lifted by V). So a look-alike far away or days apart never reaches `good` on its photo, and similarity alone never reaches the notification strength (FR-014 edge case). Same result as the first rule for A = 0 and lifted vetoes; it also caps described look-alikes (a black cat with all four attributes equal 15 km away: v3 0.686, v2 0.601).
   - A chip match is still 1.000, strong; its visual reason is still written when V ≥ 0.25.
   - Reason `{ "code": "visual", "band": "very_similar" | "similar" | "some", "lost_photo_id", "other_photo_id" }` for V ≥ 0.8 / ≥ 0.5 / ≥ 0.25; none below; it comes after the attribute reasons. Lost managers only, like every reason.
4. `MATCH_ALGO_VERSION = 'v3'` for every row the engine writes, with or without V; the deploy re-score (seeder `40-matching-rescore`, one similarity call per lost report, none with the embedder off) moves v2 rows to v3. In production with the embedder off (no vectors) rows move to v3 with score, strength and reasons unchanged, nobody notified.
5. **When a vector arrives later**: `photo.embed` sends `match.report { report_id }` when the photo had no `embedding.model` vector before the run and has one after, on an open or matched report (also when a later `embedding.next_model` embed throws). The send is debounced (`singletonKey` = report id, `singletonSeconds` 60, `singletonNextSlot`), so a second photo embedded within the slot runs once more in the next slot instead of being dropped. `notified_at` stays: a pair is notified once.
6. **Failure**: with `EMBEDDER_PROVIDER` off the engine runs no similarity query (every pair scores v2, nothing logged). A similarity query error or the 2 s timeout logs `matching.visual_unavailable` (warn, with `report_id`) and scores that run with `visual = null`; it never fails the job. `match.report` makes one similarity call for its candidates and one for its re-score of the report's other suggestions.
7. **Reverse search**: a new found or sighted report scores against every open lost report in range (§Engine 2 reverse direction); < 5 s for 1000 open lost reports (perf check `apps/api/test/perf/matching.perf.ts`, 1000 lost reports × 2 photos: about 0.4 s locally).
8. **REST**: with a visual reason, `other.photos` is ordered with `other_photo_id` first (the reports read model's photos carry their id for this ordering, never in a DTO). The client shows its own `lost_photo_id` first in the comparison: `PublicPhoto` has no id, so the client finds it by the C5 media path segment `r/<report_id>/<photo_id>/` in the photo's `url`; no photo matches (an unpublished photo has no URL) → API order. Nothing else changes in `MatchSuggestion`.
9. **Evaluation** (TASK-43.3): `pnpm --filter api eval:matching` (`apps/api/test/eval/matching/`, README there). Candidates: same species, ≤ `max_distance_km`, |Δh| ≤ `max_days`; positive = same `animal` label, hard negative = another animal with the same species, size and colours. recall@10 = lost reports with their animal in their `top_n` suggestions ≥ threshold; precision = positives / notified (≥ `notify_min_strength`), 0 when none. The gate (shipped v3 not worse than v2 on both) runs on the synthetic set in `pnpm verify` (`eval.test.ts`): 60 lost reports, 3600 pairs, 60 positives, 438 hard negatives, mock labels; v2 recall@10 0.500 / precision 0.112, shipped v3 0.717 / 1.000. Sweep: floor 0.30 to 0.85, ceiling floor + 0.05 to 1.00 (0.05 steps), visual weight 0.2 / 0.3 / 0.4 (the others keep `VISUAL_WEIGHTS`' ratio); band cut-offs stay V 0.8 / 0.5 / 0.25 (also the veto-lift and evidence values), floor and ceiling place them in cosine; geo-time fit variants for V ≥ 0.8 (< 10 km/72 h, < 3 km any time, < 10 km any time, no cap) are reported. Real-photo set in `real/` (`set.json` with a licence per file, `vectors.json` cache) behind `EVAL_EMBED=voyage`, off by default. **No values chosen yet**: floor, ceiling, weights, bands and the cap stay placeholders until the owner approves the photo set and the Voyage run; the chosen values are then recorded here with the date and the set.

## Config keys

`matching.threshold` 0.5 · `matching.top_n` 10 · `matching.max_days` 30 · `matching.max_distance_km` 30 · `matching.distance_scale_km` 3 · `matching.weights` `{"distance":0.4,"time":0.2,"attributes":0.4}` · `matching.notify_min_strength` `good` · v3 (TASK-43.2 migration): `matching.weights_visual` `{"distance":0.3,"time":0.15,"attributes":0.25,"visual":0.3}` · `matching.visual_floor` 0.70 · `matching.visual_ceiling` 0.95.

## Example

```json
{ "id": "m1…", "score": 0.78, "strength": "good", "chip_match": false,
  "reasons": [{ "code": "distance", "band": "1to3" }, { "code": "time", "hours_band": "lt24" }, { "code": "colour", "overlap": 1 }],
  "other": { "id": "7c1e2a4b-5d6f-4a8b-9c0d-1e2f3a4b5c6d", "short_code": "Hk3vT9qP", "type": "found", "species": "dog", "photos": [ … ] } }
```

## Changelog

- 2026-10-16 (TASK-20.6): `other.id` (the other report's uuid, already public on `GET /v1/reports/:code`) added to the MatchSuggestion `other` subset so the review can report abuse (C11 `target_id`).
- 2026-10-18 (TASK-114.22): evidence rule and contradiction veto; an unknown attribute adds nothing to A; algo_version v2; match.report re-scores the report's other suggestions; v2 one-off re-score of older rows on deploy (seeder 40-matching-rescore). Threshold and bands re-tuned on the fixtures, values kept.
- Not in the contract (follow-up, not built): a separate "Opažanja v bližini" list for evidence-free sightings (person-approved wireframe first). Interim lever unchanged: `matching.threshold` via the admin console.
- 2026-10-18 (M3 breakdown, CH-154, CH-155, CH-181, CH-215, CH-436, CH-515/531): as built: candidates via `$queryRaw` (no TypedSQL), lost exact point to other public point, held-for-organisation rule; `chip_sighting` instead of `chip`; band codes; reasons only for positive signals; `top_n` never evicts; `first_match_at` on the lost report; ids-only jobs; who sees score and reasons; verdict state matrix. Planned: §Visual similarity (algo v3, TASK-43) with the v2 scorer as its fallback.
- 2026-10-19 (CH-565, CH-570, CH-571, CH-577, CH-588, CH-595): §Visual similarity as built by TASK-43.1 to 43.3 ("planned" dropped): `@zivali/validation/matching` types and helpers, geo-time fit capped at the v2 strength, visual reason order and chip matches, embedder-off and failure behaviour, debounced `match.report` from `photo.embed`, perf checks, the evaluation harness and its results (values still placeholders); the client finds its `lost_photo_id` by the media path segment.
