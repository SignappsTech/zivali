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
  actor_id    String?  @db.Uuid                        // null for seed or import
  created_at  DateTime @default(now()) @db.Timestamptz(6)
  @@schema("app")
}
```

Seed (TASK-88): `apps/api/prisma/seeders/data/shelters.csv` and `municipality_shelters.csv` loaded by `prisma/seeders/05-directory.seeder.ts` with a `source` and `verified_at` per row; a validation script checks 212 municipalities, every confirmed row points at an active shelter, phones are E.164.

## REST API (public, no auth, cacheable `Cache-Control: public, max-age=3600`)

| Method and path | Purpose | Response |
|---|---|---|
| `GET /v1/shelters` | index (TASK-90) | `{ items: ShelterSummary[] }` sorted by name |
| `GET /v1/shelters/:slug` | shelter page | `Shelter & { municipalities: { slug, name }[] }`, 404 if unknown or inactive |
| `GET /v1/shelters/responsible?lat=&lng=` or `?municipality=<slug>` | checklist and call button | `{ status: 'confirmed', municipality: { slug, name }, shelter: Shelter } \| { status: 'unconfirmed' \| 'outside_slovenia', municipality?: { slug, name } }` |
| `GET /v1/shelters/municipalities` | municipality search on the index page | `{ items: { slug, name, shelter_slug \| null }[] }` |

`Shelter = { slug, name, address, postal_code, city, phone, phone_display, website?, opening_hours, source, verified_at }`. An unconfirmed municipality never returns a phone number (R-044.5). Lookups by point use `geo_lookup` (C6).

## Admin (TASK-89, M3)

`PUT /v1/admin/shelters/:slug`, `POST /v1/admin/shelters`, `PUT /v1/admin/municipality-shelters/:municipality` (staff aal2): zod-validated, writes a `directory_changes` row and an audit entry, bumps `version`. `POST /v1/admin/directory/import?dry_run=true` (CSV) returns the diff; without `dry_run` applies it in one transaction. pg-boss job `directory.reminder` (cron 1 April 08:00 Europe/Ljubljana) notifies admins with entries whose `verified_at` is older than 12 months.

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
