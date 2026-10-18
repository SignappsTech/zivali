---
source: 03§P9; docs/design/pages/P9-report-detail.md; 02§FR-007 R-007.4, §Content, SEO and legal requirements (SEO)
page: P9 Report detail (lost, found, sighted)
stories: TASK-18, TASK-72 (FR-007, FR-004, FR-011, FR-012)
copy-for: docs/design/pages/P9-report-detail.md
version: 0.6
status: Draft, native Slovenian review pending
date: 2026-10-18
---

# P9 Report detail: copy

Namespace `report`. The detail page is the main SEO landing page and link-preview surface, so it carries the dynamic title, description, structured data and alt-text rules for every listing (§10 to §12). Row titles (`browse.row_title_*`), status words (`browse.status_*`) and attribute labels come from P4 and the glossary. Pet names, areas and municipalities are inserted in the nominative only.

# 1. Header and facts

| Key | SL | EN | Notes |
|---|---|---|---|
| report.back | Nazaj na zemljevid | Back to the map | Web back text button |
| report.since_lost | Pogrešana od {date} | Missing since {date} | Under the status word |
| report.since_found | Najdena {date} | Found {date} | |
| report.since_sighted | Opažena {date} | Sighted {date} | |
| report.title_named | {name} | {name} | h1 when a name exists |
| report.subtitle | {species} · {breed} | {species} · {breed} | "Pes · Mešanec"; append " · {sex}" when known |
| report.fact_colour | Barva | Colour | |
| report.fact_size | Velikost | Size | |
| report.fact_collar | Ovratnica | Collar | Owner sees their own text |
| report.collar_described | opisana | described | Public value of the "Ovratnica" fact: the public read model has only `collar_described`, so visitors see "Ovratnica: opisana" and never the text (CH-308a). Show the row only when `collar_described` is true; the description stays a check for the owner to ask about |
| report.photo_alt_fallback | Fotografija prijavljene živali | Photo of the reported animal | Alt text when a report has no attributes to build one from (§11) |
| report.fact_chip | Čip | Microchip | |
| report.chip_on_file | Čip vpisan | Chip on file | Never the number |
| report.chip_unknown | Ni podatka | Not known | |
| report.fact_sex | Spol | Sex | |
| report.fact_born | Leto rojstva | Year of birth | |
| report.area_line | Območje: {area} | Area: {area} | Bold area name |
| report.area_note | Prikazano območje je približno. | The area shown is approximate. | |
| report.posted_by | Objavlja: {display_name} | Posted by {display_name} | Signed-in reporter with a display name |
| report.posted_by_finder | Prijavila oseba, ki je žival našla | Reported by the person who found it | Anonymous found report |
| report.posted_by_sighter | Prijavila oseba, ki je žival videla | Reported by someone who saw it | Anonymous sighted report |
| report.verified_shelter | Preverjeno zavetišče | Verified shelter | Pill (M3), followed by the shelter name |

H1 without a name: `browse.row_title_lost|found|sighted` (P4).

Animal in a shelter (shelter report, M3; v0.3):

| Key | SL | EN | Notes |
|---|---|---|---|
| report.shelter_since | V zavetišču od {date} | In the shelter since {date} | `{date}` as "13. oktobra" / "13 October"; with the year when it is not the current year |
| report.shelter_call | Pokliči zavetišče | Call the shelter | Web: `secondary` with the number beside it (`tabular-nums`); mobile: the action bar text button, no number printed |
| report.shelter_call_a11y | Pokliči {shelter} | Call {shelter} | Accessible name of the call button |

The shelter card (web; a plain block on mobile) shows `report.verified_shelter`, the shelter name and place from the shelter directory, `report.shelter_since` and the call. No countdown and no days-left count. A holding-period sentence appears under the date only when `content.legal_timings` is on, with the wording the lawyer confirms (Q-006, lawyer pack LQ-06); there is no string for it until then. "Sporoči opažanje" is hidden while the animal is in a shelter; "To je moja žival" stays the primary.

# 2. Actions (slot A)

| Key | SL | EN | Used on |
|---|---|---|---|
| report.action_sighting | Sporoči opažanje | Report a sighting | Lost (primary), found (text) |
| report.action_message | Pošlji sporočilo | Send a message | Lost (text), sighted (primary) |
| report.action_mine | To je moja žival | This is my animal | Found (primary), sighted (text) |
| report.reward_line | Nagrada | Reward offered | M4, lost reports only, when the owner set a note but no amount; gift icon |
| report.reward_line_amount | Nagrada: {amount} | Reward offered: {amount} | Same, with an amount; `{amount}` as currency in the page language ("50 €" / "€50") |
| report.contact_limited | Danes ste dosegli omejitev sporočil. Poskusite znova jutri. | You have reached today's message limit. Try again tomorrow. | Slot A note when C9 answers RATE_LIMITED (10 contacts a day), replacing `errors.RATE_LIMITED_generic` there (CH-471). Draft, needs native review |

# 3. Safety note, share and more

| Key | SL | EN |
|---|---|---|
| report.safety_note | Nikoli ne pošiljajte denarja vnaprej. Kdor je žival res našel, denarja ne zahteva. | Never send money in advance. A genuine finder does not ask for money. |
| report.safety_note_reward | Nikoli nikomur ne plačajte vnaprej. Nagrado lastnik izroči šele, ko je žival spet doma. Najdimo nagrad ne izplačuje. | Never pay anyone in advance. The owner hands over the reward only once the animal is home. Najdimo does not pay rewards. |
| report.safety_link | Nasveti za varnost | Safety tips |
| report.share_button | Deli ali natisni plakat | Share or print a poster |
| report.share_copy | Kopiraj povezavo | Copy link |
| report.share_whatsapp | WhatsApp | WhatsApp |
| report.share_facebook | Facebook | Facebook |
| report.share_poster | Plakat s QR kodo | Poster with QR code |
| report.more | Več možnosti | More options |
| report.more_abuse | Prijavi zlorabo | Report abuse |
| report.more_copy | Kopiraj povezavo | Copy link |

Reward (v0.2, brief v1.1: display only, no escrow). The owner's note (`reward_note`, up to 80 characters, C4) follows the line after " · ", as typed: "Nagrada: 100 € · tudi za podatek, ki pomaga pri iskanju". It is user text: never translated, never a link. When a reward line is shown, `report.safety_note_reward` replaces `report.safety_note`, so the page still has one safety note, placed right under the reward line. Without a reward the note stays `report.safety_note`.

# 4. Sections below

| Key | SL | EN |
|---|---|---|
| report.about_lost | Kaj se je zgodilo | What happened |
| report.about_other | Opomba | Note |
| report.where_title | Kje je bila videna | Where it was seen |
| report.sightings_title | Opažanja | Sightings |
| report.sighting_item | {time} · {area} | {time} · {area} |
| report.sightings_empty | Opažanj še ni. Ste žival videli? Sporočite nam. | No sightings yet. Have you seen this animal? Let us know. |
| report.nearby_title | V bližini | Nearby |
| report.map_open | Odpri zemljevid | Open the map |

The ad slot between "Kje je bila videna" and "V bližini" uses P21 copy.

# 5. Owner view

| Key | SL | EN |
|---|---|---|
| report.owner_home | Žival je spet doma | Pet is home again |
| report.owner_edit | Uredi | Edit |
| report.owner_poster | Plakat | Poster |
| report.owner_close | Zaključi iskanje | Close search |
| report.owner_boost | Povečaj doseg | Boost |
| report.owner_matches | {count, plural, one {# možno ujemanje} two {# možni ujemanji} few {# možna ujemanja} other {# možnih ujemanj}} | {count, plural, one {# possible match} other {# possible matches}} |
| report.owner_matches_link | Poglej | View |
| report.owner_held | Prijava je v pregledu, zato je drugi še ne vidijo. Pregledamo jo čim prej. | Your report is under review, so others cannot see it yet. We will check it as soon as we can. |
| report.owner_hidden | Več ljudi je prijavo označilo kot sporno, zato je skrita, dokler je ne pregleda naša ekipa. | Several people flagged this report, so it is hidden until our team reviews it. |
| report.owner_hidden_contact | Pišite podpori | Contact support |
| report.owner_disagree | Oseba, ki je žival našla, jo je označila kot vrnjeno. Če žival ni doma, iskanje v {days, plural, one {# dnevu} two {# dneh} few {# dneh} other {# dneh}} ponovno odprite. | The person who found the animal marked it as returned. If your pet is not home, reopen the search within {days, plural, one {# day} other {# days}}. |
| report.owner_reopen | Ponovno odpri | Reopen |
| report.owner_reward_note | Nagrado izročite šele, ko je žival spet pri vas. Nikoli nikomur ne plačajte vnaprej, tudi ne za prevoz ali „stroške“. | Hand over the reward only once your pet is back with you. Never pay anyone in advance, not even for transport or "costs". |

Responsible shelter row in the owner view of a lost report (FR-044, v0.3): `shelter_row.title` (P6) as the label, the shelter name in bold and the call. Web: the number (`tabular-nums`) with `shelter_row.call`; mobile: `report.shelter_call`, no number printed. No municipality or no confirmed shelter: `shelter_row.unknown_municipality` or `shelter_row.unconfirmed` with `shelter_row.directory_link`.

`report.owner_boost` is hidden until M4. Owner pin label: `location.exact_own` ("Približna lokacija · vidno samo vam") with help text `location.exact_own_help` (P5; the stored point is coarsened by 20–30 m). In the owner view the reward line keeps its place and `report.owner_reward_note` replaces the public safety note; the owner changes or removes the reward with "Uredi" (P6 step 6). This follows the design slice §Web layout 6–7 (display-only reward line, one safety note below it).

# 6. Status variants

| Key | SL | EN |
|---|---|---|
| report.reunited_named | {name} je spet doma. Hvala vsem, ki ste pomagali. | {name} is home again. Thank you to everyone who helped. |
| report.reunited | Žival je spet doma. Hvala vsem, ki ste pomagali. | This animal is home again. Thank you to everyone who helped. |
| report.closed | Iskanje je zaključeno. | This search is closed. |

Removed, expired or hidden (public view): 410 page, `errors.page_410_*` (P1).

# 7. Contact gate

| Key | SL | EN |
|---|---|---|
| report.gate_title | Za pogovor potrebujete račun | You need an account to message |
| report.gate_body | Tako vaša telefonska številka ostane skrita, sporočila pa na varnem. Najdeno ali opaženo žival lahko prijavite tudi brez računa. | That way your phone number stays hidden and your messages stay safe. You can report a found or sighted animal without an account. |
| report.gate_unverified | Za pogovor najprej potrdite svoj e-naslov. | Please confirm your email address before messaging. |

Buttons: P16 gate.

# 8. Gallery and mobile controls

| Key | SL | EN |
|---|---|---|
| report.photo_prev | Prejšnja fotografija | Previous photo |
| report.photo_next | Naslednja fotografija | Next photo |
| report.photo_position | {n} / {total} | {n} / {total} |
| report.photo_thumb | Pokaži fotografijo {n} | Show photo {n} |
| report.photo_failed | Fotografije ni mogoče naložiti. | This photo cannot be loaded. |
| report.mobile_back | Nazaj | Back |
| report.mobile_share | Deli | Share |

# 9. States

| State | Copy |
|---|---|
| Loading | `common.loading` (P1) |
| Map offline | Area line only: `report.area_line` + `report.area_note` |
| Offline, saved copy (v0.3) | `report.offline_cached`: "Brez povezave. Prikazujemo shranjeno različico ({time})." / "You are offline. Showing the saved copy ({time})." `{time}` is "14.05" / "14:05" for today, otherwise "12. 10., 14.05" / "12 Oct, 14:05". A `note` with the `wifi-slash` icon at the top of the page; actions that need the network stay visible and explain themselves when tapped (`errors.offline_*`, P1). |
| Network error | `common.inline_error`, `common.try_again` (P1) |

# 10. SEO (dynamic, per report)

Indexable only while the report is open and visible. Reunited or closed within 30 days: page shown with `noindex`. Hidden, removed, or closed for more than 30 days: 410 with `noindex` (FR-007 AC#3).

**Meta title** (`{municipality}` = občina name; the suffix comes from the template):

| Type | SL | EN |
|---|---|---|
| Lost | {species, select, dog {Izgubljen pes} cat {Izgubljena mačka} other {Izgubljena žival}} {name} – {municipality} · Najdimo | {species, select, dog {Lost dog} cat {Lost cat} other {Lost pet}} {name} – {municipality} · Najdimo |
| Found | {species, select, dog {Najden pes} cat {Najdena mačka} other {Najdena žival}} – {municipality} · Najdimo | {species, select, dog {Found dog} cat {Found cat} other {Found animal}} – {municipality} · Najdimo |
| Sighted | {species, select, dog {Opažen pes} cat {Opažena mačka} other {Opažena žival}} – {municipality} · Najdimo | {species, select, dog {Sighted dog} cat {Sighted cat} other {Sighted animal}} – {municipality} · Najdimo |

Length rule (60): if the title is longer, drop `{name}`; if still longer, drop " · Najdimo". Names are cut to 16 characters.

**Meta description** (155): build the sentences in order and stop before the one that would exceed 155 characters. `{colours}` is the glossary §7.2 phrase ("rjave in bele barve"); omit it with its comma when unknown. `{date}` is the long date ("12. oktobra").

| Type | SL | EN |
|---|---|---|
| Lost | {species, select, dog {Pogrešan pes {name}, {colours}. Nazadnje viden {date} v okolici kraja {area}, {municipality}. Ste ga videli? Sporočite opažanje.} cat {Pogrešana mačka {name}, {colours}. Nazadnje videna {date} v okolici kraja {area}, {municipality}. Ste jo videli? Sporočite opažanje.} other {Pogrešana žival {name}, {colours}. Nazadnje videna {date} v okolici kraja {area}, {municipality}. Ste jo videli? Sporočite opažanje.}} | {species, select, dog {Missing dog {name}, {colours}. Last seen on {date} around {area}, {municipality}. Have you seen this dog? Report a sighting.} cat {Missing cat {name}, {colours}. Last seen on {date} around {area}, {municipality}. Have you seen this cat? Report a sighting.} other {Missing pet {name}, {colours}. Last seen on {date} around {area}, {municipality}. Have you seen it? Report a sighting.}} |
| Found | {species, select, dog {Najden pes, {colours}, {date} v okolici kraja {area}, {municipality}. Je to vaš pes? Pišite osebi, ki ga je našla.} cat {Najdena mačka, {colours}, {date} v okolici kraja {area}, {municipality}. Je to vaša mačka? Pišite osebi, ki jo je našla.} other {Najdena žival, {colours}, {date} v okolici kraja {area}, {municipality}. Je to vaša žival? Pišite osebi, ki jo je našla.}} | {species, select, dog {Found dog, {colours}, on {date} around {area}, {municipality}. Is this your dog? Message the person who found it.} cat {Found cat, {colours}, on {date} around {area}, {municipality}. Is this your cat? Message the person who found it.} other {Found animal, {colours}, on {date} around {area}, {municipality}. Is this your pet? Message the person who found it.}} |
| Sighted | {species, select, dog {Opažen pes, {colours}, {date} v okolici kraja {area}, {municipality}. Je to vaš pes? Poglejte prijavo.} cat {Opažena mačka, {colours}, {date} v okolici kraja {area}, {municipality}. Je to vaša mačka? Poglejte prijavo.} other {Opažena žival, {colours}, {date} v okolici kraja {area}, {municipality}. Je to vaša žival? Poglejte prijavo.}} | {species, select, dog {Dog seen, {colours}, on {date} around {area}, {municipality}. Is this your dog? See the report.} cat {Cat seen, {colours}, on {date} around {area}, {municipality}. Is this your cat? See the report.} other {Animal seen, {colours}, on {date} around {area}, {municipality}. Is this your pet? See the report.}} |

Keys (CH-411, copy verbatim): `report.seo_description_lost`, `report.seo_description_found`, `report.seo_description_sighted` for the three descriptions above; the colour phrase is `report.seo_colours` (SL "{colours} barve", EN "{colours}") with one `report.seo_colour.<code>` per colour (SL genitive, "rjave"; EN "brown"; EN `red` = "red", aligned with the alt text, CH-416). The meta title and the OG alt reuse `browse.row_title_*` (P4). A missing value drops its part (", {colours}", " {name}") or the sentence that names the area.

Example (SL, lost dog): "Pogrešan pes Rex, rjave in bele barve. Nazadnje viden 12. oktobra v okolici kraja Šiška, Ljubljana. Ste ga videli? Sporočite opažanje." (134 characters)

**Other fields**

| Field | Value |
|---|---|
| Focus keyword | `{type} {species} {municipality}`, e.g. "izgubljen pes Ljubljana", "najdena mačka Maribor" / "lost dog Ljubljana" |
| Slug | `/r/{code}` (SL) and `/en/r/{code}` (EN), `hreflang` pair, canonical per language |
| Open Graph | `og:title` = meta title without the suffix; `og:description` = meta description; `og:image` = `/r/{code}/opengraph-image`; `og:image:alt` per §11 |
| Structured data | `Article`: `headline` = h1 title, `image` = public photo URLs, `datePublished` = created, `dateModified` = updated, `author` and `publisher` = Organization Najdimo, `contentLocation` = `Place` with `name` "{area}, {municipality}" and **no** `geo` or address, `inLanguage`, `isAccessibleForFree: true`. Plus `BreadcrumbList` (Najdimo › Zemljevid › title). Never chip number, exact point or contact data. |

# 11. Alt text rules (all report photos, also used by P4, P11, P14, P18)

Built from attributes. Colours use the invariant phrase "… barve" so the sentence never depends on species gender.

| Part | SL | EN |
|---|---|---|
| Name prefix (when known) | `{name}: ` | `{name}: ` |
| Species | pes / mačka / žival | dog / cat / animal |
| Colours | ` {colours} barve` ("rjave in bele barve") | colours before the noun ("brown and white dog") |
| Pattern | pattern phrase from glossary §7.3 (", s progastim vzorcem") | ", tabby" etc. |
| Area (API alt) | `, {municipality}` after species, colours and pattern (nominative; `name_sl`/`name_en` of the fuzzed circle's municipality, already public as `municipality_slug`) | `, {municipality}` |
| Collar (owner and manager views only) | `, ovratnica: {collar}` (owner's text, nominative after the colon) | `, collar: {collar}` |
| Extra photos | `, fotografija {n} od {total}` | `, photo {n} of {total}` |

Examples: "Rex: pes rjave in bele barve, ovratnica: rdeča z zvončkom" / "Rex: brown and white dog, collar: red with a bell". "Mačka sive barve, s progastim vzorcem, fotografija 2 od 3" / "Grey tabby cat, photo 2 of 3". API alt (public photos, TASK-14.6) adds the area and leaves the collar out, because the collar text is manager-only in C4 (PublicReport has `collar_described` only): "Piki: pes rjave in bele barve, Ljubljana, fotografija 1 od 2" / "Grey tabby cat, Ljubljana". EN `red` is "red" here and in the SEO colour key (CH-416). No attributes: "Fotografija prijavljene živali" / "Photo of the reported animal", the key `report.photo_alt_fallback` (CH-308b); this fallback cannot occur on the API alt, because species is required. The offline cached thumbnail (mobile) builds its alt from this rule and uses `report.photo_alt_fallback` when the cached row has no attributes; it no longer reuses the h1 title.

OG image alt: "{type and species} {name}, {municipality}", for example "Izgubljen pes Rex, Ljubljana" / "Lost dog Rex, Ljubljana".

# Change log

| Version | Date | Change |
|---|---|---|
| 0.5 | 2026-10-18 | CH-308: public collar value `report.collar_described`, key `report.photo_alt_fallback`. (c) The `report` namespace (§1 to §9), `browse` status_* and row_title_* (P4) and `location.area_line`, `area_note`, `area_map_alt`, `exact_own`, `exact_own_help` (P5) were added to packages/i18n verbatim from the slices; nothing to change here. |
| 0.5 | 2026-10-18 | CH-268: `report.owner_disagree` takes `{days}` (reopen window, default 7). |
| 0.6 | 2026-10-18 | CH-411: SEO key names (§10). CH-416: area in the API alt, no collar in public alt, EN red (§11). CH-471: `report.contact_limited` (§2). |
