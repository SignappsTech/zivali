---
source: 03§P5; docs/design/pages/P5-location-picker.md
page: P5 Location picker and privacy-preserving area
stories: TASK-15 (FR-004)
copy-for: docs/design/pages/P5-location-picker.md
version: 0.1
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P5 Location picker: copy

Namespace `location`. Used inside P6, P7, P13 and the profile. Area names come from geocoding and are inserted in the nominative ("Območje: Šiška") so no declension is needed.

# 1. Heading per context (h1)

| Key | SL | EN |
|---|---|---|
| location.title_lost | Kje ste žival nazadnje videli? | Where did you last see your pet? |
| location.title_found | Kje ste žival našli? | Where did you find the animal? |
| location.title_sighted | Kje ste žival videli? | Where did you see the animal? |
| location.title_alert | Za katero območje želite opozorila? | Which area would you like alerts for? |
| location.title_home | Izberite domače območje | Choose your home area |

# 2. Search

| Key | SL | EN |
|---|---|---|
| location.search_label | Iskanje kraja | Search for a place |
| location.search_placeholder | Ulica, kraj ali znamenitost | Street, town or landmark |
| location.result_line | {place}, {municipality} | {place}, {municipality} |
| location.searching | Iščemo … | Searching … |
| location.no_results | Tega kraja ne najdemo. Poskusite z drugim imenom ali premaknite zemljevid na pravo mesto. | We cannot find that place. Try another name or move the map to the right spot. |
| location.search_clear | Počisti iskanje | Clear search |

# 3. Map and pin

| Key | SL | EN |
|---|---|---|
| location.pin_a11y | Oznaka je na sredini zemljevida. Premaknite zemljevid, da jo postavite na pravo mesto. | The pin is in the centre of the map. Move the map to put it in the right place. |
| location.address_loading | Iščemo naslov … | Finding the address … |
| location.address_unknown | Kraj brez imena | Unnamed place |
| location.use_my_location | Uporabi mojo lokacijo | Use my location |
| location.locating | Določamo vašo lokacijo … | Finding your location … |
| location.keyboard_hint | Zemljevid premikate s puščicami, povečate s tipko + in pomanjšate s tipko −. | Move the map with the arrow keys, zoom in with + and out with −. |
| location.nudge_show | Pokaži gumbe za premik | Show move buttons |
| location.nudge_north | Premakni za 100 m proti severu | Move 100 m north |
| location.nudge_south | Premakni za 100 m proti jugu | Move 100 m south |
| location.nudge_east | Premakni za 100 m proti vzhodu | Move 100 m east |
| location.nudge_west | Premakni za 100 m proti zahodu | Move 100 m west |
| location.zoom_in | Povečaj | Zoom in |
| location.zoom_out | Pomanjšaj | Zoom out |

# 4. Radius

Lost reports (200 m to 5 km, default 500 m):

| Key | SL | EN |
|---|---|---|
| location.radius_label | Območje iskanja | Search area |
| location.radius_value | Polmer {value} | Radius {value} |
| location.radius_help | Izberite večje območje, če se je žival morda oddaljila. | Choose a larger area if your pet may have wandered further. |
| location.radius_large_warning | Zelo veliko območje zmanjša natančnost ujemanj. | A very large area makes matches less precise. |
| location.radius_number_label | Polmer v metrih | Radius in metres |

Alert area (1 to 25 km, default 5 km):

| Key | SL | EN |
|---|---|---|
| location.alert_radius_label | Polmer opozoril | Alert radius |
| location.alert_radius_value | {km} km | {km} km |
| location.alert_radius_help | Obvestimo vas o izgubljenih živalih znotraj tega območja. | We will tell you about lost pets within this area. |

`{value}` comes from a formatter: under 1000 m in metres ("500 m"), otherwise kilometres with one decimal in SL ("1,5 km") and EN ("1.5 km").

# 5. Privacy line and confirm

| Key | SL | EN |
|---|---|---|
| location.privacy_lost | Javno prikažemo le približno območje, najmanj 500 m okoli oznake. | We only show an approximate area in public, at least 500 m around the pin. |
| location.privacy_found | Javno prikažemo le približno območje. Ne sprašujemo, kje je žival zdaj. | We only show an approximate area in public. We never ask where the animal is now. |
| location.privacy_alert | Vaše domače območje vidite samo vi. | Only you can see your home area. |
| location.privacy_info_button | Kdo vidi ta kraj? | Who can see this place? |
| location.confirm | Potrdi kraj | Confirm location |
| location.save_area | Shrani območje | Save area |

# 6. States

| Key | SL | EN |
|---|---|---|
| location.gps_denied | Vaše lokacije nismo mogli dobiti. Kraj poiščite ali premaknite zemljevid. | We could not get your location. Search for the place or move the map. |
| location.outside_si | Ta kraj je zunaj Slovenije. Prijavo lahko oddate, vendar Najdimo zdaj deluje le v Sloveniji, zato jo bo videlo manj ljudi. | This place is outside Slovenia. You can still send the report, but Najdimo only works in Slovenia for now, so fewer people will see it. |
| location.offline | Zemljevida ni mogoče naložiti. Kraj lahko izberete, ko boste spet povezani. Osnutek je shranjen. | The map cannot load. You can choose the place once you are back online. Your draft is saved. |
| location.offline_retry | Poskusi znova | Try again |

# 7. Fuzzed public area (display component)

| Key | SL | EN | Notes |
|---|---|---|---|
| location.area_line | Območje: {area}, približno {radius} | Area: {area}, about {radius} | "Območje: Šiška, približno 500 m" |
| location.area_note | Prikazano območje je približno. | The area shown is approximate. | One sentence under the area line |
| location.area_map_alt | Približno območje okoli kraja {area}, polmer približno {radius} | Approximate area around {area}, radius about {radius} | Text alternative of the small map |
| location.exact_own | Vidno samo vam | Visible only to you | Label on the owner's or reporter's exact pin |

# 8. SEO and alt text

N/A: a component inside flows (not indexed). The map has the text alternative above; there are no content images.
