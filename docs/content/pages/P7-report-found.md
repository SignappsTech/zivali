---
source: 03§P7; docs/design/pages/P7-report-found.md
page: P7 Report found or sighted (no account) and manage page
stories: TASK-30, TASK-17 (FR-006, FR-003, FR-004)
copy-for: docs/design/pages/P7-report-found.md
version: 0.3
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P7 Report found or sighted: copy

Namespace `report_found` (photos from P6 `photos.*`, location from P5). The finder is thanked, never questioned. Copy is short: the flow must take under a minute. No ad, no payment prompt, no tip for anonymous finders.

Gender-neutral rule for this flow: the finder's answers are written in the present tense or about the animal ("Žival je pri meni", "Žival ni pri meni"), never with a past participle in the first person ("videl sem").

# 1. Flow chrome

| Key | SL | EN |
|---|---|---|
| report_found.flow_label_found | Prijava najdene živali | Report a found animal |
| report_found.flow_label_sighted | Prijava opažene živali | Report a sighted animal |
| report_found.intro_note | Hvala, da pomagate. Vzelo vam bo le minuto, račun ni potreben. | Thank you for helping. It only takes a minute, and you do not need an account. |
| report_found.step_a11y | Korak {current} od {total} | Step {current} of {total} |
| report_found.close_title | Prekinete prijavo? | Stop reporting for now? |
| report_found.close_body | Osnutek ostane shranjen na tej napravi. | Your draft stays saved on this device. |

Back, Next, Close and draft strings: `common.*` (P1).

# 2. Step 1: Photo

| Key | SL | EN |
|---|---|---|
| report_found.photo_title | Fotografirajte žival | Take a photo of the animal |
| report_found.photo_help | Dovolj je ena fotografija. Če je mogoče, naj bo viden obraz. | One photo is enough. If you can, show the face. |
| report_found.photo_take | Fotografiraj | Take a photo |
| report_found.photo_gallery | Izberi iz galerije | Choose from gallery |
| report_found.photo_web | Izberi fotografijo | Choose a photo |
| report_found.photo_drop_web | ali jo povlecite sem | or drag it here |

# 3. Step 2: Which animal

With AI pre-fill (M3):

| Key | SL | EN |
|---|---|---|
| report_found.ai_title | Je to pravilno? | Is this right? |
| report_found.ai_sentence | {size} {species}, {colours} | {size} {species}, {colours} |
| report_found.ai_note | Predlog iz fotografije. Umetna inteligenca se lahko moti. | Suggested from the photo. AI can be wrong. |
| report_found.ai_yes | Da, nadaljuj | Yes, continue |
| report_found.ai_edit | Uredi podatke | Edit details |

`report_found.ai_sentence` example: "Srednje velik pes, rjave in bele barve" / "Medium-sized dog, brown and white". Size phrases for this sentence agree with the species: dog "Zelo majhen / Majhen / Srednje velik / Velik / Zelo velik pes", cat "Majhna / Srednje velika / Velika mačka"; colours use the glossary §7.2 phrase ("rjave in bele barve").

Without AI (M2 and fallback):

| Key | SL | EN |
|---|---|---|
| report_found.species_title | Katera žival je to? | Which animal is it? |
| report_found.species_dog | Pes | Dog |
| report_found.species_cat | Mačka | Cat |
| report_found.species_unsure | Ne vem | Not sure |
| report_found.size_label | Velikost (neobvezno) | Size (optional) |
| report_found.colour_label | Barva (neobvezno) | Colour (optional) |

# 4. Step 3: Where

| Key | SL | EN |
|---|---|---|
| report_found.where_from_photo | Kraj smo prebrali iz fotografije. | We took the place from the photo. |
| report_found.where_from_gps | Kraj je določen po vaši lokaciji. | The place is based on your location. |
| report_found.where_change | Spremeni | Change |
| report_found.where_note | Ne sprašujemo, kje je žival zdaj. | We never ask where the animal is now. |

Headings: `location.title_found` (found entry) or `location.title_sighted` (sighted entry), P5.

# 5. Step 4: Is the animal with you

| Key | SL | EN |
|---|---|---|
| report_found.situation_title | Je žival pri vas? | Is the animal with you? |
| report_found.situation_have | Da, žival je pri meni | Yes, the animal is with me |
| report_found.situation_have_desc | Na varnem je pri vas ali pri nekom, ki ga poznate. | It is safe with you or with someone you know. |
| report_found.situation_seen | Ne, žival ni pri meni | No, the animal is not with me |
| report_found.situation_seen_desc | Videli ste jo, a je niste mogli prijeti. | You saw it but could not catch it. |
| report_found.note_label | Opomba (neobvezno) | Note (optional) |
| report_found.note_placeholder | Na primer: prestrašena je, ima modro ovratnico. | For example: frightened, wearing a blue collar. |
| report_found.note_help | Opomba bo javno vidna. Ne navajajte naslova ali telefonske številke. | The note will be public. Do not include an address or phone number. |
| report_found.note_too_long | Opomba je predolga. Skrajšajte jo na največ {max} znakov. | The note is too long. Please shorten it to {max} characters or fewer. |
| report_found.email_label | E-naslov (neobvezno) | Email address (optional) |
| report_found.email_help | Pošljemo vam zasebno povezavo, da prijavo urejate tudi na drugi napravi. E-naslova ne prikažemo nikomur. | We will send you a private link so you can manage the report on another device too. We never show your email address. |
| report_found.email_invalid | Preverite e-naslov, na primer ime@primer.si. | Please check the email address, for example name@example.com. |

# 6. Step 5: Send

| Key | SL | EN |
|---|---|---|
| report_found.send_title | Objavite prijavo | Publish the report |
| report_found.summary_photo | Fotografija | Photo |
| report_found.summary_animal | Žival | Animal |
| report_found.summary_place | Kraj | Place |
| report_found.summary_situation | Žival je | The animal is |
| report_found.summary_with_me | pri meni | with me |
| report_found.summary_not_with_me | ni pri meni | not with me |
| report_found.privacy_line | Vaša telefonska številka ostane skrita. Oseba, ki žival išče, vam piše v aplikaciji. | Your phone number stays hidden. The person searching writes to you in the app. |
| report_found.publish | Objavi prijavo | Publish report |
| report_found.publishing | Objavljamo … | Publishing … |

Captcha:

| Key | SL | EN |
|---|---|---|
| report_found.captcha_checking | Preverjamo, da pošiljate vi … | Checking that this is you … |
| report_found.captcha_title | Hitro preverjanje | A quick check |
| report_found.captcha_body | Potrdite, da niste program. Tako preprečujemo zlorabe. | Please confirm you are not a bot. This helps us stop abuse. |
| report_found.captcha_failed | Preverjanje ni uspelo. Osnutek je shranjen, poskusili bomo znova samodejno. | The check did not work. Your draft is saved and we will try again automatically. |

Rate limits (override `errors.RATE_LIMITED` in this flow):

| Key | SL | EN |
|---|---|---|
| report_found.limit_hour | V kratkem času ste oddali več prijav, zato smo jih začasno omejili. Poskusite znova čez {minutes, plural, one {# minuto} two {# minuti} few {# minute} other {# minut}}. | You have sent several reports in a short time, so we have paused new ones for a moment. Please try again in {minutes, plural, one {# minute} other {# minutes}}. |
| report_found.limit_day | Danes ste dosegli omejitev prijav. Poskusite znova jutri. | You have reached today's limit for reports. Please try again tomorrow. |

# 7. Sighting of a listed lost pet (short flow)

| Key | SL | EN |
|---|---|---|
| report_found.sighting_flow_label | Sporoči opažanje | Report a sighting |
| report_found.sighting_where | Kje ste žival videli? | Where did you see the animal? |
| report_found.sighting_when | Kdaj ste jo videli? | When did you see it? |
| report_found.sighting_when_now | Pravkar | Just now |
| report_found.sighting_when_today | Danes | Today |
| report_found.sighting_when_other | Drugič | Another time |
| report_found.sighting_photo | Dodate fotografijo? | Would you like to add a photo? |
| report_found.sighting_photo_help | Ni obvezno, pomaga pa pri prepoznavanju. | Optional, but it helps people recognise the animal. |
| report_found.sighting_note | Kaj ste opazili? (neobvezno) | What did you notice? (optional) |
| report_found.sighting_note_placeholder | Na primer: tekla je proti gozdu, šepala je na zadnjo nogo. | For example: running towards the woods, limping on a back leg. |
| report_found.sighting_send | Pošlji opažanje | Send sighting |
| report_found.sighting_done_title | Hvala za opažanje | Thank you for the sighting |
| report_found.sighting_done_body | Osebo, ki žival išče, smo obvestili. Če vam bo pisala, boste sporočilo našli prek zasebne povezave. | We have told the person who is searching. If they write to you, you will find the message through your private link. |

The SL placeholder describes a female animal on purpose (example only).

# 8. Success screen

| Key | SL | EN |
|---|---|---|
| report_found.done_title | Hvala, prijava je objavljena | Thank you, your report is live |
| report_found.done_body | Prijavo vidijo ljudje v bližini, mi pa jo primerjamo z vsemi prijavami izgubljenih živali. | People nearby can see it, and we compare it with every lost-pet report. |
| report_found.link_label | Vaša zasebna povezava | Your private link |
| report_found.link_help | S to povezavo urejate prijavo in odgovarjate na sporočila, tudi na drugi napravi. Shranite jo: brez e-naslova je ne moremo obnoviti. | Use this link to manage your report and reply to messages, on any device. Keep it safe: without an email address we cannot recover it. |
| report_found.link_emailed | Povezavo smo poslali tudi na vaš e-naslov. | We have also emailed the link to you. |
| report_found.link_copy | Kopiraj povezavo | Copy link |
| report_found.link_copied | Povezava je kopirana. | Link copied. |
| report_found.link_qr_web | Skenirajte kodo, da prijavo odprete na telefonu. | Scan the code to open your report on your phone. |
| report_found.open_report | Odpri mojo prijavo | Open my report |
| report_found.create_account | Ustvari račun in obdrži prijavo | Create an account to keep it |
| report_found.share | Deli | Share |
| report_found.held_note | Prijavo še pregledujemo. Ko jo preverimo, bo vidna vsem. Zasebna povezava že deluje. | We are still checking your report. Once checked, everyone will see it. Your private link already works. |

Responsible shelter row (v0.3, FR-044, R-006.1), under the link block: the shared `shelter_row.*` keys from P6.

- "Da, žival je pri meni": `shelter_row.found_body`, `shelter_row.not_replace`, the shelter, `shelter_row.call`, `shelter_row.details_link`, then `shelter_row.chip_line`.
- "Ne, žival ni pri meni" (decided: shown, softer): `shelter_row.sighted_body`, the shelter, `shelter_row.call`, `shelter_row.details_link`; no `shelter_row.not_replace` and no chip line, because the person has no animal to report yet.
- Short sighting flow from a listing (§7): no row; the owner is already notified.
- Queued offline report: the same row on the "sent" screen after `report_found.offline_queued`, from the cached directory with `shelter_row.cached`.
- No municipality or no confirmed shelter: `shelter_row.unknown_municipality` or `shelter_row.unconfirmed` with `shelter_row.directory_link`.

# 9. Manage page (`/m`)

| Key | SL | EN |
|---|---|---|
| report_found.manage_title | Vaša prijava | Your report |
| report_found.manage_private_note | Ta stran je zasebna. Povezave ne delite z neznanci. | This page is private. Do not share the link with strangers. |
| report_found.manage_messages | Sporočila | Messages |
| report_found.manage_unread | {count, plural, one {# neprebrano sporočilo} two {# neprebrani sporočili} few {# neprebrana sporočila} other {# neprebranih sporočil}} | {count, plural, one {# unread message} other {# unread messages}} |
| report_found.manage_open_messages | Odpri sporočila | Open messages |
| report_found.manage_edit | Uredi prijavo | Edit report |
| report_found.manage_close | Zaključi prijavo | Close report |
| report_found.manage_returned | Žival je spet doma | The animal is home again |
| report_found.manage_delete | Izbriši moje podatke | Delete my data |
| report_found.delete_title | Izbrišete prijavo in svoje podatke? | Delete the report and your data? |
| report_found.delete_body | Prijava, fotografije in vaš e-naslov bodo izbrisani, pogovori pa zaprti. Tega ni mogoče razveljaviti. | The report, photos and your email address will be deleted, and conversations closed. This cannot be undone. |
| report_found.delete_confirm | Izbriši | Delete |
| report_found.deleted | Prijava in vaši podatki so izbrisani. Hvala, ker ste pomagali. | Your report and data have been deleted. Thank you for helping. |
| report_found.expiry_note | {days, plural, one {Prijava bo potekla čez # dan.} two {Prijava bo potekla čez # dneva.} few {Prijava bo potekla čez # dni.} other {Prijava bo potekla čez # dni.}} Če je žival še pri vas ali jo še vedno vidite, prijavo podaljšajte. | {days, plural, one {The report expires in # day.} other {The report expires in # days.}} If the animal is still with you or you still see it, keep the report open. |
| report_found.extend | Podaljšaj za 30 dni | Keep for 30 more days |
| report_found.under_review_title | Prijava je v pregledu | Your report is under review |
| report_found.under_review_body | Prijavo pregleduje naša ekipa. Do takrat ni javno vidna. | Our team is reviewing your report. Until then it is not public. |
| report_found.closed_note | Prijava je zaključena. V 7 dneh jo lahko ponovno odprete. | This report is closed. You can reopen it within 7 days. |
| report_found.reopen | Ponovno odpri | Reopen |
| report_found.claim_hint | Z računom imate vse svoje prijave na enem mestu. | With an account, all your reports are in one place. |

The "returned" confirmation dialog and thank-you screen are in P14 §5.

# 10. Lost link and invalid link

| Key | SL | EN |
|---|---|---|
| report_found.resend_title | Pošljite mi zasebno povezavo | Send me my private link |
| report_found.resend_body | Vpišite e-naslov, ki ste ga navedli ob prijavi. | Enter the email address you gave when you reported. |
| report_found.resend_button | Pošlji povezavo | Send link |
| report_found.resend_done | Če je ta e-naslov naveden pri kateri od prijav, smo nanj poslali povezavo. Preverite tudi mapo z neželeno pošto. | If this email address belongs to a report, we have sent the link to it. Please check your spam folder too. |
| report_found.link_invalid_title | Ta povezava ne deluje več | This link no longer works |
| report_found.link_invalid_body | Prijava je morda zaključena ali izbrisana. Če ste navedli e-naslov, vam lahko povezavo pošljemo znova. | The report may be closed or deleted. If you gave an email address, we can send you the link again. |

# 11. Other states

| Key | SL | EN |
|---|---|---|
| report_found.offline_queued | Shranjeno. Prijavo pošljemo, ko boste spet povezani. | Saved. We will send your report when you are back online. |
| report_found.duplicate_photo | To fotografijo že imamo v drugi prijavi. Odprete obstoječo prijavo? | We already have this photo in another report. Open that report? |
| report_found.duplicate_open | Odpri prijavo | Open report |

Camera denied: `permissions.camera_denied` (P2).

# 12. SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Našli ste psa ali mačko? Prijava brez računa · Najdimo | Found a dog or cat? Report it, no account · Najdimo |
| Meta description | Našli ali videli ste psa ali mačko? Prijava vzame manj kot minuto in ne potrebuje računa. Vaša telefonska številka ostane skrita. | Found or seen a dog or cat? Reporting takes under a minute and needs no account. Your phone number stays hidden. |
| Focus keyword | najden pes | found dog |
| Slug | `/prijava/najdena-zival` (CHANGE from `/prijava/najden`) | `/en/report/found` |
| Structured data | `WebPage` + `BreadcrumbList` | same |
| Manage page `/m` | `noindex, nofollow`; title "Vaša prijava · Najdimo" / "Your report · Najdimo" | |

# 13. Alt text

| Image | SL | EN |
|---|---|---|
| Uploaded photo | Vaša fotografija živali | Your photo of the animal |
| AI step photo | Fotografija, iz katere je predlog | The photo the suggestion is based on |
| Manage page photo | Rule from P9 §Alt text | |
| QR code (web success) | Koda QR z vašo zasebno povezavo | QR code with your private link |
