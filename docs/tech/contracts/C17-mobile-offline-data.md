source: docs/04-technical-design.md§Interfaces and contracts (C17), ADR-019; FR-041, FR-042, FR-043, NFR-OFFLINE, NFR-BATT

# C17 Mobile offline data layer (`apps/mobile/lib/db`, `lib/data`, `lib/offline`)

## Local schema (expo-sqlite, database `zivali.db`)

Migrations live in `apps/mobile/lib/db/migrations/NNN_<slug>.ts` and run in order at startup inside a transaction; `PRAGMA user_version` holds the version. The local-data-layer task creates all tables below; later tasks add logic, and schema changes add a new migration.

```sql
create table drafts (id text primary key, kind text not null check (kind in ('lost','found','sighted','pet')),
  data text not null /* JSON: CreateReportInput or PetInput minus photo ids */, photo_paths text not null default '[]',
  updated_at integer not null);
create table outbox (id text primary key /* uuid = Idempotency-Key */, kind text not null check (kind in ('found','sighted')),
  payload text not null /* CreateReportInput minus photo_ids, event_at = captured_at */, captured_at text not null,
  status text not null check (status in ('queued','sending','sent','failed','needs_action')),
  attempts integer not null default 0, next_attempt_at integer, last_error_code text, last_error_message text,
  result text /* JSON { report_id, short_code } after send */, created_at integer not null, updated_at integer not null);
create table outbox_photos (outbox_id text not null references outbox(id) on delete cascade, position integer not null,
  path text not null, sha256 text not null, photo_id text /* after POST /v1/photos */, uploaded integer not null default 0,
  primary key (outbox_id, position));
create table reports_cache (id text primary key, short_code text not null, type text not null, status text not null,
  species text not null, name text, breed_codes text, colours text, pattern text, size text, sex text, has_chip integer,
  event_at text not null, area_lat real not null, area_lng real not null, area_radius_m integer not null,
  municipality_slug text, region_slug text, thumb_url text, thumb_path text, thumb_bytes integer default 0,
  boosted integer default 0, updated_at text not null, synced_at integer not null);
create index reports_cache_geo on reports_cache (area_lat, area_lng);
create index reports_cache_synced on reports_cache (synced_at);
create table cache_areas (id text primary key check (id in ('home','current')), lat real not null, lng real not null,
  radius_km real not null, since text /* server_time cursor */, last_sync_at integer);
create table geofences (region_id text primary key /* report id or 'boundary' */, short_code text, lat real not null,
  lng real not null, radius_m integer not null, registered_at integer not null);                       -- M3
create table geofence_events (report_id text not null, area_key text not null, fired_at integer not null,
  primary key (report_id, area_key));                                                                   -- M3
```

**Never stored locally**: exact locations of other people's reports, chip numbers, contact data (email, phone), chat messages, matches, notifications, other users' profile data. `reports_cache` columns are exactly the whitelist above; a test dumps the database and asserts the column set and that every coordinate equals a server `area` (fuzzed) value.

## Data seam

- `lib/data/reports.ts` exports `useReportSearch(filters)`, `useReport(code)` and `useMapReports(bbox)`. Screens (map, list, detail) read reports only through these hooks. Online they call `@zivali/api/reports` and upsert the cache; offline (or on network error) they read `reports_cache` and return `{ data, source: 'network' | 'cache', lastSyncAt }`.
- `lib/net.ts`: `useNetworkState()` from `expo-network`, wired to RTK Query `setupListeners` (refetch on reconnect); `isUnmetered()`.
- No query-cache persister (no redux-persist). Private queries stay in memory.

## Sync (TASK-85)

- Areas: `home` (profile `home_point`, `home_radius_km` capped to 10 km for caching) and `current` (last foreground location, 10 km; sent only as the sync request area, never stored server-side).
- Call `syncReports(api, { areas, since, limit: 500 })` → `GET /v1/sync/reports` (C4). Apply upserts, delete `removed_ids`, store `server_time` as the next `since`. First sync has `since = null` (full area snapshot).
- Triggers: foreground resume when `last_sync_at` older than 15 min; regaining an unmetered connection; `expo-background-task` (unmetered only). Thumbnails (480 px) downloaded on Wi-Fi, or on mobile data only if the user enabled it.
- Limits (settings, defaults): `cache.max_mb` 50, `cache.max_age_days` 7. Eviction order: rows not seen by a sync for > max_age, then farthest from both areas and oldest `event_at`, until under the size budget (thumbnails count).
- Settings → Offline data: size used, last updated, "Clear offline data", "Use mobile data for offline photos" (off).

## Outbox (TASK-86)

```ts
submitReport(input: CreateReportInput & { photos: PreparedPhoto[] }, opts: { capturedAt: string }): Promise<{ outboxId: string }>
// copies photos to documentDirectory/outbox/<id>/, inserts outbox + outbox_photos (status queued), triggers send()
send(): Promise<void>            // single-flight; runs on launch, resume, reconnect (foreground)
useOutbox(): { items: OutboxItem[], retry(id), remove(id) }
pendingCount(): Promise<number>  // used before sign-out
```
Send order per item: ensure session (anonymous sign-in with Turnstile token when enabled; if the widget needs interaction → `needs_action` with `CAPTCHA_REQUIRED`) → `uploadPhoto` (C5: `POST /v1/photos`, presigned PUT, `/complete`) for each photo not yet uploaded → `POST /v1/reports` with `Idempotency-Key: <id>` and `{ …payload, photo_ids, event_at: captured_at }` → store `{ report_id, short_code }` in `result` and the manage token in secure store → status `sent` → delete outbox photos. Backoff: 1, 5, 15, 60 min; `RATE_LIMITED` waits `retry_after`; `VALIDATION`/`FORBIDDEN` → `failed` (user decides); network errors → retry. The item survives app kills (state is in SQLite). The API replays the first response for the same `Idempotency-Key` for 24 h (C1), so a lost response never creates a duplicate.

## Geofences (TASK-87, M3)

- Selection: open LOST reports from `reports_cache`, nearest to the device, then most recent `event_at`; iOS ≤ 18 report regions, Android ≤ 50, plus one `boundary` region (radius 2 km around the device at selection time; exiting it re-runs selection). Region radius = `max(area_radius_m, 200)`.
- Handler (`expo-task-manager` task `zivali-geofence`), offline-capable: on enter → skip if report no longer open in cache, if `geofence_events` has `(report, area_key)`, if 3 alerts already today, or inside quiet hours (cached from the profile) → else local notification (`expo-notifications`, category `nearby_local`, deep link `zivali://r/<code>`) and insert into `geofence_events`. No network calls.
- Off switch, sign-out, account deletion or permission downgrade → `stopGeofencingAsync` and clear `geofences`.

## Device storage

Besides SQLite and SecureStore, the app keeps small non-private UI preferences in the SQLite-backed `localStorage` (`expo-sqlite/localStorage/install`). Allowed keys: the encrypted session ciphertext (TASK-3.4) and `locale` (the mobile language choice, TASK-10.3; not personal data). Anything else needs a contract change; `wipeLocalData` on `account_deleted` clears all of it.

## Wipe

`wipeLocalData({ reason: 'sign_out' | 'account_deleted' | 'user_request' })`: if `pendingCount() > 0` the caller first shows "Send now / Delete / Cancel"; then delete `reports_cache`, `cache_areas`, `drafts`, `geofences`, `geofence_events`, thumbnails and draft files, stop geofencing; on `account_deleted` wipes everything: the local db file, app files, all SecureStore keys including manage tokens, the TASK-3.4 session ciphertext and its key, and the outbox. Sign-out calls it after `supabase.auth.signOut()` via `signOutAndWipe({ removeManageLinks })`: by default it keeps manage tokens and sent rows (reports made on this device stay manageable from it); only when the user picks "Odstrani tudi povezave za urejanje prijav s te naprave" (remove my report links from this device) are manage tokens and sent rows removed too.

## Example

```json
// outbox row after a lost response, before retry
{ "id": "6f1c…", "kind": "found", "status": "queued", "attempts": 1, "last_error_code": "NETWORK", "captured_at": "2026-10-15T07:42:10Z" }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-111: Wipe: `account_deleted` wipes everything (db file, app files, SecureStore incl. manage tokens, session ciphertext + key); sign-out keeps manage tokens and sent rows unless the user picks removal (`signOutAndWipe({removeManageLinks})`) |
| 1.2 | 2026-10-15 | CH-113: `locale` added to the allowed device-storage (localStorage) keys |
