---
source: 03§P23; docs/design/pages/P23-ui-kit-gallery.md
page: P23 UI kit gallery (components and states)
stories: TASK-8 (NFR-A11Y)
copy-for: docs/design/pages/P23-ui-kit-gallery.md
version: 0.1
status: Draft (internal page, minimal copy)
date: 2026-10-15
---

# P23 UI kit gallery: copy

Internal reference page, not public, not translated for users. It uses real product strings so the gallery proves the longest Slovenian labels fit. Use these sample strings (keys point to their source slice):

| Component | SL sample | EN sample | Source key |
|---|---|---|---|
| Primary button (long) | Prijavi izgubljeno žival | Report a lost pet | `pages.home.hero_primary` (P3) |
| Secondary button | Vklopi opozorila | Turn on alerts | `pages.home.near_empty_action` (P3) |
| Text button | Ustvari račun in obdrži prijavo | Create an account to keep it | `report_found.create_account` (P7) |
| Destructive | Izbriši profil | Delete profile | `pets.delete_confirm` (P8) |
| Field label and help | Številka čipa (neobvezno) · Običajno ima 15 števk, na primer 705 1234 5678 901. | Chip number (optional) · It usually has 15 digits, for example 705 1234 5678 901. | `report_lost.chip_label`, `report_lost.chip_help` (P6) |
| Field error | Številka čipa je običajno dolga 15 števk. Shranili jo bomo kot neznano, preverite jo, ko boste lahko. | Chip numbers usually have 15 digits. We will save it as unknown; please check it when you can. | `report_lost.chip_warning` (P6) |
| Choice row | Opažena žival · Videli ste žival, ki se je morda izgubila. Brez računa. | Sighted animal · You saw an animal that may be lost. No account needed. | `nav.report_sighted_*` (P1) |
| Status words | Izgubljena · Najdena · Opažena · Spet doma | Lost · Found · Sighted · Home again | `browse.status_*` (P4) |
| Pills | Povečan doseg · Preverjeno zavetišče | Boosted · Verified shelter | glossary |
| Note | Nikoli ne pošiljajte denarja vnaprej. Kdor je žival res našel, denarja ne zahteva. | Never send money in advance. A genuine finder does not ask for money. | `report.safety_note` (P9) |
| Toast | Povezava je kopirana. | Link copied. | `common.link_copied` (P1) |
| Dialog | Izbrišete ta profil? · Izbrisali bomo tudi vse fotografije profila. Odprte prijave ostanejo. | Delete this profile? · We will also delete all the profile's photos. Open reports stay as they are. | `pets.delete_*` (P8) |
| Sheet title | Kaj želite prijaviti? | What would you like to report? | `nav.report_menu_title` (P1) |
| Empty state | V bližini ni odprtih prijav · To je dobra novica. Vklopite opozorila in obvestili vas bomo, če bo kdo v bližini pogrešal žival. | No open reports near you · That is good news. Turn on alerts and we will let you know if someone nearby is missing a pet. | `pages.home.near_empty_*` (P3) |
| Bottom navigation | Zemljevid · Sporočila · Prijavi · Profil | Map · Inbox · Report · Profile | `nav.tab_*` (P2) |
| Flow top bar | Korak 3 od 7 | Step 3 of 7 | `report_lost.step_a11y` (P6) |
| Plural sample | 1 prijava · 2 prijavi · 3 prijave · 5 prijav | 1 report · 2 reports | `browse.count` (P4) |

SEO: N/A (`noindex`, dev only). Alt text: sample pet photos use the P9 §11 rule; map markers per P4.
