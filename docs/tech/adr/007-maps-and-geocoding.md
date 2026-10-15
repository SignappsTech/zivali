# ADR-007: MapLibre + OpenFreeMap tiles; our own geocoder on GURS address data in Postgres

- Status: Accepted · Date: 2026-10-14 · Revised 2026-10-15 (geocoding: MapTiler and Photon replaced by our own GURS geocoder) · Owner: Tech Lead
- Source: brief §Maps and geo (no Google Maps), budget about €5–10/month, FR-004, FR-007, NFR-PERF, NFR-A11Y, NFR-PRIV, lawyer briefing LQ-21, LQ-63, LQ-64, CD-09

## Context (revision)

- The MapTiler Cloud Free plan is "for testing, PoC, prototyping, personal, or non-commercial use" (pricing page, checked 2026-10-15). Commercial use needs Flex at about $30/month, more than the whole hosting budget.
- LQ-21: the client sent the exact chosen point to MapTiler (Switzerland) for reverse geocoding. A third party receiving exact points, which are often near the owner's home, is the privacy risk the fuzzing exists to avoid.
- GURS publishes the official registers under CC BY 4.0 with commercial use allowed and free download (https://www.e-prostor.gov.si/en/access-to-geodetic-data/), from the same WFS services TASK-6.1 already uses. Counts on 2026-10-15: `SI.GURS.RPE:NASELJA` 6,035 settlement polygons, `SI.GURS.RPE:ULICE` 10,499 street lines, `SI.GURS.RPE:CETRTNE_SKUPNOSTI` 65 city districts (Ljubljana 17, Maribor 11, Celje 10 …), `SI.GURS.KN:HISNE_STEVILKE` 580,251 house-number points (`SI.GURS.RN:REGISTER_NASLOVOV` has 1,102,986 rows because it repeats each house number per flat; not needed). Names include the official Italian and Hungarian forms in the bilingual areas (`NAZIV_DJ`, 685 places).

## Decision

- **Web**: `maplibre-gl` 6, loaded only on map routes (dynamic import, client component) so it stays out of the initial JS budget.
- **Mobile**: `@maplibre/maplibre-react-native` 11 with its Expo config plugin (requires a development build, not Expo Go).
- **Tiles**: OpenFreeMap vector tiles (no key). Our style is the OpenFreeMap "positron" style recoloured by `buildMapStyle(mode)` from `@zivali/tokens/map-style` (`map-*` tokens, light and dark; calm layer set per `docs/design/system.md` §9). Map attribution (© OpenStreetMap contributors, OpenFreeMap) is always visible.
- **Clustering**: MapLibre GeoJSON source clustering on both platforms (no extra library). Markers follow the design system: photo avatars with a status ring, lost reports as a fuzzed area disc (never an exact pin), clusters as count discs; status is never colour alone.
- **Geocoding: our own, in the API, on GURS data** (C6):
  - Data: a generator (`scripts/geo-places.mjs`, same approach as TASK-6.1) downloads the four GURS layers once and commits a dated, gzipped snapshot to `supabase/seed/geo/`; seeder `02-geo-places` loads it into `app.geo_places` (settlements and districts with a simplified polygon and an inner point; streets with one point on the street) and `app.geo_addresses` (house numbers: place, number, suffix, point).
  - Forward search `POST /v1/geo/search`: names normalised without diacritics, `pg_trgm` GIN index, house number parsed from the query, ranking exact → prefix → trigram similarity → size of the place (house-number count) → distance to the current map centre. At most 5 results.
  - Reverse `POST /v1/geo/reverse`: the district or settlement polygon that covers the point (`st_covers`, GiST), returned as an area label ("Šiška, Ljubljana"). Never a street or house number: it is an area hint, not an address.
  - Privacy: queries and points reach only our API (Hetzner, EU) and our database (Supabase, Frankfurt). They travel in POST bodies, so they never appear in URLs or access logs; they are never logged or stored. No third party receives a point, so LQ-21 no longer applies and no rounding is needed.
  - Visitors and anonymous finders can use it (optional auth), rate limited per hashed IP and device id.
  - Attribution under the results: GURS, data type, data-state date and the CC BY 4.0 link (`supabase/seed/geo/LICENSE.md`).
- **Shared component API** (`MapView`, `LocationPicker`, `useFuzzedArea`) is specified in contract C6; web and mobile implement the same props.

### Size (measured 2026-10-15)

Prototype load of the real GURS layers (house numbers: a 20,000-row sample, extrapolated linearly) into `supabase/postgres:17.11.0.004` with the proposed tables and indexes:

| Table | Rows | Size incl. indexes | Notes |
|---|---|---|---|
| `geo_places` | 16,598 (6,035 settlements, 65 districts, 10,498 streets) | **7.8 MB** | settlement polygons simplified to 12 % (mean displacement 18 m); about 5.5 MB at 5 % (46 m); trigram GIN 1.7 MB |
| `geo_addresses` | 580,251 | **about 54 MB** | 92 bytes/row with a geography point and a b-tree on (place, number); 44 MB with two float8 columns; a GiST for nearest-house reverse would add about 50 MB and is not needed |
| Total | | **about 60 MB** | about 12 % of the Supabase Free 500 MB database |

Query cost in the prototype: trigram search 3.6 ms, polygon cover lookup under 1 ms. Committed snapshot: about 1 MB (places) and 5 MB (house numbers), gzipped.

## Alternatives (checked 2026-10-15)

| Option | Commercial use | Free limits | Data and privacy | Verdict |
|---|---|---|---|---|
| MapTiler Cloud Free | No ("testing, PoC, prototyping, personal, or non-commercial") | - | exact point to Switzerland from the client | rejected; Flex (about $30/month) only as a last resort |
| Geoapify Free | Yes, "including in production" (FAQ) | 3,000 credits/day, 5 requests/s, soft limits | KEPTAGO LTD, Cyprus (EU); Geoapify and OSM attribution required; no DPA in the terms | first fallback if ever needed: called from the API, never from the client, point rounded first |
| LocationIQ Free | "Limited commercial use" with a prominent "Search by LocationIQ.com" link | 5,000/day, 2/s, 60/min | non-EU company (transfer) | second fallback |
| Photon public instance (komoot) | not stated; "extensive usage will be throttled", no availability guarantee | - | Germany | dropped (was development only, CD-09) |
| Self-hosted Photon or Nominatim | Yes | - | our server | too heavy for the 4 GB VPS for little gain over GURS |
| **Own geocoder on GURS data** | Yes (CC BY 4.0) | our database | no third party | **chosen** |

## Consequences

- No points of interest (parks, shops, "Tivoli"): only official names (settlements, city districts, streets, house numbers). GPS and the pin stay the primary input; search is a shortcut. If feedback shows landmarks are needed, add named OSM places from the Geofabrik Slovenia extract to `geo_places` first (ODbL: attribution, and the share-alike terms apply to that derived table); a server-side Geoapify fallback second; MapTiler Flex only if both fail.
- Data refresh is a generator re-run (yearly or on demand) with a new data-state date in the attribution.
- Database budget: if the Supabase database passes 400 MB, drop `geo_addresses` first (one migration; search falls back to street level).
- No new dependency: `pg_trgm` is a Postgres extension available on Supabase; mapshaper runs one-off through `npx` in the generator, as in TASK-6.1; gzip through `node:zlib`.
- Environment: `MAPTILER_API_KEY`, `NEXT_PUBLIC_MAPTILER_KEY`, `EXPO_PUBLIC_MAPTILER_KEY`, `NEXT_PUBLIC_GEOCODER` and `EXPO_PUBLIC_GEOCODER` are removed; the client geocoder is a normal `@zivali/api` module (mocked in tests like every other domain). The CSP `connect-src` no longer lists MapTiler or Photon.
- Search needs a connection (mobile offline shows the pin and GPS only), as before.
- Mobile map work needs Android dev builds (EAS cloud with the existing Expo token, or a local Android SDK on Windows); iOS builds wait for the Apple account (Q-007).
