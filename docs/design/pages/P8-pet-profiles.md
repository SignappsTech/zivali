---
source: 03§P8
page: P8 Pet profiles
stories: TASK-16 (FR-002, FR-003)
platforms: web, mobile
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

1. **Photos:** up to 5, camera or gallery, drag to reorder on web, first photo is the cover, delete with confirmation (photos removed from storage). Upload progress per photo.
2. **Basics:** species (choice rows Dog / Cat), name, sex (three pills), birth year (select).
3. **Looks:** breed (searchable select, localised names, "Mixed / Unknown"), colours (toggle pills), pattern (select), size (three choice pills).
4. **Chip:** line field (digits, grouped as typed), format hint; below it the `pets.chip_register_note` help text (plain text, no link); duplicates are flagged silently to moderators (never shown to the user).
5. **Collar and notes:** collar description, medication, temperament (textareas).

Sticky bottom bar on mobile with primary "Save"; web has Save at the end of the page and a sticky summary on `lg`. AI pre-fill (M3) adds the sparkle suggestion sentence on the photos step.

## Pet detail

Cover photo (radius 32), name h1, facts as a plain 2-column list, notes, chip row (never shows the number to anyone but the owner; the owner sees it with a reveal toggle), actions: primary "Report lost" (opens P6 with this pet prefilled), text buttons "Edit", "Delete". Delete uses a dialog that states photos are removed.

## States

| State | Behaviour |
|---|---|
| Empty | as above |
| Loading | row skeletons |
| Invalid or short chip | warning `note`: saved as "unknown chip", not blocked |
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
