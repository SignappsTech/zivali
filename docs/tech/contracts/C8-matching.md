source: docs/04-technical-design.md§Data model (matches), ADR-004; FR-008, FR-014 (v2 later), NFR-LAT

# C8 Matching v1

## Models (Prisma `prisma/schemas/matching.prisma`, schema `app`)

```sql
create type match_state as enum ('suggested','confirmed','rejected','closed');
matches(id, lost_report_id → reports, other_report_id → reports,   -- other = found or sighted
        score numeric(4,3), strength text check (strength in ('strong','good','possible')),
        chip_match boolean, reasons jsonb, state match_state default 'suggested',
        algo_version text default 'v1', rejected_reason text null, notified_at, created_at, updated_at,
        unique (lost_report_id, other_report_id))
match_feedback(match_id, user_id, verdict text ('confirm'|'reject'), reason text null, created_at)
```
Access only through the API: managers of the lost report read and act on its suggestions; the other side sees only that a match was confirmed (C9); staff read all. RLS deny-all (ADR-021).

## Engine (pg-boss job `match.report { report_id }`, owned by TASK-19.1)

1. **Chip**: if the report has a valid chip, any open report of the opposite side with the same chip → score 1.000, `chip_match = true`, `strength = 'strong'`, immediate `notify` type `match_chip` to the lost report's managers (bypasses quiet hours). A sighting with a chip match is still a chip match; reason `chip_sighting` tells the owner the animal may have moved.
2. **Candidates** (TypedSQL `prisma/sql/matchCandidates.sql`): opposite side (lost ↔ found|sighted), status open/matched, moderation visible or held-by-org, same species, distance ≤ `matching.max_distance_km` (30) using exact points, time window: other.event_at ∈ [lost.event_at − 12 h, lost.event_at + `matching.max_days` (30) d], not previously rejected for the pair, excluding sex conflict (both known and different).
3. **Score** (TS `scoreMatch(features, config)` in `@zivali/validation/matching`):
   - `D = exp(−distance_km / matching.distance_scale_km (3))`
   - `T = 1 − min(1, max(0, Δhours) / (24 × 30))`
   - `A = mean(size_sim, colour_jaccard, sex_sim, pattern_sim)` where `size_sim` = 1 equal, 0.5 adjacent, 0 otherwise; `sex_sim` = 1 equal, 0.5 unknown; unknown attributes count 0.5.
   - `score = wD·D + wT·T + wA·A` with defaults `wD 0.4, wT 0.2, wA 0.4`. Keep `score ≥ matching.threshold (0.5)`; top `matching.top_n (10)` per lost report.
   - `strength`: chip → strong; ≥ 0.8 strong; ≥ 0.65 good; else possible.
4. Upsert suggestions (idempotent on the unique pair; never resurrect `rejected`); set `reports.first_match_at` if null; notify lost managers once per new suggestion with `strength ≥ good` (`match_suggested` notification, quiet hours apply). New lost reports run against open found/sighted; new found/sighted reports run in reverse.

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
