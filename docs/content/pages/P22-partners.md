---
source: 03§P22; docs/design/pages/P22-partners.md; 02§FR-032; brief v0.7 (Vet Partner, mission first)
page: P22 Partners page ("Oglašujte pri nas")
stories: TASK-38 (FR-032)
copy-for: docs/design/pages/P22-partners.md
version: 0.4
status: Draft; reply time and founding-partner terms confirmed by client (2026-10-15); pricing and media kit still pending client decision
date: 2026-10-19
---

# P22 Partners page: copy

Namespace `partners`. The client's sales tool for vets, pet shops, groomers, insurers and pet-food brands. It pitches two products: **ads** (all businesses) and **Veterinarski partner / Vet Partner** (vet clinics). Tone: practical and honest. We show real numbers, including small ones, and never invent figures or prices. Mission first: the reason to advertise here is that it keeps the search free for everyone. No ads on this page.

Route: `/oglasevanje`, `/en/advertise`. Section anchors: `#obcinstvo` / `#audience`, `#mesta` / `#placements`, `#veterinarski-partner` / `#vet-partner`, `#povprasevanje` / `#enquiry`.

# 1. Hero

| Key | SL | EN |
|---|---|---|
| partners.hero_title | Oglašujte pri nas | Advertise with us |
| partners.hero_lede | Dosezite lastnike psov in mačk v svoji regiji. Vaš oglas pomaga, da iskanje izgubljenih živali ostane brezplačno za vse. | Reach dog and cat owners in your region. Your ad helps keep the search for lost pets free for everyone. |
| partners.hero_primary | Pošlji povpraševanje | Send an enquiry |
| partners.hero_secondary | Kako so oglasi videti | How placements look |

Lede: 18 words (SL).

# 2. Audience (live numbers)

| Key | SL | EN |
|---|---|---|
| partners.audience_title | Naše občinstvo | Our audience |
| partners.region_label | Prikaži podatke za regijo | Show figures for region |
| partners.region_all | Vsa Slovenija | All of Slovenia |
| partners.stat_users | Registrirani uporabniki | Registered users |
| partners.stat_reports | Aktivne prijave | Active reports |
| partners.stat_reunions | Živali spet doma v zadnjih 90 dneh | Pets home again in the last 90 days |
| partners.stat_under5 | < 5 | < 5 |
| partners.stat_under5_a11y | manj kot 5 | fewer than 5 |
| partners.pilot_note | Smo v pilotu v Ljubljani. Številke so prave in zaenkrat še majhne. Rastejo z vsako prijavo. | We are piloting in Ljubljana. The numbers are real and still small. They grow with every report. |
| partners.stats_date | Stanje: {datetime}. Številke osvežujemo vsako uro. | As of {datetime}. We refresh the numbers every hour. |
| partners.stats_masked | Za zasebnost v tej regiji skupne številke zaokrožimo na 10. | For privacy, we round the totals in this region to the nearest 10. |
| partners.stats_source | Podatki iz naše baze, brez osebnih podatkov. | Figures from our own database, with no personal data. |
| partners.stats_error | Številk ta trenutek ne moremo prikazati. Poskusite znova pozneje. | We cannot show the numbers right now. Please try again later. |

`partners.stats_masked` (CH-257, TASK-38.1) shows under the figures, in the same small muted style, when the selected region is masked: its totals are rounded to the nearest 10 instead of showing exact small counts. Draft, needs native review.

Zero stays "0"; any value from 1 to 4 shows as "< 5" (C14 `CountValue`).

Under `partners.stats_source`, in the same small muted style: `common.geo_attribution` (P1), because the figures are grouped by GURS statistical regions (CC BY 4.0 attribution).

The label of the audience region switch is "Show figures for region", so it no longer clashes with the enquiry field `partners.form_region` "Regija" / "Region" (§8) (CH-466).

# 3. Where your ad appears

| Key | SL | EN |
|---|---|---|
| partners.slots_title | Kje se prikaže vaš oglas | Where your ad appears |
| partners.slot_feed_title | Seznam prijav | Report list |
| partners.slot_feed_body | Med prijavami na zemljevidu in v seznamu, za vsako osmo prijavo. Nikoli kot prvi in nikoli dva zapored. | Between reports on the map list, after every eighth report. Never first and never two in a row. |
| partners.slot_detail_title | Stran prijave | Report page |
| partners.slot_detail_body | Na strani posamezne izgubljene ali najdene živali, pod glavnimi dejanji. Primerno za ambulante in trgovine v bližini. | On the page of each lost or found animal, below the main actions. A good fit for nearby clinics and shops. |
| partners.slot_reunited_title | Zaslon Spet doma | Home again screen |
| partners.slot_reunited_body | Ko lastnik označi, da je žival spet doma. Najlepši trenutek v aplikaciji. | When an owner marks their pet as home again. The happiest moment in the app. |
| partners.slot_sidebar_title | Stranska vrstica | Sidebar |
| partners.slot_sidebar_body | Na spletni strani ob vsebini, na večjih zaslonih. | Next to the content on the website, on larger screens. |
| partners.format_title | Format | Format |
| partners.format_body | Ena slika v razmerju 4:3 (najmanj 1200 × 900 slikovnih pik, JPG ali PNG do 500 KB), naslov do 60 znakov, besedilo do 120 znakov in povezava https. Oglas za vse štiri mesta pripravimo mi. | One 4:3 image (at least 1200 × 900 pixels, JPG or PNG up to 500 KB), a title of up to 60 characters, text of up to 120 characters and an https link. We prepare the ad for all four slots. |
| partners.slot_preview_alt | Primer oglasa na mestu {slot} | Example ad in the {slot} slot |

Slot previews (CH-432): the four previews reuse the P21 copy, stored as `partners.preview_*`. Report list = the Support house ad, Report page = the Vet Partner unit (label "Oglas · Veterinar v vaši regiji", title `ads.vet_partner_mark` "Partnerska ambulanta", marks "Nujna pomoč 24 ur" and "Zdaj odprto", button `ads.vet_cta`), Home again = the Adopt house ad, Sidebar = the Partner house ad (P21 §2, §3). No invented clinic or shop names. The image boxes show an icon until the house-ad images exist (TASK-36.1 to 36.3).

# 4. Targeting

| Key | SL | EN |
|---|---|---|
| partners.targeting_title | Komu se prikaže | Who sees it |
| partners.targeting_body | Oglas prikažemo glede na kraj in vrsto živali v prijavi, ne glede na to, kdo jo gleda. Profilov uporabnikov ne gradimo. | We show your ad based on the place and the type of animal in the report, not on who is looking. We do not build user profiles. |
| partners.targeting_region | Regija (12 statističnih regij) | Region (12 statistical regions) |
| partners.targeting_municipality | Občina (212 občin) | Municipality (212 municipalities) |
| partners.targeting_species | Psi, mačke ali oboji | Dogs, cats or both |
| partners.targeting_dates | Obdobje prikazovanja | Run dates |

# 5. Vet Partner (`#veterinarski-partner`)

| Key | SL | EN |
|---|---|---|
| partners.vet_title | Veterinarski partner | Vet Partner |
| partners.vet_lede | Za veterinarske ambulante. Vse, kar pomaga vrniti žival domov, je za vas brezplačno. Veterinarski partner vam doda prepoznavnost v vaši okolici. | For vet practices. Everything that helps an animal home is free for you. Vet Partner adds visibility in your area. |
| partners.vet_1 | Preverjen profil ambulante z delovnim časom, storitvami, oznako »Nujna pomoč 24 ur« in povezavo za naročanje ali klic. | A verified clinic profile with opening hours, services, a "24-hour emergency care" badge and a booking or call link. |
| partners.vet_2 | Izpostavljeno mesto »Veterinar v bližini« na straneh izgubljenih in najdenih živali v vašem območju. | A featured "Vet nearby" placement on lost and found pages in your area. |
| partners.vet_3 | Omemba v opozorilih o izgubljenih živalih in na plakatih za vašo regijo, vedno označena kot oglas. | A mention in lost-pet alerts and on posters for your region, always labelled as an ad. |
| partners.vet_4 | Mesečno poročilo o ogledih, klikih in vrnitvah domov v vašem območju. | A monthly report on views, clicks and pets returned home in your area. |
| partners.vet_5 | Mesečna naročnina z računom z DDV. Odpoveste jo lahko kadar koli. | A monthly subscription with a VAT invoice. Cancel at any time. |
| partners.vet_free_title | Brezplačno ostane | Always free |
| partners.vet_free_body | Prijava najdenih živali, ki vam jih prinesejo, preverjanje čipa, ujemanja in pogovor z lastniki. | Reporting found animals brought to you, chip lookup, matches and talking to owners. |
| partners.vet_cta | Pošlji povpraševanje | Send an enquiry |

# 6. Why it works here

| Key | SL | EN |
|---|---|---|
| partners.trust_title | Pravila, ki varujejo zaupanje | Rules that protect trust |
| partners.trust_1 | Vsak oglas je označen z besedo »Oglas«. | Every ad is labelled "Ad". |
| partners.trust_2 | Oglasov ni med prijavo izgubljene ali najdene živali, v pogovorih in pri plačilu. Ljudje vas srečajo, ko imajo čas pogledati. | There are no ads while people report a lost or found animal, in conversations or during payment. People meet you when they have time to look. |
| partners.trust_3 | Prikaze in klike štejemo skupno in brez piškotkov. Poročilo prejmete vsak mesec. | We count impressions and clicks in aggregate and without cookies. You get a report every month. |

# 7. Pricing and next steps

| Key | SL | EN |
|---|---|---|
| partners.pricing_title | Cene in naslednji koraki | Pricing and next steps |
| partners.pricing_body | Med pilotom cene za oglase in Veterinarskega partnerja sporočimo na povpraševanje. Prvi partnerji prejmejo ugodnejše pogoje. | During the pilot we share prices for ads and Vet Partner on request. The first partners receive more favourable terms. |
| partners.step_1 | Pošljete povpraševanje. | You send an enquiry. |
| partners.step_2 | Odgovorimo v 2 delovnih dneh in pripravimo predlog za vašo regijo. | We reply within 2 working days with a proposal for your region. |
| partners.step_3 | Ko predlog potrdite, pripravimo oglas in ga začnemo prikazovati. | Once you approve it, we prepare your ad and start showing it. |
| partners.media_kit | Prenesi predstavitev (PDF) | Download the media kit (PDF) |

Both promises are confirmed by the client (2026-10-15): the 2-working-day reply time (`partners.step_2`) and the founding-partner terms (`partners.pricing_body`). Keep them live; the client must still honour them. `partners.media_kit` stays hidden until the PDF exists.

# 8. Enquiry form (`#povprasevanje`)

| Key | SL | EN |
|---|---|---|
| partners.form_title | Pošljite povpraševanje | Send an enquiry |
| partners.form_company | Podjetje | Company |
| partners.form_name | Ime in priimek | Full name |
| partners.form_email | E-naslov | Email address |
| partners.form_phone | Telefon (neobvezno) | Phone (optional) |
| partners.form_interest | Kaj vas zanima? | What are you interested in? |
| partners.form_interest_ad | Oglas | Advertising |
| partners.form_interest_vet | Veterinarski partner | Vet Partner |
| partners.form_interest_unsure | Še ne vem | Not sure yet |
| partners.form_region | Regija | Region |
| partners.form_region_all | Vsa Slovenija | All of Slovenia |
| partners.form_message | Sporočilo | Message |
| partners.form_message_placeholder | Na primer: veterinarska ambulanta v Mariboru, zanima nas mesto na strani prijave. | For example: a vet practice in Maribor, interested in the report page slot. |
| partners.form_consent | Strinjam se, da me Najdimo kontaktira glede tega povpraševanja. | I agree that Najdimo may contact me about this enquiry. |
| partners.form_privacy | Podatke uporabimo le za odgovor na povpraševanje. Več v [politiki zasebnosti](/zasebnost). | We only use your details to reply to your enquiry. More in the [privacy policy](/en/privacy). |
| partners.form_submit | Pošlji povpraševanje | Send enquiry |
| partners.form_sending | Pošiljamo … | Sending … |

Validation:

| Key | SL | EN |
|---|---|---|
| partners.err_company | Vpišite ime podjetja. | Enter the company name. |
| partners.err_name | Vpišite svoje ime. | Enter your name. |
| partners.err_email | Vpišite veljaven e-naslov, na primer ime@podjetje.si. | Enter a valid email address, for example name@company.com. |
| partners.err_phone | Preverite telefonsko številko. | Please check the phone number. |
| partners.err_message | Napišite nekaj besed o tem, kaj vas zanima. | Write a few words about what you are interested in. |
| partners.err_message_long | Sporočilo je predolgo: največ 2000 znakov. | The message is too long: at most 2000 characters. |
| partners.err_consent | Za odgovor potrebujemo vaše soglasje. | We need your consent to reply. |

States:

| Key | SL | EN |
|---|---|---|
| partners.success_title | Hvala, povpraševanje smo prejeli | Thank you, we have received your enquiry |
| partners.success_body | Odgovorili vam bomo na {email}. | We will reply to {email}. |
| partners.success_back | Nazaj na stran | Back to the page |
| partners.limited | Iz tega omrežja je bilo poslanih več povpraševanj. Poskusite znova čez eno uro. Vaši podatki so ostali v obrazcu. | Several enquiries were sent from this network. Please try again in an hour. Your details are still in the form. |
| partners.captcha_failed | Preverjanje ni uspelo. Vaši podatki so ostali v obrazcu, poskusite znova. | The check did not work. Your details are still in the form; please try again. |
| partners.server_error | Povpraševanja ni bilo mogoče poslati. Poskusite znova čez nekaj minut. | The enquiry could not be sent. Please try again in a few minutes. |

# 9. Questions (T3 style)

| # | SL question | SL answer | EN question | EN answer |
|---|---|---|---|---|
| 1 | Kdo vidi moj oglas? | Ljudje, ki na Najdimo gledajo prijave v regijah in za živali, ki jih izberete. | Who sees my ad? | People who look at reports on Najdimo in the regions and for the animals you choose. |
| 2 | Ali sledite uporabnikom? | Ne. Oglase prikazujemo glede na kraj in vrsto živali v prijavi. Ne uporabljamo piškotkov za sledenje in ne delimo podatkov o uporabnikih. | Do you track users? | No. We show ads based on the place and type of animal in the report. We use no tracking cookies and share no data about users. |
| 3 | Kako merite uspešnost? | Štejemo prikaze in klike vsakega oglasa po dnevih, mestih in regijah. Prikaz štejemo, ko je vsaj polovica oglasa vsaj 1 sekundo vidna na zaslonu. Poročilo prejmete vsak mesec. | How do you measure results? | We count impressions and clicks per day, slot and region. An impression counts when at least half of the ad has been on screen for at least 1 second. You get a report every month. |
| 4 | Kaj potrebujete od nas? | Sliko, kratek naslov, besedilo in povezavo. Oglas za vsa mesta pripravimo mi. | What do you need from us? | An image, a short title, some text and a link. We prepare the ad for every slot. |
| 5 | Ali morajo zavetišča plačati? | Ne. Zavetišča in občine uporabljajo Najdimo brezplačno, za vedno. | Do shelters have to pay? | No. Shelters and municipalities use Najdimo for free, forever. |
| 6 | Ali je Veterinarski partner pogoj za brezplačne funkcije? | Ne. Prijava najdenih živali, preverjanje čipa, ujemanja in pogovor z lastniki so za vse ambulante brezplačni. | Is Vet Partner required for the free features? | No. Reporting found animals, chip lookup, matches and talking to owners are free for every practice. |

FAQ heading (CH-431): `partners.faq_title` SL "Pogosta vprašanja", EN "Frequently asked questions". Key names for the table above: `partners.faq_<1-6>_q` and `partners.faq_<1-6>_a`, copied verbatim.

# 10. SEO

| Field | SL | EN |
|---|---|---|
| Meta title | Oglašujte lastnikom psov in mačk · Najdimo | Advertise to dog and cat owners · Najdimo |
| Meta description | Oglasi in Veterinarski partner na Najdimo: dosezite lastnike psov in mačk v svoji regiji. Prave številke, jasno označeni oglasi, brez sledenja. | Ads and Vet Partner on Najdimo: reach dog and cat owners in your region. Real numbers, clearly labelled ads, no tracking. |
| Focus keyword | oglaševanje za lastnike hišnih ljubljenčkov | advertise to pet owners Slovenia |
| Slug | `/oglasevanje` | `/en/advertise` |
| Structured data | `WebPage` + `BreadcrumbList`; `FAQPage` for §9 | same |
| OG image | `og-partners.png` 1200 by 630 (image task) | |

Key names (CH-431): `partners.seo_title`, `partners.seo_description` (§10) and `partners.og_alt` (§11), verbatim.

# 11. Alt text

| Image | SL | EN |
|---|---|---|
| Hero (reuse `assets/house-ad-partner.png` unless the client supplies a photo) | Ilustracija: vrsta lokalnih trgovin in ambulanta ob ulici | Illustration: a row of local shops and a clinic along a street |
| Slot previews | `partners.slot_preview_alt` with the slot name | |
| OG image | Oglašujte pri Najdimo | Advertise with Najdimo |

# Change log

| Version | Date | Change |
|---|---|---|
| 0.2 | 2026-10-18 | CH-257: `partners.stats_masked` (§2). |
| 0.4 | 2026-10-19 | CH-558 (PRD A-016, R-029.4): FAQ 3 states the viewable impression (at least half of the ad on screen for at least 1 second), web and app alike; catalogue `partners.faq_3_a` updated. |
| 0.3 | 2026-10-18 | CH-431: key names for SEO and FAQ, `partners.faq_title`. CH-432: slot previews reuse P21 copy (§3). CH-466: `partners.region_label` reworded (§2). |
