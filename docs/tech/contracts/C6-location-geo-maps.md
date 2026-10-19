source: docs/04-technical-design.md§Data model, ADR-006, ADR-007; FR-004, FR-007, FR-017

# C6 Location, geo reference, fuzzing and map components

## Location payload

`{ lat: number; lng: number; accuracy_m?: number }` (WGS84). Lost reports add `requested_radius_m` (200–5000; omitted = the public radius is `fuzz.lost_min_radius_m`, 500 m, the P5 default). The place where a found animal is kept is never collected (FR-004 R-004.4).

**Radius decision (CH-302): 5 km, the P5 picker's range, not 20 km.** The requested radius only widens the public disc (`public_radius_m = greatest(min, requested)`, below); a disc above 5 km covers most of a statistical region and tells a finder nothing, while reach comes from the alert radius (1–25 km, C10) and Boost (25 km), not from this disc. Both clients already stop at 5 km (P5 stops 200 m … 5 km). The API still accepts up to 20 000 until TASK-29.18 narrows it; stored rows keep their value.

## Storage: the raw point is never stored (ADR-006 amended, CH-25)

`coarsenPoint({lat, lng}) → {lat, lng}` in `@zivali/validation/geo`: random offset of 20–30 m (`privacy.coarsen_min_m`/`coarsen_max_m`), bearing uniform, `crypto.getRandomValues`, result rounded to 6 decimals. Applied **once per write**, twice in the chain:
1. Client (LocationPicker `onChange` and the report/alert form): the value handed to the form, draft, offline outbox (C17) and request is already coarsened; the raw GPS/pin/EXIF value lives only in component state.
2. API (`ReportsDomain.createReport/updateReport`, alert subscription create/update): coarsens again before the insert; never trusts that the client did. An update that carries the stored point unchanged (or no `location`) keeps it; a different point is coarsened anew. Never re-randomised on read.

`reports.exact_point` stores the coarsened private point; `public_point` derives from it (below). The owner sees the stored point on the map labelled "približno" (`location.approximate_label`, P5/P9); chat location messages (R-004.3) send the coarsened stored point too. After `retention.exact_point_blur_days` (30) from closure the stored point is replaced by `public_point` (ADR-006, job `retention.blur_location`). Request bodies containing points are never logged.

## Public blur (API, `lib/fuzz.ts`, applied by the report service whenever a location is written, from the coarsened stored point)

| Config key | Default |
|---|---|
| `fuzz.lost_min_radius_m` | 500 |
| `fuzz.found_min_radius_m` | 150 |
| `fuzz.grid_m` | 50 |

`public_radius_m = greatest(min_radius(type), coalesce(requested_radius_m, 0))`. The public circle **centre stays fixed when only the radius changes**: the offset does not depend on `requested_radius_m`. Seed = `HMAC-SHA256(FUZZ_SECRET, report_id + ':' + lat6 + ':' + lng6)` where lat6/lng6 are the stored (coarsened) point rounded to 6 decimals (Node `crypto`; u and the bearing fraction u2 from the first 8 bytes). Offset distance `D = 0.75 × min_radius(type) × sqrt(0.16 + 0.84·u)`, bearing `360° × u2`, snapped to `fuzz.grid_m` (lost reports end up 150–410 m from the stored point). Deterministic per report and stored point; the stored point is always inside the circle. The public `municipality_slug` and `region_slug` derive from `public_point`, never from the stored point. `FUZZ_SECRET` rotation: rotate only on a leak; existing circles stay as stored (not recomputed), only new or moved points use the new secret. Distances shown to users are bands only: `lt1`, `1to3`, `3to10`, `gt10` km.

**Residual risk (CH-147)**: the offset is fixed per report, but averaging the public centres of about 10 reports filed from one spot gets within about 24 m (median) of the stored point. The 150 m found radius is therefore the real privacy limit, not the offset; do not describe the blur as hiding the location more precisely than that.

Exact point sharing (R-004.3): only inside a chat as a `location` message the manager sends explicitly (C9).

## Geo reference

Prisma models `regions` and `municipalities` (`prisma/schemas/geo.prisma`, schema `app`; `geom` is `Unsupported("geography(MultiPolygon,4326)")` with a GiST index created in the migration SQL):

```sql
regions(id smallint, slug text unique, name_sl, name_en, geom geography(MultiPolygon))        -- 12 statistical regions
municipalities(id smallint, slug text unique, name_sl, name_en, region_id, geom geography(MultiPolygon)) -- 212
```

Lookup `geoLookup(lat, lng)` in `lib/geo.ts` runs the query below through `$queryRaw` with `Prisma.sql` (TypedSQL is dropped here: it needs a live database at build time); `lat`/`lng` are validated with `LatLng` before the SQL. The `geography` type is `extensions.geography`, so casts are written `::extensions.geography`:

```sql
select m.id as municipality_id, m.slug as municipality_slug, r.id as region_id, r.slug as region_slug
from app.municipalities m join app.regions r on r.id = m.region_id
where st_covers(m.geom, st_setsrid(st_makepoint($2, $1), 4326)::extensions.geography)
order by m.id limit 1;            -- tie-break: GURS polygons of Ivančna Gorica and Žužemberk overlap by about 330 m²
```
No row → `in_slovenia = false`. Loading: the TASK-6.1 files stay in `supabase/seed/geo/` (EWKT SQL generated by `scripts/geo-to-sql.mjs`); the geo migration creates the tables and the Prisma seeder `prisma/seeders/01-geo.seeder.ts` executes that SQL (idempotent: upsert by id, not truncate and insert, so it is cascade-safe) so `prisma migrate reset` and staging seeding load the same data.
Snapshot files in `supabase/seed/geo/` (full format in `supabase/seed/geo/LICENSE.md`): `places.ndjson.gz` (one JSON object per line; `id` decimal string, `point` `[lng,lat]`, `geom` GeoJSON MultiPolygon) and `addresses.tsv.gz` (header `place_id number suffix lng lat`).
Slugs are ASCII lower-case (`ljubljana`, `osrednjeslovenska`) and are what analytics sends (C12). Data: GURS Register of Spatial Units, simplified GeoJSON in `supabase/seed/geo/`, licence and attribution in `supabase/seed/geo/LICENSE.md`. The report service stores `municipality_id`, `region_id` and `in_slovenia` with the fuzzed location.

## Geocoder (our own, on GURS data; ADR-007 revised 2026-10-15)

No third-party geocoder. Search and reverse lookups run in our API on GURS registers loaded into Postgres.

### Data (Prisma models in `prisma/schemas/geo.prisma`, schema `app`; seeder `prisma/seeders/02-geo-places.seeder.ts`)

```sql
geo_places(
  id bigint primary key,              -- GURS EID of the settlement, district or street (stable across refreshes)
  kind smallint not null,             -- 1 settlement (RPE NASELJA), 2 district (RPE CETRTNE_SKUPNOSTI), 3 street (RPE ULICE)
  name text not null,                 -- official Slovenian name; districts without the "Četrtna skupnost ", "Četrt ", "Mestna skupnost " prefix
  alt_name text null,                 -- NAZIV_DJ: official Italian or Hungarian name in bilingual areas
  search text not null, search_alt text null,   -- normalisePlace(name), normalisePlace(alt_name)
  municipality_id smallint not null references municipalities,
  settlement_id bigint null,          -- streets: their settlement
  weight int not null default 0,      -- house numbers in the place (ranks "Ljubljana" above "Ljubno")
  point geography(Point,4326) not null,           -- settlement and district: inner point; street: a point on the street
  geom geography(MultiPolygon,4326) null)         -- settlements and districts only, simplified
  -- indexes: GIN (search gin_trgm_ops), GIN (search_alt gin_trgm_ops), GiST (geom)
geo_addresses(
  place_id bigint not null,           -- the street, or the settlement for villages without streets ("Vrhpolje 12")
  number smallint not null, suffix text not null default '',   -- 12, 'a'
  point geography(Point,4326) not null,
  primary key (place_id, number, suffix))      -- no spatial index: reverse lookups never return house numbers
```
Planned (CH-477; API TASK-37.8, web TASK-37.9): add `id` (smallint) to the `GET /v1/shelters/municipalities` items (chosen over a new geo reference endpoint), because `MunicipalityRef` is slug and name only while C14 targets by `municipality_ids`. The web ad editor (TASK-37.3) ships the 212 GURS ids and names as a static list (`apps/web/components/admin/ads/municipalities.ts`, a test keeps it equal to `supabase/seed/geo/municipalities.geojson`); the copy goes when the id is served.

Migration enables `pg_trgm` in schema `extensions`. Both models are static reference data with no personal data (data-inventory entries like `municipalities`). Loading: the seeder reads the gzipped snapshot in `supabase/seed/geo/` (written by `scripts/geo-places.mjs`, licence in `supabase/seed/geo/LICENSE.md`) with `node:zlib`, truncates and inserts in batches (idempotent). Measured size: places 7.8 MB, addresses about 54 MB (ADR-007).

`normalisePlace(s)` (in `@zivali/validation`, the generator uses the same expression): `s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()`, so "Šentvid", "sentvid" and "SENTVID" match.

### `POST /v1/geo/search` (optionalAuth; `rateLimit('geo', { limit: 60, window: '1m', key: 'ip' })` and the same per device id)

Request `{ q: string /* 2–100 chars */, near?: { lat: number; lng: number } }` → `200 { items: Place[] }` (0–5). Errors: `VALIDATION`, `RATE_LIMITED`.

1. Parse: split `q` at the first comma into `head` and an optional `tail` (settlement or municipality qualifier, "Cankarjeva 5, Kranj"). A trailing `(\d{1,4})\s?([a-z])?` in `head` is the house number; the rest is the place text. Normalise both with `normalisePlace`.
2. Candidates from `geo_places` where `search` or `search_alt` matches the place text by prefix (`like 'text%'`) or trigram (`%`, default threshold 0.3).
3. Rank: exact match, then prefix match, then `similarity` (desc); then, when `tail` is given, places whose settlement or municipality matches it; then `weight` (desc); then distance to `near` (asc). Streets with the same name in many settlements ("Cankarjeva ulica") are told apart by `tail`, `near` and the label.
4. With a house number: for the best street or settlement candidates, look up `geo_addresses` (place_id, number, suffix); a hit becomes the first result with `kind: 'address'`; no hit keeps the street or settlement result.
5. Return at most 5, without duplicates.

### `POST /v1/geo/reverse` (same guards)

Request `{ lat: number, lng: number }` → `200 { place: Place | null }`. `null` when the point is outside Slovenia (no municipality covers it).
Lookup: the district covering the point, else the settlement covering it (`st_covers`, GiST on `geom`), plus that place's municipality. Label: `<district or settlement>, <municipality name>`; just the name when both are equal ("Kranj"). If no settlement covers the point (gaps from simplification), the municipality from `geoLookup` alone (`kind: 'municipality'`). Never returns a street or house number.

### Types and client (`@zivali/api/geocode`)

```ts
type Place = {
  label: string                       // "Trubarjeva cesta 5, Ljubljana" | "Trubarjeva cesta, Ljubljana" | "Šiška, Ljubljana" | "Vrhpolje, Kamnik"
  lat: number; lng: number            // the point to move the map or pin to
  kind: 'address' | 'street' | 'settlement' | 'district' | 'municipality'
  municipality_slug: string
}
searchPlaces(api, q: string, opts?: { near?: { lat: number; lng: number }; signal?: AbortSignal }): Promise<Place[]>
reversePlace(api, point: { lat: number; lng: number }, opts?: { signal?: AbortSignal }): Promise<Place | null>
```
UI: debounce 300 ms, minimum 3 characters, abort the previous request; labels are proper names and are the same in SL and EN (no locale parameter). Attribution line `location.search_attribution` under the results (content P5; GURS, data type, data-state date, CC BY 4.0). Tests and fixtures use `createMockApi()` like every other domain.

### Privacy rules

- Queries and points only in POST bodies (never in URLs, so never in Caddy or API access logs); the request logger logs the route pattern only, never bodies; responses `Cache-Control: no-store`.
- Nothing from a search or reverse lookup is stored; labels are display hints and never saved with a report (the report keeps only `municipality_id`, `region_id`, `in_slovenia`).
- No external geocoder, so the point is never sent to a third party. Search and reverse accept the client's raw or coarsened point (lookups are not stored); the point saved with a report is always the coarsened one (above).
- Read endpoints that take a location (`GET /v1/reports?near=`, `GET /v1/shelters/responsible`, C4/C18) are the one exception to "POST only": see C4 §REST (client rounds to 2 decimals, about 1 km; access logs keep route patterns only).

## Shared map components (same names and props on web and mobile)

```ts
type LatLng = { lat: number; lng: number }
type Marker = { id: string; position: LatLng; kind: 'lost'|'found'|'sighted'|'reunited'|'me'; label: string /* a11y */; boosted?: boolean; photoUrl?: string /* public 1:1 thumb, for the system §9 photo avatar */ }
type Circle = { id: string; center: LatLng; radiusM: number; kind: 'area'|'alert' }
type Path   = { id: string; points: LatLng[]; numbered?: boolean }              // FR-017 (M3)

<MapView
  markers?: Marker[] cluster?: boolean circles?: Circle[] paths?: Path[]
  initialView?: { center: LatLng; zoom: number } | { bbox: [number,number,number,number] }
  onViewportChange?(bbox: [w,s,e,n], zoom: number): void        // debounced 300 ms
  onMarkerPress?(id: string): void
  textAlternative: ReactNode                                     // required: list rendered for SR/keyboard users (web: visually adjacent; mobile: accessible list toggle)
  bottomInset?: number                                           // px an overlay covers at the bottom (e.g. the P4 list sheet at its current snap): the attribution and the list overlay's end padding stay above it, so it is never covered. Mobile has it (TASK-15.4); the web sheet pattern below `lg` needs the same
  height?: number | string  testID?: string />

<LocationPicker
  value?: { point: LatLng; radiusM?: number }
  mode: 'lost' | 'found' | 'sighted' | 'alert'                   // lost/alert show radius control (lost 200 m–5 km on the P5 stops, alert 1–25 km)
  suggested?: LatLng & { source: 'exif' | 'gps' }                // shown as "Use photo location"
  onChange(v: { point: LatLng; radiusM?: number; source: 'gps'|'pin'|'search'|'exif' }): void
  permissionDenied?: boolean                                     // shows explanation; pin and search still work
/>

useFuzzedArea(report: PublicReport): Circle                      // convenience for detail pages
```

Mobile `MapView` as built (TASK-15.5, CH-302): optional picker hooks `ref` (`moveTo(center, zoom)`), `onCameraChange({ center, zoom, moving })`, `label`/`hint` and `children` (an overlay under the list). `usePlaceSearch` also returns `searched` (results for the current text are in).

Web `MapView` as built (TASK-15.2, CH-391), with the mobile names: `Marker.photoUrl?` (thumbnail for the system §9 photo avatar), `Circle.status?: 'lost' | 'found' | 'sighted'` (area hue, system §9), `detail?` (`buildMapStyle` detail), `onCameraChange?({ center, zoom, moving })`, `label?`, `hint?`, `bottomInset?`, `children` (overlays) and `ref: MapViewHandle { moveTo(center, zoom?) }`; `cluster` only takes effect from 25 report markers (P4 "Many results"). `useFuzzedArea` is not built yet (TASK-18.2 can add it).

Web `LocationPicker` adds `variant?: 'inline' | 'dialog'` (P5 E2, TASK-15.3, CH-404): in `dialog` the question is the caller's `DialogTitle` (h2 30/36) and the map is 300 px with radius 20; the caller wraps it in `DialogContent`. `inline` stays the default; props otherwise as above.

**Planned (CH-305, CH-410; web TASK-18.14, mobile TASK-18.16):**
- `Marker.kind` adds `'pin'`: the system §9 pin (48 px primary head with tail, paw) for the **manager's own stored point** only (`ReportOwnerView.location`, P9 W5 "Vidno samo vam"); never for a public point or another person's report. The `me` dot stays the device location. Today both clients draw the owner's point as the `me` dot with `location.exact_own` as text.
- `MapView` adds `onTilesStatus?(status: 'ready' | 'error'): void`: `ready` once the style and the first tiles have loaded (web `load`, mobile `onDidFinishLoadingMap`), `error` on a style or tile source failure (web `error` event for the style or a tile source, mobile `onDidFailLoadingMap`). P9 S5 hides "Odpri zemljevid" until `ready` and collapses the map block on `error`.
- Mobile `Circle.status` (as web, CH-391) so found and sighted area discs carry their status tint instead of `marker-area`.
- Design to confirm (design-lead CHANGE): on the detail map a lost marker's fixed 96 px disc draws under the to-scale area circle; proposal: with `detail` and a Circle for the same report, the lost marker draws its avatar only and the to-scale circle is the area.

Until `photoUrl` is drawn, mobile renders the avatar as a 44 px `status-<kind>-subtle` disc inside the 3 px status ring and halo; found and sighted then differ by ring hue only on the map (the list carries the status word) (CH-276).
- Style: `buildMapStyle(mode)` from `@zivali/tokens/map-style` (OpenFreeMap "positron" recoloured with the `map-*` tokens, calm layer set; `detail: true` on detail maps). Markers per `docs/design/system.md` §9: photo avatar with a `marker-<kind>` ring for found/sighted, lost as a fuzzed `marker-area` disc with avatar (never an exact pin), clusters as count discs, "you" dot only after permission; status is never colour alone. Attribution always visible.
- Keyboard (web): map focusable, arrow keys pan, +/- zoom; markers reachable through the text alternative list.
- Locations outside Slovenia: picker shows a notice (FR-004 edge).

## Sightings heatmap (Premium search plan, M4, TASK-83; PRD R-026.8)

- **What**: the density of same-species `found` and `sighted` reports in the search area since the loss, for the owner of a lost report. Area = a circle on the lost report's public point, default the owner's alert radius (C10), at most 25 km. Window = the lost report's `event_at` … now.
- **Positions**: `public_point` only (P-3; never `exact_point`, whoever asks). Cells: a square grid of 250 m in EPSG:3035 (`st_snaptogrid` on `st_transform`), never smaller, so a cell never singles out a fuzzed point.
- **Weight** per sighting: the C8 match score with this lost report (0…1; 0.3 when there is no match row) × recency `exp(-age_days / 7)`; confirmed or linked sightings (`linked_report_id` = this report, or match `confirmed`) are flagged; sightings whose match the owner rejected ("not my pet", C8 `rejected`) are excluded.
- **Response** `GET /v1/reports/:code/search-plan/heatmap` (manager of the lost report with `hasEntitlement(user, 'premium')`, else `UPGRADE_REQUIRED`; `FORBIDDEN`, `NOT_FOUND`; lost reports only, else `VALIDATION`): `{ generated_at, radius_km, cells: { center: { lat, lng }, weight: number /* 0…1, normalised */, count: number, has_confirmed: boolean }[] | null, top_areas: { label: string /* settlement name from the geo lookup of the cell centre (§Geo reference) */, count: number, latest_at: string, has_confirmed: boolean }[] }`. Fewer than 3 sightings → `cells: null`, list only. `top_areas`: the 5 heaviest cells merged by place label, ranked by weight: the accessible alternative to the map layer.
- **Cache**: one row per report (`search_plan_heatmaps(report_id pk → reports on delete cascade, payload jsonb, generated_at)`), rebuilt on read when older than 15 min, and queued (`search_plan.heatmap { report_id }`) when a sighting is linked to the report. No AI call.
- **Free stays free**: the public map layer and the sighting trail of a report are unchanged and need no entitlement.

## Example

```tsx
<LocationPicker mode="lost" value={v} suggested={exif && { ...exif, source: 'exif' }} onChange={setV} />
```

```json
// POST /v1/geo/search  { "q": "trubarjeva 5, ljubljana", "near": { "lat": 46.05, "lng": 14.51 } } → 200
{ "items": [
  { "label": "Trubarjeva cesta 5, Ljubljana", "lat": 46.05169, "lng": 14.50701, "kind": "address", "municipality_slug": "ljubljana" },
  { "label": "Trubarjeva cesta, Ljubljana", "lat": 46.05231, "lng": 14.50952, "kind": "street", "municipality_slug": "ljubljana" }
] }
// POST /v1/geo/reverse  { "lat": 46.0702, "lng": 14.4875 } → 200
{ "place": { "label": "Šiška, Ljubljana", "lat": 46.0739, "lng": 14.4851, "kind": "district", "municipality_slug": "ljubljana" } }
// POST /v1/geo/search  { "q": "x" } → 400
{ "error": { "code": "VALIDATION", "message": "Invalid request", "issues": [{ "path": "q", "message": "Too short" }] } }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-39: name the geocoder snapshot files places.ndjson.gz and addresses.tsv.gz |
| 1.2 | 2026-10-15 | CH-117: seeder upserts; geo lookup via `$queryRaw` + `Prisma.sql` (no TypedSQL), `extensions.geography`, lat/lng validated with `LatLng` first |
| 1.3 | 2026-10-15 | CH-131: fixed public centre when only the radius changes, seed = HMAC(FUZZ_SECRET, report_id:lat6:lng6), D = 0.75 × min radius × sqrt(0.16 + 0.84u), public slugs from public_point, FUZZ_SECRET rotation note |
| 1.4 | 2026-10-18 | CH-147: lost offset range 150–410 m; residual risk of averaging ~10 reports from one spot (~24 m median), the 150 m found radius is the real limit |
| 1.5 | 2026-10-18 | CH-275: MapView.bottomInset; CH-276: Marker.photoUrl |
| 1.6 | 2026-10-18 | CH-302: mobile MapView picker hooks (ref, onCameraChange, label/hint, children), usePlaceSearch `searched` |
| 1.7 | 2026-10-19 | CH-638: §Sightings heatmap for the Premium search plan (TASK-83): public points, 250 m cells, weights, top areas, 15 min cache |
| 1.8 | 2026-10-19 | CH-391: web MapView props as built; CH-404: web LocationPicker `variant`; CH-477: planned municipality `id` |
| 1.9 | 2026-10-19 | CH-302: lost radius 200 m–5 km (P5), why not 20 km; CH-305, CH-410: planned `Marker.kind 'pin'` (own point only), `onTilesStatus`, mobile `Circle.status`, lost disc on the detail circle to design; build tasks named |
