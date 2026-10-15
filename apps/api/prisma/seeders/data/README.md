# Responsible-shelter directory seed data (C18, TASK-88.1)

Public reference data: the 17 registered shelters for abandoned animals in Slovenia and the shelter
responsible for each of the 212 municipalities (GURS). The seeder `prisma/seeders/05-directory.seeder.ts`
(TASK-88.2) loads both files. `node --test scripts/` (part of `pnpm test` and `pnpm verify`) validates them
and prints the municipalities that still have no confirmed shelter.

## Files

`shelters.csv` has one row per registered shelter. The columns follow the `shelters` model in C18:

| Column                           | Content                                                                                                                                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `slug`                           | ASCII URL slug for `/zavetisca/[slug]`                                                                                                                                                                          |
| `name`                           | Public shelter name                                                                                                                                                                                             |
| `address`, `postal_code`, `city` | Address of the shelter (as on the shelter website, else as in the register)                                                                                                                                     |
| `lat`, `lng`                     | Empty for now (optional in C18)                                                                                                                                                                                 |
| `phone`                          | The number to call, in E.164 (`+386…`)                                                                                                                                                                          |
| `phone_display`                  | The same number, grouped as the shelter publishes it (separators as spaces)                                                                                                                                     |
| `email`, `website`               | The shelter's general e-mail and website. E-mail addresses that contain a person's name are left out (no personal data)                                                                                         |
| `opening_hours`                  | JSON array `[{ "days": "mon-fri", "from": "10:00", "to": "16:00", "note_sl"?, "note_en"? }]`; `[]` when the shelter publishes no hours                                                                          |
| `registry_id`                    | `<register edition>#<position>`, e.g. `2026-02-23#3`. **Not an official register number:** the UVHVVR register publishes no shelter numbers, only a numbered list, so this is the list position in that edition |
| `source`                         | Where each value comes from, and any corrections                                                                                                                                                                |
| `verified_at`                    | Date the row was last checked against its sources                                                                                                                                                               |

`municipality_shelters.csv` has at least one row per municipality:

| Column              | Content                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `municipality_slug` | GURS slug from `supabase/seed/geo/municipalities.geojson` (the seeder maps it to `app.municipalities.id`)                     |
| `municipality_name` | GURS name (for people editing the file; the test checks it)                                                                   |
| `species`           | Empty = all animals; `cat` or `dog` = this row applies to that species only and overrides the empty row                       |
| `shelter_slug`      | Responsible shelter; empty when `status` is `UNCONFIRMED`                                                                     |
| `status`            | `CONFIRMED` or `UNCONFIRMED`                                                                                                  |
| `suggested_shelter` | Unconfirmed rows only: the most likely shelter from an old or indirect source (a lead for the client)                         |
| `source`            | The document that names the shelter, with its date or the access date; unconfirmed rows start with "ni potrjeno:" and say why |
| `verified_at`       | Date the row was last checked                                                                                                 |

There is at most one row per municipality and species. Each municipality must resolve for both cats and
dogs, through an empty-species row or through both a `cat` and a `dog` row. The `species` column is an
addition to C18 (reported as a CHANGE).

## Sources and method

1. **Shelters:** the UVHVVR register "Seznam zavetišč za zapuščene živali", last updated 23 Feb 2026:
   https://www.gov.si/assets/organi-v-sestavi/UVHVVR/Bolezni-zivali/Seznam-obratov/Seznam-obratov-splosni/REG-zavetisc-2026-02-23.docx.
   Each shelter's website was then checked for its address, phone, hours and e-mail (URL in `source`).
2. **Municipalities:** a municipality is `CONFIRMED` only when a source from 2025–26, or a live page that
   states the current arrangement, names its shelter and nothing newer contradicts it. Sources,
   in order of preference: the shelter's own list of contract municipalities, the municipality's website,
   ordinance or concession act (Uradni list RS, lex-localis), or news about a new contract. When no
   current source names a shelter, or sources contradict each other, the row is `UNCONFIRMED`. The API
   then shows no phone number for that municipality (R-044.5).
3. Several shelters cancelled municipal contracts in 2025–26 after the stricter capacity rules (ZZZiv-G),
   so a contract list older than 2025 needs a newer source. That is why the municipalities on the
   Horjul 2024 report and the old Mala hiša list (Pomurje) are `UNCONFIRMED` with a `suggested_shelter`.
4. Research of October 2026 (web only, no calls). `node --test scripts/` prints the open list. Koroška
   has no shelter (a regional one is planned for 2029), and several municipalities have no contract or
   an open tender.

## No personal data

The files hold only organisation data: names, addresses, phone numbers and general e-mail addresses that
the shelters publish in the official register or on their websites. E-mail addresses that contain a
person's name are left out.

## Yearly refresh (TASK-89 reminder, 1 April)

Each municipality reports its shelters to UVHVVR by 31 March (ZZZiv 27).

1. Download the latest register from gov.si. Search for "REG-zavetisc" under UVHVVR, Seznam obratov.
   Add, deactivate or update shelters, and set `registry_id` to the new edition and position.
2. For each shelter, re-check its municipality list page (URL in the `source` column).
3. For each `UNCONFIRMED` row, ask the municipality or UVHVVR. The municipal reports to UVHVVR can be
   requested as public information (ZDIJZ).
4. Update `source` and `verified_at`, then run `node --test scripts/`.
