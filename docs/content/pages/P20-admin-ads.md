---
source: 03§P20; docs/design/pages/P20-admin-ads.md
page: P20 Admin ad management
stories: TASK-37 (FR-031)
copy-for: docs/design/pages/P20-admin-ads.md
version: 0.1
status: Draft, native Slovenian review pending
date: 2026-10-15
---

# P20 Admin ad management: copy

Namespace `admin` (prefix `admin.ads_`). Shared table, dialog and toast strings: P19. Slot names match the public names in P21 and the Partners page (P22).

# 1. Ads list

| Key | SL | EN |
|---|---|---|
| admin.ads_title | Oglasi | Ads |
| admin.ads_new | Nov oglas | New ad |
| admin.ads_col_preview | Predogled | Preview |
| admin.ads_col_title | Naslov | Title |
| admin.ads_col_status | Stanje | Status |
| admin.ads_col_slots | Mesta | Slots |
| admin.ads_col_targeting | Ciljanje | Targeting |
| admin.ads_col_dates | Obdobje | Dates |
| admin.ads_col_impressions | Prikazi | Impressions |
| admin.ads_col_clicks | Kliki | Clicks |
| admin.ads_col_ctr | Delež klikov | CTR |
| admin.ads_status_draft | Osnutek | Draft |
| admin.ads_status_scheduled | Načrtovan | Scheduled |
| admin.ads_status_running | Se prikazuje | Running |
| admin.ads_status_ended | Končan | Ended |
| admin.ads_targeting_all | Vsa Slovenija, vse živali | All of Slovenia, all animals |
| admin.ads_action_edit | Uredi | Edit |
| admin.ads_action_duplicate | Podvoji | Duplicate |
| admin.ads_action_end | Končaj zdaj | End now |
| admin.ads_action_delete | Izbriši | Delete |
| admin.ads_empty | Oglasov še ni. | No ads yet. |

# 2. Create and edit

| Key | SL | EN |
|---|---|---|
| admin.ads_section_creative | Oglas | Creative |
| admin.ads_image | Slika | Image |
| admin.ads_image_drop | Povlecite sliko sem ali | Drag an image here or |
| admin.ads_image_choose | Izberi datoteko | Choose file |
| admin.ads_image_help | Razmerje 4:3, najmanj 1200 × 900 slikovnih pik, JPG ali PNG do 500 KB. | 4:3 ratio, at least 1200 × 900 pixels, JPG or PNG up to 500 KB. |
| admin.ads_alt | Opis slike (alt) | Image description (alt) |
| admin.ads_alt_help | Opišite, kaj je na sliki, za ljudi z bralnikom zaslona. Ne ponavljajte naslova. Od 5 do 140 znakov. | Describe what is in the image for people using a screen reader. Do not repeat the title. 5 to 140 characters. |
| admin.ads_title_label | Naslov | Title |
| admin.ads_text_label | Besedilo | Text |
| admin.ads_cta_label | Besedilo gumba (neobvezno) | Button text (optional) |
| admin.ads_cta_help | Privzeto: »Več o tem«. Do 24 znakov. | Default: "Learn more". Up to 24 characters. |
| admin.ads_link | Povezava | Link |
| admin.ads_link_help | Začeti se mora s https://. Odpre se v novem zavihku, klike pa štejemo prek naše preusmeritve. | Must start with https://. It opens in a new tab, and clicks are counted through our redirect. |
| admin.ads_char_count | {count} / {max} | {count} / {max} |
| admin.ads_section_where | Kje | Where |
| admin.ads_slots | Oglasna mesta | Ad slots |
| admin.ads_slot_feed | Seznam prijav | Report list |
| admin.ads_slot_detail | Stran prijave | Report page |
| admin.ads_slot_reunited | Zaslon Spet doma | Home again screen |
| admin.ads_slot_sidebar | Stranska vrstica | Sidebar |
| admin.ads_languages | Jeziki | Languages |
| admin.ads_section_who | Komu | Who |
| admin.ads_regions | Regije | Regions |
| admin.ads_municipalities | Občine | Municipalities |
| admin.ads_municipality_search | Poiščite občino | Search for a municipality |
| admin.ads_species | Živali | Animals |
| admin.ads_species_dogs | Psi | Dogs |
| admin.ads_species_cats | Mačke | Cats |
| admin.ads_all_hint | Brez izbire pomeni vse. | No selection means all. |
| admin.ads_section_when | Kdaj | When |
| admin.ads_start | Začetek | Start |
| admin.ads_end | Konec | End |
| admin.ads_status | Stanje | Status |
| admin.ads_exclusive | Izključno mesto | Exclusive slot |
| admin.ads_exclusive_help | V istem obdobju na tem mestu in v teh regijah ne bo drugih oglasov. | No other ads will run in this slot and these regions during the same dates. |
| admin.ads_preview | Predogled | Preview |
| admin.ads_preview_slot | Mesto | Slot |
| admin.ads_preview_theme | Svetlo / temno | Light / dark |
| admin.ads_save | Shrani | Save |
| admin.ads_save_draft | Shrani kot osnutek | Save as draft |
| admin.ads_cancel | Prekliči | Cancel |

# 3. Validation

| Key | SL | EN |
|---|---|---|
| admin.ads_err_alt | Dodajte opis slike. | Add an image description. |
| admin.ads_err_alt_length | Opis slike naj ima od 5 do 140 znakov. | The image description should have 5 to 140 characters. |
| admin.ads_err_link | Povezava se mora začeti s https://. | The link must start with https://. |
| admin.ads_err_image | Slika mora imeti razmerje 4:3, najmanj 1200 × 900 slikovnih pik, in biti JPG ali PNG do 500 KB. | The image must be 4:3, at least 1200 × 900 pixels, and a JPG or PNG up to 500 KB. |
| admin.ads_err_overlap | V tem obdobju je to mesto že rezervirano za oglas: {title}. | This slot is already reserved for another ad in these dates: {title}. |
| admin.ads_err_dates | Konec mora biti po začetku. | The end must be after the start. |
| admin.ads_err_too_long | Največ {max} znakov. | At most {max} characters. |
| admin.ads_err_slots | Izberite vsaj eno oglasno mesto. | Choose at least one ad slot. |
| admin.ads_err_required | To polje je obvezno. | This field is required. |

# 4. Ad detail and statistics

| Key | SL | EN |
|---|---|---|
| admin.ads_totals_impressions | Prikazi | Impressions |
| admin.ads_totals_clicks | Kliki | Clicks |
| admin.ads_totals_ctr | Delež klikov | Click-through rate |
| admin.ads_range | Obdobje | Date range |
| admin.ads_chart_alt | Graf prikazov in klikov po dnevih. Podatki so v tabeli pod grafom. | Chart of impressions and clicks per day. The data is in the table below. |
| admin.ads_by_slot | Po mestih | By slot |
| admin.ads_by_region | Po regijah | By region |
| admin.ads_under_5 | < 5 | < 5 |
| admin.ads_under_5_a11y | manj kot 5 | fewer than 5 |
| admin.ads_export | Izvozi CSV | Export CSV |
| admin.ads_method | Prikaze in klike štejemo v naši bazi, skupno in brez piškotkov. Prikaz pomeni, da se je oglas izrisal na zaslonu; vidnosti ne merimo. | We count impressions and clicks in our own database, in aggregate and without cookies. An impression means the ad was rendered on screen; we do not measure viewability. |
| admin.ads_history | Zgodovina sprememb | Change history |

# 5. House ads

| Key | SL | EN |
|---|---|---|
| admin.house_title | Lastni oglasi | House ads |
| admin.house_body | Prikažejo se, kadar za mesto ni plačanega oglasa. | They show when no paid ad fits a slot. |
| admin.house_kind_support | Podpora | Support |
| admin.house_kind_partner | Oglašujte pri nas | Advertise with us |
| admin.house_kind_adopt | Posvojitev | Adoption |
| admin.house_locked | Pri lastnih oglasih so mesta in ciljanje fiksni. | Slots and targeting are fixed for house ads. |
| admin.house_marker | Lastni | House |

House-ad creatives (title, text, button, link, alt): P21 §3.

# 6. States

| Key | SL | EN |
|---|---|---|
| admin.ads_upload_failed | Slike ni bilo mogoče naložiti. Poskusite znova. | The image could not be uploaded. Please try again. |
| admin.ads_end_title | Končate oglas zdaj? | End this ad now? |
| admin.ads_end_body | Oglas se takoj neha prikazovati. Statistika ostane. | The ad stops showing straight away. Its statistics are kept. |
| admin.ads_delete_title | Izbrišete oglas? | Delete this ad? |
| admin.ads_delete_body | Oglas skrijemo iz seznama, statistika in zgodovina pa ostaneta. | The ad is removed from the list; its statistics and history are kept. |
| admin.ads_ended_note | Oglas je končan in ga ni mogoče urejati. Lahko ga podvojite. | This ad has ended and cannot be edited. You can duplicate it. |

Unsaved changes: `common.discard_*` (P1). Saved: `admin.saved_logged` (P19).

# 7. SEO and alt text

SEO: N/A (admin). Alt text: list thumbnails use the ad's own alt field; the preview renders the real slot component with that alt.

# 8. CHANGE requests

- `CHANGE docs/tech/contracts/C14-ads-partners.md§Admin: image validation says 1200×628 and 300×600, the design (P21) uses one 4:3 format of at least 1200×900; body max 140 vs 120 in the design. Copy follows the design (4:3, 1200×900, text 120). Please align C14.`
