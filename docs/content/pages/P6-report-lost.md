---
source: 03§P6; docs/design/pages/P6-report-lost.md
page: P6 Report lost
stories: TASK-29 (FR-005, FR-003, FR-002)
copy-for: docs/design/pages/P6-report-lost.md
version: 0.2
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P6 Report lost: copy

Namespace `report_lost` (photos in `photos`, location in `location` from P5, sign-in gate in `auth` from P16, support row in `support` from P15). The flow is calm and short: one question per screen, the owner is addressed with vikanje, no ad and no payment prompt anywhere in the flow.

# 1. Flow chrome

| Key | SL | EN |
|---|---|---|
| report_lost.flow_label | Prijava izgubljene živali | Report a lost pet |
| report_lost.step_a11y | Korak {current} od {total} | Step {current} of {total} |
| report_lost.back | Nazaj | Back |
| report_lost.next | Naprej | Next |
| report_lost.close | Zapri | Close |
| report_lost.close_title | Prekinete prijavo? | Stop reporting for now? |
| report_lost.close_body | Osnutek ostane shranjen na tej napravi. Nadaljujete lahko kadar koli. | Your draft stays saved on this device. You can continue at any time. |
| report_lost.close_confirm | Prekini | Stop |
| report_lost.close_cancel | Nadaljuj prijavo | Continue reporting |
| report_lost.draft_saved | Osnutek je shranjen. | Draft saved. |
| report_lost.resume_title | Nadaljujete prijavo? | Continue your report? |
| report_lost.resume_body | Imate shranjen osnutek z dne {date}. | You have a saved draft from {date}. |
| report_lost.resume_continue | Nadaljuj | Continue |
| report_lost.resume_discard | Začni znova | Start again |

# 2. Step 1: Which pet

| Key | SL | EN |
|---|---|---|
| report_lost.pet_title | Katero žival iščete? | Which pet are you looking for? |
| report_lost.pet_other | Druga žival | Another animal |
| report_lost.pet_other_desc | Podatke vnesete zdaj. | Enter the details now. |
| report_lost.pet_enter | Vnesi podatke | Enter details |

Saved pet rows show the pet name and species ("Luna · Mačka").

# 3. Step 2: Photos

| Key | SL | EN |
|---|---|---|
| report_lost.photos_title | Dodajte fotografije | Add photos |
| report_lost.photos_help | Dodate lahko do 5 fotografij. Na prvi naj bo dobro viden obraz. | You can add up to 5 photos. Make sure the face is clearly visible on the first. |
| photos.take | Fotografiraj | Take a photo |
| photos.choose | Izberi iz galerije | Choose from gallery |
| photos.choose_web | Izberi fotografije | Choose photos |
| photos.drop_web | ali jih povlecite sem | or drag them here |
| photos.thumb_a11y | Fotografija {n} od {total} | Photo {n} of {total} |
| photos.remove | Odstrani fotografijo {n} | Remove photo {n} |
| photos.move_left | Premakni fotografijo {n} naprej | Move photo {n} earlier |
| photos.move_right | Premakni fotografijo {n} nazaj | Move photo {n} later |
| photos.cover | Naslovna fotografija | Cover photo |
| photos.uploading | Nalaganje {percent} % | Uploading {percent}% |
| photos.progress_a11y | Nalaganje fotografije {n} | Uploading photo {n} |
| photos.uploaded | Fotografija je naložena. | Photo uploaded. |
| photos.failed | Fotografija se ni naložila. | The photo did not upload. |
| photos.failed_network | Fotografija se ni naložila. Preverite povezavo in poskusite znova. | The photo did not upload. Check your connection and try again. |
| photos.retry | Poskusi znova | Try again |
| photos.limit | Dodate lahko največ 5 fotografij. | You can add up to 5 photos. |
| report_lost.photos_required | Dodajte vsaj eno fotografijo, da bodo ljudje žival prepoznali. | Add at least one photo so people can recognise your pet. |
| report_lost.photos_wait | Počakajte, da se naloži vsaj ena fotografija. | Please wait until at least one photo has uploaded. |

Upload states (v0.2): the progress bar carries `photos.progress_a11y` as its accessible name and `photos.uploading` as its visible label. When a photo is done, `photos.uploaded` is announced once in a polite live region (no lasting text on the thumbnail). Use `photos.failed_network` when the connection dropped and `photos.failed` for any other failure, both with `photos.retry`; wrong file type or size uses `errors.UPLOAD_TYPE` or `errors.UPLOAD_SIZE` (P1).

# 4. Step 3: Details

| Key | SL | EN |
|---|---|---|
| report_lost.details_title | Opišite žival | Tell us about your pet |
| report_lost.species_label | Vrsta | Species |
| report_lost.species_required | Izberite, ali je pes ali mačka. | Choose dog or cat. |
| report_lost.size_label | Velikost | Size |
| report_lost.colour_label | Barva | Colour |
| report_lost.colour_other | Drugo | Other |
| report_lost.colour_required | Izberite vsaj eno barvo. | Choose at least one colour. |
| report_lost.name_label | Ime | Name |
| report_lost.name_help | Ime, na katero se odziva. | The name your pet answers to. |
| report_lost.chip_label | Številka čipa (neobvezno) | Chip number (optional) |
| report_lost.chip_help | Običajno ima 15 števk, na primer 705 1234 5678 901. Nikoli je ne prikažemo javno. | It usually has 15 digits, for example 705 1234 5678 901. We never show it publicly. |
| report_lost.chip_warning | Številka čipa je običajno dolga 15 števk. Shranili jo bomo kot neznano, preverite jo, ko boste lahko. | Chip numbers usually have 15 digits. We will save it as unknown; please check it when you can. |
| report_lost.collar_label | Ovratnica (neobvezno) | Collar (optional) |
| report_lost.collar_placeholder | Na primer: rdeča ovratnica z zvončkom | For example: red collar with a bell |
| report_lost.marks_label | Posebnosti (neobvezno) | Distinctive marks (optional) |
| report_lost.marks_help | Po čem jo prepoznamo? Eno posebnost obdržite zase, da boste lažje prepoznali prevaro. | How can people recognise your pet? Keep one detail to yourself so you can spot a scam. |
| report_lost.sex_label | Spol (neobvezno) | Sex (optional) |
| report_lost.dog_register_link | Preverite podatke v Centralnem registru psov (CRPsi) | Check your details in the Central Register of Dogs (CRPsi) |

Attribute labels (species, size, colours, sex): glossary §7.

# 5. Step 4: Where

Location picker (P5) with `location.title_lost` and the radius control.

# 6. Step 5: When

| Key | SL | EN |
|---|---|---|
| report_lost.when_title | Kdaj ste žival nazadnje videli? | When did you last see your pet? |
| report_lost.when_now | Pravkar | Just now |
| report_lost.when_today | Danes | Today |
| report_lost.when_yesterday | Včeraj | Yesterday |
| report_lost.when_other | Drugič | Another time |
| report_lost.when_date | Datum | Date |
| report_lost.when_time | Ura | Time |
| report_lost.when_future | Datum in ura ne moreta biti v prihodnosti. | The date and time cannot be in the future. |
| report_lost.when_old | Od takrat je minilo več kot 30 dni. Prijavo lahko oddate, a ujemanj bo verjetno manj. | That was more than 30 days ago. You can still report it, but there will probably be fewer matches. |

# 7. Step 6: What happened and contact

| Key | SL | EN |
|---|---|---|
| report_lost.circumstances_title | Kaj se je zgodilo? | What happened? |
| report_lost.circumstances_label | Opis okoliščin (neobvezno) | What happened (optional) |
| report_lost.circumstances_placeholder | Na primer: med sprehodom ga je prestrašil ognjemet in se je iztrgal s povodca. | For example: fireworks scared him on a walk and he slipped his lead. |
| report_lost.circumstances_help | To bo javno vidno. Ne navajajte naslova ali telefonske številke. | This will be public. Do not include your address or phone number. |
| report_lost.circumstances_too_long | Opis je predolg. Skrajšajte ga na največ {max} znakov. | The description is too long. Please shorten it to {max} characters or fewer. |
| report_lost.contact_label | Kako vam lahko pišejo? | How can people reach you? |
| report_lost.contact_chat | Samo s sporočili v aplikaciji | Only through messages in the app |
| report_lost.contact_chat_desc | Priporočeno. Vaša telefonska številka ostane skrita. | Recommended. Your phone number stays hidden. |
| report_lost.contact_phone | Sporočila, telefon pa v potrjenem pogovoru | Messages, plus my phone in a confirmed conversation |
| report_lost.contact_phone_desc | Številko pokažemo le osebi, s katero ste potrdili ujemanje. | We only show your number to someone you have confirmed a match with. |
| report_lost.contact_phone_missing | V profilu še nimate telefonske številke. Dodate jo lahko pozneje. | You have no phone number in your profile yet. You can add one later. |

# 8. Step 7: Review

| Key | SL | EN |
|---|---|---|
| report_lost.review_title | Preverite in objavite | Check and publish |
| report_lost.review_photos | Fotografije | Photos |
| report_lost.review_pet | Žival | Pet |
| report_lost.review_place | Kraj | Place |
| report_lost.review_time | Nazadnje videno | Last seen |
| report_lost.review_circumstances | Kaj se je zgodilo | What happened |
| report_lost.review_contact | Kontakt | Contact |
| report_lost.review_edit | Uredi | Edit |
| report_lost.review_edit_a11y | Uredi: {field} | Edit: {field} |
| report_lost.review_note | Ko objavite, obvestimo ljudi v bližini, ki imajo vklopljena opozorila. | When you publish, we alert people nearby who have alerts turned on. |
| report_lost.publish | Objavi iskanje | Publish search |
| report_lost.publishing | Objavljamo … | Publishing … |

# 9. Sign-in gate (at Publish)

| Key | SL | EN |
|---|---|---|
| report_lost.gate_title | Za objavo potrebujete račun | You need an account to publish |
| report_lost.gate_body | Tako vas obvestimo o ujemanjih, ljudje pa vam lahko pišejo, ne da bi videli vašo številko. Vse, kar ste vnesli, ostane. | That way we can tell you about matches, and people can message you without seeing your number. Everything you entered is kept. |

Buttons: P16 gate (Vpis, Ustvari račun, Google, Apple, Prekliči).

# 10. Confirmation

| Key | SL | EN |
|---|---|---|
| report_lost.done_title | Iskanje je objavljeno | Your search is live |
| report_lost.done_lede_named | {name} je zdaj na zemljevidu. Ljudem v bližini že pošiljamo opozorilo. | {name} is now on the map. We are already alerting people nearby. |
| report_lost.done_lede | Prijava je zdaj na zemljevidu. Ljudem v bližini že pošiljamo opozorilo. | Your report is now on the map. We are already alerting people nearby. |
| report_lost.next_title | Kaj se zgodi zdaj | What happens next |
| report_lost.next_1 | Ljudje v bližini z vklopljenimi opozorili prejmejo obvestilo. | People nearby with alerts turned on get a notification. |
| report_lost.next_2 | Vsako novo prijavo najdene ali opažene živali primerjamo z vašo. | We compare every new found or sighted report with yours. |
| report_lost.next_3 | Možna ujemanja in sporočila boste našli med sporočili, obvestimo vas tudi po e-pošti. | You will find possible matches and messages in your inbox, and we will email you too. |
| report_lost.poster | Prenesi plakat | Download poster |
| report_lost.share | Deli | Share |
| report_lost.open_report | Odpri mojo prijavo | Open my report |
| report_lost.first_24h | Kaj storiti v prvih 24 urah | What to do in the first 24 hours |

`report_lost.first_24h` links to `/varnost#prvih-24-ur` (`/en/safety#first-24-hours`). The collapsed support row at the end uses `support.contribution_*` from P15. No ad.

# 11. States

| Key | SL | EN |
|---|---|---|
| report_lost.duplicate_title | Za to žival že imate odprto iskanje | You already have an open search for this pet |
| report_lost.duplicate_update | Posodobi obstoječe iskanje | Update the existing search |
| report_lost.duplicate_new | Ustvari novo prijavo | Create a new report |
| report_lost.send_failed | Prijave nismo mogli poslati. Osnutek je shranjen, poskusite znova. | We could not send your report. Your draft is saved; please try again. |
| report_lost.validation_summary | Preverite označena polja. | Please check the highlighted fields. |
| report_lost.unverified_note | Iskanje je objavljeno. Za opozorila in sporočila še potrdite svoj e-naslov. | Your search is live. Confirm your email address to get alerts and messages. |

Rate limits and other errors: `errors.*` (P1 §6).

# 12. SEO

The flow start page is public and indexable; the steps are client-side.

| Field | SL | EN |
|---|---|---|
| Meta title | Prijavite izgubljenega psa ali mačko · Najdimo | Report a lost dog or cat · Najdimo |
| Meta description | Izgubili ste psa ali mačko? Prijava je brezplačna in vzame nekaj minut. Ljudje v bližini prejmejo opozorilo, mi pa iščemo ujemanja. | Lost your dog or cat? Reporting is free and takes a few minutes. People nearby get an alert and we look for matches. |
| Focus keyword | izgubil se je pes | lost my dog |
| Slug | `/prijava/izgubljena-zival` (CHANGE from `/prijava/izgubljen`) | `/en/report/lost` |
| Structured data | `WebPage` + `BreadcrumbList` | same |

# 13. Alt text

| Image | SL | EN |
|---|---|---|
| Uploaded photo thumbnail | Vaša fotografija {n} | Your photo {n} |
| Saved pet row photo | {name} | {name} |
| Confirmation illustration (if used) | decorative, `alt=""` | |

# 14. CHANGE requests

- `CHANGE docs/tech/contracts/C15-routes-deeplinks.md§Web routes: reportLost SL /prijava/izgubljen → /prijava/izgubljena-zival and reportFound /prijava/najden → /prijava/najdena-zival (agree with "žival", clearer for search).`
