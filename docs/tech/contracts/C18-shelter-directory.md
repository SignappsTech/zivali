source: docs/04-technical-design.md§Interfaces and contracts (C18); FR-044, FR-005 R-005.3, FR-006 R-006.1, A-029; stories TASK-88, TASK-89, TASK-90

# C18 Responsible-shelter directory

Public reference data: which registered shelter is responsible for each of Slovenia's 212 municipalities (17 registered shelters). No personal data. Powers the post-submit checklists (call buttons), the offline cache and the public pages `/zavetisca/[slug]`.

## Data (Prisma `prisma/schemas/directory.prisma`, schema `app`, naming per ADR-020)

```prisma
model shelters {
  id             String   @id @default(uuid()) @db.Uuid
  slug           String   @unique                     // ascii, e.g. "zavetisce-ljubljana"
  name           String
  address        String
  postal_code    String
  city           String
  lat            Float?                               // public address location
  lng            Float?
  phone          String                               // E.164, e.g. +38612345678
  phone_display  String                               // as published, e.g. "01 234 56 78"
  email          String?
  species        String[] @default(["dog", "cat"])     // accepted species, 'dog' | 'cat' (ShelterSummary.species)
  website        String?
  opening_hours  Json                                 // [{ days: "mon-fri", from: "10:00", to: "16:00", note_sl?, note_en? }]
  registry_id    String?                              // veterinary administration register number
  source         String                               // "UVHVVR register 2026-09; municipal report 2025"
  verified_at    DateTime @db.Date
  active         Boolean  @default(true)
  version        Int      @default(1)
  created_at     DateTime @default(now()) @db.Timestamptz(6)
  updated_at     DateTime @updatedAt @db.Timestamptz(6)
  municipality_shelters municipality_shelters[]
  @@schema("app")
}
model municipality_shelters {                          // one row per municipality (212)
  municipality_id Int     @id @db.SmallInt            // app.municipalities.id (C6)
  shelter_id      String? @db.Uuid                     // null = not confirmed
  status          DIRECTORY_STATUS                     // CONFIRMED | UNCONFIRMED
  source          String
  verified_at     DateTime @db.Date
  version         Int     @default(1)
  shelter         shelters? @relation(fields: [shelter_id], references: [id])
  @@schema("app")
}
model directory_changes {                              // versioning (append-only)
  id          String   @id @default(uuid()) @db.Uuid
  entity      String                                  // 'shelter' | 'municipality_shelter'
  entity_id   String
  version     Int
  data        Json                                    // full row after the change
  source      String
  actor_id    String?  @db.Uuid                        // null for seed or import (import versions keep it null and carry the note)
  audit_note  String?                                 // the admin's note (required on writes, CH-250)
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  @@schema("app")
}
```

The seed CSV may split a municipality by species. One assignment per municipality is kept: CONFIRMED only when cat and dog resolve to the same confirmed shelter. Otherwise it is UNCONFIRMED, and shelter_id is the likely shelter (the first suggested_shelter) or null. A likely shelter is returned as status likely only when it is active and has coordinates; otherwise the response is unconfirmed with nearest. `ShelterSummary.area` is the region derived from the shelter's lat/lng (C6 geo lookup). Optional hardening: the server also rounds `/responsible` lat/lng to 2 decimals.

Follow-ups (TASK-88.2): foreign key `municipality_shelters.municipality_id` to `municipalities` after TASK-15.8; replace the `@zivali/api/directory` stubs via `gen:api`; data check of `species` for Mačja hiša and Sia in Lu.

Seed (TASK-88): `apps/api/prisma/seeders/data/shelters.csv` and `municipality_shelters.csv` loaded by `prisma/seeders/05-directory.seeder.ts` with a `source` and `verified_at` per row; a validation script checks 212 municipalities, every confirmed row points at an active shelter, phones are E.164.

## REST API (public, no auth, cacheable `Cache-Control: public, max-age=3600`)

| Method and path | Purpose | Response |
|---|---|---|
| `GET /v1/shelters` | index (TASK-90) | `{ items: ShelterSummary[] }` sorted by name |
| `GET /v1/shelters/:slug` | shelter page | `Shelter & { municipalities: { slug, name }[] }`, 404 if unknown or inactive |
| `GET /v1/shelters/responsible?lat=&lng=` (client rounds to 2 decimals, C4 §REST privacy; exact points are not needed) or `?municipality=<slug>` | checklist and call button | `{ status: 'confirmed', municipality: { slug, name }, shelter: Shelter } \| { status: 'likely', municipality: { slug, name }, likely_shelter: { slug, name, phone, distance_km } } \| { status: 'unconfirmed', municipality: { slug, name }, nearest: { slug, name, distance_km }[] } \| { status: 'outside_slovenia', municipality?: { slug, name } }` |
| `GET /v1/shelters/municipalities` | municipality search on the index page | `{ items: { slug, name, shelter_slug \| null }[] }` |

`ShelterSummary = { slug, name, city, phone_display, phone, area, municipality_count, verified_at, source, species }` (`phone` E.164, `area` = short region label, `municipality_count` = municipalities assigned, `species` = `('dog' | 'cat')[]` accepted). `Shelter = { slug, name, address, postal_code, city, lat?, lng?, phone, phone_display, email?, website?, opening_hours, source, verified_at }`; `OpeningHours = { days, from, to, closed?: boolean, note_sl?, note_en? }[]` (`closed: true` marks a closed day or range, `from`/`to` then ignored). Client rule (brief): for an unconfirmed municipality, `status: 'likely'` is returned when a likely shelter is known (UI: "Morda pristojno zavetišče" + "Ni potrjeno", the call button is secondary and labelled unconfirmed); otherwise `status: 'unconfirmed'` with `nearest`: up to 2 shelters `{ slug, name, distance_km }` (no phone). `municipality` is always included. A `confirmed` response is the only one with a primary call button; `phone` appears only in `confirmed` and `likely`. Lookups by point use `geo_lookup` (C6).

## Admin (TASK-89, M3)

All routes: staff aal2 (`authMiddleware`, `requireRole('admin')`, `requireAal2`), zod-validated, JSON. Every write inserts a `directory_changes` row (keyed by entity id and `slug`/municipality slug), an audit entry, and bumps `version`.

| Method and path | Purpose | Body → response |
|---|---|---|
| `GET /v1/admin/shelters` | admin list (includes inactive) | `{ items: (Shelter & { id, active, version, municipality_count })[] }` |
| `GET /v1/admin/municipality-shelters` | admin list of the 212 assignments | `{ items: { municipality: { slug, name }, shelter_slug | null, status, source, verified_at, version }[] }` |
| `GET /v1/admin/shelters/:slug/changes` | history, newest first, keyed by shelter slug | `{ items: { version, data, source, actor_id | null, audit_note | null, created_at }[] }` |
| `POST /v1/admin/shelters` | create | shelter fields + `municipalities: string[]` (slugs) + `audit_note` → `Shelter` (201) |
| `PUT /v1/admin/shelters/:slug` | update | shelter fields + `version` (the version the editor loaded) + `municipalities: string[]` + `audit_note` → `Shelter` |
| `DELETE /v1/admin/shelters/:slug` | delete (or deactivate when history exists) | `{ audit_note }` → 204 |
| `PUT /v1/admin/municipality-shelters/:municipality` | reassign one municipality | `{ shelter_slug | null, status, source, verified_at, version, audit_note }` → assignment row |
| `POST /v1/admin/directory/import?dry_run=true` | CSV import | `{ csv, audit_note? }` (JSON, not multipart; `audit_note` required unless `dry_run=true`, else `VALIDATION`) → `{ changes: { entity, id, action: 'create' | 'update' | 'none', diff }[], errors: { row: number, field: string }[] }`; `id` = shelter slug or municipality slug, `diff` = `{ <field>: { from, to } }` (`from` null on create, `{}` for none), `errors[].row` = CSV row with the header as row 1, `field` = failing column or `header` (unknown format); with `dry_run` nothing is written; without it, applied in one transaction only if `errors` is empty; with errors and no `dry_run` the answer is still 200 and nothing is written. One audit entry `directory.import` per apply |

Admin errors (C1 envelope): `CONFLICT` (409) when the body `version` is stale (another admin saved first; details carry the current version), `CONFLICT` (409) with `details.code = 'HAS_ASSIGNMENTS'` when `DELETE` targets a shelter that still has municipalities assigned (details: code, count; reassign first; repo convention like PET_LIMIT, not a new top-level code), `VALIDATION` (400) for bad bodies including a missing or blank `audit_note`, `NOT_FOUND`, `FORBIDDEN`/`AAL2_REQUIRED`. The two 409s are told apart by `details.code` (absent = stale version) so the UI can offer reload vs reassign. As implemented (TASK-89.1, CH-250): `DELETE` always deactivates (every shelter has history from version 1, and seed 05-directory would re-create a removed slug); `PUT` never changes the slug; on `POST`, `slug` is optional (derived from the name; a taken slug, also an inactive shelter's → `VALIDATION` issue `slug`). `municipalities[]` is the exact CONFIRMED set: added ones are reassigned, dropped ones become UNCONFIRMED with shelter null (source/verified_at from the shelter). `HAS_ASSIGNMENTS` and `municipality_count` count CONFIRMED rows. The admin municipality list's `shelter_slug` = the confirmed or likely shelter. CONFIRMED needs an active shelter. `species` and `registry_id` are not in `Shelter`, so only the CSV import sets them (the admin form keeps them). The reminder is a plain Slovenian email to admins with a confirmed address, audited as `directory.reminder`. pg-boss job `directory.reminder` (cron 1 April 08:00 Europe/Ljubljana) notifies admins with entries whose `verified_at` is older than 12 months.

## Client (`@zivali/api/directory`)

`getResponsibleShelter({ lat, lng } | { municipality })`, `listShelters()`, `getShelter(slug)`, hook `useResponsibleShelter(point)`. The mobile offline cache stores the responsible shelter for the home and current areas (C17).

## Content rules

Legal timings (3 days / 72 h owner duty, 24 h find notice, 8-day holding) render only when the content flag `content.legal_timings` is on (A-029). Copy never claims the app replaces the legal report.

## Example

```json
// GET /v1/shelters/responsible?municipality=ljubljana
{ "status": "confirmed", "municipality": { "slug": "ljubljana", "name": "Ljubljana" },
  "shelter": { "slug": "zavetisce-ljubljana", "name": "Zavetišče …", "phone": "+386…", "phone_display": "01 …",
               "opening_hours": [{ "days": "mon-sun", "from": "10:00", "to": "18:00" }], "source": "UVHVVR 2026-09", "verified_at": "2026-10-01" } }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-81: responsible-shelter returns status 'likely' (likely_shelter) or 'unconfirmed' with nearest (up to 2); municipality always included |
| 1.2 | 2026-10-15 | CH-123, CH-125: admin lists, /changes history by slug, DELETE with audit_note, versioned bodies with municipalities[], {csv} import → {changes, errors[{row, field}]}, OpeningHours.closed, Shelter lat/lng/email, ShelterSummary phone/area/municipality_count/verified_at/source/species; CONFLICT vs HAS_ASSIGNMENTS |
| 1.3 | 2026-10-15 | CH-128: delete refused while municipalities are assigned = 409 CONFLICT with details.code HAS_ASSIGNMENTS (not a top-level code) |
| 1.4 | 2026-10-15 | CH-132, CH-133: shelters.species, area from lat/lng, species split collapses to one row (CONFIRMED only if cat and dog agree, else UNCONFIRMED with likely shelter_id), server rounds /responsible coordinates; follow-ups listed |
| 1.5 | 2026-10-18 | CH-249: import body audit_note, result shape and errors; CH-250: directory_changes.audit_note, deactivate-only DELETE, slug rules, municipalities[] semantics as built (TASK-89.1) |
