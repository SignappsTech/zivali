source: docs/04-technical-design.md§Data model, §Interfaces and contracts (C4); FR-002, FR-005, FR-006, FR-007, FR-012

# C4 Reports and pets

## Enums (Postgres and `packages/types/src/domain/enums.ts`, zod in `@zivali/validation/enums`)

```ts
species      = 'dog' | 'cat'
reportType   = 'lost' | 'found' | 'sighted'
reportStatus = 'open' | 'matched' | 'reunited' | 'closed'
closeReason  = 'found_elsewhere' | 'gave_up' | 'returned_to_owner' | 'expired' | 'removed' | 'other'
moderation   = 'visible' | 'held' | 'hidden' | 'removed'
size         = 'xs' | 's' | 'm' | 'l' | 'xl'
sex          = 'male' | 'female' | 'unknown'
colour       = 'black' | 'white' | 'grey' | 'brown' | 'chocolate' | 'red' | 'cream' | 'golden' | 'tan' | 'blue_grey'
pattern      = 'solid' | 'bicolour' | 'tricolour' | 'tabby' | 'tortoiseshell' | 'calico' | 'brindle' | 'merle' | 'spotted' | 'pointed' | 'other'
contactPref  = 'chat_only' | 'chat_and_phone'      // phone shown only inside a confirmed chat, never public
source       = 'user' | 'anonymous' | 'organisation'
```
Breeds: codes in `@zivali/validation/breeds` (`dog.labrador_retriever`, `cat.european_shorthair`, … ~60 dog and ~20 cat breeds plus `mixed`, `unknown`); labels in the `breeds` i18n namespace.

## Chip numbers

`normalizeChip(input) → { chip: string | null, status: 'valid' | 'invalid' | 'none' }` (TS in `@zivali/validation/chip`, used by the API and the clients): strip spaces, dashes and dots; digits only; length 9–15 → `valid` (15 expected, ISO 11784); otherwise `invalid` (kept as null, warning in UI, never blocked). Chip numbers never leave the API except to their owner or manager. The chip field is equally prominent for dogs and cats, with the note that a vet or the responsible shelter reads the chip; there is no link to a public chip lookup (the CRPsi public lookup closed in June 2026; the register is CRHŽ; any future public lookup sits behind the `chip.public_lookup` config flag).

## Models (Prisma `prisma/schemas/reports.prisma`, schema `app`; snake_case per ADR-020; columns below; RLS deny-all, access only through the API)

```sql
pets(id, owner_id → profiles, species, name, breed_codes text[], colours colour[], pattern, size, sex,
     birth_year int, chip_number text, chip_status text,
     chip_registered_crhz text check (chip_registered_crhz in ('yes','no','unknown')),   -- FR-002 R-002.5
     ear_tip boolean null, lifestyle text null check (lifestyle in ('indoor','outdoor','both')),   -- cats (FR-002)
     collar text, notes text, archived_at, created_at, updated_at)
reports(id, short_code text unique,            -- 8 chars base58, public identifier in URLs
        type, status default 'open', close_reason, moderation_state default 'visible',
        pet_id → pets null, species, name text null (lost only), breed_codes, colours, pattern, size, sex,
        chip_number, chip_status, collar,
        ear_tip boolean null, lifestyle text null check (lifestyle in ('indoor','outdoor','both')),   -- cats; copied from the pet or entered inline (CH-17)
        exact_point geography(Point) not null,   -- the COARSENED private point (20–30 m offset applied once at write, device and server; never the raw point; C6 §Storage, ADR-006) requested_radius_m int null (lost: 200–20000),
        public_point geography(Point), public_radius_m int,          -- set by the API fuzz service on write (C6)
        municipality_id, region_id, in_slovenia bool,                -- set by the API from geo_lookup (C6)
        event_at timestamptz not null,       -- lost: last seen; found/sighted: when seen (offline queue: original capture time, C17); matching uses event_at, never created_at
        circumstances text (≤ 1000), contact_pref default 'chat_only',
        reward_eur int null check (reward_eur between 1 and 10000), reward_note text null (≤ 80),   -- lost only, display only (no payment, brief v1.1)
        linked_report_id → reports null,     -- a sighting of a lost report
        source, organisation_id null, boosted_until timestamptz null,
        manage_token_hash bytea null,   -- report_contacts(report_id, email) holds the optional finder email
        first_match_at, reunited_at, closed_at, last_owner_update_at,
        created_by → profiles, created_at, updated_at)
report_managers(report_id, user_id, role text check (role in ('owner','finder','staff')), created_at, pk(report_id,user_id))
```
Photos of a report or pet: C5. Max 5 per report and per pet. A photo can belong to one pet and one report at once (C5 §REST, shared photos); web P6 lists a saved pet's photos first on the photos step (they count towards the 5) and sends them in `photo_ids`; mobile still sends only new photos. A pet lost again reuses the photos of its ended report.

## Status machine (`POST /v1/reports/:code/transitions`, owned by TASK-26.3)

| From | Action | To | Who | Side effects |
|---|---|---|---|---|
| open | (match confirmed, C8) | matched | owner | counterpart notified |
| open, matched | `mark_reunited` | reunited | manager | linked matches closed, pending alerts cancelled, boost stopped, counterpart report reunited if both sides confirmed, `reunited_at`, notify |
| open, matched | `close` (+reason) | closed | manager | alerts cancelled; manage token cleared |
| reunited, closed | `reopen` | open | manager, within 7 days | - |
| open (lost, ≥ 90 days idle) | `expire` | closed (`expired`) | system | owner notified with one-tap `extend` |
| open (found/sighted, ≥ 30 days idle, source ≠ organisation) | `expire` | closed (`expired`) | system | finder notified (email if given) |
| any | `extend` | unchanged, `last_owner_update_at = now()` | manager | resets the idle timer |

Reminders for LOST at 7, 14, 30 days after `created_at` (`lifecycle_tick`, hourly). Timings in `app_config` (`lifecycle.*`).

## REST (owned by TASK-29.2 unless noted)

| Method and path | Guards | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/reports` | auth (user or anonymous), `Idempotency-Key` required, rate limit (C7 for anonymous) | `CreateReportInput` | `201 { id, short_code, moderation_state, manage_token?, warnings[] }` | `VALIDATION`, `DUPLICATE_OPEN_REPORT` (409, `details.short_code`), `RATE_LIMITED`, `UNVERIFIED_EMAIL` (lost by unverified user is allowed; see FR-001) |
| `PATCH /v1/reports/:code` | manager | partial `CreateReportInput` minus `type` | `ReportOwnerView` | `FORBIDDEN`, `VALIDATION`, `GONE` |
| `GET /v1/reports/:code` | optionalAuth | - | `PublicReport` (+ `ReportOwnerView` fields when the caller manages it) | `NOT_FOUND`, `GONE` (`details.reason`) |
| `GET /v1/reports` (TASK-31.3) | optionalAuth | query `ReportSearch` | `{ items: PublicReport[], next_cursor, total_estimate }` | `VALIDATION` |
| `GET /v1/reports/map` (TASK-31.3) | optionalAuth | query `bbox` + filters, `limit` ≤ 1000 | `{ items: MapReport[] }` (id, short_code, type, species, area, boosted, thumb_url) | `VALIDATION` |
| `GET /v1/me/reports` | auth | - | `{ items: ReportOwnerView[], next_cursor }` | - |
| `POST /v1/reports/:code/transitions` (TASK-26.3) | manager | `{ action: 'mark_reunited' | 'close' | 'reopen' | 'extend', reason? }` | `ReportOwnerView` | `FORBIDDEN`, `CONFLICT` (invalid transition), `GONE` (reopen after 7 days) |
| `GET /v1/sync/reports` (TASK-85.1) | optionalAuth, rate limit 60/h per device | query `areas` (JSON, ≤ 3 circles ≤ 25 km), `since`, `limit` ≤ 1000 | `{ upserts: CachedReport[], removed_ids: uuid[], server_time, has_more }` | `VALIDATION`, `RATE_LIMITED` |
| `GET/POST /v1/pets`, `GET/PATCH/DELETE /v1/pets/:id`, `POST /v1/pets/:id/archive` (TASK-16.3) | auth (not anonymous), owner | `PetInput` | `Pet` / `{ items: Pet[] }` | `VALIDATION`, `FORBIDDEN`, `CONFLICT` (`code: PET_LIMIT` in details; free limit 2, app_config `pets.free_limit`) |

Limits (implemented, confirmed): `name` ≤ 60, `collar` ≤ 200, pet `notes` ≤ 1000, `breed_codes` ≤ 5; `mixed` and `unknown` are species-scoped (`dog.mixed`, `cat.unknown`); `PetInput.name` required (1–60). `location` in the request is the point already coarsened by the client; the API coarsens again (C6 §Storage).

**Sync cursor (CH-142, TASK-85.1 AC#4)**: `server_time` is an opaque cursor the client always sends back as `since` and never interprets. With `has_more` it encodes `(updated_at, id)` of the page's last row, with upserts and removals in one order; the final value (`has_more: false`) overlaps in-flight transactions slightly, so upserts are idempotent.

**Query encoding (implemented, confirmed)**: lists as a comma list or repeated keys (`types=lost,found`); `bbox=w,s,e,n`; `near=lat,lng,km`; sync `areas` = JSON `[{lat,lng,radius_km}]` (1–3, radius ≤ 25). **Location in URLs (decision, CH-19)**: accepted for these read endpoints (`near`, sync `areas`, C18 `shelters/responsible`) because they must stay cacheable-friendly GETs and are used for public reads, under three rules: the client rounds the coordinates to 2 decimals (about 1 km) before putting them in a URL (`near`, sync `areas`; `bbox` on `GET /v1/reports` and `/map` is rounded outwards: west and south down, east and north up); the API and Caddy access logs record the route pattern only, never the query string; responses with a location query are `Cache-Control: private, no-store`. Anything that carries a precise point (report create/update, alert subscription, geocoder search/reverse) stays POST/PUT body only (C6).

```ts
type CreateReportInput = {
  type: 'lost'|'found'|'sighted'; pet_id?: uuid;                 // lost: either pet_id or inline attributes
  species; name?; breed_codes?; colours?; pattern?; size?; sex?; chip?: string; collar?; ear_tip?; lifestyle?;
  location: { lat: number; lng: number; accuracy_m?: number }; requested_radius_m?: number;
  event_at: string /* ISO; offline queue: original capture time */; circumstances?: string; contact_pref?;
  reward_eur?: number | null; reward_note?: string | null;      // lost only; display only
  linked_report_id?: uuid;                                       // "I saw this pet"
  photo_ids: uuid[];                                             // 1–5 for lost and found, 0–5 sighted; may include the owner's pet photos and photos of their ended reports (shared photos, C5)
  finder_email?: string                                          // anonymous only, for the manage link
}
```
Rules (domain `ReportsDomain.createReport(input, ctx)`): `event_at` not in the future (+10 min) → `VALIDATION`; older than 30 days → accepted with `warnings: ['OLD_EVENT']`; lost with a `pet_id` that has an open lost report → `DUPLICATE_OPEN_REPORT`; chip normalised; fuzz and geo lookup computed (C6); creator added to `report_managers`; anonymous callers pass the submission guard and get a manage token (C7); in one transaction with jobs `photo.publish`, `match.report` and, for visible lost reports, `alerts.fanout`. Lost reports need a non-anonymous account (`FORBIDDEN` for anonymous).

**Reward (display only, brief v1.1)**: lost reports may carry `reward_eur` (integer 1–10 000) and/or `reward_note` (single line, ≤ 80 characters). Found and sighted reports with either field → `VALIDATION`. `reward_note` is rejected (`VALIDATION`, issue `CONTACT_DATA`) when it contains a URL, an e-mail address or 6 or more digits, optionally split by single spaces, dashes or slashes (so `041 123 456`, `SI56 0510 …` and `4111-1111-1111` are caught; dots are not separators, so dates such as `15.10.2026` pass); URL = a scheme, `www.`, or `label.<common TLD>`. The check is `containsContactData()` in `@zivali/validation`, shared with the clients. The app never collects, holds or transfers reward money (no escrow); clients show the reward line together with the scam warning from the content slice. Editable with `PATCH` like other fields; not used in matching.

## Public read model (API serializers, `mappers/report.mappers.ts`)

```ts
type PublicReport = {
  id; short_code; type; status; species; name?: string /* lost only */; breed_codes; colours; pattern; size; sex;
  has_chip: boolean; collar_described: boolean; event_at; circumstances?: string;
  reward?: { eur: number | null; note: string | null };         // lost only, when either field is set
  area: { lat: number; lng: number; radius_m: number };       // fuzzed
  municipality_slug?: string; region_slug?: string; in_slovenia: boolean;
  photos: { url: string; thumb_url: string; alt: string; width: number; height: number }[];
  boosted: boolean; linked_report_code?: string; created_at; updated_at; is_mine: boolean
}
type ReportSearch = {
  bbox?: [w,s,e,n]; near?: { lat, lng, km: number /* ≤ 100 */ };
  types?: reportType[]; species?: species[]; colours?: colour[]; sizes?: size[];
  from?: string; to?: string; include_closed?: boolean /* closed ≤ 30 days */;
  sort?: 'recent'|'distance'; cursor?: string; limit?: number /* ≤ 50 list, ≤ 1000 map */
}
```
```ts
type ReportOwnerView = PublicReport & {            // returned to managers (GET /v1/reports/:code, /v1/me/reports, PATCH, transitions)
  manager_role: 'owner'|'finder'|'staff'; moderation_state; close_reason: closeReason | null;
  pet_id: uuid | null; chip_number: string | null; chip_status: 'valid'|'invalid'|'none'; collar: string | null;
  location: { lat: number; lng: number };         // the stored COARSENED point labelled "približno" (C6 §Storage), never a raw point
  requested_radius_m: number | null; contact_pref; reward_eur: number | null; reward_note: string | null;
  first_match_at: string | null; reunited_at: string | null; closed_at: string | null; last_owner_update_at: string
}
type Pet = {                                       // owner only
  id; species; name; breed_codes; colours; pattern: pattern | null; size: size | null; sex: sex | null; birth_year: number | null;
  chip_number: string | null; chip_status; chip_registered_crhz: 'yes'|'no'|'unknown' | null; ear_tip: boolean | null;
  lifestyle: 'indoor'|'outdoor'|'both' | null; collar: string | null; notes: string | null; archived_at: string | null;
  created_at; updated_at; photos: { id: uuid; thumb_url: string }[]
}
```
(Confirmed from `packages/types/src/domain/{reports,pets}.ts`, TASK-6.5; `PetInput` = the editable columns, `name` required 1–60.)

Never returned to the public: `exact_point`, `chip_number`, `manage_token_hash`, `created_by`, finder email, phone. Boosted (`boosted_until > now()`) sort first.

Sync feed (`GET /v1/sync/reports`, TASK-85.1): Offline cache feed for mobile (C17): open, visible reports whose public area intersects an area and `updated_at > p_since` (all when null); `removed_ids` = reports in those areas changed since `p_since` that are no longer open and visible (closed, reunited, expired, hidden, removed). Callable without a session; rate limited 60/hour per device id. `CachedReport` = the PublicReport fields used by the cache (C17) plus `thumb_url`. Never returns more than the public whitelist.

## Drafts (clients)

Drafts live only on the device until submit: web `idb-keyval` key `draft:<kind>:<id>` (fields + photo blobs), mobile app document directory + kv-store. Shape = `CreateReportInput` minus `photo_ids` plus `localPhotos[]`. A draft survives reloads and sign-in.

## Example

```json
// POST /v1/reports → 201
{ "id": "7c1e…", "short_code": "Hk3vT9qP", "moderation_state": "visible", "warnings": [] }
// POST /v1/reports (same pet) → 409
{ "error": { "code": "DUPLICATE_OPEN_REPORT", "message": "This pet already has an open lost report", "details": { "report_id": "51aa…", "short_code": "Pq7…" } } }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-56: bbox rounded outwards to 2 decimals like near and areas |
| 1.2 | 2026-10-15 | CH-142: sync `server_time` is an opaque (updated_at, id) cursor, final value overlaps in-flight transactions |
| 1.3 | 2026-10-18 | CH-494 (TASK-114.5): report photo_ids may reuse the owner's pet photos and photos of their ended reports (C5) |
