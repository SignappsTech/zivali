---
id: TASK-89.1
title: >-
  Directory admin API: edits with versions, CSV import with dry run, yearly
  reminder job
status: In Progress
assignee:
  - '@backend-dev'
created_date: '2026-10-14 23:36'
updated_date: '2026-10-15 21:53'
labels:
  - be
  - 'est:S'
milestone: m-2
dependencies:
  - TASK-88.2
  - TASK-34.2
references:
  - docs/tech/backend.md
  - docs/tech/contracts/C18-shelter-directory.md
  - docs/tech/contracts/C1-platform-conventions.md
parent_task_id: TASK-89
priority: low
ordinal: 285000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
New shelters and municipal contracts change the directory; admins must correct it safely and be reminded every year after 31 March (FR-044 R-044.3).
## Packet
Unblocks on: Shelter directory API: models, versioned seed, public lookup endpoints merged (TASK-88.2); Admin API: aal2 enforcement, users and roles, audit log, queues, admin bootstrap script merged (TASK-34.2)
Contracts: C18, C1 (in references); conventions in C1 and ADR-020
Review: tech-lead code review (full mode); run `pnpm verify` before reporting done.
Branch: agent/task-89.1-dir-admin-be
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST and PUT /v1/admin/shelters and PUT /v1/admin/municipality-shelters/:municipality (admins, aal2) validate input, write a directory_changes version and an audit entry, and the public endpoints show the change at once.
- [x] #2 POST /v1/admin/directory/import?dry_run=true returns the diff for an uploaded CSV without writing; without dry_run it applies the same diff in one transaction.
- [x] #3 The directory.reminder job runs on 1 April 08:00 Europe/Ljubljana and notifies admins with the entries older than 12 months.
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Pending CHANGE rows for backlog/changes.md (the worktree guard refused writes to the main checkout's inbox; lead: move these 3 rows there):

| - | tech-lead | docs/tech/contracts/C18-shelter-directory.md§Admin (import) | `POST /v1/admin/directory/import` body is `{ csv, audit_note? }`: `audit_note` is required unless `dry_run=true` (backend.md: bulk apply needs a note; missing → VALIDATION). Result: `id` = shelter slug or municipality slug, `diff` = `{ <field>: { from, to } }` (`from` null on create, `{}` for none), `errors[].row` = CSV row with the header as row 1, `field` = failing column or `header` (unknown format). With errors and no dry_run the answer is still 200 and nothing is written. Import versions keep `actor_id` null (C18) and carry the note; one audit entry `directory.import` per apply. | TASK-89.1 | open |
| - | tech-lead | docs/tech/contracts/C18-shelter-directory.md§Data, §Admin | As implemented in TASK-89.1: `directory_changes.audit_note String?` (history returns it). DELETE always deactivates (every shelter has history from version 1, and seed 05-directory would re-create a removed slug); PUT never changes the slug; POST `slug` optional (derived from the name; a taken slug, also an inactive shelter's → VALIDATION issue `slug`). `municipalities[]` = the exact CONFIRMED set: added ones are reassigned, dropped ones become UNCONFIRMED with shelter null (source/verified_at from the shelter). HAS_ASSIGNMENTS and `municipality_count` count CONFIRMED rows. Admin municipality list `shelter_slug` = confirmed or likely shelter. CONFIRMED needs an active shelter. `species` and `registry_id` are not in `Shelter`, so only the CSV import sets them (the admin form keeps them). Reminder: plain Slovenian email to admins with a confirmed address, cron `0 8 1 4 *` Europe/Ljubljana, audited as `directory.reminder`. | TASK-89.1 | open |
| - | tech-lead | TASK-89.2 / packages/api/src/directory-admin.ts | FE stubs differ from C18 and the TASK-89.1 API: (1) `audit_note` optional on POST/PUT (API requires it, VALIDATION); `version` and `municipalities` optional in ShelterInput (required on PUT; `municipalities` also on POST). (2) create/update typed as AdminShelter; the API returns `Shelter` (no id/active/version/municipality_count: refetch the list). (3) DirectoryChange has `id` and `actor: { display_name }`; the API returns `{ version, data, source, actor_id, audit_note, created_at }`. (4) DirectoryImportResult uses `label/before/after`; the API returns `{ entity, id, action: create/update/none, diff: { field: { from, to } } }`. (5) AdminMunicipality is flat `slug, name`; the API nests `municipality: { slug, name }`. (6) historyUrl calls `/v1/admin/municipality-shelters/:slug/changes`, which C18 does not have (404). (7) importDirectory must send `audit_note` when applying. | TASK-89.1 | open |
<!-- SECTION:NOTES:END -->
