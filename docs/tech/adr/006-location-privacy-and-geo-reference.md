# ADR-006: Exact points stay private; deterministic fuzz on write; GURS boundaries in PostGIS

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Amended 2026-10-15 (ADR-020): fuzzing runs in the API report service (same deterministic HMAC algorithm, secret `FUZZ_SECRET`) when a location is written; reads go through API serializers that never include `exact_point`; `geo_lookup` and other spatial queries are Prisma TypedSQL files in `apps/api/prisma/sql/`.
- Source: FR-004, P-3, NFR-PRIV, FR-029 R-029.5, brief §Maps and geo, R-011, R-019

## Context

Lost reports are often at the owner's home. Public views must show an area (LOST ≥ 500 m, FOUND/SIGHTED ≥ 150 m), identical on every view so averaging does not reveal the point. Ads and analytics need municipality and statistical region without calling an API.

## Decision

- `reports.exact_point geography(Point,4326)` is readable only by report managers, moderators and admins (base-table RLS). Public reads go through RPCs that never select it (ADR-003).
- On insert or location change, a trigger computes `public_point` and `public_radius_m`:
  - radius = `max(config min radius for type, requested radius)`; seed = `hmac_sha256(report_id, fuzz_secret)` (secret in Vault);
  - offset distance = `0.8 × radius × sqrt(u1)`, bearing = `360 × u2` (u1, u2 from the seed), then snapped to a 50 m grid;
  - the exact point is always inside the public circle; repeated reads return the same circle.
- Matching distances use exact points server-side; users see only distance bands (`< 1 km`, `1–3 km`, `3–10 km`, `> 10 km`).
- **Reference data**: Slovenian municipalities (212, "občine") and statistical regions (12) from the GURS Register of Spatial Units (open data; licence recorded in `supabase/seed/geo/LICENSE.md`, attribution in the footer if required), simplified to ~1–2 MB GeoJSON, loaded by a seed migration into `municipalities` and `regions` with GiST indexes. `geo_lookup(point)` returns `{ municipality_id, municipality_slug, region_id, region_slug, in_slovenia }`. Reports store `municipality_id` and `region_id` (coarse, used for ads, stats and analytics dimensions).
- Points outside Slovenia are accepted with `in_slovenia = false` (notice in UI), per FR-004 edge case.

## Alternatives

- Fuzz at read time with random noise: averaging attack.
- Separate private location table: more joins and RLS for no extra safety, because public reads never touch base tables.
- Reverse geocoding API for municipality: cost, latency and an external dependency for a static dataset.

## Consequences

- Fuzz parameters live in `app_config`; changing them recomputes `public_point` only on the next location update (documented).
- If the GURS licence turns out unsuitable, the fallback is user-selected region (R-019); the schema stays the same.
