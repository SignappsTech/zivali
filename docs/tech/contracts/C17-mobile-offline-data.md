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
  radius_km real not null, since text /* server_time cursor */, last_sync_at integer,
  shelter text /* C18 responsible-shelter JSON for the area, null until fetched */);
create table geofences (region_id text primary key /* report id or 'boundary' */, short_code text, lat real not null,
  lng real not null, radius_m integer not null, registered_at integer not null);                       -- M3
create table geofence_events (report_id text not null, area_key text not null, fired_at integer not null,
  primary key (report_id, area_key));                                                                   -- M3
```

Planned (CH-304, CH-422; TASK-18.15): a migration adds `reports_cache.area_label text` (C4 `CachedReport.area_label`, the public area's place name), so the offline detail names the area without a lookup.

**Never stored locally**: exact locations of other people's reports, chip numbers, contact data (email, phone), chat messages, matches, notifications, other users' profile data. `reports_cache` columns are exactly the whitelist above; a test dumps the database and asserts the column set and that every coordinate equals a server `area` (fuzzed) value.

## Data seam

- `lib/data/reports.ts` exports `useReportSearch(filters)`, `useReport(code)` and `useMapReports(bbox)`. Screens (map, list, detail) read reports only through these hooks. Online they call `@zivali/api/reports` and upsert the cache; offline (or on network error) they read `reports_cache` and return `{ data, source: 'network' | 'cache', lastSyncAt }`.
- `useReportSearch(filters, { skip })` and `useMapReports(query, { skip })` take an optional `skip` (loading: no network request and no cache read; the Map tab holds them until the location permission and first fix are known) and both return `refetch` (the error state's "Poskusi znova") (TASK-31.5, CH-311).
- `lib/data/shelters.ts` exports `getCachedShelter(areaId)`: reads `cache_areas.shelter` (parsed C18 `responsible` response, null when absent) so the shelter checklist works offline.
- `lib/net.ts`: `useNetworkState()` from `expo-network`, wired to RTK Query `setupListeners` (refetch on reconnect); `isUnmetered()`.
- No query-cache persister (no redux-persist). Private queries stay in memory.

## Sync (TASK-85)

- Areas: `home` (profile `home_point`, `home_radius_km` capped to 10 km for caching) and `current` (last foreground location, 10 km; sent only as the sync request area, never stored server-side).
- Call `syncReports(api, { areas, since, limit: 500 })` → `GET /v1/sync/reports` (C4). Apply upserts, delete `removed_ids`, store `server_time` as the next `since`. First sync has `since = null` (full area snapshot).
- Triggers: foreground resume when `last_sync_at` older than 15 min; regaining an unmetered connection; `expo-background-task` (unmetered only). Thumbnails (480 px) downloaded on Wi-Fi, or on mobile data only if the user enabled it.
- Also a trigger (TASK-85.5 to 85.7, CH-382, CH-393): a new or moved area (first location fix, a move past the 2-decimal rounding, a new home or a resized radius) syncs at once while online, after any running sync (single-flight).
- As built (CH-393): a complete sync from `since = null` (first, new, moved or resized area) deletes cached rows inside the area that the snapshot did not list. Only live reports (open or matched, owner view visible) are written; one seen closed, held or hidden online is deleted. A thumbnail file the OS purged is forgotten at the start of every sync (it stops counting in `cache.max_mb`) and is downloaded again under the photo rules.
- "Unmetered" (decision CH-383: accepted as the meaning of "respects data saver", TASK-85 AC #5): Wi-Fi or Ethernet by the `expo-network` connection type. Known gaps, accepted for v1: a metered Wi-Fi (phone hotspot) counts as unmetered, Android Data Saver and iOS Low Data Mode are not read, and `expo-background-task` sets no unmetered constraint. A native check (`NET_CAPABILITY_NOT_METERED`, `NWPath.isExpensive`/`isConstrained`) would need a native module (ADR-017) for a small saving: the sync is incremental and thumbnails are 480 px; revisit if store reviews or users report data use.
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
Send order per item: ensure session (anonymous sign-in with Turnstile token when enabled; if the widget needs interaction → `needs_action` with `CAPTCHA_REQUIRED`) → `uploadPhoto` (C5: `POST /v1/photos`, presigned PUT, `/complete`) for each photo not yet uploaded → `POST /v1/reports` with `Idempotency-Key: <id>` and `{ …payload, photo_ids, event_at: captured_at }` → store `{ report_id, short_code }` in `result` and the manage token in secure store → status `sent` → delete outbox photos. Backoff: 1, 5, 15, 60 min; `RATE_LIMITED` waits `retry_after`; `VALIDATION`/`FORBIDDEN` → `failed` (user decides); network errors → retry. The item survives app kills (state is in SQLite). The API replays the first response for 24 h (C1); later, or after a post-commit 5xx, the same key and body return the same report (never a duplicate or VALIDATION) with a fresh manage token for anonymous senders (C7 §Token), which the outbox saves over the old one. No client change.

- **Late resend (CH-379, resolved)**: an answer lost and a resend after the 24 h key window no longer duplicates a sighting or fails a found report: `POST /v1/reports` answers a known `(created_by, submission_id)` as a submission repeat before the photo checks (TASK-86.5, C4 §Submission repeat). This is the "keep report-create keys longer than the outbox can wait" option: `reports.submission_id` has no expiry; the outbox id is not used as the report id.
- **Changed body hash (decision CH-402 (1); planned, TASK-86.6)**: after the window the repeat matches on the key alone, so a `RATE_SALT` rotation or a new zod default never turns a resend into `409` (C4). Within 24 h a `409 CONFLICT` stays a `failed` item (the user retries or removes it).
- **Lost session (decision CH-402 (2): accepted gap)**: the outbox keeps no session. A queued item sent under a new anonymous user (the old session was revoked or expired while the outbox survived; a reinstall or cleared storage deletes the outbox too) gets `409` within 24 h (the key belongs to another user; item `failed`) and after 24 h creates a second report, which the finder can remove from its manage link. Rare enough not to store sessions with queued items.

## Geofences (TASK-87, M3)

- Selection: open LOST reports from `reports_cache`, nearest to the device, then most recent `event_at`; iOS ≤ 18 report regions, Android ≤ 50, plus one `boundary` region (radius 2 km around the device at selection time; exiting it re-runs selection). Region radius = `max(area_radius_m, 200)`.
- Handler (`expo-task-manager` task `zivali-geofence`), offline-capable: on enter → skip if report no longer open in cache, if `geofence_events` has `(report, area_key)`, if 3 alerts already today, or inside quiet hours (cached from the profile) → else local notification (`expo-notifications`, category `nearby_local`, deep link `zivali://r/<code>`) and insert into `geofence_events`. No network calls.
- `expo-location` is a native module (new dev build / EAS rebuild; iOS background mode `location`, Android background location). A revoked Always permission is noticed on resume or after a cache sync, not instantly (CH-234).
- As built (TASK-87.2, CH-354): selection and handler skip the user's own reports (manage tokens ∪ own report ids from `geofence.own_reports`); `geofenceState()` serves the Settings switch (it reads no position). Caveat: iOS keychain items are `WHEN_UNLOCKED`, so a boundary re-selection on a locked phone reads no manage tokens (own ids from localStorage still apply).
- Off switch, sign-out, account deletion or permission downgrade → `stopGeofencingAsync` and clear `geofences`.

## Device storage

Besides SQLite and SecureStore, the app keeps small non-private UI preferences in the SQLite-backed `localStorage` (`expo-sqlite/localStorage/install`). Allowed keys: the encrypted session ciphertext (TASK-3.4) `locale` (the mobile language choice, TASK-10.3; not personal data) and the cache settings `cache.max_mb`, `cache.max_age_days`, `cache.mobile_photos` (TASK-85.2), `geofence.own_reports` (JSON array of the account's report ids from `/v1/me/reports` page 1, cached by `useOfflineCache`, which calls `useListMyReportsInfiniteQuery` and so must mount under the Redux Provider; removed on sign-out and account deletion), `geofence.permission_lost` (`'1'` after a revoked Always permission stopped the reminders, so Settings → Alerts explains it; cleared by the switch and the wipe) and `geofence.quiet_hours` (JSON `{ quiet_from, quiet_to }` from the profile, cached by `useOfflineCache` for the offline geofence handler; removed on sign-out and account deletion, kept by "Clear offline data", CH-231). Anything else needs a contract change; `wipeLocalData` on `account_deleted` clears all of it.

## Wipe

`wipeLocalData({ reason: 'sign_out' | 'account_deleted' | 'user_request' })`: if `pendingCount() > 0` the caller first shows "Send now / Delete / Cancel"; then delete `reports_cache`, `cache_areas`, `geofences`, `geofence_events` and thumbnails, stop geofencing; `drafts` (rows and files) are deleted on `sign_out` and `account_deleted` only: the user-requested "Clear offline data" is a cache clear and keeps unsent work (drafts and the outbox) (CH-319, CH-347). Because `cache_areas` goes, the `home` area returns only on the next profile change or launch (`current` on the next location fix); on `account_deleted` wipes everything: the local db file, app files, all SecureStore keys including manage tokens, the TASK-3.4 session ciphertext and its key, and the outbox. Sign-out calls it after `supabase.auth.signOut()` via `signOutAndWipe({ removeManageLinks })`: by default it keeps manage tokens and sent rows (reports made on this device stay manageable from it); only when the user picks "Odstrani tudi povezave za urejanje prijav s te naprave" (remove my report links from this device) are manage tokens and sent rows removed too.

**Session ended outside the app (TASK-87.6, CH-415).** A session that ends without `signOutAndWipe` (Supabase `SIGNED_OUT` after a refresh token revoked by sign-out everywhere, a password reset or the account deleted on the web; at start-up or on a later refresh) runs `wipeLocalData({ reason: 'session_ended' })` = the sign-out wipe EXCEPT drafts: rows and `draftsDir` stay, like the outbox, so unsent forms survive a revoked or expired token (`wipeOnSessionEnd`, subscribed in `lib/store` before the session is restored). Offline the client keeps the session and emits nothing, so nothing is wiped. No push-token delete (no session is left). A flag (SecureStore `session_ended`) makes the next open or foreground show "You were signed out. Sign in again to continue." once, and the pending-reports prompt if the outbox is not empty.

**Account deletion (mobile, TASK-51; TASK-85 AC #3, TASK-86 AC #4, CH-380, CH-384).** The flow first resolves unsent outbox items with the pending prompt (`usePendingPrompt().resolvePending` in `components/outbox/queue.tsx`: Send now / Delete / Cancel), deletes the account on the server, then calls `wipeLocalData({ reason: 'account_deleted' })`. `wipeLocalData` is built and tested; nothing calls it until TASK-51 exists, and TASK-51's acceptance criteria must name this step.

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
| 1.3 | 2026-10-15 | CH-140: cache_areas.shelter and getCachedShelter(areaId) |
| 1.4 | 2026-10-15 | CH-141: allowed device-storage keys cache.max_mb, cache.max_age_days, cache.mobile_photos |
| 1.5 | 2026-10-18 | CH-231: allowed key geofence.quiet_hours; CH-234: geofencing native-module and permission notes |
| 1.6 | 2026-10-18 | CH-311: `skip` and `refetch` on the data hooks; CH-319/CH-347: user_request keeps drafts and outbox; CH-354: geofence.own_reports, geofence.permission_lost, geofenceState |
| 1.7 | 2026-10-19 | CH-382, CH-393: sync trigger for a new or moved area, complete-sync deletes, purged thumbnails; CH-390: outbox repeat after the key window; CH-415: `session_ended` wipe; CH-380, CH-384: account deletion order (pending prompt, server delete, wipe) |
| 1.8 | 2026-10-19 | CH-379: late resend resolved by the submission repeat; CH-383: connection-type "unmetered" accepted with its gaps; CH-402: hash mismatch after the window answered as a repeat, lost session accepted; planned `reports_cache.area_label` |
