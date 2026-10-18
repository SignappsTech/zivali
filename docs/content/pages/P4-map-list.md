---
source: 03§P4; docs/design/pages/P4-map-list.md
page: P4 Map and list
stories: TASK-31 (FR-007, FR-004)
copy-for: docs/design/pages/P4-map-list.md
version: 0.3
status: Draft, native Slovenian review pending
date: 2026-10-18
---

# P4 Map and list: copy

Namespaces `browse` and `map`. Status words and attribute labels come from the glossary (`attributes`, §2 and §7). Plural rules: glossary §8.

# 1. Area pill (mobile) and list header (web)

| Key | SL | EN | Notes |
|---|---|---|---|
| browse.area_pill | {place}, {radius} km | {place}, {radius} km | "Ljubljana, 10 km" |
| browse.area_pill_no_location | Slovenija | Slovenia | When location is unknown and no place chosen |
| browse.area_pill_a11y | Območje: {place}, {radius} km. Odpri filtre | Area: {place}, {radius} km. Open filters | Accessible name |
| browse.sheet_title | V bližini | Near you | h2 in the sheet |
| browse.sheet_handle | Povleci ali tapni za razširitev | Drag or tap to expand | Accessible name of the list sheet's grabber button, which steps through the snap points (mobile; CH-309, from the P4 mockup). Draft, needs native review |
| browse.count | {count, plural, one {# prijava} two {# prijavi} few {# prijave} other {# prijav}} | {count, plural, one {# report} other {# reports}} | Next to the title |
| browse.web_title | Prijave | Reports | Web list pane h1 |
| browse.filters_button | Filtri | Filters | Web pane header |
| browse.filters_summary | {types} · {species} · {when} · {radius} km | {types} · {species} · {when} · {radius} km | Plain text under the header, e.g. "Izgubljene in najdene · psi in mačke · zadnjih 7 dni · 10 km" |
| browse.load_more | Naloži več | Load more | Web keyset pagination |
| browse.show_closed | Pokaži zaključene v zadnjih 30 dneh | Show closed in the last 30 days | End of list |
| browse.hide_closed | Skrij zaključene | Hide closed | |

Summary fragments:

| Key | SL | EN |
|---|---|---|
| browse.summary_all_types | vse prijave | all reports |
| browse.summary_lost | izgubljene | lost |
| browse.summary_found | najdene | found |
| browse.summary_sighted | opažene | sighted |
| browse.summary_join_and | {a} in {b} | {a} and {b} |
| browse.summary_both_species | psi in mačke | dogs and cats |
| browse.summary_dogs | psi | dogs |
| browse.summary_cats | mačke | cats |
| browse.summary_24h | zadnjih 24 ur | last 24 hours |
| browse.summary_7d | zadnjih 7 dni | last 7 days |
| browse.summary_30d | zadnjih 30 dni | last 30 days |

The summary string starts with a capital letter (format the first fragment with an initial capital).

# 2. Rows and tiles

| Key | SL | EN | Notes |
|---|---|---|---|
| browse.row_title_named | {name} | {name} | Pet name when known |
| browse.row_title_lost | {species, select, dog {Izgubljen pes} cat {Izgubljena mačka} other {Izgubljena žival}} | {species, select, dog {Lost dog} cat {Lost cat} other {Lost animal}} | No name |
| browse.row_title_found | {species, select, dog {Najden pes} cat {Najdena mačka} other {Najdena žival}} | {species, select, dog {Found dog} cat {Found cat} other {Found animal}} | |
| browse.row_title_sighted | {species, select, dog {Opažen pes} cat {Opažena mačka} other {Opažena žival}} | {species, select, dog {Sighted dog} cat {Sighted cat} other {Sighted animal}} | |
| browse.row_meta | {status} · {time} | {status} · {time} | Time from `formatRelative` ("pred 2 urama") |
| browse.row_distance | {band} | {band} | From `formatDistanceBand` ("1–3 km") |
| browse.row_a11y | {title}, {status}, {time}, {distance} | {title}, {status}, {time}, {distance} | Accessible name of the row link |
| browse.boosted | Povečan doseg | Boosted | M4 pill under the status word |
| browse.status_lost | Izgubljena | Lost | Status word |
| browse.status_found | Najdena | Found | |
| browse.status_sighted | Opažena | Sighted | |
| browse.status_reunited | Spet doma | Home again | |
| browse.status_closed | Zaključeno | Closed | |

# 3. Sort

| Key | SL | EN |
|---|---|---|
| browse.sort_label | Razvrsti | Sort |
| browse.sort_nearest | Najbližje | Nearest |
| browse.sort_newest | Najnovejše | Newest |

# 4. Filter sheet and drawer

| Key | SL | EN |
|---|---|---|
| browse.filters_title | Filtri | Filters |
| browse.filters_reset | Ponastavi | Reset |
| browse.filter_type | Vrsta prijave | Report type |
| browse.filter_type_lost | Izgubljene | Lost |
| browse.filter_type_found | Najdene | Found |
| browse.filter_type_sighted | Opažene | Sighted |
| browse.filter_species | Žival | Animal |
| browse.filter_dogs | Psi | Dogs |
| browse.filter_cats | Mačke | Cats |
| browse.filter_when | Kdaj | When |
| browse.filter_24h | Zadnjih 24 ur | Last 24 hours |
| browse.filter_7d | Zadnjih 7 dni | Last 7 days |
| browse.filter_30d | Zadnjih 30 dni | Last 30 days |
| browse.filter_distance | Razdalja | Distance |
| browse.filter_distance_value | {km} km | {km} km |
| browse.filter_use_location | Uporabi mojo lokacijo | Use my location |
| browse.filter_place | Kraj | Place |
| browse.filter_place_search | Poiščite kraj | Search for a place |
| browse.filter_more | Več filtrov | More filters |
| browse.filter_colour | Barva | Colour |
| browse.filter_size | Velikost | Size |
| browse.filter_size_small | Majhna | Small |
| browse.filter_size_medium | Srednja | Medium |
| browse.filter_size_large | Velika | Large |
| browse.filters_apply | {count, plural, one {Prikaži # prijavo} two {Prikaži # prijavi} few {Prikaži # prijave} other {Prikaži # prijav}} | {count, plural, one {Show # report} other {Show # reports}} |
| browse.filters_close | Zapri filtre | Close filters |
| browse.location_denied_note | Lokacija ni dovoljena, zato prikazujemo {place}. Kraj lahko izberete sami. | Location access is off, so we are showing {place}. You can choose the place yourself. |

Size pills here group the five sizes: Majhna = xs and s, Srednja = m, Velika = l and xl. Colour pills use the glossary §7.2 labels.

Live region when the count changes (polite):

| Key | SL | EN |
|---|---|---|
| browse.count_announce | {count, plural, one {Najdena je # prijava} two {Najdeni sta # prijavi} few {Najdene so # prijave} other {Najdenih je # prijav}} | {count, plural, one {# report found} other {# reports found}} |

# 5. Map

| Key | SL | EN |
|---|---|---|
| map.text_alternative | Zemljevid prijav v okolici kraja {place}. Vse prijave so naštete v seznamu. | Map of reports around {place}. All reports are listed in the list. |
| map.marker_a11y | {title}, {status} | {title}, {status} |
| map.cluster_a11y | {count, plural, one {# prijava na tem območju} two {# prijavi na tem območju} few {# prijave na tem območju} other {# prijav na tem območju}}. Povečaj | {count, plural, one {# report in this area} other {# reports in this area}}. Zoom in |
| map.lost_area_a11y | Približno območje, kjer je bila žival nazadnje videna | Approximate area where the pet was last seen |
| map.preview_open | Odpri | Open |
| map.attribution | © OpenFreeMap © OpenMapTiles, podatki © sodelavci OpenStreetMap | © OpenFreeMap © OpenMapTiles, data © OpenStreetMap contributors |
| map.loading | Nalagamo zemljevid … | Loading the map … |
| map.a11y_label | Zemljevid: {count, plural, one {# prijava} two {# prijavi} few {# prijave} other {# prijav}} | Map: {count, plural, one {# report} other {# reports}} |
| map.list_show | Pokaži seznam | Show list |
| map.list_hide | Pokaži zemljevid | Show map |
| map.tiles_error | Zemljevida ta trenutek ni mogoče naložiti. Prijave so v seznamu. | The map cannot load right now. Reports are in the list. |

Mobile list toggle (C6 accessible list toggle, CH-277, TASK-15.4), draft, needs native review: `map.a11y_label` is the map's accessible name; `map.list_show` is the hint on the toggle that opens the list; `map.list_hide` is the button label that closes the list and returns to the map.

Attribution text: confirm the exact wording required by OpenFreeMap at build time. Place search is our own geocoder on GURS data (ADR-007), so its attribution is the GURS line `location.search_attribution` (P5), not MapTiler.

# 6. States

| State | Key | SL | EN |
|---|---|---|---|
| Empty region | browse.empty_title | Tu ni odprtih prijav | No open reports here |
| | browse.empty_body | V tem območju trenutno nihče ne pogreša živali. Če ste izgubili ali našli žival, jo prijavite. Lahko pa vklopite opozorila za svojo okolico. | Nobody in this area is missing a pet right now. If you have lost or found an animal, report it. Or turn on alerts for your area. |
| | browse.empty_primary | Prijavi | Report |
| | browse.empty_secondary | Vklopi opozorila | Turn on alerts |
| No match for filters | browse.no_match | Nobena prijava ne ustreza izbranim filtrom. | No reports match these filters. |
| | browse.no_match_action | Ponastavi filtre | Reset filters |
| Error | browse.error | Prijav ta trenutek ne moremo naložiti. Na zemljevidu so zadnje znane. | We cannot load reports right now. The map shows the last ones we had. |
| | browse.error_action | Poskusi znova | Try again |
| Loading | browse.loading | Nalagamo prijave v bližini … | Loading reports nearby … |

Offline states on mobile (CH-317, TASK-85.3), draft, native review pending:

| State | Key | SL | EN |
|---|---|---|---|
| Offline, cached area | browse.offline_note | Brez povezave, zadnja posodobitev {time}. | Offline, last updated {time}. |
| Offline, rows saved while browsing | browse.offline_note_saved | Brez povezave. Prikazujemo shranjene prijave. | Offline. Showing saved reports. |
| First launch offline, title | errors.offline_title (P1) | Ni povezave z internetom | No internet connection |
| First launch offline, body | browse.offline_empty_body | Prijave v bližini shranimo v telefon, ko ste na spletu. Potem jih vidite tudi brez povezave. | We save reports near you on this phone while you are online, so you can see them offline too. |

`{time}` is "14:20" when the update was today, otherwise "12. 10., 14:20" (EN "12 Oct, 14:20"). `browse.offline_note_saved` is for rows saved while browsing before an area sync has run.

# 7. SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Zemljevid izgubljenih in najdenih živali · Najdimo | Map of lost and found pets · Najdimo |
| Meta description | Izgubljeni in najdeni psi in mačke na zemljevidu Slovenije. Izberite kraj, vrsto in čas ter pomagajte, da se živali vrnejo domov. | Lost and found dogs and cats on a map of Slovenia. Choose a place, type and time, and help animals get home. |
| Focus keyword | izgubljeni psi in mačke | lost dogs and cats Slovenia |
| Slug | `/zemljevid` | `/en/map` |
| Structured data | `CollectionPage` with an `ItemList` of the first 20 open, visible reports (`url`, `name` = row title) + `BreadcrumbList` | same |
| Indexing | Base URL indexable. Filtered URLs (query parameters) carry `rel=canonical` to the base URL. Regional landing pages come in M5 (TASK-72). | same |

# 8. Alt text

| Image | Rule |
|---|---|
| Row and tile photo | Generated from attributes, as defined in P9 §Alt text (for example "Pes rjave in bele barve z rdečo ovratnico"). |
| Marker avatar | `alt=""`; the marker's accessible name is `map.marker_a11y`. |
| Empty-state illustration `assets/empty-no-reports.png` | Decorative, `alt=""`. |

# Change log

| Version | Date | Change |
|---|---|---|
| 0.3 | 2026-10-18 | CH-277: map list-toggle keys. CH-309: `browse.sheet_handle`. CH-317: offline states. |
