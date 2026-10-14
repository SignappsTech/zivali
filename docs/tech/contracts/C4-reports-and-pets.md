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

`normalizeChip(input) → { chip: string | null, status: 'valid' | 'invalid' | 'none' }` (TS in `@zivali/validation/chip`, same logic in SQL `normalize_chip(text)`): strip spaces, dashes and dots; digits only; length 9–15 → `valid` (15 expected, ISO 11784); otherwise `invalid` (kept as null, warning in UI, never blocked). Chip numbers never leave base tables except to their owner/manager.

## Tables (main columns; RLS: managers/owners + staff only)

```sql
pets(id, owner_id → profiles, species, name, breed_codes text[], colours colour[], pattern, size, sex,
     birth_year int, chip_number text, chip_status text, collar text, notes text, archived_at, created_at, updated_at)
reports(id, short_code text unique,            -- 8 chars base58, public identifier in URLs
        type, status default 'open', close_reason, moderation_state default 'visible',
        pet_id → pets null, species, name text null (lost only), breed_codes, colours, pattern, size, sex,
        chip_number, chip_status, collar,
        exact_point geography(Point) not null, requested_radius_m int null (lost: 200–20000),
        public_point geography(Point), public_radius_m int,          -- set by trigger (C6)
        municipality_id, region_id, in_slovenia bool,                -- set by trigger (C6)
        event_at timestamptz not null,       -- lost: last seen; found/sighted: when seen
        circumstances text (≤ 1000), contact_pref default 'chat_only',
        linked_report_id → reports null,     -- a sighting of a lost report
        source, organisation_id null, boosted_until timestamptz null,
        manage_token_hash bytea null, first_match_at, reunited_at, closed_at, last_owner_update_at,
        created_by → profiles, created_at, updated_at)
report_managers(report_id, user_id, role text check (role in ('owner','finder','staff')), created_at, pk(report_id,user_id))
```
Photos of a report or pet: C5. Max 5 per report and per pet.

## Status machine (`transition_report`, owned by TASK-26)

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

## Write RPCs

```ts
create_report(p: CreateReportInput, p_client_request_id?: uuid) → { id, short_code, manage_token?: string, moderation_state }
// owned by TASK-29.1; anonymous guard hook submission_guard(p) is replaced by TASK-17.1 (C7)
type CreateReportInput = {
  type: 'lost'|'found'|'sighted'; pet_id?: uuid;          // lost: either pet_id or inline attributes
  species; name?; breed_codes?; colours?; pattern?; size?; sex?; chip?: string; collar?;
  location: { lat: number; lng: number; accuracy_m?: number }; requested_radius_m?: number;
  event_at: string /* ISO */; circumstances?: string; contact_pref?;
  linked_report_id?: uuid;                                 // "I saw this pet"
  photo_ids: uuid[];                                       // 1–5 for lost (FR-002 edge), 1–5 for found, 0–5 sighted
  finder_email?: string                                    // anonymous only, for the manage link
}
```
Rules: `event_at` not in the future (+10 min tolerance) → `VALIDATION`; older than 30 days → accepted, response `warnings: ['OLD_EVENT']`; lost with a `pet_id` that already has an open lost report → `DUPLICATE_OPEN_REPORT` with `details.report_id`; chip normalised; inserts the creator into `report_managers`; for anonymous callers generates the manage token (C7). AFTER INSERT trigger `on_report_published` (when `moderation_state = 'visible'`) enqueues `publish_photos`, `match_report`, and for lost `fanout_alerts`.

```ts
update_report(id, patch: Partial<CreateReportInput minus type>) → { id }        // managers; re-runs matching on attribute/location change
transition_report(id, action, reason?) → { status }                           // TASK-26.1
```

## Public read model (RPCs, owned by TASK-6.2 and TASK-31.1)

```ts
type PublicReport = {
  id; short_code; type; status; species; name?: string /* lost only */; breed_codes; colours; pattern; size; sex;
  has_chip: boolean; collar_described: boolean; event_at; circumstances?: string;
  area: { lat: number; lng: number; radius_m: number };       // fuzzed
  municipality_slug?: string; region_slug?: string; in_slovenia: boolean;
  photos: { url: string; thumb_url: string; alt: string; width: number; height: number }[];
  boosted: boolean; linked_report_code?: string; created_at; updated_at; is_mine: boolean
}
get_public_report(short_code) → PublicReport
// errors: NOT_FOUND; GONE (hidden/removed, or closed > 30 days) with details.reason
search_reports(f: {
  bbox?: [w,s,e,n]; near?: { lat, lng, km: number /* ≤ 100 */ };
  types?: reportType[]; species?: species[]; colours?: colour[]; sizes?: size[];
  from?: string; to?: string; include_closed?: boolean /* closed ≤ 30 days */;
  sort?: 'recent'|'distance'; cursor?: string; limit?: number /* ≤ 50 list, ≤ 1000 map */
}) → { items: PublicReport[] /* map mode returns { id, short_code, type, species, area, boosted } */; next_cursor?; total_estimate: number }
```
Never returned: `exact_point`, `chip_number`, `manage_token_hash`, `created_by`, finder email, phone. Boosted (`boosted_until > now()`) sort first.

## Drafts (clients)

Drafts live only on the device until submit: web `idb-keyval` key `draft:<kind>:<id>` (fields + photo blobs), mobile app document directory + kv-store. Shape = `CreateReportInput` minus `photo_ids` plus `localPhotos[]`. A draft survives reloads and sign-in.

## Example

```json
// rpc/create_report → 200
{ "id": "7c1e…", "short_code": "Hk3vT9qP", "moderation_state": "visible", "warnings": [] }
// rpc/create_report (same pet) → 400
{ "code": "DUPLICATE_OPEN_REPORT", "message": "This pet already has an open lost report", "details": { "report_id": "51aa…", "short_code": "Pq7…" } }
```
