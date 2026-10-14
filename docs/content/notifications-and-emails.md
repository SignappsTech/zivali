source: docs/tech/contracts/C10-notifications-alerts.md; 02§FR-010, FR-012, FR-020, FR-021, FR-001

# Notifications and emails (SL source, EN second)

- Version: 0.1
- Date: 2026-10-15
- Status: Draft (needs native Slovenian review and client approval)
- Stories: TASK-22, TASK-23, TASK-26, TASK-9, TASK-32, TASK-33
- Owner: Content Strategist
- Terms: `docs/content/glossary.md` (binding). Voice: `docs/content/voice-and-tone.md`.
- Scope: brief v0.7. Mission first. Money appears only in payment receipts. No QR/NFC tags. No Shelter Pro. Vet Partner (SL "Veterinarski partner") appears only as one labelled footer line in the nearby-alert email.

# 1. Rules

## 1.1 Lengths and content

| Item | Limit |
|---|---|
| Push title | 45 characters |
| Push body | 100 characters |
| In-app title and body | same as push, unless stated |
| Email subject | 60 characters |
| Email preheader | 90 characters |
| `{pet_name}` | truncated to 18 characters with "…" by the `notify` handler before it goes into a title |
| `{preview_alias}` | truncated to 24 characters with "…" |

Lengths are checked with the longest legal values (18-character name, longest band). Slovenian runs longer than English; both fit.

- No personal data in push or in-app text: no chip number, address, phone, e-naslov, message text. Areas are the public "približno območje" only.
- No exclamation marks, no emoji, no capitals for emphasis. No hype. Hope is allowed, promises are not.
- Money is never mentioned outside `payment_receipt`.
- Sender name: **Najdimo**. Replies go to the support address (section 6).
- Language = recipient `profiles.locale`. Strings live in i18n namespaces `notifications` (in-app, push) and `email`.
- Every email carries the layout footer (section 6): why you got it and a link to notification settings. Nearby-alert emails also carry the one-click "Izklopi ta opozorila".
- Names are not declined. Slovenian pet names (Luna, Rex, Mici, Bunda) cannot be inflected by software, so a name only ever appears in the nominative: after a middle dot in titles ("Verjetno ujemanje · Luna"), or at the start of a sentence followed by a colon ("Luna: iščete že 14 dni."). Never write "za Luno", "Lune", "Luni". See open question Q1.
- Numbers always sit inside an ICU `plural` with `one`, `two`, `few`, `other` (SL) and `one`, `other` (EN), and the case is the one the sentence needs.

## 1.2 Macros (defined once, expanded in the i18n files)

Written as `⟦NAME⟧` in this document. The developer expands each macro verbatim into every string that uses it.

**Pet label, nominative.** Variables: `has_name` (`yes`|`no`, set by the handler), `pet_name`, `species` (`dog`|`cat`|`other`).

```
⟦PET⟧   SL: {has_name, select, yes {{pet_name}} other {{species, select, dog {vaš pes} cat {vaša mačka} other {vaša žival}}}}
⟦PET_CAP⟧ SL: {has_name, select, yes {{pet_name}} other {{species, select, dog {Vaš pes} cat {Vaša mačka} other {Vaša žival}}}}
⟦PET⟧   EN: {has_name, select, yes {{pet_name}} other {{species, select, dog {your dog} cat {your cat} other {your pet}}}}
⟦PET_CAP⟧ EN: {has_name, select, yes {{pet_name}} other {{species, select, dog {Your dog} cat {Your cat} other {Your pet}}}}
```

**Species, nominative.**

```
⟦LOST⟧  SL: {species, select, dog {Izgubljen pes} cat {Izgubljena mačka} other {Izgubljena žival}}
⟦LOST⟧  EN: {species, select, dog {Lost dog} cat {Lost cat} other {Lost animal}}
⟦ANIMAL_CAP⟧ SL: {species, select, dog {Pes} cat {Mačka} other {Žival}}
⟦ANIMAL_CAP⟧ EN: {species, select, dog {Dog} cat {Cat} other {Animal}}
⟦IT⟧    SL (accusative pronoun): {species, select, dog {ga} other {jo}}
⟦IT⟧    EN: it
```

**The other side of a match** (variables `other_type` = `found`|`sighted`, `species`).

```
⟦OTHER⟧ SL: {other_type, select, sighted {{species, select, dog {opažen pes} cat {opažena mačka} other {opažena žival}}} other {{species, select, dog {najden pes} cat {najdena mačka} other {najdena žival}}}}
⟦OTHER⟧ EN: {other_type, select, sighted {sighted {species, select, dog {dog} cat {cat} other {animal}}} other {found {species, select, dog {dog} cat {cat} other {animal}}}}
```

**Distance band** (codes fixed in C6/glossary §9).

```
⟦BAND⟧  SL: {distance_band, select, lt1 {manj kot 1 km} 1to3 {1–3 km} 3to10 {3–10 km} gt10 {več kot 10 km} other {v bližini}}
⟦BAND⟧  EN: {distance_band, select, lt1 {under 1 km} 1to3 {1–3 km} 3to10 {3–10 km} gt10 {over 10 km} other {nearby}}
```

**Days.**

```
⟦DAYS_ACC(n)⟧ SL ("čez 5 dni", "že 14 dni"): {n, plural, one {# dan} two {# dneva} few {# dni} other {# dni}}
⟦DAYS_LOC(n)⟧ SL ("po 90 dneh", "v 7 dneh"): {n, plural, one {# dnevu} two {# dneh} few {# dneh} other {# dneh}}
⟦DAYS(n)⟧     EN: {n, plural, one {# day} other {# days}}
```

**Unread messages.**

```
⟦UNREAD(n)⟧ SL ("Imate …"): {n, plural, one {# neprebrano sporočilo} two {# neprebrani sporočili} few {# neprebrana sporočila} other {# neprebranih sporočil}}
⟦UNREAD(n)⟧ EN: {n, plural, one {# unread message} other {# unread messages}}
```

## 1.3 Variables per type (summary)

| Type | Variables |
|---|---|
| match_chip | `has_name`, `pet_name`, `species`, `other_type` |
| match_suggested | `has_name`, `pet_name`, `species`, `other_type`, `strength` (`good`\|`strong`) |
| match_confirmed | `species`, `report_type` (`found`\|`sighted`) |
| chat_message | `preview_alias`, `unread_count` (email) |
| nearby_lost | `species`, `distance_band`, `has_area`, `area_name`, `when` (formatRelative), `has_vet_partner`, `clinic_name`, `clinic_area`, `clinic_url`, `unsubscribe_url` |
| report_reminder | `has_name`, `pet_name`, `species`, `day` |
| report_expiring | `report_type` (`lost`\|`found`\|`sighted`), `has_name`, `pet_name`, `species`, `days_left` |
| report_closed | `report_type`, `has_name`, `pet_name`, `species`, `idle_days`, `reopen_days` |
| report_hidden | `report_type`, `support_email` |
| report_reunited | `species` |
| manage_link | `report_type` (`found`\|`sighted`), `species`, `manage_url` |
| payment_receipt | `purpose` (`tip`\|`report_contribution`), `amount` (from `formatEur`), `paid_at` (from `formatDate`), `receipt_ref`, `is_test` (`yes`\|`no`) |

Variables the C10 payloads do not have yet are listed in the CHANGE requests at the end.

# 2. Notification types

Format per type: in-app and push strings, then the email. "Deep link" is the target of the button and of the tap.

## 2.1 match_chip

Chip matches ignore quiet hours. Calm, clear, no celebration. Never prints the chip number. Variant: the other side is a sighting, so the animal may have moved.

Channels: in-app, push, email. Deep link: `/r/<lost_code>/matches`.

**In-app and push**

| | SL | EN |
|---|---|---|
| Title | `Številka čipa se ujema · ⟦PET⟧` | `Chip number matches · ⟦PET⟧` |
| Body, found | `Najdena žival ima enako številko čipa. Odprite ujemanje.` | `A found animal has the same chip number. Open the match.` |
| Body, sighted | `Opažena žival ima enako številko čipa, a se je morda že premaknila. Odprite ujemanje.` | `A sighted animal has the same chip number, but it may have moved on. Open the match.` |

Body is `{other_type, select, sighted {…} other {…}}`.

**Email**

| | SL | EN |
|---|---|---|
| Subject | `Številka čipa se ujema: ⟦PET⟧` | `Chip number matches: ⟦PET⟧` |
| Preheader | `Poglejte fotografije in presodite sami.` | `Look at the photos and decide for yourself.` |
| Button | `Odpri ujemanje` | `Open match` |

SL body:

1. `{other_type, select, sighted {Opažena žival ima enako številko čipa kot ⟦PET⟧. Opažanje je morda starejše, zato se je žival lahko že premaknila.} other {Najdena žival ima enako številko čipa kot ⟦PET⟧.}}`
2. `Poglejte fotografije in podrobnosti ter presodite sami. Kontaktnih podatkov ne razkrijemo, dokler ujemanja ne potrdite.`
3. `Nikoli ne pošiljajte denarja vnaprej.`

EN body:

1. `{other_type, select, sighted {A sighted animal has the same chip number as ⟦PET⟧. The sighting may be a little old, so the animal could have moved.} other {A found animal has the same chip number as ⟦PET⟧.}}`
2. `Look at the photos and details, then decide for yourself. We do not share contact details until you confirm the match.`
3. `Never send money in advance.`

## 2.2 match_suggested

Only sent for `strength` good or strong (possible matches are never notified). Quiet hours apply. Hedged wording, never "we found your dog".

Channels: in-app, push, email. Deep link: `/r/<lost_code>/matches`.

**In-app and push**

| | SL | EN |
|---|---|---|
| Title, strong | `Zelo verjetno ujemanje · ⟦PET⟧` | `Very likely match · ⟦PET⟧` |
| Title, good | `Verjetno ujemanje · ⟦PET⟧` | `Likely match · ⟦PET⟧` |
| Body | `Morda se z iskanjem ujema ⟦OTHER⟧. Poglejte fotografije in presodite sami.` | `A ⟦OTHER⟧ may match your search. Look at the photos and decide for yourself.` |

Title is `{strength, select, strong {…} other {…}}`. Longest SL title: 23 + 3 + 18 = 44 characters.

**Email**

| | SL | EN |
|---|---|---|
| Subject | `Morda smo našli žival, ki jo iščete` | `We may have found the animal you are looking for` |
| Preheader | `{strength, select, strong {Zelo verjetno} other {Verjetno}} ujemanje za iskanje: ⟦PET⟧. Poglejte fotografije.` | `{strength, select, strong {Very likely} other {Likely}} match for the search: ⟦PET⟧. Look at the photos.` |
| Button | `Poglej ujemanje` | `View match` |

SL body:

1. `Morda smo našli žival, ki jo iščete. Iskanje: ⟦PET⟧.`
2. `Ujemanje je ocenjeno kot {strength, select, strong {zelo verjetno} other {verjetno}}. Odprite ga, preberite, zakaj tako mislimo, in presodite sami.`
3. `Kontaktnih podatkov ne razkrijemo, dokler ujemanja ne potrdite.`

EN body:

1. `We may have found the animal you are looking for. Search: ⟦PET⟧.`
2. `We rate the match as {strength, select, strong {very likely} other {likely}}. Open it, read why we think so, and decide for yourself.`
3. `We do not share contact details until you confirm the match.`

## 2.3 match_confirmed (to the other side, for example the finder)

Sent when the owner confirms the match. The finder may be anonymous and may open the chat without an account. Quiet hours apply. No pet name (the finder's report has none).

Channels: in-app, push, email. Deep link: `/inbox/<conversation_id>`.

**In-app and push**

| | SL | EN |
|---|---|---|
| Title | `Ujemanje je potrjeno` | `Match confirmed` |
| Body | `Oseba, ki žival išče, meni, da je to njena žival. Odprite pogovor.` | `The person looking for the animal believes it is theirs. Open the conversation.` |

**Email**

| | SL | EN |
|---|---|---|
| Subject | `Ujemanje je potrjeno – odprite pogovor` | `Match confirmed – open the conversation` |
| Preheader | `Telefonska številka ostane skrita. Pišete si v aplikaciji.` | `Your phone number stays hidden. You write to each other in the app.` |
| Button | `Odpri pogovor` | `Open conversation` |

SL body:

1. `Oseba, ki išče žival, je potrdila, da se vaša prijava ujema z njenim iskanjem. Hvala, da pomagate.`
2. `Pogovor je odprt. Vaša telefonska številka ostane skrita, pišete si v aplikaciji.`
3. `Žival predajte na javnem kraju, podnevi in v spremstvu. Nikoli ne pošiljajte denarja vnaprej.`

EN body:

1. `The person looking for the animal has confirmed that your report matches their search. Thank you for helping.`
2. `The conversation is open. Your phone number stays hidden; you write to each other in the app.`
3. `Hand the animal over in a public place, in daylight, with someone you trust. Never send money in advance.`

## 2.4 chat_message

No message text anywhere. Quiet hours ignored. Push and in-app per message (grouped per conversation in the inbox). The email goes only after 30 minutes unread, once per conversation.

Channels: in-app, push; email after 30 min unread. Deep link: `/inbox/<conversation_id>`.

**In-app and push**

| | SL | EN |
|---|---|---|
| Title | `Novo sporočilo · {preview_alias}` | `New message · {preview_alias}` |
| Body | `Odprite pogovor in preberite sporočilo.` | `Open the conversation to read it.` |

**Email**

| | SL | EN |
|---|---|---|
| Subject | `{unread_count, plural, one {Imate neprebrano sporočilo} two {Imate # neprebrani sporočili} few {Imate # neprebrana sporočila} other {Imate # neprebranih sporočil}}` | `{unread_count, plural, one {You have an unread message} other {You have # unread messages}}` |
| Preheader | `Sporočilo je v pogovoru {preview_alias}.` | `The message is in your conversation with {preview_alias}.` |
| Button | `Odpri pogovor` | `Open conversation` |

SL body:

1. `Imate ⟦UNREAD(unread_count)⟧ v pogovoru: {preview_alias}.`
2. `Sporočila ne vključimo v e-sporočilo, da ostane zasebno. Odprite pogovor in preberite ga v aplikaciji.`
3. `Nikoli ne pošiljajte denarja vnaprej.`

EN body:

1. `You have ⟦UNREAD(unread_count)⟧ in your conversation: {preview_alias}.`
2. `We leave the message out of this email to keep it private. Open the conversation to read it in the app.`
3. `Never send money in advance.`

## 2.5 nearby_lost

Information, not an alarm. Quiet hours apply. Dogs and cats only. Distance is only a band, area name only when available. Push and in-app per C10; the email is an opt-in channel (see CHANGE). The email is the only place a Vet Partner line can appear.

Channels: in-app, push; email (opt-in, default off, see CHANGE). Deep link: `/r/<report_code>`.

**In-app and push**

| | SL | EN |
|---|---|---|
| Title | `⟦LOST⟧ v vaši bližini` | `⟦LOST⟧ near you` |
| Body | `{has_area, select, yes {{area_name}, } other {}}⟦BAND⟧ od vašega območja. Ste ⟦IT⟧ morda videli?` | `{has_area, select, yes {{area_name}, } other {}}⟦BAND⟧ from your area. Have you seen it?` |

Examples: "Izgubljen pes v vaši bližini · Bežigrad, 1–3 km od vašega območja. Ste ga morda videli?" / "Lost cat near you · Bežigrad, 1–3 km from your area. Have you seen it?"

**Email**

| | SL | EN |
|---|---|---|
| Subject | `⟦LOST⟧ v vaši bližini` | `⟦LOST⟧ near you` |
| Preheader | `{when}{has_area, select, yes {, {area_name}} other {}}. Ste ⟦IT⟧ morda videli?` | `{when}{has_area, select, yes {, {area_name}} other {}}. Have you seen it?` |
| Button | `Odpri prijavo` | `Open report` |

SL body:

1. `Prijavljen je izgubljen {species, select, dog {pes} cat {mačka} other {žival}}, približno ⟦BAND⟧ od vašega območja{has_area, select, yes { ({area_name})} other {}}.`
2. `Ste ⟦IT⟧ morda videli? Če ste, odprite prijavo in sporočite opažanje. Če ne, vam ni treba storiti ničesar.`
3. `Javno prikažemo le približno območje.`

Optional last line, above the footer, only when `has_vet_partner = yes` (vet clinic with an active Vet Partner subscription for the region of the report). Always labelled, never in push or in-app, one line, no emphasis:

`Oglas · Potrebujete veterinarja? Najbližja ambulanta: {clinic_name}, {clinic_area}`

The clinic name is the link (`{clinic_url}`, tracked click). No text about the animal in the line.

EN body:

1. `A lost {species, select, dog {dog} cat {cat} other {animal}} has been reported, about ⟦BAND⟧ from your area{has_area, select, yes { ({area_name})} other {}}.`
2. `Have you seen it? If so, open the report and tell us about the sighting. If not, there is nothing you need to do.`
3. `We only show the approximate area publicly.`

EN Vet Partner line: `Ad · Need a vet? Nearest practice: {clinic_name}, {clinic_area}`

## 2.6 report_reminder

Day 7, 14, 30 after the lost report is published. A plain question, never guilt. Nothing is required of the owner. Quiet hours apply. Pet name only at the start of the sentence with a colon.

Channels: in-app, push, email. Deep link: `/my-reports` (actions via query, see CHANGE).

**In-app and push**

| | SL | EN |
|---|---|---|
| Title | `Še iščete žival?` | `Still looking for your pet?` |
| Body | `⟦PET_CAP⟧: iščete že ⟦DAYS_ACC(day)⟧. Nadaljujte iskanje ali ga zaključite.` | `⟦PET_CAP⟧: your search is ⟦DAYS(day)⟧ old. Keep searching or close it.` |
| Actions | `Nadaljuj iskanje` · `Zaključi iskanje` | `Keep searching` · `Close search` |

**Email**

| | SL | EN |
|---|---|---|
| Subject | `Še iščete žival?` | `Still looking for your pet?` |
| Preheader | `Nadaljujte iskanje ali ga zaključite, kakor vam ustreza.` | `Keep searching or close it, whichever suits you.` |
| Primary button | `Nadaljuj iskanje` | `Keep searching` |
| Text link | `Zaključi iskanje` | `Close search` |

SL body:

1. `⟦PET_CAP⟧: iščete že ⟦DAYS_ACC(day)⟧.`
2. `Če iskanje še teče, ga nadaljujte in ostalo bomo uredili mi. Če žival ni več pogrešana, ga zaključite.`
3. `Če je žival spet doma, odprite prijavo in jo označite kot spet doma.`

EN body:

1. `⟦PET_CAP⟧: your search is ⟦DAYS(day)⟧ old.`
2. `If the search is still going, keep it open and we will take care of the rest. If your pet is no longer missing, close it.`
3. `If your pet is home again, open the report and mark it as home again.`

## 2.7 report_expiring

Lost: auto-close after 90 days without an update, one-tap extension. Found and sighted: expiry after 30 days without update. Quiet hours apply. No push (C10).

Channels: in-app, email. Deep link: `/my-reports` (extension via query, see CHANGE).

**In-app**

| | SL | EN |
|---|---|---|
| Title, lost | `Iskanje se bo kmalu zaključilo` | `Your search will close soon` |
| Body, lost | `⟦PET_CAP⟧: iskanje se čez ⟦DAYS_ACC(days_left)⟧ zaključi. Nadaljujte ga z enim dotikom.` | `⟦PET_CAP⟧: your search closes in ⟦DAYS(days_left)⟧. Keep it going with one tap.` |
| Action, lost | `Nadaljuj iskanje` | `Keep searching` |
| Title, found or sighted | `Prijava bo kmalu potekla` | `Your report will expire soon` |
| Body, found or sighted | `Prijava poteče čez ⟦DAYS_ACC(days_left)⟧, ker ni bilo posodobitev. Podaljšajte jo.` | `Your report expires in ⟦DAYS(days_left)⟧ because it has had no updates. Extend it.` |
| Action, found or sighted | `Podaljšaj za 30 dni` | `Keep for 30 more days` |

**Email**

| | SL | EN |
|---|---|---|
| Subject, lost | `Iskanje se bo čez {days_left, plural, one {# dan} two {# dneva} few {# dni} other {# dni}} zaključilo` | `Your search closes in {days_left, plural, one {# day} other {# days}}` |
| Preheader, lost | `Nadaljujte ga z enim dotikom ali pustite, da se zaključi.` | `Keep it going with one tap, or let it close.` |
| Button, lost | `Nadaljuj iskanje` | `Keep searching` |
| Subject, found or sighted | `Prijava poteče čez {days_left, plural, one {# dan} two {# dneva} few {# dni} other {# dni}}` | `Your report expires in {days_left, plural, one {# day} other {# days}}` |
| Preheader, found or sighted | `Če je še aktualna, jo podaljšajte za 30 dni.` | `If it is still relevant, keep it for 30 more days.` |
| Button, found or sighted | `Podaljšaj za 30 dni` | `Keep for 30 more days` |

SL body, lost:

1. `⟦PET_CAP⟧: iskanje je brez posodobitev že dolgo, zato se bo čez ⟦DAYS_ACC(days_left)⟧ samodejno zaključilo.`
2. `Če žival še iščete, ga nadaljujte z enim dotikom. Če ne, vam ni treba storiti ničesar.`

EN body, lost:

1. `⟦PET_CAP⟧: your search has had no updates for a long time, so it will close automatically in ⟦DAYS(days_left)⟧.`
2. `If you are still looking, keep it going with one tap. If not, there is nothing you need to do.`

SL body, found or sighted:

1. `Vaša prijava {report_type, select, sighted {opažene} other {najdene}} živali bo čez ⟦DAYS_ACC(days_left)⟧ potekla, ker ni bilo posodobitev.`
2. `Če je žival še tam ali jo še iščejo, prijavo podaljšajte za 30 dni. Če ne, vam ni treba storiti ničesar.`

EN body, found or sighted:

1. `Your report of a {report_type, select, sighted {sighted} other {found}} animal expires in ⟦DAYS(days_left)⟧ because it has had no updates.`
2. `If the animal is still there or someone is still looking, keep the report for 30 more days. If not, there is nothing you need to do.`

## 2.8 report_closed

Lost: closed at 90 days idle. Found or sighted: closed after 30 days without update. A closed report can be reopened for `reopen_days` days (currently 7). No push (C10).

Channels: in-app, email. Deep link: `/my-reports`.

**In-app**

| | SL | EN |
|---|---|---|
| Title, lost | `Iskanje je zaključeno` | `Your search is closed` |
| Body, lost | `⟦PET_CAP⟧: iskanje je zaključeno, ker ni bilo posodobitev. Znova ga odprete v ⟦DAYS_LOC(reopen_days)⟧.` | `⟦PET_CAP⟧: the search was closed because it had no updates. You can reopen it within ⟦DAYS(reopen_days)⟧.` |
| Title, found or sighted | `Prijava je zaključena` | `Your report is closed` |
| Body, found or sighted | `Prijava je zaključena, ker ni bilo posodobitev. Znova jo odprete v ⟦DAYS_LOC(reopen_days)⟧.` | `The report was closed because it had no updates. You can reopen it within ⟦DAYS(reopen_days)⟧.` |

Reopening the report is the button's job: `Odpri znova` / `Reopen`.

**Email**

| | SL | EN |
|---|---|---|
| Subject, lost | `Iskanje je zaključeno` | `Your search is closed` |
| Preheader, lost | `Če žival še iščete, ga lahko znova odprete.` | `If you are still looking, you can reopen it.` |
| Subject, found or sighted | `Prijava je zaključena` | `Your report is closed` |
| Preheader, found or sighted | `Po potrebi jo lahko znova odprete.` | `You can reopen it if you need to.` |
| Button | `Odpri znova` | `Reopen` |

SL body, lost:

1. `⟦PET_CAP⟧: iskanje smo po ⟦DAYS_LOC(idle_days)⟧ brez posodobitev zaključili in ga umaknili z zemljevida.`
2. `Če žival še iščete, ga lahko v ⟦DAYS_LOC(reopen_days)⟧ znova odprete, vse ostane, kot je bilo. Če ste žival že našli, se veselimo z vami.`

EN body, lost:

1. `⟦PET_CAP⟧: after ⟦DAYS(idle_days)⟧ without updates we closed the search and took it off the map.`
2. `If you are still looking, you can reopen it within ⟦DAYS(reopen_days)⟧ and everything stays as it was. If you have found your pet, we are glad for you.`

SL body, found or sighted:

1. `Prijavo {report_type, select, sighted {opažene} other {najdene}} živali smo po ⟦DAYS_LOC(idle_days)⟧ brez posodobitev zaključili in jo umaknili z zemljevida.`
2. `Če je prijava še aktualna, jo lahko v ⟦DAYS_LOC(reopen_days)⟧ znova odprete. Hvala, da ste pomagali.`

EN body, found or sighted:

1. `After ⟦DAYS(idle_days)⟧ without updates we closed your report of a {report_type, select, sighted {sighted} other {found}} animal and took it off the map.`
2. `If it is still relevant, you can reopen it within ⟦DAYS(reopen_days)⟧. Thank you for helping.`

## 2.9 report_hidden

Moderation hold. Calm, no accusation, no reason given in the text. The owner of the report is told how to reach support. Quiet hours apply. No push (C10).

Channels: in-app, email. Deep link: `/my-reports`.

**In-app**

| | SL | EN |
|---|---|---|
| Title | `Prijava je v pregledu` | `Your report is under review` |
| Body | `Prijavo je začasno umaknila naša ekipa in zaenkrat ni javno vidna. Odprite jo za več.` | `Our team has taken your report off the map for now. Open it to read more.` |

**Email**

| | SL | EN |
|---|---|---|
| Subject | `Prijava je v pregledu` | `Your report is under review` |
| Preheader | `Zaenkrat ni javno vidna. Tukaj je, kaj lahko storite.` | `It is not publicly visible for now. Here is what you can do.` |
| Button | `Odpri prijavo` | `Open report` |

SL body:

1. `Vaša prijava {report_type, select, lost {izgubljene} found {najdene} other {opažene}} živali je v pregledu naše ekipe in zaenkrat ni javno vidna.`
2. `Prijave občasno pregledamo, da zemljevid ostane zanesljiv. Običajno pregled ne traja dolgo. Vam ni treba storiti ničesar.`
3. `Če imate vprašanja ali želite k prijavi kaj dodati, nam odgovorite na to sporočilo ali pišite na {support_email}.`

EN body:

1. `Your report of a {report_type, select, lost {lost} found {found} other {sighted}} animal is being reviewed by our team and is not publicly visible for now.`
2. `We check some reports now and then to keep the map reliable. A review does not usually take long. There is nothing you need to do.`
3. `If you have questions or want to add something to the report, reply to this email or write to {support_email}.`

## 2.10 report_reunited (to the counterpart)

The finder or reporter learns that the animal is home. Warm, short, thanks. No money ask, no tip, no ad. Quiet hours apply. No email (C10).

Channels: in-app, push. Deep link: `/r/<report_code>`.

**In-app and push**

| | SL | EN |
|---|---|---|
| Title | `⟦ANIMAL_CAP⟧ je spet doma` | `⟦ANIMAL_CAP⟧ is home again` |
| Body | `Žival, ki ste jo prijavili, je spet doma. Hvala, da ste pomagali.` | `The animal you reported is home again. Thank you for helping.` |

## 2.11 manage_link

Email only, to the anonymous finder (`report_contacts`), sent once the finder gave an e-naslov. Not subject to quiet hours or notification preferences (transactional). Contains the secret link.

Channels: email. Deep link: `<APP_URL>/m#<token>` (SL), `<APP_URL>/en/m#<token>` (EN).

**Email**

| | SL | EN |
|---|---|---|
| Subject | `Zasebna povezava do vaše prijave` | `Your private link to your report` |
| Preheader | `Shranite jo. Brez nje prijave ne morete upravljati.` | `Keep it safe. Without it you cannot manage your report.` |
| Button | `Odpri mojo prijavo` | `Open my report` |

SL body:

1. `Hvala, da ste prijavili {report_type, select, sighted {opaženo} other {najdeno}} žival. Prijava je objavljena.`
2. `S spodnjim gumbom jo lahko kadar koli uredite, preberete sporočila ali jo zaključite, brez računa in brez vpisa.`
3. `Povezava je zasebna. Kdor jo ima, lahko upravlja prijavo, zato je ne delite. Če jo izgubite, je ne moremo obnoviti, zato to e-sporočilo shranite.`
4. `Če želite prijavo obdržati tudi na drugi napravi, ustvarite račun.`

EN body:

1. `Thank you for reporting a {report_type, select, sighted {sighted} other {found}} animal. Your report is live.`
2. `The button below lets you edit it, read messages or close it at any time, with no account and no sign-in.`
3. `The link is private. Anyone who has it can manage the report, so do not share it. If you lose it we cannot recover it, so keep this email.`
4. `If you want to keep the report on another device too, create an account.`

## 2.12 payment_receipt

Sent after a successful payment. Purposes: `tip` ("prispevek v zahvalo") and `report_contribution`. States the amount, says plainly what the money does, and says it is not a donation receipt. In-app and email; no push. Test mode while `APP_ENV` is not production.

Channels: in-app, email. Deep link: `/account/payments`.

**In-app**

| | SL | EN |
|---|---|---|
| Title | `Potrdilo o plačilu` | `Payment receipt` |
| Body | `{amount}, ⟦PURPOSE⟧. Hvala.{is_test, select, yes { Testno plačilo.} other {}}` | `{amount}, ⟦PURPOSE⟧. Thank you.{is_test, select, yes { Test payment.} other {}}` |

`⟦PURPOSE⟧` SL: `{purpose, select, tip {prispevek v zahvalo} other {prispevek}}`. EN: `{purpose, select, tip {thank-you contribution} other {contribution}}`.

**Email**

| | SL | EN |
|---|---|---|
| Subject | `{is_test, select, yes {Test · } other {}}Potrdilo o plačilu: {amount}` | `{is_test, select, yes {Test · } other {}}Payment receipt: {amount}` |
| Preheader | `Hvala. Prispevki pokrivajo strežnike, zemljevide in pošiljanje opozoril.` | `Thank you. Contributions cover servers, maps and sending alerts.` |
| Button | `Odpri moja plačila` | `Open my payments` |

SL body:

1. `{purpose, select, tip {Prejeli smo vaš prispevek v zahvalo} other {Prejeli smo vaš prispevek ob objavi iskanja}} v višini {amount}. Hvala.`
2. `Prispevki pokrivajo strežnike, zemljevide in pošiljanje opozoril. Najdimo ostaja brezplačno za vse.`
3. `Datum: {paid_at}` / `Znesek: {amount}` / `Referenca: {receipt_ref}` (three short lines)
4. `{is_test, select, yes {Testno plačilo – kartica ni bila bremenjena.} other {}}`
5. `To je potrdilo o plačilu, ne potrdilo o donaciji.`

EN body:

1. `{purpose, select, tip {We received your thank-you contribution} other {We received your contribution for publishing your search}} of {amount}. Thank you.`
2. `Contributions cover servers, maps and sending alerts. Najdimo stays free for everyone.`
3. `Date: {paid_at}` / `Amount: {amount}` / `Reference: {receipt_ref}` (three short lines)
4. `{is_test, select, yes {Test payment – your card was not charged.} other {}}`
5. `This is a payment receipt, not a donation receipt.`

The legal wording of line 5 needs legal review (see Q6).

# 3. Auth emails (Supabase Auth, sent through Brevo)

Files: `supabase/templates/*.html`, localised with `{{ if eq .Data.locale "en" }} … {{ else }} … {{ end }}`. Supabase variables are used literally. Same layout, no ad line. Each carries the footer of section 6 without the notification-settings link (these are security emails).

## 3.1 Confirm sign-up (`confirmation`)

| | SL | EN |
|---|---|---|
| Subject | `Potrdite e-naslov` | `Confirm your email address` |
| Preheader | `Še en korak do računa v Najdimo.` | `One more step to your Najdimo account.` |
| Button | `Potrdi e-naslov` | `Confirm email` |

SL body:

1. `Hvala, da ste ustvarili račun v Najdimo. Potrdite, da je {{ .Email }} vaš e-naslov.`
2. `Z računom boste lahko prejemali opozorila v bližini, pisali v pogovorih in upravljali svoje prijave.`
3. `Če računa niste ustvarili vi, tega e-sporočila ne upoštevajte.`
4. Fallback under the button: `Gumb ne deluje? Kopirajte to povezavo v brskalnik: {{ .ConfirmationURL }}`

EN body:

1. `Thank you for creating a Najdimo account. Please confirm that {{ .Email }} is your email address.`
2. `With an account you can receive nearby alerts, write in conversations and manage your reports.`
3. `If you did not create an account, you can ignore this email.`
4. Fallback: `Button not working? Copy this link into your browser: {{ .ConfirmationURL }}`

Button target: `{{ .ConfirmationURL }}`.

## 3.2 Reset password (`recovery`)

| | SL | EN |
|---|---|---|
| Subject | `Ponastavitev gesla` | `Reset your password` |
| Preheader | `Povezava za nastavitev novega gesla.` | `A link to set a new password.` |
| Button | `Nastavi novo geslo` | `Set new password` |

SL body:

1. `Prejeli smo zahtevo za ponastavitev gesla za {{ .Email }}.`
2. `Z gumbom spodaj nastavite novo geslo. Povezava velja omejen čas.`
3. `Če gesla niste zahtevali vi, tega e-sporočila ne upoštevajte. Vaše geslo ostane nespremenjeno.`
4. Fallback: `Gumb ne deluje? Kopirajte to povezavo v brskalnik: {{ .ConfirmationURL }}`

EN body:

1. `We received a request to reset the password for {{ .Email }}.`
2. `Use the button below to set a new password. The link is valid for a limited time.`
3. `If you did not ask for this, you can ignore this email. Your password stays the same.`
4. Fallback: `Button not working? Copy this link into your browser: {{ .ConfirmationURL }}`

Button target: `{{ .ConfirmationURL }}`.

## 3.3 Change email, confirm the new address (`email_change`)

| | SL | EN |
|---|---|---|
| Subject | `Potrdite nov e-naslov` | `Confirm your new email address` |
| Preheader | `Potrditev spremembe e-naslova za račun v Najdimo.` | `Confirm the change of email address on your Najdimo account.` |
| Button | `Potrdi nov e-naslov` | `Confirm new email` |

SL body:

1. `Zahtevali ste spremembo e-naslova računa v Najdimo z {{ .Email }} na {{ .NewEmail }}.`
2. `Spremembo potrdite z gumbom spodaj. Do potrditve se še vpisujete s starim e-naslovom.`
3. `Če spremembe niste zahtevali vi, se vpišite in spremenite geslo ali nam pišite.`
4. Fallback: `Gumb ne deluje? Kopirajte to povezavo v brskalnik: {{ .ConfirmationURL }}`

EN body:

1. `You asked to change the email address of your Najdimo account from {{ .Email }} to {{ .NewEmail }}.`
2. `Confirm the change with the button below. Until then you keep signing in with your old address.`
3. `If you did not ask for this, sign in and change your password, or write to us.`
4. Fallback: `Button not working? Copy this link into your browser: {{ .ConfirmationURL }}`

Button target: `{{ .ConfirmationURL }}`.

## 3.4 Reauthentication code (`reauthentication`, for account deletion later)

| | SL | EN |
|---|---|---|
| Subject | `Vaša potrditvena koda` | `Your confirmation code` |
| Preheader | `Koda za potrditev občutljivega dejanja.` | `A code to confirm a sensitive action.` |
| Button | none (code only) | none (code only) |

SL body:

1. `Za potrditev dejanja v računu {{ .Email }} vnesite to kodo:`
2. Code line, large, selectable: `{{ .Token }}`
3. `Kode ne povejte nikomur. Najdimo je ne zahteva po telefonu ali v sporočilih.`
4. `Če dejanja niste začeli vi, nam takoj pišite in spremenite geslo.`

EN body:

1. `To confirm an action on the account {{ .Email }}, enter this code:`
2. Code line: `{{ .Token }}`
3. `Never share this code with anyone. Najdimo will never ask for it by phone or message.`
4. `If you did not start this action, write to us and change your password.`

## 3.5 A new sign-in method was linked (`identity_linked_notification`)

Security notice, no button needed. Variable `{{ .Provider }}` (for example Google, Apple, email). Verify in the Supabase template editor that the variable exists in the deployed version (see Q8).

| | SL | EN |
|---|---|---|
| Subject | `Dodan nov način vpisa` | `A new sign-in method was added` |
| Preheader | `Vašemu računu je bil dodan nov način vpisa.` | `A new way to sign in was added to your account.` |
| Button | none | none |

SL body:

1. `Računu {{ .Email }} v Najdimo je bil dodan nov način vpisa: {{ .Provider }}.`
2. `Če ste to storili vi, vam ni treba storiti ničesar.`
3. `Če tega niste storili vi, spremenite geslo in nam takoj pišite na [naročnik: e-naslov za podporo].`

EN body:

1. `A new sign-in method was added to your Najdimo account {{ .Email }}: {{ .Provider }}.`
2. `If this was you, there is nothing you need to do.`
3. `If it was not you, change your password and write to us at [client: support email address] right away.`

# 4. Internal email: new partner enquiry (lead)

SL only. Sent by `submit-lead` to `LEADS_NOTIFY_EMAIL` (the client). No footer reason line, internal layout only. Sender "Najdimo".

| | SL |
|---|---|
| Subject | `Novo povpraševanje: {enquiry_type, select, vet_partner {Veterinarski partner} other {Oglas}} · {company}` |
| Preheader | `{contact_name}, {region_interest}. Odgovorite v dveh delovnih dneh.` |
| Button | `Odpri povpraševanje` |

Body (short field list, then the message):

1. `Prejeli smo novo povpraševanje prek strani Partnerji.`
2. Fields, one per line:
   - `Podjetje: {company}`
   - `Kontaktna oseba: {contact_name}`
   - `E-naslov: {email}`
   - `Telefon: {phone}` (line left out when empty)
   - `Zanimiva regija: {region_interest}` (line left out when empty)
   - `Vrsta povpraševanja: {enquiry_type, select, vet_partner {Veterinarski partner} other {Oglas}}`
   - `Soglasje za stik: {consent_at}`
3. `Sporočilo:` followed by `{message}` in a quoted block.
4. `Povpraševanje je shranjeno v skrbniškem pregledu. Odgovorite osebi neposredno na zgornji e-naslov.`

Button target: `{admin_enquiries_url}/{lead_id}` (admin enquiries, requires aal2).

"Odgovorite v dveh delovnih dneh" is a client commitment. Remove from the preheader if the client does not want it (Q9).

# 5. Out of scope here

Push permission primer, in-app opt-in sheet (P13), page copy, "Nastavitve obvestil" page copy, confirmation page of the one-click unsubscribe. These live in the page slices.

# 6. Shared email layout

## 6.1 Structure

Header: wordmark "Najdimo" and tagline "Spet doma." / "Home again." Body. Button (one primary per email). Optional ad line (nearby-alert email only). Footer.

## 6.2 Footer

Reason line, selected by `category` (SL / EN):

| category | SL | EN |
|---|---|---|
| account | `Prejeli ste to e-sporočilo, ker imate račun v Najdimo.` | `You received this email because you have a Najdimo account.` |
| search (match, chat, reminders, lifecycle, hidden) | `Prejeli ste to e-sporočilo, ker imate v Najdimo iskanje, prijavo ali pogovor.` | `You received this email because you have a search, a report or a conversation on Najdimo.` |
| alert | `Prejeli ste to e-sporočilo, ker ste vklopili opozorila v bližini.` | `You received this email because you turned on nearby alerts.` |
| finder | `Prejeli ste to e-sporočilo, ker ste ob prijavi navedli ta e-naslov.` | `You received this email because you gave this address when you made a report.` |
| payment | `Prejeli ste to e-sporočilo, ker ste opravili plačilo v Najdimo.` | `You received this email because you made a payment on Najdimo.` |

Links:

| | SL | EN |
|---|---|---|
| Settings (all notification emails, not auth emails) | `Nastavitve obvestil` → `/account/alerts` | `Notification settings` → `/account/alerts` |
| One-click, alert emails only | `Izklopi ta opozorila` → `{unsubscribe_url}` | `Turn off these alerts` → `{unsubscribe_url}` |

The one-click link needs no sign-in and is also set as the `List-Unsubscribe` header (with `List-Unsubscribe-Post`). Finder and payment emails have no settings link, only the reason line and the support line.

Support line:

| SL | EN |
|---|---|
| `Vprašanja? Odgovorite na to sporočilo ali pišite na [naročnik: e-naslov za podporo].` | `Questions? Reply to this email or write to [client: support email address].` |

Company line:

| SL | EN |
|---|---|
| `Najdimo · [naročnik: naslov družbe]` | `Najdimo · [client: company address]` |

Replies go to the support address (`Reply-To`), never to a no-reply mailbox. The ad line, when present, sits above the footer and is a single line starting with "Oglas ·" / "Ad ·".

# 7. Template count

12 notification types (of which `match_chip` with a sighting variant, `report_expiring` and `report_closed` with lost and found/sighted variants, and `nearby_lost` with an optional Vet Partner line), 5 auth emails, 1 internal lead email. Total 18 templates plus the shared layout footer.

# CHANGE requests

1. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: all pet-related payloads (match_chip, match_suggested, report_reminder, report_expiring, report_closed) need { has_name: 'yes'|'no', pet_name?: string, species: 'dog'|'cat'|'other' }; the handler sets has_name and truncates pet_name to 18 characters.`
2. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: match_chip and match_suggested need other_type ('found'|'sighted') so the sighting variant (animal may have moved) and the ⟦OTHER⟧ wording work.`
3. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: match_confirmed needs { species, report_type } for the finder side.`
4. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: chat_message email needs unread_count (messages unread in that conversation at send time). preview_alias must be an alias or display name chosen by the user, max 24 characters after truncation.`
5. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: nearby_lost needs { has_area, area_name? (public approximate area only), reported_at (for formatRelative) }; default channels add email as an opt-in, default off, controlled by the existing per-type email switch in P13.`
6. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: nearby_lost email needs { has_vet_partner, clinic_name?, clinic_area?, clinic_url? (tracked click), ad_id? }, resolved by the handler from the Vet Partner entitlement of the report's region, and an unsubscribe_url (signed, one-click, no sign-in). Never put these in the push or in-app payload.`
7. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: report_expiring needs { report_type, days_left }; report_closed needs { report_type, idle_days, reopen_days }; report_hidden needs { report_type } (no free-text reason in user-facing copy).`
8. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: report_reminder, report_expiring deep links need an action: /my-reports?r=<code>&action=keep|close|extend so "Nadaljuj iskanje", "Zaključi iskanje" and "Podaljšaj za 30 dni" are one tap (with a confirm screen for close).`
9. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: report_reunited needs { species }.`
10. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: manage_link needs { report_type, species } and the URL must respect recipient locale (/m#token for SL, /en/m#token for EN); transactional, not governed by notification_prefs.`
11. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: payment_receipt needs { paid_at, receipt_ref, is_test } besides payment_id, amount_cents, purpose. is_test = APP_ENV is not production or provider is mock/test mode.`
12. `CHANGE docs/tech/contracts/C10-notifications-alerts.md§Types: the email layout needs a category (account|search|alert|finder|payment) per template to select the footer reason line.`
13. `CHANGE docs/tech/contracts/C14-ads-partners.md§Tables: leads needs enquiry_type text ('ad'|'vet_partner'); submit-lead body needs enquiry_type; the internal email links to the admin enquiries page by lead id.`
14. `CHANGE docs/tech/contracts/C3-auth-profiles-roles.md§Auth configuration: add the identity-linked security notification template and the email_change and reauthentication templates to supabase/templates, all localised with Data.locale; confirm the available variables (Provider, NewEmail) for the deployed Supabase version.`

# Open questions

- **Q1 Pet names in cases.** Names cannot be declined by software, so copy keeps them in the nominative after a middle dot or colon. The voice-guide example "Morda smo našli Luno" cannot be produced for arbitrary names. Options: keep this approach (recommended), or let owners type an optional accusative form. Needs a decision from the lead and native review.
- **Q2 ICU select keys.** The band codes `1to3` and `3to10` start with a digit. Confirm that the chosen i18n library (ICU/FormatJS) accepts them as select keys, or map to `b_lt1`, `b_1to3` and so on in the handler.
- **Q3 Nearby alert by email.** C10 lists no email for `nearby_lost`, but the Vet Partner line lives only in that email. Proposal: an opt-in email channel (default off). If the client rejects it, the Vet Partner mention has no home in alerts (poster and ad slots remain).
- **Q4 Anonymous finders and lifecycle messages.** `report_expiring` and `report_closed` for found and sighted reports go to `report_contacts`, but the extension needs a signed action link (the manage token is only a hash). Proposal: the email carries a one-time extension link, or links to `/m` where the finder uses the saved link.
- **Q5 Reason for hold.** Copy shows no reason for `report_hidden`. Confirm with the moderation policy whether a short public reason ("pomanjkljive fotografije", "možna vsebina, ki ni v skladu s pravili") may be shown.
- **Q6 Not a donation receipt.** The line "ne potrdilo o donaciji" and any mention of tax treatment need legal review (Q-008, and the page "Where your money goes and dohodnina").
- **Q7 Vet Partner line labelling and wording.** "Oglas · …" follows the ad-label rule. Legal and the client should confirm that a sponsored vet line in an alert email is acceptable (consent for marketing content in a service email) and approve the sentence "Potrebujete veterinarja? Najbližja ambulanta: …". Region resolution (clinic nearest to the report, or to the recipient) is a product decision.
- **Q8 Supabase template variables.** `{{ .Provider }}` for the identity-linked notice and `{{ .NewEmail }}` for email change need checking against the Supabase version in use. Link validity is not stated in the copy; if the client wants "velja 1 uro", the value must match the Auth setting.
- **Q9 Lead response promise.** "Odgovorite v dveh delovnih dneh" in the internal email is an internal reminder; client to confirm or drop.
- **Q10 Brand and addresses.** Final name (Q-001), sender domain, support address and company address are still markers: `[naročnik: e-naslov za podporo]`, `[naročnik: naslov družbe]`.
- **Q11 Match notifications to the other side.** `match_suggested` goes only to the owner. If the finder should hear that a match is being reviewed, a new type is needed; copy is not written for it.
