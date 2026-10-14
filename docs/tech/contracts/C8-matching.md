source: docs/04-technical-design.md§Data model (matches), ADR-004; FR-008, FR-014 (v2 later), NFR-LAT

# C8 Matching v1

## Table

```sql
create type match_state as enum ('suggested','confirmed','rejected','closed');
matches(id, lost_report_id → reports, other_report_id → reports,   -- other = found or sighted
        score numeric(4,3), strength text check (strength in ('strong','good','possible')),
        chip_match boolean, reasons jsonb, state match_state default 'suggested',
        algo_version text default 'v1', rejected_reason text null, notified_at, created_at, updated_at,
        unique (lost_report_id, other_report_id))
match_feedback(match_id, user_id, verdict text ('confirm'|'reject'), reason text null, created_at)
```
RLS: managers of either report can select rows of their reports, but the counterpart's personal data is never in the row; staff select all.

## Engine (job `match_report {report_id}`, owned by TASK-19)

1. **Chip**: if the report has a valid chip, any open report of the opposite side with the same chip → score 1.000, `chip_match = true`, `strength = 'strong'`, immediate `notify` type `match_chip` to the lost report's managers (bypasses quiet hours). A sighting with a chip match is still a chip match; reason `chip_sighting` tells the owner the animal may have moved.
2. **Candidates** (SQL `match_candidates(report_id)`): opposite side (lost ↔ found|sighted), status open/matched, moderation visible or held-by-org, same species, distance ≤ `matching.max_distance_km` (30) using exact points, time window: other.event_at ∈ [lost.event_at − 12 h, lost.event_at + `matching.max_days` (30) d], not previously rejected for the pair, excluding sex conflict (both known and different).
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

## Review RPCs (owned by TASK-20)

```ts
get_match_suggestions(p_lost_report_id) → MatchSuggestion[]
type MatchSuggestion = { match_id; score; strength; chip_match; reasons; state;
  other: Pick<PublicReport,'short_code'|'type'|'species'|'breed_codes'|'colours'|'size'|'sex'|'photos'|'event_at'|'area'> }
confirm_match(p_match_id) → { conversation_id }   // lost managers only; state → confirmed; lost status → matched;
                                                  // calls start_conversation (C9); notifies the other side
reject_match(p_match_id, p_reason?) → void        // state → rejected; match_feedback row; never shown again
```
Errors: `FORBIDDEN`, `CONFLICT` (already confirmed/rejected), `UNVERIFIED_EMAIL` (confirm opens chat).

Neither side sees contact data before confirmation (FR-008 R-008.5); after confirmation only what C9 exposes.

## Config keys

`matching.threshold` 0.5 · `matching.top_n` 10 · `matching.max_days` 30 · `matching.max_distance_km` 30 · `matching.distance_scale_km` 3 · `matching.weights` `{"distance":0.4,"time":0.2,"attributes":0.4}` · `matching.notify_min_strength` `good`.

## Example

```json
{ "match_id": "m1…", "score": 0.78, "strength": "good", "chip_match": false,
  "reasons": [{ "code": "distance", "band": "1to3" }, { "code": "time", "hours_band": "lt24" }, { "code": "colour", "overlap": 1 }],
  "other": { "short_code": "Hk3vT9qP", "type": "found", "species": "dog", "photos": [ … ] } }
```
