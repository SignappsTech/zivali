---
source: 03§P8
page: P8 Pet profiles
stories: TASK-16 (FR-002, FR-003)
platforms: web, mobile
version: 1.2
mockup: docs/design/mockups/P8-pet-profiles.html
copy: docs/content/pages/P8-pet-profiles.md
---

# P8 Pet profiles

## Purpose

Owners register pets in advance (photos, chip, details) so reporting a loss takes seconds and matching has data. Lives under Profile on mobile and "My pets and reports" on web.

## List ("My pets")

- Heading and a count line. Primary `lg` "Add an animal" (one primary per view). 
- Pet rows: photo 64, name, species and breed line, chip indicator as a status-like word ("Chip on file" with shield icon, or "No chip" muted). Open report badge: if the pet has an open lost report, a `st-lost` word "Lost" with the report link.
- Free limit: when one profile exists and the user adds another, a quiet `note` says more profiles come with Premium (M4); the add action still works for the first profile only and never blocks reporting a pet lost with inline details.
- Below the list: "My reports" section (rows for open and past reports with status words) on web; on mobile a separate row "My reports".

Empty state: spot illustration, h3, sentence, primary "Add an animal".

## Add and edit (sectioned form, one section per screen on mobile)

A single column of line fields grouped by h3 labels with 40 px gaps. No cards, no borders.

1. **Photos:** 0 to 5 (none required on web and mobile, CH-329: a profile can be saved first and photographed later; a lost report for a pet without photos asks for one in P6), camera or gallery, drag to reorder on web, first photo is the cover, delete with confirmation (photos removed from storage). Upload progress per photo.
2. **Basics:** species (choice rows Dog / Cat), name, sex (three pills), birth year (select).
3. **Looks:** breed (searchable select, localised names; "Mixed breed" and "Not sure" always listed last), colours (all 10 as toggle pills; no "Other" expander, C4 has no other colour), pattern (select), size (three choice pills). Breed and pattern stay disabled with "Najprej izberite vrsto." until a species is chosen. Cats also get an ear-tip pill (Looks) and indoor/outdoor pills (Basics). (CH-272)
4. **Chip:** line field (digits, grouped as typed), format hint; below it the CRHŽ register pills (yes / no / not sure) with `pets.chip_register_note` as their help line (plain text, no link; CH-272); duplicates are flagged silently to moderators (never shown to the user).
5. **Collar and notes:** collar description and one "Opombe" textarea whose placeholder names medication and temperament. C4 `pets` has a single `notes` column, so there are no separate medication and temperament fields; `pets.medication_label`, `pets.temperament_label` and `pets.temperament_placeholder` are unused (CH-271).

Sticky bottom bar on mobile with primary "Save"; web has Save at the end of the page and a sticky summary on `lg`. AI pre-fill (M3) adds the sparkle suggestion sentence on the photos step.

### As built, web (TASK-16.6, CH-299)

- No "Moje prijave" section on the list (TASK-26.4 owns `/moje-prijave`) and no open-report badge on rows (C4 `Pet` carries no open report; it would need an API field).
- Photos use the PhotoPicker rows (up and down buttons, no drag). Removing a saved photo has no confirmation: it takes effect on Save, and leaving through "Moje živali" with changes asks to discard.
- The `lg` sticky summary has the cover, name, species and breed, and Save; no checklist lines (no copy).
- The unsaved-changes dialog covers the back link and the browser leave prompt, not header links.

### As built, mobile (TASK-16.7, CH-324)

- At the free limit (2 active pets) "Dodaj žival" stays active but opens no form; pressing it adds two text actions to the limit note: Premium (web checkout in the in-app browser, purpose `subscription`, answers 503 until M4) and "report without a profile" (`/report/lost`). The same note shows in the form's sticky bar on a PET_LIMIT answer.
- Archived pets stay in the one list with an "Arhiviran" word (as on web); their detail shows that word instead of "Prijavi izgubljeno žival".
- The mobile list has no "Moje prijave" row until a mobile My reports screen exists (TASK-26.5).

## Pet detail

Cover photo (radius 32), name h1, facts as a plain 2-column list, notes, chip row (never shows the number to anyone but the owner; the owner sees it with a reveal toggle), actions: primary "Report lost" (opens P6 with this pet prefilled), text buttons "Edit", "Delete". Delete uses a dialog that states photos are removed.

## States

| State | Behaviour |
|---|---|
| Empty | as above |
| Loading | row skeletons |
| Invalid or short chip | warning `note` when the digits fall outside 9 to 15 (C4 `normalizeChip`): saved as "unknown chip", not blocked. Mockup M5 shows "705 1234" (CH-274) |
| Photo upload failure | per photo retry |
| Pet limit reached | quiet note, no modal |
| Unsaved changes | leaving with edits asks to discard or save (dialog) |
| Deleted | toast and return to the list |

## Responsive and accessibility

List single column; detail two columns from `lg` (photos left, facts right). Labels above fields, errors with icon text, reveal toggle for the chip number has an accessible name, reorder has a non-drag alternative (move up and down buttons).

## Assets

| File | Brief |
|---|---|
| `assets/empty-no-pets.png` | Empty-state illustration for "no animals yet". See image task. |

## Mockup scope (`P8-pet-profiles.html`)

1. Mobile: list, empty, add steps (photos, basics, looks, chip, notes), detail, invalid chip warning, delete dialog, limit note.
2. Web: list with reports section, edit form, detail.
3. Light and dark.

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-18 | CH-271, CH-272, CH-299, CH-324: Looks and notes sections as built, web and mobile as-built notes |
| 1.2 | 2026-10-19 | CH-329: no minimum photo count on web and mobile. CH-274: chip warning outside 9 to 15 digits, M5 sample |
