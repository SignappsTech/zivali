---
source: 03§P8; docs/design/pages/P8-pet-profiles.md
page: P8 Pet profiles
stories: TASK-16 (FR-002, FR-003)
copy-for: docs/design/pages/P8-pet-profiles.md
version: 0.1
status: Draft, native Slovenian review pending
date: 2026-10-15
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
| pets.limit_note | Za zdaj lahko shranite en profil živali. Izgubljeno žival lahko vedno prijavite tudi brez profila. | For now you can save one pet profile. You can always report a lost pet without a profile. |
| pets.limit_note_premium | Brezplačno lahko shranite en profil živali, več jih omogoča Premium Zaščita. Izgubljeno žival lahko vedno prijavite tudi brez profila. | You can save one pet profile for free; Premium Protect allows more. You can always report a lost pet without a profile. |
| pets.my_reports | Moje prijave | My reports |
| pets.my_reports_empty | Nimate še nobene prijave. | You have no reports yet. |

`pets.limit_note_premium` replaces `pets.limit_note` once Premium exists (M4). Open lost report on a pet row: status word `browse.status_lost` (P4) with `pets.open_search`.

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
| pets.chip_help | Običajno ima 15 števk, na primer 705 1234 5678 901. Vidite jo samo vi. | It usually has 15 digits, for example 705 1234 5678 901. Only you can see it. |
| pets.chip_warning | Številka čipa je običajno dolga 15 števk. Shranili jo bomo kot neznano, preverite jo, ko boste lahko. | Chip numbers usually have 15 digits. We will save it as unknown; please check it when you can. |
| pets.crpsi_link | Preverite podatke v Centralnem registru psov (CRPsi) | Check your details in the Central Register of Dogs (CRPsi) |
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

`pets.crpsi_link` is shown for dogs only and opens the official CRPsi search in a new tab (`common.opens_new_tab`).

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

# 4. States

| State | Copy |
|---|---|
| Loading | `common.loading` (P1) |
| Invalid or short chip | `pets.chip_warning` |
| Photo upload failure | `photos.failed`, `photos.retry` (P6) |
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
