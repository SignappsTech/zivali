---
source: 03§P18; docs/design/pages/P18-poster-share.md; 02§FR-011
page: P18 Poster and sharing
stories: TASK-24 (FR-011)
copy-for: docs/design/pages/P18-poster-share.md
version: 0.4
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P18 Poster and sharing: copy

Namespaces `poster` and `share`. The poster and sharing are free for everyone, forever. The poster QR code links to the public listing only (`https://<host>/r/<code>`), never to a person. No phone number, email, chip number, exact address or holding place on the poster, in share texts or in the link card. Species-dependent words use ICU `select` so adjectives agree ("Pogrešan pes", "Pogrešana mačka").

# 1. Screen

| Key | SL | EN |
|---|---|---|
| poster.screen_title | Plakat in deljenje | Poster and sharing |
| poster.language_label | Jezik plakata | Poster language |
| poster.language_sl | Slovenščina | Slovenščina |
| poster.language_en | English | English |
| poster.download | Prenesi PDF | Download PDF |
| poster.preparing | Pripravljamo … | Preparing … |
| poster.ready_file | Datoteka: {filename} | File: {filename} |
| poster.print | Natisni | Print |
| poster.view_full | Pokaži v polni velikosti | View full size |
| poster.qr_note | Plakat ima kodo QR, ki odpre to prijavo. | The poster has a QR code that opens this report. |
| share.title | Deli | Share |
| share.whatsapp | WhatsApp | WhatsApp |
| share.facebook | Facebook | Facebook |
| share.copy | Kopiraj povezavo | Copy link |
| share.more | Več … | More … |
| share.poster | Plakat s QR kodo | Poster with QR code |
| share.copied | Povezava je kopirana. | Link copied. |

Share menu on the web detail page (v0.2): the button is `report.share_button` (P9) and also names the menu; items in this order: `share.facebook`, `share.whatsapp`, `share.copy`, `share.poster` (opens this screen). After copying, the toast is `share.copied`.

File name: `najdimo-{code}.pdf` (no pet name, so the file is safe to forward).

# 2. Poster (A4)

| Zone | Key | SL | EN |
|---|---|---|---|
| Top band, lost | poster.top_lost | {species, select, dog {Pogrešan pes} cat {Pogrešana mačka} other {Pogrešana žival}} | {species, select, dog {Missing dog} cat {Missing cat} other {Missing pet}} |
| Top band, found | poster.top_found | {species, select, dog {Najden pes} cat {Najdena mačka} other {Najdena žival}} | {species, select, dog {Found dog} cat {Found cat} other {Found animal}} |
| Name | poster.name | {name} | {name} |
| Fact: colour | poster.fact_colour | Barva: {colours} | Colour: {colours} |
| Fact: size | poster.fact_size | Velikost: {size} | Size: {size} |
| Fact: collar | poster.fact_collar | Ovratnica: {collar} | Collar: {collar} |
| Fact: breed | poster.fact_breed | Pasma: {breed} | Breed: {breed} |
| When, lost | poster.since_lost | {species, select, dog {Pogrešan od {date}} cat {Pogrešana od {date}} other {Pogrešana od {date}}} | Missing since {date} |
| When, found | poster.since_found | {species, select, dog {Najden {date}} cat {Najdena {date}} other {Najdena {date}}} | Found on {date} |
| Area | poster.area | Območje: {area}, {municipality} (približno) | Area: {area}, {municipality} (approximate) |
| Call to action, lost | poster.cta_lost | {species, select, dog {Ste ga videli? Skenirajte kodo in nam sporočite.} cat {Ste jo videli? Skenirajte kodo in nam sporočite.} other {Ste jo videli? Skenirajte kodo in nam sporočite.}} | {species, select, dog {Seen this dog? Scan the code and let us know.} cat {Seen this cat? Scan the code and let us know.} other {Seen this pet? Scan the code and let us know.}} |
| Call to action, found | poster.cta_found | {species, select, dog {Je to vaš pes? Skenirajte kodo.} cat {Je to vaša mačka? Skenirajte kodo.} other {Je to vaša žival? Skenirajte kodo.}} | {species, select, dog {Is this your dog? Scan the code.} cat {Is this your cat? Scan the code.} other {Is this your pet? Scan the code.}} |
| Link under QR | poster.short_link | {short_url} | {short_url} |
| Reward, lost only | poster.reward | Nagrada | Reward offered |
| Reward with amount | poster.reward_amount | Nagrada: {amount} | Reward offered: {amount} |
| Safety line | poster.safety | Stik samo prek Najdimo. Nikoli ne plačujte vnaprej. | Contact only through Najdimo. Never pay in advance. |
| Safety line, with a reward | poster.safety_reward | Stik samo prek Najdimo. Nagrado lastnik izroči šele, ko je žival spet doma. Nikoli nikomur ne plačajte vnaprej. | Contact only through Najdimo. The owner hands over the reward only once the animal is home. Never pay anyone in advance. |
| Footer | poster.footer | Najdimo · Spet doma. | Najdimo · Home again. |

Reward (v0.3, brief v1.1: display only): only on lost posters whose report has a reward. `poster.reward` or `poster.reward_amount` sits between the area line and the call to action, followed by the owner's note after " · " when there is one (as in P9); `{amount}` is formatted as currency in the poster language ("50 €" / "€50"). With a reward, `poster.safety_reward` replaces `poster.safety`. Without a reward both reward keys are left out and the poster reflows without a gap.

`CHANGE docs/design/pages/P18-poster-share.md§Poster layout: add an optional "Reward" zone (lost only) between "Where and when" and "Call to action", 32 pt bold, black on white; the safety line uses poster.safety_reward when a reward is shown.`

Fact values: colours as pill labels joined with "in" in lowercase ("rjava in bela"), size as the pill label in lowercase ("srednja"); both agree with the feminine labels "barva" and "velikost". Show 3 to 5 fact lines; skip empty ones.

Reunited or closed reports:

| Key | SL | EN |
|---|---|---|
| poster.top_home | Spet doma | Home again |
| poster.home_named | {name} je spet doma. | {name} is home again. |
| poster.home_thanks | Hvala vsem, ki ste pomagali. Plakat lahko odstranite. | Thank you to everyone who helped. You can take this poster down. |
| poster.unavailable_closed | Iskanje je zaključeno, zato plakat ni na voljo. | The search is closed, so the poster is not available. |

Vet Partner line (later, behind a flag; paid placement, always labelled):

| Key | SL | EN |
|---|---|---|
| poster.vet_line | Oglas · Potrebujete veterinarja? {clinic_name}, {clinic_area} | Ad · Need a vet? {clinic_name}, {clinic_area} |
| poster.vet_toggle_label | Prikaži oglas veterinarske ambulante | Show vet practice ad |
| poster.vet_toggle_hint | Plačan oglas lokalnega veterinarskega partnerja. Na svojem plakatu ga lahko skrijete. | Paid ad from a local vet partner. You can hide it on your poster. |

Toggle state: on by default for the owner's own poster; the owner may switch it off (decided by the client, 2026-10-15). The toggle lives in the poster options, next to the language choice. When it is off, `poster.vet_line` is left out and the poster reflows without an empty gap.

PDF metadata: title "{top band} {name} – Najdimo" ("Pogrešan pes Rex – Najdimo"), language `sl` or `en`.

# 3. Link card (Open Graph image text)

| Key | SL | EN |
|---|---|---|
| poster.og_type | {top band} | {top band} |
| poster.og_name | {name} | {name} |
| poster.og_area | Območje: {area} | Area: {area} |

`{top band}` = `poster.top_lost` or `poster.top_found`; sighted reports use `browse.row_title_sighted` (P4).

# 4. Share texts (native sheet, WhatsApp, Facebook)

| Key | SL | EN |
|---|---|---|
| share.text_lost | {species, select, dog {Pomagajte najti psa: {name}. Nazadnje viden {date}, območje {area}. Ste ga videli? {url}} cat {Pomagajte najti mačko: {name}. Nazadnje videna {date}, območje {area}. Ste jo videli? {url}} other {Pomagajte najti žival: {name}. Nazadnje videna {date}, območje {area}. Ste jo videli? {url}}} | {species, select, dog {Help find this dog: {name}. Last seen {date}, area {area}. Have you seen it? {url}} cat {Help find this cat: {name}. Last seen {date}, area {area}. Have you seen it? {url}} other {Help find this pet: {name}. Last seen {date}, area {area}. Have you seen it? {url}}} |
| share.text_lost_noname | {species, select, dog {Pomagajte najti izgubljenega psa. Nazadnje viden {date}, območje {area}. Ste ga videli? {url}} cat {Pomagajte najti izgubljeno mačko. Nazadnje videna {date}, območje {area}. Ste jo videli? {url}} other {Pomagajte najti izgubljeno žival. Nazadnje videna {date}, območje {area}. Ste jo videli? {url}}} | {species, select, dog {Help find a lost dog. Last seen {date}, area {area}. Have you seen it? {url}} cat {Help find a lost cat. Last seen {date}, area {area}. Have you seen it? {url}} other {Help find a lost pet. Last seen {date}, area {area}. Have you seen it? {url}}} |
| share.text_found | {species, select, dog {Najden pes, območje {area}. Ga poznate? Pomagajte mu domov: {url}} cat {Najdena mačka, območje {area}. Jo poznate? Pomagajte ji domov: {url}} other {Najdena žival, območje {area}. Jo poznate? Pomagajte ji domov: {url}}} | {species, select, dog {Found dog, area {area}. Do you know it? Help it get home: {url}} cat {Found cat, area {area}. Do you know it? Help it get home: {url}} other {Found animal, area {area}. Do you know it? Help it get home: {url}}} |
| share.text_sighted | {species, select, dog {Opažen pes, območje {area}. Ga pogrešate? {url}} cat {Opažena mačka, območje {area}. Jo pogrešate? {url}} other {Opažena žival, območje {area}. Jo pogrešate? {url}}} | {species, select, dog {Dog seen around {area}. Is it yours? {url}} cat {Cat seen around {area}. Is it yours? {url}} other {Animal seen around {area}. Is it yours? {url}}} |
| share.text_home | {name} je spet doma. Hvala vsem, ki ste delili in pomagali. {url} | {name} is home again. Thank you to everyone who shared and helped. {url} |

`{date}` is the short relative or calendar date ("včeraj", "12. 10.").

# 4b. Share kit (Facebook groups and local media)

Copy-ready texts for the owner of a lost-pet report, shown under the share menu. Rule: no phone number, email, chip number, exact address or holding place in any text; the only contact route is the report link `{url}`. The media line is a neutral template: the owner chooses where to send it, and we never name a real station or outlet.

| Key | SL | EN |
|---|---|---|
| share.kit_title | Pripravljena besedila za deljenje | Ready-made texts to share |
| share.kit_intro | Besedila lahko kopirate in prilepite v skupine na Facebooku ali pošljete lokalnim medijem. Stik poteka samo prek povezave. | You can copy and paste these texts into Facebook groups or send them to local media. Contact happens only through the link. |
| share.kit_post_title | Objava za Facebook | Facebook post |
| share.kit_post_text | {species, select, dog {Pogrešamo psa: {name}. Nazadnje viden {date}, območje {area}. Če ste ga videli, nam prosim sporočite prek povezave. Hvala, da delite. {url}} cat {Pogrešamo mačko: {name}. Nazadnje videna {date}, območje {area}. Če ste jo videli, nam prosim sporočite prek povezave. Hvala, da delite. {url}} other {Pogrešamo žival: {name}. Nazadnje videna {date}, območje {area}. Če ste jo videli, nam prosim sporočite prek povezave. Hvala, da delite. {url}}} | {species, select, dog {We are missing our dog: {name}. Last seen {date}, area {area}. If you have seen him, please let us know through the link. Thank you for sharing. {url}} cat {We are missing our cat: {name}. Last seen {date}, area {area}. If you have seen her, please let us know through the link. Thank you for sharing. {url}} other {We are missing our pet: {name}. Last seen {date}, area {area}. If you have seen them, please let us know through the link. Thank you for sharing. {url}}} |
| share.kit_groups_title | Skupine, kamor lahko objavite | Groups where you can post |
| share.kit_groups_intro | Poiščite skupine za izgubljene živali v svoji občini ali regiji in preberite njihova pravila, preden objavite. Objavo izberete in pošljete sami. | Look for lost-pet groups in your municipality or region and read their rules before posting. You choose and send the post yourself. |
| share.kit_groups_hint | Poskusite z iskanjem: izgubljene živali, ime kraja. | Try searching: lost pets, your town's name. |
| share.kit_copy | Kopiraj besedilo | Copy text |
| share.kit_copied | Besedilo je kopirano. | Text copied. |
| share.kit_media_title | Sporočilo za lokalni radio | Message for local radio |
| share.kit_media_intro | Lokalni radio ali krajevni portal lahko objavo prebere ali objavi. Besedilo je kratko in brez osebnih podatkov. | A local radio station or community website may read out or publish this. The text is short and has no personal details. |
| share.kit_media_text | {species, select, dog {Pogrešan je pes {name}, nazadnje viden {date} v okolici: {area}. Če ga vidite, prosimo, sporočite prek povezave: {url}} cat {Pogrešana je mačka {name}, nazadnje videna {date} v okolici: {area}. Če jo vidite, prosimo, sporočite prek povezave: {url}} other {Pogrešana je žival {name}, nazadnje videna {date} v okolici: {area}. Če jo vidite, prosimo, sporočite prek povezave: {url}}} | {species, select, dog {Missing dog {name}, last seen {date} around {area}. If you see him, please report it through the link: {url}} cat {Missing cat {name}, last seen {date} around {area}. If you see her, please report it through the link: {url}} other {Missing pet {name}, last seen {date} around {area}. If you see them, please report it through the link: {url}}} |
| share.kit_media_hint | Besedilo pošljite izbranemu lokalnemu radiu ali mediju sami. | Send the text to the local radio station or outlet of your choice yourself. |

# 5. States

| Key | SL | EN |
|---|---|---|
| poster.no_photo | Za plakat potrebujemo fotografijo, na kateri je žival dobro vidna. | The poster needs a photo where the animal is clearly visible. |
| poster.no_photo_action | Dodaj fotografijo | Add a photo |
| poster.failed | Plakata ni bilo mogoče pripraviti. Poskusite znova. | The poster could not be prepared. Please try again. |
| share.unsupported | Deljenje ni na voljo, zato smo povezavo kopirali. | Sharing is not available here, so we copied the link. |

# 6. SEO

N/A: an in-app screen (`noindex`). The poster PDF and OG image are served by the report detail page (P9).

# 7. Alt text

| Image | SL | EN |
|---|---|---|
| Poster preview | Predogled plakata: {top band} {name}, s fotografijo in kodo QR | Poster preview: {top band} {name}, with photo and QR code |
| Poster photo (in the PDF) | P9 §11 rule | |
| QR code (in the PDF and preview) | Koda QR za prijavo na {short_url} | QR code for the report at {short_url} |
| Logo on the poster | Najdimo | Najdimo |
| Link-card preview | P9 §11 OG alt | |

# Change log

| Version | Date | Change |
|---|---|---|
| 0.4 | 2026-10-15 | CH-58: added the share kit (section 4b): Facebook post text, group list intro, local radio/media line with neutral placeholder; no contact data. |
