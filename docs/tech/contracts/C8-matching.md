source: docs/04-technical-design.md§Data model (matches), ADR-004; FR-008, FR-014 (v2 later), NFR-LAT

# C8 Matching v1

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

1. **Chip**: if the report has a valid chip, any open report of the opposite side with the same chip → score 1.000, `chip_match = true`, `strength = 'strong'`, immediate `notify` type `match_chip` to the lost report's managers (bypasses quiet hours). A sighting with a chip match is still a chip match; reason `chip_sighting` tells the owner the animal may have moved.
2. **Candidates** (TypedSQL `prisma/sql/matchCandidates.sql`): opposite side (lost ↔ found|sighted), status open/matched, moderation visible or held-by-org, same species, distance ≤ `matching.max_distance_km` (30) using exact points, time window: other.event_at ∈ [lost.event_at − 12 h, lost.event_at + `matching.max_days` (30) d], not previously rejected for the pair, excluding sex conflict (both known and different).
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
4. Upsert suggestions (idempotent on the unique pair; never resurrect `rejected`); set `reports.first_match_at` if null; notify lost managers once per new suggestion with `strength ≥ good` (`match_suggested` notification, quiet hours apply). New lost reports run against open found/sighted; new found/sighted reports run in reverse. After its upserts, match.report re-scores the report's other suggested rows without a chip (either side): a row that no longer passes (veto, no evidence, below the threshold) is deleted, so it leaves the managers' list until match.report finds the pair again; the rest get the new score, strength and `algo_version`. No notification either way. Deploy one-off per algorithm version: seeder `40-matching-rescore` re-scores the same way the suggested rows without a chip whose `algo_version` is not the current one (v1 rows, also those an old worker writes during the deploy window). Rows of the current version are never re-scored by a deploy, so a `matching.threshold` raised by an admin never deletes them. A failure is logged and does not stop the deploy; the next deploy retries it. Notifications already sent stay.

`reasons` shape (no exact data):
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

Neither side sees contact data before confirmation (FR-008 R-008.5); after confirmation only what C9 exposes.

## Config keys

`matching.threshold` 0.5 · `matching.top_n` 10 · `matching.max_days` 30 · `matching.max_distance_km` 30 · `matching.distance_scale_km` 3 · `matching.weights` `{"distance":0.4,"time":0.2,"attributes":0.4}` · `matching.notify_min_strength` `good`.

## Example

```json
{ "id": "m1…", "score": 0.78, "strength": "good", "chip_match": false,
  "reasons": [{ "code": "distance", "band": "1to3" }, { "code": "time", "hours_band": "lt24" }, { "code": "colour", "overlap": 1 }],
  "other": { "id": "7c1e2a4b-5d6f-4a8b-9c0d-1e2f3a4b5c6d", "short_code": "Hk3vT9qP", "type": "found", "species": "dog", "photos": [ … ] } }
```

## Changelog

- 2026-10-16 (TASK-20.6): `other.id` (the other report's uuid, already public on `GET /v1/reports/:code`) added to the MatchSuggestion `other` subset so the review can report abuse (C11 `target_id`).
- 2026-10-18 (TASK-114.22): evidence rule and contradiction veto; an unknown attribute adds nothing to A; algo_version v2; match.report re-scores the report's other suggestions; v2 one-off re-score of older rows on deploy (seeder 40-matching-rescore). Threshold and bands re-tuned on the fixtures, values kept.
- Not in the contract (follow-ups, not built): photo similarity (pgvector embeddings, `EMBEDDER_PROVIDER`) as a fourth feature when both reports have photos; a separate "Opažanja v bližini" list for evidence-free sightings (person-approved wireframe first). Interim lever unchanged: `matching.threshold` via the admin console.
