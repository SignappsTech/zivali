# ADR-019: Mobile offline data layer: one expo-sqlite store for drafts, public cache and outbox; OS geofences for local alerts

- Status: Accepted · Date: 2026-10-15 · Owner: Tech Lead
- Source: FR-041, FR-042, FR-043, NFR-OFFLINE, NFR-BATT, FR-006, FR-003 R-003.3, FR-037 R-037.5; stories TASK-85, TASK-86, TASK-87

## Context

People search for pets outdoors with weak signal. The app must (1) keep showing nearby reports offline, (2) let a finder create a found or sighted report offline and send it later exactly once, and (3) in M3 raise a gentle local alert near a lost pet's area using OS geofences. The cache may hold only public, fuzzed data; everything is wiped on logout; battery and data use stay low. The three features share one local store, so it must exist from the first mobile task (TASK-85 is the base for TASK-87).

## Decision

**Store: `expo-sqlite`** (already in the stack for the Supabase session via its localStorage polyfill). One database file `zivali.db` with versioned local migrations in `apps/mobile/lib/db/` (schema in contract C17):

| Table | Holds | Sensitive |
|---|---|---|
| `drafts` | in-progress report and pet forms (the user's own input) | own data |
| `outbox`, `outbox_photos` | queued found/sighted submissions, one row per idempotency key | own data |
| `reports_cache` | public report fields only (the `get_public_report` / `search_reports` whitelist), fuzzed area, thumbnail path | public |
| `cache_areas` | synced areas (home, current) with `since` cursors and last sync time | coarse (home area centre is the user's own setting) |
| `geofences`, `geofence_events` | registered regions and fired alerts (M3) | local only |

Files: thumbnails in `FileSystem.cacheDirectory/thumbs/` (purgeable), draft and outbox photos in `FileSystem.documentDirectory/{drafts,outbox}/<id>/` (not purgeable). Small preferences stay in `expo-sqlite/kv-store`; secrets (manage tokens) in `expo-secure-store`.

- **MMKV rejected**: faster key-value, but an extra native module and no queries; the cache needs bounding-box, age and size queries and transactional queue updates.
- **No generic query persistence**: TanStack Query's persister would write every query (chat, profile, matches) to disk. Instead, one explicit repository (`lib/data/reports.ts`) is the only path for report lists: online it fetches and upserts the cache, offline it reads SQLite. Private queries are never persisted. TanStack `onlineManager` is driven by `expo-network`; report queries use `networkMode: 'offlineFirst'`.

**Sync (TASK-85)**: new RPC `sync_public_reports(areas, since, limit)` returns upserts, removed ids and `server_time` (contract C4). Areas: the home area (profile, default 10 km) and the current area (last foreground location, 10 km). Refresh: on app foreground when the last sync is older than 15 minutes, on regaining an unmetered connection, and in the background with `expo-background-task` (OS-scheduled, minimum 15 minutes, unmetered networks only). Thumbnails download only on Wi-Fi unless the user allows mobile data. Limits from settings: 50 MB and 7 days by default; eviction oldest and farthest first; removed, closed, hidden and expired reports deleted on every sync.

**Outbox (TASK-86)**: every found/sighted submission goes through `submitReport()`, which writes the outbox row (id = client request id, payload, capture time, photos copied to the outbox folder) and returns at once. A sender runs on launch, resume and reconnect while the app is in the foreground (captcha may need the WebView): anonymous session if needed → `register_photo` + upload (deduped by hash) → `create_report` with `p_client_request_id = outbox.id` and `event_at = captured_at`. The server stores the first result for 24 hours (`client_requests`, C1), so any retry returns the same report and manage token; duplicates are impossible. Errors are classified (retry with backoff, `needs_action` for captcha or validation, `RATE_LIMITED` waits for `retry_after`); nothing is deleted without the user. Lost reports are not queued (they need an account and a connection, FR-042 edge case).

**Local proximity alerts (TASK-87, M3)**: `expo-location` geofencing (`startGeofencingAsync` + `expo-task-manager`), not continuous GPS. Up to 18 regions on iOS (OS limit 20, minus one "boundary" region around the user whose exit triggers re-selection, plus headroom), 50 on Android; nearest and most recent open LOST areas from the cache, radius = public fuzzed radius. The task handler works offline: checks the cache (still open), once per pet per area, daily cap (default 3) and quiet hours (cached from the profile), then shows a local notification via `expo-notifications` with a deep link to `/r/<code>`. Location never leaves the device. Requires an explicit opt-in with a primer for "Always" location; off switch, logout or a permission downgrade removes all geofences.

**Wipe**: `wipeLocalData()` (sign-out, account deletion, "Clear offline data" in settings) clears cache tables and thumbnails, stops geofencing, clears drafts; the outbox is offered for sending or deletion first (FR-042 AC#4).

## Alternatives

- WatermelonDB / RxDB sync engines: full offline-first sync of private data, far beyond this scope and a large dependency.
- Background location polling for proximity alerts: battery drain, store-review risk, violates NFR-BATT.
- Server push for proximity: needs the user's location on the server, violates FR-043 R-043.5.

## Consequences

- New Expo modules (all first-party): `expo-network`, `expo-background-task`, `expo-task-manager`; `expo-location` gains background permission only when the user opts in (M3).
- Store release (TASK-75): Google Play requires a background-location declaration and Apple reviews "Always" use; the opt-in and primer copy must match the declaration.
- The local schema is a contract (C17); changes go through local migrations, never by editing a released migration.
