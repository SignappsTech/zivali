# ADR-007: MapLibre + OpenFreeMap tiles; MapTiler geocoding with Photon fallback

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: brief §Maps and geo (no Google Maps), FR-004, FR-007, NFR-PERF, NFR-A11Y

## Decision

- **Web**: `maplibre-gl` 6, loaded only on map routes (dynamic import, client component) so it stays out of the initial JS budget.
- **Mobile**: `@maplibre/maplibre-react-native` 11 with its Expo config plugin (requires a development build, not Expo Go).
- **Tiles**: OpenFreeMap vector tiles (no key). Our style is the OpenFreeMap "positron" style recoloured by `buildMapStyle(mode)` from `@zivali/tokens/map-style` (`map-*` tokens, light and dark; calm layer set per `docs/design/system.md` §9). Attribution (© OpenStreetMap contributors, OpenFreeMap, MapTiler when used) is always visible.
- **Clustering**: MapLibre GeoJSON source clustering on both platforms (no extra library). Markers follow the design system: photo avatars with a status ring, lost reports as a fuzzed area disc (never an exact pin), clusters as count discs; status is never colour alone.
- **Geocoding** in `@zivali/api/geocode` with one interface `search(query, {lang, near})` and `reverse(point)`:
  - `maptiler` when `MAPTILER_API_KEY` is set (country `si`, language sl/en; the key is a public, domain-restricted browser key),
  - `photon` (komoot public instance, Slovenia bounding box) as fallback and default for development,
  - `mock` in tests (fixtures for Ljubljana, Maribor, Kranj, Koper).
  Geocoded addresses are display hints only and are never stored.
- **Shared component API** (`MapView`, `LocationPicker`, `useFuzzedArea`) is specified in contract C6; web and mobile implement the same props.

## Alternatives

- Google Maps / Mapbox: excluded by the brief (cost, keys).
- Self-hosted tiles: unnecessary for pilot traffic; OpenFreeMap is free and keyless.

## Consequences

- Mobile map work needs Android dev builds (EAS cloud with the existing Expo token, or a local Android SDK on Windows); iOS builds wait for the Apple account (Q-007).
- Photon's public instance has a fair-use policy: production should run with a MapTiler key (free tier) or a self-hosted Photon later.
