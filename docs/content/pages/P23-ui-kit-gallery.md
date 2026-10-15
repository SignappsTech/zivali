---
source: 03§P23; docs/design/pages/P23-ui-kit-gallery.md
page: P23 UI kit gallery (components and states)
stories: TASK-8 (NFR-A11Y)
copy-for: docs/design/pages/P23-ui-kit-gallery.md
version: 0.3
status: Draft (internal page, minimal copy)
date: 2026-10-15
---

# P23 UI kit gallery: copy

Internal reference page, not public, not translated for users. It uses real product strings so the gallery proves the longest Slovenian labels fit. Use these sample strings (keys point to their source slice). Version 0.2 replaces every string the mockup marked as sample (`data-sample`) with a product string, except the user-entered values in §5.

# 1. Actions, fields and choices

| Component | SL sample | EN sample | Source key |
|---|---|---|---|
| Primary button (long) | Prijavi izgubljeno žival | Report a lost pet | `pages.home.hero_primary` (P3) |
| Secondary button | Vklopi opozorila | Turn on alerts | `pages.home.near_empty_action` (P3) |
| Text button | Ustvari račun in obdrži prijavo | Create an account to keep it | `report_found.create_account` (P7) |
| Destructive | Izbriši profil | Delete profile | `pets.delete_confirm` (P8) |
| Field 1: input, label and help | Številka čipa (neobvezno) · Običajno ima 15 števk, na primer 705 1234 5678 901. | Chip number (optional) · It usually has 15 digits, for example 705 1234 5678 901. | `report_lost.chip_label`, `report_lost.chip_help` (P6) |
| Field 1: error | Številka čipa je običajno dolga 15 števk. Shranili jo bomo kot neznano, preverite jo, ko boste lahko. | Chip numbers usually have 15 digits. We will save it as unknown; please check it when you can. | `report_lost.chip_warning` (P6) |
| Field 1: disabled, with reason | Ta prijava je zaključena, zato je ni več mogoče urejati. | This report is closed, so it can no longer be changed. | `errors.GONE` (P1); fields of a closed report are read-only |
| Field 2: textarea, label | Opis okoliščin (neobvezno) | What happened (optional) | `report_lost.circumstances_label` (P6) |
| Field 2: placeholder | Na primer: med sprehodom ga je prestrašil ognjemet in se je iztrgal s povodca. | For example: fireworks scared him on a walk and he slipped his lead. | `report_lost.circumstances_placeholder` (P6) |
| Field 2: help | To bo javno vidno. Ne navajajte naslova ali telefonske številke. | This will be public. Do not include your address or phone number. | `report_lost.circumstances_help` (P6) |
| Field 2: error | Opis je predolg. Skrajšajte ga na največ 1000 znakov. | The description is too long. Please shorten it to 1000 characters or fewer. | `report_lost.circumstances_too_long` (P6), `{max}` = 1000 (C4) |
| Field 3: select, label | Regija | Region | `partners.region_label` (P22) |
| Field 3: default value | Vsa Slovenija | All of Slovenia | `partners.region_all` (P22) |
| Field 3: options (listbox or sheet) | Osrednjeslovenska · Gorenjska · Jugovzhodna Slovenija · Primorsko-notranjska | Central Slovenia · Upper Carniola · Southeast Slovenia · Littoral–Inner Carniola | Region names, glossary §3a (the two longest in each language) |
| Field 4: search, label | Iskanje kraja | Search for a place | `location.search_label` (P5) |
| Field 4: placeholder | Ulica s hišno številko ali kraj | Street and house number, or town | `location.search_placeholder` (P5) |
| Field 4: clear button (accessible name) | Počisti iskanje | Clear search | `location.search_clear` (P5) |
| Field 4: loading (live region) | Iščemo … | Searching … | `location.searching` (P5) |
| Field 4: attribution under results | Vir: Geodetska uprava Republike Slovenije, prostorske enote in hišne številke, stanje 15. 10. 2026 (CC BY 4.0) | Source: Surveying and Mapping Authority of the Republic of Slovenia, spatial units and house numbers, as of 15 October 2026 (CC BY 4.0) | `location.search_attribution` (P5), sample date |
| Choice row | Opažena žival · Videli ste žival, ki se je morda izgubila. Brez računa. | Sighted animal · You saw an animal that may be lost. No account needed. | `nav.report_sighted_*` (P1) |
| Segmented control | Pogovori · Obvestila | Conversations · Notifications | `chat.view_conversations`, `chat.view_notifications` (P12); the real two-view switch in the Inbox |
| Switch, disabled with reason | Opozorila v bližini · Obvestila na telefonu so izklopljena. Vse boste našli med sporočili in v e-pošti. | Nearby alerts · Phone notifications are off. You will find everything in your inbox and email. | `alerts.type_nearby` (P13), `permissions.notifications_denied` (P2) |
| Checkbox group, legend | Kako vas obvestimo | How we tell you | `alerts.channels_title` (P13) |
| Checkbox items | Na telefonu · Po e-pošti · V aplikaciji | On the phone · By email · In the app | `alerts.channel_push`, `alerts.channel_email`, `alerts.channel_inapp` (P13) |
| Checkbox, checked and disabled, with reason | V aplikaciji · Možnih ujemanj in sporočil v aplikaciji ni mogoče izklopiti, da ne zamudite česa pomembnega. | In the app · Possible matches and messages in the app cannot be turned off, so you never miss anything important. | `alerts.channel_inapp`, `alerts.locked_note` (P13) |
| Checkbox, disabled, with reason | Po e-pošti · Za obvestila po e-pošti potrdite svoj e-naslov. | By email · Confirm your email address to get email notifications. | `alerts.channel_email`, `alerts.email_unverified` (P13) |
| Single checkbox with help | Blokiraj tudi to osebo · Ne bo vam mogla več pisati. | Also block this person · They will not be able to message you any more. | `abuse.block_label`, `abuse.block_help` (P10) |
| Single checkbox, error | Strinjam se, da me Najdimo kontaktira glede tega povpraševanja. · Za odgovor potrebujemo vaše soglasje. | I agree that Najdimo may contact me about this enquiry. · We need your consent to reply. | `partners.form_consent`, `partners.err_consent` (P22) |
| Radio group, legend | Razlog | Reason | `abuse.reason_label` (P10) |
| Radio items | Prevara ali zahteva po denarju · Lažna prijava · Neželena vsebina · Neprimerna fotografija · Drugo | Scam or asking for money · Fake report · Spam · Inappropriate photo · Other | `abuse.reason_*` (P10) |
| Radio, disabled | (same items, no reason line) | | The product has no disabled radio with a reason. Show the whole group disabled while the form sends; leave out the help line. |
| Button disabled, with reason | Pošlji · Najprej izberite razlog. | Send · Choose a reason first. | `abuse.send`, `abuse.send_disabled_help` (P10) |
| Status words | Izgubljena · Najdena · Opažena · Spet doma | Lost · Found · Sighted · Home again | `browse.status_*` (P4) |
| Pills | Povečan doseg · Preverjeno zavetišče | Boosted · Verified shelter | glossary |

# 2. Surfaces and overlays

| Component | SL sample | EN sample | Source key |
|---|---|---|---|
| Pet row and tile, second line | Pes · Mešanec | Dog · Mixed breed | `pets.row_meta` (P8) with species code `dog` (namespace `attributes`) and breed fallback `mixed` (namespace `breeds`), glossary §7 |
| Note | Nikoli ne pošiljajte denarja vnaprej. Kdor je žival res našel, denarja ne zahteva. | Never send money in advance. A genuine finder does not ask for money. | `report.safety_note` (P9) |
| Toast | Povezava je kopirana. | Link copied. | `common.link_copied` (P1) |
| Dialog | Izbrišete ta profil? · Izbrisali bomo tudi vse fotografije profila. Odprte prijave ostanejo. | Delete this profile? · We will also delete all the profile's photos. Open reports stay as they are. | `pets.delete_title`, `pets.delete_body` (P8) |
| Dialog buttons | Izbriši profil · Prekliči | Delete profile · Cancel | `pets.delete_confirm` (P8), `common.cancel` (P1) |
| Sheet title | Kaj želite prijaviti? | What would you like to report? | `nav.report_menu_title` (P1) |
| Popover menu: button and menu name | Deli ali natisni plakat | Share or print a poster | `report.share_button` (P9) |
| Popover menu: items, in order | Facebook · WhatsApp · Kopiraj povezavo · Plakat s QR kodo | Facebook · WhatsApp · Copy link · Poster with QR code | `share.facebook`, `share.whatsapp`, `share.copy`, `share.poster` (P18) |

# 3. Navigation

| Component | SL sample | EN sample | Source key |
|---|---|---|---|
| Bottom navigation | Zemljevid · Sporočila · Prijavi · Profil | Map · Inbox · Report · Profile | `nav.tab_*` (P2) |
| Flow top bar | Korak 3 od 7 | Step 3 of 7 | `report_lost.step_a11y` (P6) |
| Top bar back button (accessible name) | Nazaj | Back | `common.back` (P1) |

# 4. Feedback

| Component | SL sample | EN sample | Source key |
|---|---|---|---|
| Skeleton (live region) | Nalaganje … | Loading … | `common.loading` (P1) |
| Empty state | V bližini ni odprtih prijav · To je dobra novica. Vklopite opozorila in obvestili vas bomo, če bo kdo v bližini pogrešal žival. | No open reports near you · That is good news. Turn on alerts and we will let you know if someone nearby is missing a pet. | `pages.home.near_empty_*` (P3) |
| Inline error | Tega trenutno ne moremo naložiti. · Poskusi znova | We cannot load this right now. · Try again | `common.inline_error`, `common.inline_error_retry` (P1) |
| Progress bar: uploading | Nalaganje 40 % | Uploading 40% | `photos.uploading` (P6) |
| Progress bar: accessible name | Nalaganje fotografije 1 | Uploading photo 1 | `photos.progress_a11y` (P6) |
| Progress bar: done (live region) | Fotografija je naložena. | Photo uploaded. | `photos.uploaded` (P6) |
| Progress bar: failed | Fotografija se ni naložila. Preverite povezavo in poskusite znova. · Poskusi znova | The photo did not upload. Check your connection and try again. · Try again | `photos.failed_network`, `photos.retry` (P6) |
| Plural sample | 1 prijava · 2 prijavi · 3 prijave · 5 prijav | 1 report · 2 reports | `browse.count` (P4) |

# 5. User-entered sample values

These stand for what users type or what the data holds. They are not UI copy and have no keys.

| Where | SL | EN |
|---|---|---|
| Pet name | Maks | Maks |
| Avatar initials | MŠ | MŠ |
| Filled textarea (field 2) | Med sprehodom ga je prestrašil ognjemet in se je iztrgal s povodca. Plašen je in ne pride na klic. | Fireworks scared him on a walk and he slipped his lead. He is shy and does not come when called. |
| Filled search (field 4) | Šiška | Šiška |
| Filled select (field 3) | Osrednjeslovenska | Central Slovenia |

SEO: N/A (`noindex`, dev only). Alt text: sample pet photos use the P9 §11 rule; map markers per P4.

# Change log

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-10-15 | Product strings for every mockup sample: fields 2–4 (textarea, select, search), disabled reasons, checkbox and radio groups, segmented control, "Prekliči", the share menu, upload progress and failure; new keys `photos.uploaded`, `photos.failed_network`, `photos.progress_a11y`, `report_lost.circumstances_too_long` (P6), `report_found.note_too_long` (P7), `share.poster` (P18). |
| 0.1 | 2026-10-15 | First sample list. |
