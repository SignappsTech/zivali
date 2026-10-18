---
source: 03§P11; docs/design/pages/P11-match-review.md
page: P11 Match review
stories: TASK-20 (FR-008)
copy-for: docs/design/pages/P11-match-review.md
version: 0.2
status: Draft, native Slovenian review pending
date: 2026-10-18
---

# P11 Match review: copy

Namespace `matches`. The emotional peak of the product: honest and calm. No percentages, no "Našli smo vašega psa", no celebration. The owner decides. Reasons come from C8 (`chip`, `chip_sighting`, `distance` band, `time` hours band, `size`, `colour` overlap, `sex`).

# 1. Matches list

| Key | SL | EN |
|---|---|---|
| matches.title | Možna ujemanja | Possible matches |
| matches.count | {count, plural, one {# možno ujemanje} two {# možni ujemanji} few {# možna ujemanja} other {# možnih ujemanj}} | {count, plural, one {# possible match} other {# possible matches}} |
| matches.row_found | Najdena | Found |
| matches.row_sighted | Opažena | Sighted |
| matches.row_place | {area} · {distance} | {area} · {distance} |
| matches.row_gap | Prijavljena {gap} po izgubi | Reported {gap} after going missing |
| matches.gap_lt24 | manj kot 24 ur | less than 24 hours |
| matches.gap_24to72 | 1–3 dni | 1–3 days |
| matches.gap_gt72 | več kot 3 dni | more than 3 days |
| matches.strength_strong | Zelo verjetno | Very likely |
| matches.strength_good | Verjetno | Likely |
| matches.strength_possible | Mogoče | Possible |
| matches.strength_a11y | Moč ujemanja: {strength} | Match strength: {strength} |
| matches.chip_row | Številka čipa se ujema | Chip number matches |
| matches.confirmed | Ujemanje potrjeno | Match confirmed |
| matches.open_chat | Odpri pogovor | Open conversation |
| matches.refresh | Povlecite za osvežitev | Pull to refresh |

Empty state:

| Key | SL | EN |
|---|---|---|
| matches.empty_title | Ujemanj še ni | No matches yet |
| matches.empty_body | Iskanje teče naprej. Vsako novo prijavo primerjamo z vašo in vas obvestimo, ko bo kaj podobnega. | Your search is still running. We compare every new report with yours and will let you know when something similar comes in. |
| matches.empty_share | Deli iskanje | Share the search |

# 2. Review screen

| Key | SL | EN |
|---|---|---|
| matches.review_title | Ujemanje | Match |
| matches.more_abuse | Prijavi zlorabo | Report abuse |
| matches.toggle_mine | Moja žival | My pet |
| matches.toggle_found | Najdena žival | Found animal |
| matches.toggle_sighted | Opažena žival | Sighted animal |
| matches.photo_next | Naslednja fotografija | Next photo |
| matches.strength_line | Ujemanje: {strength} | Match: {strength} |
| matches.why_title | Zakaj tako mislimo | Why we think so |
| matches.chip_banner | Najdena žival ima enako številko čipa kot vaša. Poglejte fotografije in se odločite. | The found animal has the same chip number as yours. Look at the photos and decide. |

# 3. Reasons (one line each, check icon)

| Key | SL | EN |
|---|---|---|
| matches.reason_chip | Številka čipa je enaka. | The chip number is the same. |
| matches.reason_chip_sighting | Številka čipa je enaka, vendar je bila žival le opažena, zato je morda že drugje. | The chip number is the same, but the animal was only sighted, so it may have moved on. |
| matches.reason_distance | Kraja sta {band} narazen. | The places are {band} apart. |
| matches.reason_time | Prijavljena {gap} po izgubi. | Reported {gap} after going missing. |
| matches.reason_size | Velikost se ujema. | The size matches. |
| matches.reason_colour_full | Barva se ujema. | The colour matches. |
| matches.reason_colour_partial | Barva se delno ujema. | The colour partly matches. |
| matches.reason_sex | Spol se ujema. | The sex matches. |

`matches.band` (CH-331) is that phrase as one ICU select on `lt1` / `1to3` / `3to10` / `gt10`, `other` "v bližini" / "nearby": SL `{band, select, lt1 {manj kot 1 km} 1to3 {1–3 km} 3to10 {3–10 km} gt10 {več kot 10 km} other {v bližini}}`, EN `{band, select, lt1 {under 1 km} 1to3 {1–3 km} 3to10 {3–10 km} gt10 {over 10 km} other {nearby}}`. `{band}` is the distance band phrase from the glossary §9 ("manj kot 1 km", "1–3 km"). `colour` overlap 1.0 uses `_full`, anything above 0 uses `_partial`.

# 4. Facts table

| Key | SL | EN |
|---|---|---|
| matches.table_caption | Primerjava podatkov | Comparison of details |
| matches.col_feature | Podatek | Detail |
| matches.col_mine | Moja žival | My pet |
| matches.col_other | Prijavljena žival | Reported animal |
| matches.col_result | Ujemanje | Match |
| matches.row_species | Vrsta | Species |
| matches.row_size | Velikost | Size |
| matches.row_colour | Barva | Colour |
| matches.row_sex | Spol | Sex |
| matches.row_area | Kraj | Place |
| matches.row_when | Kdaj | When |
| matches.result_same | Ujema se | Matches |
| matches.result_diff | Razlikuje se | Differs |
| matches.result_unknown | Ni podatka | Not known |
| matches.result_not_compared | Ni primerjano | Not compared |

The "Kdaj" row has no same/differs result: the two times are not compared, so its result cell reads `matches.result_not_compared` (CH-240; sr-only text in the mockup, visible in the app).

# 5. Caveats

| Key | SL | EN |
|---|---|---|
| matches.caveat_sighting | Žival je bila le opažena, zato je morda že drugje. | The animal was only sighted, so it may have moved on. |
| matches.caveat_no_photo | Prijava nima fotografije. Ujemanje temelji na številki čipa. | This report has no photo. The match is based on the chip number. |

# 6. Actions

| Key | SL | EN |
|---|---|---|
| matches.confirm | To je moja žival | This is my animal |
| matches.reject | Ni moja žival | Not my animal |
| matches.confirm_note | Ko potrdite, se odpre pogovor. Telefonske številke ostanejo skrite. | When you confirm, a conversation opens. Phone numbers stay hidden. |
| matches.reject_title | Skrijete to ujemanje? | Hide this match? |
| matches.reject_body | Ne bomo ga več prikazali. | We will not show it again. |
| matches.reject_confirm | Skrij za vedno | Hide for good |
| matches.reject_reason | Razlog (neobvezno) | Reason (optional) |
| matches.reject_cancel | Prekliči | Cancel |
| matches.rejected_toast | Ujemanje je skrito. | Match hidden. |

# 7. States

| Key | SL | EN |
|---|---|---|
| matches.withdrawn | Eno ujemanje smo odstranili, ker prijava ni več aktivna. | We removed a match because the report is no longer active. |
| matches.offline | Brez povezave. Ujemanja lahko pogledate, potrdite pa jih, ko boste spet povezani. | Offline. You can look at matches and confirm them once you are back online. |
| matches.already_confirmed | Ujemanje ste že potrdili. | You have already confirmed this match. |
| matches.other_confirmed | Eno ujemanje ste že potrdili. Vsako potrjeno ujemanje dobi svoj pogovor. | You have already confirmed one match. Each confirmed match gets its own conversation. |
| matches.multi_confirmed | Potrdili ste več ujemanj, zato žival še ni označena kot združena. To se zgodi, ko ostane potrjeno eno samo ujemanje. | You have confirmed more than one match, so the pet is not marked as reunited yet. That happens when exactly one confirmed match is left. |

`matches.other_confirmed` shows above the confirm button when another match is already confirmed (several matches can be confirmed). `matches.multi_confirmed` shows on a confirmed match when more than one is confirmed; the reunite step only happens when exactly one is (CH-240, TASK-26.3). Draft, needs native review. `matches.reject_reason` (CH-331) is the label of the optional reason the reject dialog asks for; it is sent as the C8 `reason`.

Loading: `common.loading` (P1).

# 8. SEO and alt text

SEO: N/A (signed-in, `noindex`). Document title "Možna ujemanja · Najdimo" / "Possible matches · Najdimo".

Alt text: the prefixes are the keys `matches.alt_mine` "Vaša žival: {alt}" / "Your pet: {alt}" and `matches.alt_other` "Prijavljena žival: {alt}" / "Reported animal: {alt}" (CH-331); web and mobile reuse them. Photos use the P9 §11 rule, prefixed with "Vaša žival: " / "Your pet: " for the owner's photo and "Prijavljena žival: " / "Reported animal: " for the candidate. Empty illustration decorative.

# Change log

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-10-18 | CH-240: other_confirmed, multi_confirmed, "When" row result word. CH-331: band, reject_reason, result_not_compared, alt_mine, alt_other. |
