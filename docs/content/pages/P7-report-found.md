---
source: 03§P7; docs/design/pages/P7-report-found.md
page: P7 Report found or sighted (no account) and manage page
stories: TASK-30, TASK-17 (FR-006, FR-003, FR-004)
copy-for: docs/design/pages/P7-report-found.md
version: 0.8
status: Draft, native Slovenian review pending; §3a strings marked † need owner and legal review
date: 2026-10-19
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
| report_found.ai_dog | {size, select, xs {Zelo majhen pes} s {Majhen pes} m {Srednje velik pes} l {Velik pes} xl {Zelo velik pes} other {Pes}} | {size, select, xs {Very small dog} s {Small dog} m {Medium-sized dog} l {Large dog} xl {Very large dog} other {Dog}} |
| report_found.ai_cat | {size, select, s {Majhna mačka} m {Srednje velika mačka} l {Velika mačka} other {Mačka}} | {size, select, s {Small cat} m {Medium-sized cat} l {Large cat} other {Cat}} |
| report_found.ai_colours | {colours} barve | {colours} |
| report_found.ai_colour.black … blue_grey | črne, bele, sive, rjave, čokoladne, rdečkaste, kremne, zlate, svetlo rjave, modrosive | black, white, grey, brown, chocolate, red, cream, golden, tan, blue-grey |
| report_found.ai_note | Predlog iz fotografije. Umetna inteligenca se lahko moti. | Suggested from the photo. AI can be wrong. |
| report_found.ai_yes | Da, nadaljuj | Yes, continue |
| report_found.ai_edit | Uredi podatke | Edit details |
| report_found.breed_label | Pasma (neobvezno) | Breed (optional) |

The sentence (wireframe v2 F2, owner 2026-10-19) is built from three parts joined with ", ": the size phrase (`ai_dog` or `ai_cat`), the breed name (`breeds.*`), and the colours (`ai_colours` with the `ai_colour.*` genitive forms joined by the locale list format, "rjave in bele"). Examples: "Pes, labradorec, črne barve" / "Dog, Labrador Retriever, black"; "Srednje velik pes, rjave in bele barve" / "Medium-sized dog, brown and white"; "Velika mačka, maine coon" / "Large cat, Maine Coon". There is no `ai_sentence` key. Rules for the breed:

- Left out when the suggestion is null, `*.mixed` or `*.unknown`.
- SL: the breed is a common noun mid-sentence, so it is written in lower case ("labradorec", "nemški ovčar", "border collie"). A name with a capital after its first letter keeps the catalogue form, because it contains a proper name ("Jack Russell terier", "Kavalir King Charles španjel"). EN keeps the catalogue form.
- `breed_label` shows on the "Uredi podatke" path only when the sentence named a breed: filled, with the Predlog mark, to change or clear. Without a breed suggestion the step has no breed field.

Size phrases agree with the species: dog "Zelo majhen / Majhen / Srednje velik / Velik / Zelo velik pes", cat "Majhna / Srednje velika / Velika mačka"; colours use the glossary §7.2 phrase ("rjave in bele barve").

Without AI (M2 and fallback):

| Key | SL | EN |
|---|---|---|
| report_found.species_title | Katera žival je to? | Which animal is it? |
| report_found.species_dog | Pes | Dog |
| report_found.species_cat | Mačka | Cat |
| report_found.size_label | Velikost (neobvezno) | Size (optional) |
| report_found.colour_label | Barva (neobvezno) | Colour (optional) |

Species is dog or cat only: there is no "Ne vem" row (`report_found.species_unsure` dropped, CH-625, design P7 1.4).

Validation messages added from mobile P7 (TASK-30.3, CH-351), draft, needs native review:

| Key | SL | EN |
|---|---|---|
| report_found.species_required | Izberite, katera žival je to. | Choose which animal it is. |

# 3a. AI pre-fill (shared: P6, P7, P8)

New namespace `ai_prefill` (M3, TASK-40.6), used by P6 (photo and details steps, new pet path), P7 (step 2 and the "Uredi podatke" path) and P8 (add and edit form). P6 and P8 point here. Behaviour: C19 §Client rules. Layout and rules: design P7 §AI suggestions, wireframe `M-ai-prefill.html` v2 (owner approved 2026-10-19). Draft, needs native review.

Copy rules:

- Say "predlog" / "suggested". Never "prepoznali smo", "to je", "we recognised", "this is", or anything else that sounds certain.
- The one number we show is the confidence on the Predlog mark (owner 2026-10-19): "Predlog · 81 %" / "Suggested · 81%", the confidence rounded to a whole percent, formatted with `Intl` (SL puts a no-break space before "%"), and the same number in the field's accessible description. No other percentage or confidence number anywhere: not on the "Je to pravilno?" sentence, not in notes or hints, and never on match strength (that stays words, glossary §3).
- AI is named in the note and in the info text, not on every field. A field label just gets the mark `ai_prefill.suggested`.
- No message on failure: unavailable, a cap, a refusal, an error or the 10 s timeout show nothing extra, and the form simply stays manual (C19). This is deliberate. The checking status disappears without an announcement.
- Strings marked † make a privacy claim. The owner and the lawyer approve them before release, together with privacy policy 0.8 chapter 8 (lawyer pack LQ-36, LQ-68 to LQ-71).

## Checking the photo

| Key | SL | EN |
|---|---|---|
| ai_prefill.checking | Pregledujemo fotografijo … Obrazec lahko medtem izpolnjujete naprej. | Checking the photo … You can carry on with the form in the meantime. |
| ai_prefill.arrived_live | {count, plural, one {Iz fotografije smo predlagali # podatek. Preverite ga.} two {Iz fotografije smo predlagali # podatka. Preverite ju.} few {Iz fotografije smo predlagali # podatke. Preverite jih.} other {Iz fotografije smo predlagali # podatkov. Preverite jih.}} | {count, plural, one {We suggested # detail from the photo. Please check it.} other {We suggested # details from the photo. Please check them.}} |
| ai_prefill.none_live | Iz fotografije podatkov nismo mogli zanesljivo razbrati. Izpolnite jih sami. | We could not tell the details reliably from the photo. Please fill them in yourself. |

`checking` is a visible status next to the first photo, inside a polite live region, while the first photo is `pending` (C19 polls for up to 10 s). When the status is `ready`, the same region announces once: `arrived_live` with the number of fields actually filled, or `none_live` when every value is null and nothing was filled, or the notice title (below) when there is a notice. Nothing is announced when the user has already filled in every field. `unavailable` and the timeout clear the status silently.

## Suggested fields

| Key | SL | EN |
|---|---|---|
| ai_prefill.suggested | Predlog | Suggested |
| ai_prefill.suggested_a11y | Predlog iz fotografije. Preverite ga. | Suggested from the photo. Please check it. |
| ai_prefill.suggested_confidence_a11y | Predlog iz fotografije, verjetnost {confidence, number, percent}. Preverite ga. | Suggested from the photo, {confidence, number, percent} likely to be right. Please check it. |
| ai_prefill.note_continue | Nekatera polja smo izpolnili s predlogi iz fotografije. Umetna inteligenca se lahko moti, zato jih preverite, preden nadaljujete. | We filled in some fields with suggestions from the photo. AI can be wrong, so please check them before you continue. |
| ai_prefill.note_save | Nekatera polja smo izpolnili s predlogi iz fotografije. Umetna inteligenca se lahko moti, zato jih preverite, preden shranite. | We filled in some fields with suggestions from the photo. AI can be wrong, so please check them before you save. |
| ai_prefill.note_publish | Nekatera polja smo izpolnili s predlogi iz fotografije. Umetna inteligenca se lahko moti, zato jih preverite, preden objavite. | We filled in some fields with suggestions from the photo. AI can be wrong, so please check them before you publish. |
| ai_prefill.review | Preveri predloge | Check the suggestions |
| ai_prefill.review_row | Predlog: {fields} | Suggested: {fields} |
| ai_prefill.fields.species, breed_codes, colours, pattern, size | vrsta, pasma, barva, vzorec, velikost | species, breed, colour, pattern, size |
| ai_prefill.low_confidence | Iz fotografije tega ne moremo zanesljivo razbrati. Izberite sami. | We could not tell this reliably from the photo. Please choose it yourself. |
| ai_prefill.low_confidence_breed | Pasme iz fotografije ne moremo zanesljivo razbrati. Izberite jo sami ali pa Mešanec oziroma Ne vem. | We could not tell the breed reliably from the photo. Choose it yourself, or pick Mixed breed or Not sure. |
| ai_prefill.collar_hint | Na fotografiji je videti ovratnica. Če lahko, jo opišite: barva, obesek, zvonček. | There seems to be a collar in the photo. If you can, describe it: colour, tag, bell. |
| ai_prefill.collar_hint_note | Na fotografiji je videti ovratnica. Če lahko, jo omenite v opombi. | There seems to be a collar in the photo. If you can, mention it in the note. |
| ai_prefill.species_differs | {species, select, dog {Na fotografiji je videti pes.} cat {Na fotografiji je videti mačka.} other {Na fotografiji je videti druga vrsta.}} Če ste vrsto izbrali pravilno, jo pustite. | {species, select, dog {The photo looks like a dog.} cat {The photo looks like a cat.} other {The photo looks like a different species.}} If your choice is right, leave it as it is. |
| ai_prefill.species_switch | {species, select, dog {Izberi psa} cat {Izberi mačko} other {Spremeni vrsto}} | {species, select, dog {Choose dog} cat {Choose cat} other {Change species}} |

- `suggested` is the mark after the label of each field the suggestion filled, followed by " · " and the confidence ("Predlog · 81 %"). `suggested_confidence_a11y` is that field's accessible description, with the same number (`{confidence}` is the value from 0.6 to 1, so the formatter shows "81 %" / "81%"). `suggested_a11y` is the fallback for a filled field without a confidence value. Mark and description go when the user edits the field. Saving or publishing the form confirms the rest (C19: nothing is saved unconfirmed).
- The note sits once in the AI slot by the main action (design rule 1), not above the fields: `note_continue` in P6 (details step) and on P7's "Uredi podatke" path, `note_save` in P8, `note_publish` on the P6 review step while a mark remains. Show the note only when at least one field was filled.
- `review` is a text button in P8 next to `note_save`: it moves focus to the first marked field. `review_row` is the line under the Žival row on the P6 review step, listing the marked fields with the `fields.*` words joined by ", " in form order ("Predlog: pasma, barva, vzorec" / "Suggested: breed, colour, pattern"; the collar is never listed, it is never filled); the row's Uredi goes back to the step with the marks.
- `low_confidence` goes under a field whose value came back null (below the minimum confidence), and the field stays empty. Use `low_confidence_breed` for the breed field (P8). No hint for a field the user has already touched.
- `collar_hint` goes under the collar text field (P6, P8) when `collar` is true. The collar text is never filled. P7 has no collar field, so `collar_hint_note` goes under the note field on step 4.
- `species_differs` and `species_switch` appear when the suggested species is not the one the user already chose. The species is never switched for them. `species_switch` is a text button.

## Notices about the photo

| Key | SL | EN |
|---|---|---|
| ai_prefill.no_animal_title | Na fotografiji ne najdemo psa ali mačke | We cannot see a dog or cat in this photo |
| ai_prefill.no_animal_body | Poskusite z drugo fotografijo, na kateri je žival dobro vidna. Če je žival na fotografiji, jo obdržite in podatke vpišite sami. | Try another photo where the animal is clearly visible. If the animal is in the photo, keep it and fill in the details yourself. |
| ai_prefill.other_animal_title | Na fotografiji je videti druga žival | This looks like a different kind of animal |
| ai_prefill.other_animal_body | Prijave na Najdimo so samo za pse in mačke. Če je na fotografiji pes ali mačka, jo obdržite in podatke vpišite sami. | Reports on Najdimo are for dogs and cats only. If the photo shows a dog or cat, keep it and fill in the details yourself. |
| ai_prefill.multiple_title | Na fotografiji je videti več živali | There seem to be several animals in this photo |
| ai_prefill.multiple_body | Če lahko, izberite drugo ali obrezano fotografijo, na kateri je ena sama žival. Sicer preverite, ali se predlogi nanašajo na pravo žival. | If you can, choose another or a cropped photo that shows just one animal. Otherwise check that the suggestions are about the right animal. |
| ai_prefill.change_photo | Zamenjaj fotografijo | Change photo |
| ai_prefill.keep_photo | Obdrži fotografijo | Keep photo |

A notice is an inline, neutral note under the first photo (not an error, not red). It does not block Next or Save. `change_photo` opens the picker for that photo. `keep_photo` dismisses the notice. For `no_animal` and `other_animal`, P7 skips the "Je to pravilno?" screen and shows the manual step with the notice above it. `multiple_animals` fills fields as usual, with the notice, and adds `crop_photo` as its first action (below). `no_animal` and `other_animal` never offer the crop: cropping cannot add an animal.

## Crop tool (P6, P7, P8; also with AI off)

Final (CH-597, CH-632; wireframe v2 F8, F11, F12; C19 §Crop). The tool is offered under every photo the form holds as a local file and from the several-animals note.

| Key | SL | EN |
|---|---|---|
| ai_prefill.crop_photo | Obreži fotografijo | Crop photo |
| ai_prefill.crop_photo_n | Obreži fotografijo {n} | Crop photo {n} |
| ai_prefill.crop_apply | Uporabi | Apply |
| ai_prefill.crop_cancel | Prekliči | Cancel |
| ai_prefill.crop_help | Povlecite okvir ali njegove vogale, da bo na fotografiji ena sama žival. | Drag the frame or its corners so the photo shows just one animal. |
| ai_prefill.crop_keys | S tipkovnico: Tab izbere okvir ali vogal, puščice ga premaknejo ali spremenijo velikost, Shift pospeši, Esc prekliče. | With a keyboard: Tab selects the frame or a corner, the arrow keys move it or change its size, Shift speeds it up, Esc cancels. |
| ai_prefill.crop_frame | Okvir obreza | Crop frame |
| ai_prefill.crop_nw | Vogal zgoraj levo | Top left corner |
| ai_prefill.crop_ne | Vogal zgoraj desno | Top right corner |
| ai_prefill.crop_sw | Vogal spodaj levo | Bottom left corner |
| ai_prefill.crop_se | Vogal spodaj desno | Bottom right corner |
| ai_prefill.crop_done | Fotografija je obrezana. | The photo is cropped. |

- `crop_photo` is the text button in the several-animals note and the dialog title (web) or screen title (mobile). `crop_photo_n` is the button under each photo, with the photo's position (1 to 5), so each button has its own name; it sits next to Odstrani.
- `crop_help` shows above the photo and is the frame's accessible description. `crop_keys` is the web-only keyboard line under the photo (the 100 px step with Ctrl or Cmd is a bonus and is not described). The corner names are the accessible names of the four corner handles; the edge handles are pointer-only and unnamed.
- `crop_done` is one polite announcement after Uporabi. The checking line for the cropped first photo stays silent, as in F1.

Mobile only (TASK-41.6, not in the catalogue yet): the frame and each corner are accessibility elements with four actions each, moving the frame (or that corner) by 10 % of the photo. The mobile screen shows no `crop_keys`; `crop_actions_hint` is the frame's accessibility hint.

| Key | SL | EN |
|---|---|---|
| ai_prefill.crop_left | Premakni levo | Move left |
| ai_prefill.crop_right | Premakni desno | Move right |
| ai_prefill.crop_up | Premakni navzgor | Move up |
| ai_prefill.crop_down | Premakni navzdol | Move down |
| ai_prefill.crop_actions_hint | Okvir in vogale premikate z dejanji bralnika zaslona. | Use your screen reader's actions to move the frame and its corners. |

## About the suggestions (disclosure)

| Key | SL | EN |
|---|---|---|
| ai_prefill.info_link | Kako nastanejo predlogi? | How do the suggestions work? |
| ai_prefill.info_body † | Fotografijo pregleda model umetne inteligence. Predlaga vrsto, pasmo, barve, vzorec, velikost in ovratnico ter preveri, ali je na fotografiji v ospredju oseba ali neprimerna vsebina. Ponudniku pošljemo samo pomanjšano kopijo fotografije, brez metapodatkov in lokacije ter brez podatkov o vas ali prijavi. Isto kopijo uporabimo tudi za iskanje podobnih fotografij pri ujemanju. Predlogi se lahko motijo in postanejo del prijave šele, ko jih potrdite. | An AI model looks at the photo. It suggests the species, breed, colours, pattern, size and collar, and checks whether a person or inappropriate content is prominent in the photo. We send the provider only a smaller copy of the photo, with no metadata or location and nothing about you or the report. We use the same copy to look for similar photos when matching. Suggestions can be wrong and become part of the report only once you confirm them. |
| ai_prefill.info_privacy | Več v politiki zasebnosti | More in the privacy policy |

`info_link` is a text button under the note (P6, P8) or under `report_found.ai_note` (P7). It opens `info_body` in a disclosure, a bottom sheet on mobile. `info_privacy` links to `/zasebnost#s8` (EN `/en/privacy#s8`). In P8, "prijave" in `info_body` stays as it is: the profile is the source of a later report. Show `info_link` only when `ai.enabled` is true.

## P7 sentence screen ("Je to pravilno?")

The `report_found.ai_*` keys are in §3. `report_found.ai_note` ("Predlog iz fotografije. Umetna inteligenca se lahko moti.") is the found-flow disclosure line. LQ-37 in the lawyer pack quotes it, so do not change it without updating LQ-37.

- Build the sentence (§3) only from suggested values. Leave a missing size, breed or colour out: "Pes, labradorec, črne barve", "Pes, rjave in bele barve", "Srednje velik pes" / "Dog, Labrador Retriever, black", "Dog, brown and white", "Medium-sized dog". With no species suggestion, or with a `no_animal` or `other_animal` notice, skip the screen and show the manual step.
- The sentence screen shows no confidence number (owner 2026-10-19).
- "Da, nadaljuj" confirms the suggestion, the breed included. "Uredi podatke" opens the manual step with the suggested values filled, the Predlog marks and `note_continue`; a suggested breed shows as `report_found.breed_label`, filled and marked.

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

Validation message (CH-351), draft:

| Key | SL | EN |
|---|---|---|
| report_found.situation_required | Izberite enega od odgovorov. | Choose one of the answers. |

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

Sighting date and time fields on the mobile flow (there is no native picker), added in CH-351, draft:

| Key | SL | EN |
|---|---|---|
| report_found.sighting_date | Datum | Date |
| report_found.sighting_time | Ura | Time |
| report_found.sighting_when_invalid | Vpišite datum in uro, ki nista v prihodnosti, na primer 15. 10. 2026 in 18.30. | Enter a date and time that are not in the future, for example 15/10/2026 and 18:30. |

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

Status pill on the manage page (CH-212), from glossary §2:

| Key | SL | EN |
|---|---|---|
| report_found.status_found | Najdena | Found |
| report_found.status_sighted | Opažena | Sighted |

Resend row on the web manage page (C7 manager, CH-438): a row with the label `report_found.resend_title` (§10) sends the private link to the address on file.

| Key | SL | EN |
|---|---|---|
| report_found.resend_done_manager | Povezavo smo poslali na e-naslov, ki ste ga navedli ob prijavi. Preverite tudi mapo z neželeno pošto. | We have sent the link to the email address you gave when you reported. Please check your spam folder too. |
| report_found.resend_no_email | Ob prijavi niste navedli e-naslova, zato povezave ne moremo poslati. | You did not give an email address when you reported, so we cannot send the link. |

`resend_done_manager` is the toast after the manager presses the row (the signed-out form on the lost-link screen keeps `resend_done`, which does not confirm that an address exists). `resend_no_email` shows on CONFLICT, when the report has no email on file.

The "returned" confirmation dialog and thank-you screen are in P14 §6. "Zaključi prijavo" opens the finder's neutral close confirm, without reason rows (P14 §4, `lifecycle.finder_close_*`; sent as C4 reason `other`).

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
| report_found.outbox_title | Čaka na pošiljanje | Waiting to be sent |
| report_found.outbox_waiting | Čaka | Waiting |
| report_found.outbox_sending | Pošiljamo … | Sending … |
| report_found.outbox_sent | Poslano | Sent |
| report_found.outbox_failed | Ni uspelo | Failed |
| report_found.outbox_retry | Poskusi znova | Try again |
| report_found.outbox_delete | Izbriši | Delete |
| report_found.duplicate_photo | To fotografijo že imamo v drugi prijavi. Odprete obstoječo prijavo? | We already have this photo in another report. Open that report? |
| report_found.duplicate_open | Odpri prijavo | Open report |

Outbox queue on the mobile Profile (CH-262, TASK-86.2), draft, needs native review:

| Key | SL | EN |
|---|---|---|
| report_found.my_reports | Moje prijave | My reports |
| report_found.outbox_pending_title | {count, plural, one {# prijava še ni poslana} two {# prijavi še nista poslani} few {# prijave še niso poslane} other {# prijav še ni poslanih}} | {count, plural, one {# report has not been sent yet} other {# reports have not been sent yet}} |
| report_found.outbox_pending_body | Pošljite jih zdaj ali jih izbrišite s te naprave. Izbrisanih prijav ni mogoče obnoviti. | Send them now or delete them from this device. Deleted reports cannot be recovered. |
| report_found.outbox_send_now | Pošlji zdaj | Send now |
| report_found.outbox_send_failed | Prijav ni bilo mogoče poslati. Poskusite znova, ko boste povezani, ali jih izbrišite. | The reports could not be sent. Try again when you are online, or delete them. |
| report_found.open_report | Odpri mojo prijavo | Open my report |

`my_reports` is the Profile section heading; `outbox_send_failed` is a toast. The delete prompt reuses `outbox_delete` and `common.cancel`; the link on a sent row is `open_report`.

Cancelling a queued report (CH-351, TASK-30.3), draft:

| Key | SL | EN |
|---|---|---|
| report_found.cancel_queued_title | Prekličete pošiljanje? | Cancel sending? |
| report_found.cancel_queued_body | Prijavo izbrišemo s te naprave in je ne pošljemo. | We delete the report from this device and do not send it. |
| report_found.cancel_queued_keep | Obdrži prijavo | Keep the report |

The `shelter_row` namespace used by the mobile flows is the one defined verbatim in P6 §Responsible shelter row (CH-351).

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

# Change log

| Version | Date | Change |
|---|---|---|
| 0.5 | 2026-10-18 | CH-212: status pill keys. CH-262: outbox queue keys. CH-351: validation, sighting date/time and cancel-queued keys; shelter_row note. CH-330 not applied (design decision pending). |
| 0.6 | 2026-10-18 | CH-438: manager resend row on `/m`: `resend_done_manager`, `resend_no_email` (§9). |
| 0.7 | 2026-10-18 | TASK-40.6: §3a AI pre-fill, shared with P6 and P8 (namespace `ai_prefill`): checking status and live-region text, Suggested pill, notes, low-confidence and collar hints, species hint, photo notices, disclosure (†, owner and legal review), rules for the P7 sentence screen. |
| 0.8 | 2026-10-19 | Wireframe M-ai-prefill v2 (owner 2026-10-19). CH-613, CH-618: confidence as a percentage on the Predlog mark only; final `suggested_confidence_a11y` ("verjetnost 81 %", replaces the "zelo verjetno / verjetno" proposal and the draft "81 % verjetno pravilen"); `note_publish`, `review`, `review_row`, `fields.*`; note placement in the AI slot. CH-597 (b), CH-618: the found sentence names the breed (`ai_dog`/`ai_cat` + breed + `ai_colours`; no `ai_sentence` key), SL lower-case rule, `breed_label`; "never names a breed" removed. CH-597 (c), CH-632: crop keys final as drafted, plus mobile action names (§3a Crop tool). CH-625: `species_unsure` dropped. CH-330: finder close decided by design (P14 §4). |
