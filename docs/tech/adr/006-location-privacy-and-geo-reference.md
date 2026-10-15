# ADR-006: Raw points are never stored; one 20–30 m coarsening at write; deterministic public blur; GURS boundaries in PostGIS

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Amended 2026-10-15 (ADR-020): fuzzing runs in the API report service (same deterministic HMAC algorithm, secret `FUZZ_SECRET`) when a location is written; reads go through API serializers that never include `exact_point`; `geo_lookup` and other spatial queries are Prisma TypedSQL files in `apps/api/prisma/sql/`.
- Amended 2026-10-15 (client decision, CH-25, CH-24): **the raw GPS/pin point is never stored.** Every report and user location (report location, alert subscription centre) is coarsened once at write time by a random 20–30 m offset, on the device before sending and again on the server (defence in depth); the public blur derives from the stored (coarsened) point; the stored point is itself blurred N days after closure.
- Source: FR-004, P-3, NFR-PRIV, FR-029 R-029.5, brief §Maps and geo, R-011, R-019

## Context

Lost reports are often at the owner's home. Public views must show an area (LOST ≥ 500 m, FOUND/SIGHTED ≥ 150 m), identical on every view so averaging does not reveal the point. Ads and analytics need municipality and statistical region without calling an API.

## Decision

- **Coarsening (never store the raw point)**: `coarsenPoint(lat, lng)` in `@zivali/validation/geo` (shared by the clients and the API): distance `20 + 10 × u1` m (`app_config` `privacy.coarsen_min_m` 20, `privacy.coarsen_max_m` 30), bearing `360° × u2`, `u1, u2` from `crypto.getRandomValues` (not seeded, so it cannot be recomputed from the raw point). It runs (1) on the device in the LocationPicker/report form before the point is put in a request or draft (GPS, pin, search and EXIF suggestions alike), (2) again in the API report/alert service when a location is written. It runs **once per write**: a PATCH or sync that does not change the location keeps the stored point; a changed location is coarsened anew. The client's coarsened point is the only point that ever crosses the network, so no raw point reaches logs, drafts, the offline outbox (C17) or the database; request bodies with points are never logged (route pattern only). Total displacement from the raw point is therefore 40–60 m; the picker shows the owner the stored point labelled "približno" (content P5/P9).
- `reports.exact_point geography(Point,4326)` (column name kept to avoid a migration churn) holds that **coarsened private point**, readable only by report managers, moderators and admins (API serializers; deny-all RLS, ADR-021). Public reads never select it.
- On insert or location change, the report service computes `public_point` and `public_radius_m` **from the stored coarsened point**:
  - radius = `max(config min radius for type, requested radius)`; seed = `hmac_sha256(report_id, fuzz_secret)` (secret in the environment, `FUZZ_SECRET`);
  - offset distance = `0.8 × radius × sqrt(u1)`, bearing = `360 × u2` (u1, u2 from the seed), then snapped to a 50 m grid;
  - the stored point is always inside the public circle; repeated reads return the same circle and the same coarsened point.
- **Post-closure blur (CH-24)**: `retention.blur_location` (pg-boss, daily, ADR-022) sets `exact_point = public_point` for reports closed or reunited more than `retention.exact_point_blur_days` ago (default 30, lawyer to confirm in the retention table) and keeps only the blurred point and the area label (`municipality_id`); the circle is unchanged. The existing 12-month purge (04 §Deletion and retention) still nulls the remaining point. Job tests below.
- Matching distances use the stored (coarsened) points server-side; users see only distance bands (`< 1 km`, `1–3 km`, `3–10 km`, `> 10 km`).
- **Reference data**: Slovenian municipalities (212, "občine") and statistical regions (12) from the GURS Register of Spatial Units (open data; licence recorded in `supabase/seed/geo/LICENSE.md`, attribution in the footer if required), simplified to ~1–2 MB GeoJSON, loaded by a seed migration into `municipalities` and `regions` with GiST indexes. `geo_lookup(point)` returns `{ municipality_id, municipality_slug, region_id, region_slug, in_slovenia }`. Reports store `municipality_id` and `region_id` (coarse, used for ads, stats and analytics dimensions).
- Points outside Slovenia are accepted with `in_slovenia = false` (notice in UI), per FR-004 edge case.

## Alternatives

- Fuzz at read time with random noise: averaging attack.
- Store the raw point and only coarsen on display, or coarsen with a deterministic function of the raw point: a leak or a breach would expose the home location (client decision: data minimisation).
- Coarsen on the device only (the server could not vouch for it) or on the server only (the raw point would travel and could be logged): both, hence defence in depth.
- Separate private location table: more joins and RLS for no extra safety, because public reads never touch base tables.
- Reverse geocoding API for municipality: cost, latency and an external dependency for a static dataset.

## Consequences

- Tests (owned by TASK-6.6, TASK-29.2, TASK-15.3/15.5, the retention job): (a) `coarsenPoint` distance is always 20–30 m (10 000 samples) and is not repeatable; (b) API: after `POST /v1/reports` the stored point differs from the received one by 20–30 m and no table column or job payload holds the received value; (c) repeated `GET` and `PATCH` without a location change return and keep the same stored point and the same public circle; (d) a changed location is coarsened anew; (e) log capture shows no coordinates for report and alert writes; (f) pickers hand `onChange` a coarsened point; (g) the retention job blurs only reports closed longer ago than N days.
- Cost: matching and "distance bands" can be off by up to ~60 m; irrelevant at the 1 km band size, and invisible to users.
- Fuzz parameters live in `app_config`; changing them recomputes `public_point` only on the next location update (documented).
- If the GURS licence turns out unsuitable, the fallback is user-selected region (R-019); the schema stays the same.
