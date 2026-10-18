---
source: 03§P8; docs/design/pages/P8-pet-profiles.md
page: P8 Pet profiles
stories: TASK-16 (FR-002, FR-003)
copy-for: docs/design/pages/P8-pet-profiles.md
version: 0.4
status: Draft, native Slovenian review pending
date: 2026-10-18
---

# P8 Pet profiles: copy

Namespace `pets`. Attribute labels: glossary §7. Photo controls: `photos.*` (P6). Pet names are inserted in the nominative only.

# 1. List ("Moje živali")

| Key | SL | EN |
|---|---|---|
| pets.title | Moje živali | My pets |
| pets.count | {count, plural, one {# žival} two {# živali} few {# živali} other {# živali}} | {count, plural, one {# pet} other {# pets}} |
| pets.add | Dodaj žival | Add a pet |
| pets.row_meta | {species} · {breed} | {species} · {breed} |
| pets.chip_on_file | Čip vpisan | Chip on file |
| pets.chip_none | Brez čipa | No chip |
| pets.chip_unknown | Čip ni znan | Chip unknown |
| pets.open_search | Odpri iskanje | Open search |
| pets.limit_note | Za zdaj lahko shranite {limit, plural, one {# profil} two {# profila} few {# profile} other {# profilov}} živali. Izgubljeno žival lahko vedno prijavite tudi brez profila. | For now you can save {limit, plural, one {# pet profile} other {# pet profiles}}. You can always report a lost pet without a profile. |
| pets.limit_note_premium | Brezplačno lahko shranite {limit, plural, one {# profil} two {# profila} few {# profile} other {# profilov}} živali, več jih omogoča Premium Zaščita. Izgubljeno žival lahko vedno prijavite tudi brez profila. | You can save {limit, plural, one {# pet profile} other {# pet profiles}} for free; Premium Protect allows more. You can always report a lost pet without a profile. |
| pets.my_reports | Moje prijave | My reports |
| pets.my_reports_empty | Nimate še nobene prijave. | You have no reports yet. |

`{limit}` is the free profile limit from `app_config` `pets.free_limit` (now 2, API error `PET_LIMIT`), so the copy renders "2 profila" / "2 pet profiles" (CH-237, CH-243; lead decision 2026-10-16, PRD R-002.4). The P8 mockup's sample "dva profila" is the same sentence spelled out. `pets.limit_note_premium` replaces `pets.limit_note` once Premium exists (M4); the apps show `limit_note_premium` because the acceptance criteria ask for the Premium mention, so `limit_note` need not be in the catalogue until Premium is hidden.

My reports row meta (CH-344): no `pets.my_reports_row_meta` key is added. The row reuses the report's own relative phrase `report.since_{type}` ("Pogrešana od 12. oktobra" / "Missing since 12 October"), which is the same wording as on the report; the mockup's "Prijavljena 12. 10. 2026" is superseded.

Mobile additions (CH-323, TASK-16.7), draft, needs native review:

| Key | SL | EN |
|---|---|---|
| pets.status_lost | Izgubljena | Lost |
| pets.premium_action | Več profilov s Premium Zaščito | More profiles with Premium Protect |
| pets.report_without_profile | Prijavi izgubljeno žival brez profila | Report a lost pet without a profile |

`pets.status_lost` is the pet-row status word until P4's `browse.status_lost` is used on the row. `pets.premium_action` opens the web checkout in the in-app browser. `empty_action` and `open_search` are the slice's own keys. Open lost report on a pet row: status word `browse.status_lost` (P4) with `pets.open_search`.

Empty state:

| Key | SL | EN |
|---|---|---|
| pets.empty_title | Še nimate shranjenih živali | You have not saved any pets yet |
| pets.empty_body | Shranite fotografije in številko čipa že zdaj. Če se žival kdaj izgubi, je prijava oddana v nekaj sekundah. | Save photos and the chip number now. If your pet ever goes missing, your report is ready in seconds. |
| pets.empty_action | Dodaj žival | Add a pet |

# 2. Add and edit

| Key | SL | EN |
|---|---|---|
| pets.new_title | Nova žival | New pet |
| pets.edit_title | Uredi profil | Edit profile |
| pets.section_photos | Fotografije | Photos |
| pets.photos_help | Dodate lahko do 5 fotografij. Prva je naslovna. | You can add up to 5 photos. The first is the cover. |
| pets.section_basics | Osnovno | Basics |
| pets.species_label | Vrsta | Species |
| pets.name_label | Ime | Name |
| pets.sex_label | Spol | Sex |
| pets.birth_year_label | Leto rojstva | Year of birth |
| pets.birth_year_placeholder | Izberite leto | Choose a year |
| pets.section_looks | Videz | Appearance |
| pets.breed_label | Pasma | Breed |
| pets.breed_search | Poiščite pasmo | Search for a breed |
| pets.breed_none | Te pasme ne najdemo. Izberite Mešanec ali Ne vem. | We cannot find that breed. Choose Mixed breed or Not sure. |
| pets.colour_label | Barva | Colour |
| pets.pattern_label | Vzorec | Pattern |
| pets.size_label | Velikost | Size |
| pets.section_chip | Čip | Microchip |
| pets.chip_label | Številka čipa | Chip number |
| pets.chip_help | Običajno ima 15 števk, na primer 705 1234 5678 9012. Vidite jo samo vi. | It usually has 15 digits, for example 705 1234 5678 9012. Only you can see it. |
| pets.chip_warning | Številka čipa je običajno dolga 15 števk. Shranili jo bomo kot neznano, preverite jo, ko boste lahko. | Chip numbers usually have 15 digits. We will save it as unknown; please check it when you can. |
| pets.chip_register_note | Čip prebere veterinar ali pristojno zavetišče in podatke o lastniku poišče v Centralnem registru hišnih živali (CRHŽ), ki ni javen. Ali so vaši podatki v registru pravilni, preverite pri svojem veterinarju. | A vet or the responsible shelter reads the chip and looks up the owner's details in the Central Register of Pets (CRHŽ), which is not public. Ask your vet to check that your details in the register are correct. |
| pets.section_notes | Ovratnica in opombe | Collar and notes |
| pets.collar_label | Ovratnica | Collar |
| pets.collar_placeholder | Na primer: rdeča ovratnica z zvončkom | For example: red collar with a bell |
| pets.medication_label | Zdravila | Medication |
| pets.temperament_label | Značaj | Temperament |
| pets.temperament_placeholder | Na primer: plašna, k sebi pusti le znane ljudi | For example: shy, only lets familiar people near |
| pets.notes_private | Opombe so zasebne in niso del javne prijave. | Notes are private and are not part of a public report. |
| pets.save | Shrani | Save |
| pets.saved | Profil je shranjen. | Profile saved. |
| pets.species_required | Izberite, ali je pes ali mačka. | Choose dog or cat. |
| pets.name_required | Vpišite ime. | Enter a name. |

`pets.chip_register_note` replaces `pets.crpsi_link`, which is removed. It is a plain help line under the chip field for dogs and cats, with no link and no external-link icon: the public lookup closed in June 2026 and the register is not public (A-003, glossary "CRHŽ").

`CHANGE docs/design/pages/P8-pet-profiles.md§4 Chip: replace "a link for dogs to the official CRPsi lookup (text button with external-link icon)" with the help line pets.chip_register_note under the chip field, no link (A-003).`

## Chip register, cats and notes (PetFields, CH-269, TASK-16.4)

Keys drafted in `packages/i18n/messages/{sl,en}/pets.json`. Draft, needs native review.

| Key | SL | EN |
|---|---|---|
| pets.crhz_label | Ali je čip v CRHŽ vpisan z vašo trenutno telefonsko številko? | Is the chip registered in CRHŽ with your current phone number? |
| pets.answer_yes | Da | Yes |
| pets.answer_no | Ne | No |
| pets.answer_unknown | Ne vem | Not sure |
| pets.crhz_reminder | Prosite veterinarja, naj v registru posodobi vašo telefonsko številko, da vas lahko pokličejo, ko žival najdejo. | Ask your vet to update your phone number in the register so you can be called when your pet is found. |
| pets.ear_tip_label | Ali ima prirezano konico ušesa? | Is the tip of one ear clipped? |
| pets.ear_tip_help | Tako so pogosto označene kastrirane prostoživeče mačke. | Neutered community cats are often marked this way. |
| pets.lifestyle_label | Kje živi? | Where does your cat live? |
| pets.lifestyle.indoor | Samo notri | Indoors only |
| pets.lifestyle.outdoor | Večinoma zunaj | Mostly outdoors |
| pets.lifestyle.both | Notri in zunaj | Indoors and outdoors |
| pets.species_first | Najprej izberite vrsto. | Choose the species first. |
| pets.not_sure | Ne vem | Not sure |
| pets.notes_label | Opombe | Notes |
| pets.notes_placeholder | Na primer: zdravila, ki jih potrebuje, in kako se odziva na neznance | For example: medication it needs and how it reacts to strangers |

`crhz_label` is the CRHŽ question; `crhz_reminder` shows only on "Ne" and "Ne vem". `ear_tip_*` and `lifestyle_*` are cats only (the SL lifestyle label stays neutral because the pet name is not inserted). `species_first` is the hint on breed and pattern before a species is chosen. `not_sure` is the select item that clears the birth year and the pattern. `notes_label` and `notes_placeholder` replace the separate medication and temperament fields on mobile.

Photo removal on mobile (CH-237, CH-323), draft; the P8 mockup C3 uses this as sample text:

| Key | SL | EN |
|---|---|---|
| pets.photo_delete_title | Odstranim fotografijo? | Remove this photo? |
| pets.photo_delete_body | Fotografija bo izbrisana tudi iz shrambe. | The photo will also be deleted from storage. |
| pets.photo_delete_confirm | Odstrani | Remove |

Mobile form chrome (CH-323), draft:

| Key | SL | EN |
|---|---|---|
| pets.step_a11y | Korak {n} od {total} | Step {n} of {total} |
| pets.photos_required | Dodajte vsaj eno fotografijo. | Add at least one photo. |
| pets.photos_pending | Počakajte, da se fotografije naložijo, ali odstranite tiste, ki se niso naložile. | Wait until the photos are uploaded, or remove the ones that did not upload. |

`step_a11y` is the accessible name of the five-bar progress. `photos_required` applies the 1 to 5 photos rule. `photos_pending` shows when Save is pressed while an upload is still running.

# 3. Pet detail

| Key | SL | EN |
|---|---|---|
| pets.fact_species | Vrsta | Species |
| pets.fact_breed | Pasma | Breed |
| pets.fact_colour | Barva | Colour |
| pets.fact_pattern | Vzorec | Pattern |
| pets.fact_size | Velikost | Size |
| pets.fact_sex | Spol | Sex |
| pets.fact_born | Leto rojstva | Year of birth |
| pets.fact_collar | Ovratnica | Collar |
| pets.chip_row | Čip | Microchip |
| pets.chip_show | Pokaži številko | Show number |
| pets.chip_hide | Skrij številko | Hide number |
| pets.chip_only_you | Številko vidite samo vi. | Only you can see the number. |
| pets.report_lost | Prijavi izgubljeno žival | Report as lost |
| pets.edit | Uredi | Edit |
| pets.delete | Izbriši | Delete |
| pets.delete_title | Izbrišete ta profil? | Delete this profile? |
| pets.delete_body | Izbrisali bomo tudi vse fotografije profila. Odprte prijave ostanejo. | We will also delete all the profile's photos. Open reports stay as they are. |
| pets.delete_confirm | Izbriši profil | Delete profile |
| pets.deleted | Profil je izbrisan. | Profile deleted. |

Archive (CH-298, TASK-16.6), draft, needs native review:

| Key | SL | EN |
|---|---|---|
| pets.archive | Arhiviraj | Archive |
| pets.archive_title | Arhiviram ta profil? | Archive this profile? |
| pets.archive_body | Arhiviran profil ostane shranjen, a se ne šteje več med brezplačne profile. Arhiviranja ni mogoče preklicati. | An archived profile stays saved but no longer counts towards your free profiles. Archiving cannot be undone. |
| pets.archive_confirm | Arhiviraj profil | Archive profile |
| pets.archived | Profil je arhiviran. | Profile archived. |
| pets.archived_label | Arhiviran | Archived |

`pets.archived` is a toast; `pets.archived_label` is the status word on an archived profile. The photo alt text of §6 is the key `pets.photo_alt` ("{name}, fotografija {n}" / "{name}, photo {n}").

# 4. States

| State | Copy |
|---|---|
| Loading | `common.loading` (P1) |
| Invalid or short chip | `pets.chip_warning` |
| Photo upload failure | `photos.failed`, `photos.retry` (P6) |
| Photo rejected on save | `photos.rejected` (P6), shown as the save toast |
| Pet limit | `pets.limit_note` |
| Unsaved changes | `common.discard_title`, `common.discard_body`, `common.discard_confirm`, `common.keep_editing` (P1) |
| Deleted | `pets.deleted` |

# 5. SEO

N/A: signed-in pages, `noindex`. Document titles: "Moje živali · Najdimo" / "My pets · Najdimo"; "Nova žival · Najdimo" / "New pet · Najdimo".

# 6. Alt text

| Image | SL | EN |
|---|---|---|
| Profile photo n | {name}, fotografija {n} | {name}, photo {n} |
| Row photo | {name} | {name} |
| Empty-state illustration `assets/empty-no-pets.png` | decorative, `alt=""` | |

# 7. CHANGE requests

- `CHANGE docs/design/pages/P8-pet-profiles.md§Pet detail: remove the "Order a tag" text button (QR tags are out of scope, brief v0.7).`
- `CHANGE docs/tech/contracts/C15-routes-deeplinks.md§Web routes: myPets SL /moji-ljubljenci → /moje-zivali (glossary: "žival" in UI labels).`

# Change log

| Date | Change |
|---|---|
| 2026-10-15 | CH-79: `chip_help` example is now 15 digits, 705 1234 5678 9012. |
| 2026-10-18 | CH-496 (TASK-114.5): `photos.rejected` (P6 §3) is the save toast when a photo is rejected. |
| 2026-10-18 | v0.4. CH-237/CH-243: `pets.limit_note` and `limit_note_premium` take `{limit}` (free limit 2); photo-delete keys. CH-269: PetFields keys. CH-298: archive keys, `photo_alt`. CH-323: mobile keys. CH-344: decided no `my_reports_row_meta` (reuse `report.since_{type}`). |
