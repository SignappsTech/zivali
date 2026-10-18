**Draft — requires client/legal review.**
source: 02§Content, SEO and legal requirements (Legal); 03§Content strategy / page inventory; brief v1.0 (maps and geo); supabase/seed/geo/LICENSE.md

| Field | Value |
|---|---|
| Version | 0.5 |
| Date | 2026-10-18 |
| Route SL | `/podatki-o-podjetju` (301 from `/impresum`) |
| Route EN | `/en/company-information` (301 from `/en/imprint`) |
| Slug SL / EN | `podatki-o-podjetju` / `company-information` |
| Structured data | WebPage |
| Template | T4 Legal (numbered h2 sections, "On this page" list, draft note) |

Change in 0.5 (TASK-114.17, owner 2026-10-16): the page is "Podatki o podjetju" / "Company information", not a media imprint (ZMed). Basis is ZEPT: company data, contact, register entry. The representative row and chapter 3 "Person responsible for content" are removed, so no person is named. The public register has the names. Chapters renumbered (7 chapters). Revisit if regular editorial content is added.

Change in 0.4: place search runs on our own geocoder on GURS data (ADR-007); the MapTiler line in chapter 7 is replaced by the GURS attribution for the settlement, street and house-number data.

Change in 0.3: new chapter 7 "Data sources and maps" with the GURS (CC BY 4.0), OpenStreetMap/OpenFreeMap and MapTiler attributions; "Rules of use" is now chapter 8.

Change in 0.2: hosting per brief v1.0 (Hetzner server in the EU, Supabase for the database and sign-in, Cloudflare R2 for photos and backups; Vercel removed).

**SEO (SL)**

- Meta title: Podatki o podjetju · Najdimo
- Meta description: Kdo upravlja Najdimo: podatki o družbi Signapps, kontakt, gostovanje, viri podatkov in avtorstvo fotografij.
- Focus keyword: podatki o podjetju

**SEO (EN)**

- Meta title: Company information · Najdimo
- Meta description: Who runs Najdimo: company details of Signapps, contact, hosting, data sources and photo credits.
- Focus keyword: company information

---

# Podatki o podjetju (slovenščina)

**Osnutek – zahteva pregled naročnika in pravnika.**

Zadnja posodobitev: 18. 10. 2026

## 1. Ponudnik storitve

Najdimo upravlja družba Signapps.

| Podatek | Vrednost |
|---|---|
| Polno ime družbe in pravnoorganizacijska oblika | SIGNAPPS, grafična in digitalna agencija, d.o.o. (skrajšano: SIGNAPPS d.o.o.) |
| Sedež | Kolomban 34B, 6280 Ankaran – Ancarano, Slovenija |
| Matična številka | 6575536000 |
| Davčna številka / ID za DDV | SI16967666 (zavezanec za DDV) |
| Vpis v register | Sodni register pri Okrožnem sodišču v Kopru, vpis z dne 21. 3. 2014 |
| Osnovni kapital | 7.500,00 EUR |

## 2. Kontakt

- E-naslov: info@signapps.si
- Telefon: 040 975 210 (+386 40 975 210)
- Zasebnost in pravice glede podatkov: info@signapps.si

## 3. Gostovanje

- Spletna stran in strežniški del: Hetzner Online GmbH, Gunzenhausen, Nemčija; strežnik je v EU.
- Podatkovna zbirka in vpis: Supabase Inc., podatki v EU, regija Frankfurt.
- Fotografije in varnostne kopije: Cloudflare, Inc., storitev R2, shramba v EU.

Več o ponudnikih je v [politiki zasebnosti](/zasebnost).

## 4. O imenu

Najdimo je delovno ime storitve.

## 5. Avtorstvo slik

Fotografije živali v prijavah so last njihovih avtorjev, ki so nam dovolili prikaz v Najdimo. Ilustracije so delo ekipe Najdimo.

## 6. Viri podatkov in zemljevidi

- **Meje občin in statističnih regij.** Vir: Geodetska uprava Republike Slovenije, Register prostorskih enot, stanje 15. 10. 2026 (licenca [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.sl)). Meje so poenostavljene. Z njimi prijavi določimo občino in regijo, pripravimo statistiko po regijah in izberemo oglase za regijo.
- **Zemljevid.** Ploščice [OpenFreeMap](https://openfreemap.org), © [OpenMapTiles](https://www.openmaptiles.org), podatki © [sodelavci OpenStreetMap](https://www.openstreetmap.org/copyright) (licenca ODbL).
- **Iskanje krajev in naslovov.** Vir: Geodetska uprava Republike Slovenije, Register prostorskih enot (naselja, ulice, četrtne skupnosti) in hišne številke, stanje {data_date} (licenca [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.sl)). Podatke smo za iskanje preoblikovali, iskanje pa teče na naših strežnikih.

## 7. Pravila uporabe

Pravila uporabe so v [pogojih uporabe](/pogoji-uporabe). O piškotkih beremo v [politiki piškotkov](/piskotki), o dostopnosti pa v [izjavi o dostopnosti](/dostopnost).

---

# Company information (English)

**Draft — requires client/legal review.**

Last updated: 18 October 2026

## 1. Service provider

Najdimo is operated by the company Signapps.

| Item | Value |
|---|---|
| Full company name and legal form | SIGNAPPS, grafična in digitalna agencija, d.o.o. (short: SIGNAPPS d.o.o.) |
| Registered seat | Kolomban 34B, 6280 Ankaran – Ancarano, Slovenia |
| Registration number | 6575536000 |
| Tax number / VAT ID | SI16967666 (VAT payer) |
| Register entry | Court register at the District Court of Koper, entered on 21 March 2014 |
| Share capital | EUR 7,500.00 |

## 2. Contact

- Email: info@signapps.si
- Phone: 040 975 210 (+386 40 975 210)
- Privacy and data rights: info@signapps.si

## 3. Hosting

- Website and server: Hetzner Online GmbH, Gunzenhausen, Germany; the server is in the EU.
- Database and sign-in: Supabase Inc., data in the EU, Frankfurt region.
- Photos and backups: Cloudflare, Inc., R2 service, storage in the EU.

More about providers is in the [privacy policy](/en/privacy).

## 4. About the name

Najdimo is a working name of the service.

## 5. Image credits

Photos of animals in reports belong to their authors, who allowed us to display them in Najdimo. Illustrations are by the Najdimo team.

## 6. Data sources and maps

- **Municipal and statistical region boundaries.** Source: Surveying and Mapping Authority of the Republic of Slovenia, Register of Spatial Units, as of 15 October 2026 ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Boundaries simplified. We use them to set the municipality and region of a report, for statistics by region and to choose ads for a region.
- **Map.** Tiles by [OpenFreeMap](https://openfreemap.org), © [OpenMapTiles](https://www.openmaptiles.org), data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) (ODbL licence).
- **Place and address search.** Source: Surveying and Mapping Authority of the Republic of Slovenia, Register of Spatial Units (settlements, streets, city districts) and house numbers, as of {data_date} ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). We converted the data for search, which runs on our own servers.

## 7. Rules of use

The rules of use are in the [terms of use](/en/terms). Read about cookies in the [cookie policy](/en/cookies) and about accessibility in the [accessibility statement](/en/accessibility).

---

# Notes for legal review (EN, internal, not published)

1. **Scope (0.5).** Not a media imprint: the page carries the ZEPT data only, with no representative and no responsible editor (owner decision 2026-10-16). Counsel to confirm that ZEPT/ZGD-1 do not need a named representative here (lawyer briefing LQ-02).
2. **Company facts.** All company details are client markers: full name and form, seat, registration number, tax number and VAT ID, register entry (court register or AJPES), share capital (only for a d.o.o.), contact email and phone. The build should fail while a marker remains.
3. **Required content.** Confirm the minimum imprint content under Slovenian law (company law and the e-commerce act, ZVEP) and add any item that counsel requires, for example supervisory authority if the activity needs one.
4. **Hosting (updated in 0.2, brief v1.0).** One Hetzner server in the EU (Germany or Finland, client decision) runs the website, API and job worker; Supabase Inc. hosts the database and sign-in in Frankfurt (AWS eu-central-1); photos and nightly backups are on Cloudflare R2, which is "in the EU" only if the buckets use EU jurisdiction (privacy-policy note 9). Vercel is no longer used.
5. **Image credits.** Confirm the licence of any stock photos, fonts or icon sets used on the site and list them here.
6. **Working name.** The line "Najdimo is a working name" must be removed or updated when the client picks the final name (Q-001); the legal pages then change with the name.
7. **Quality.** The Slovenian text needs a native review.
8. **Data sources (new in 0.3).** The GURS lines are the attribution required by the GURS terms and CC BY 4.0 (`supabase/seed/geo/LICENSE.md`): source, data type, data state date, licence link and the note that the data were changed. Update the date whenever the geodata are refreshed; the same line is the shared key `common.geo_attribution` (P1) for every page that shows boundaries or figures by municipality or region (P22 statistics, SEO location pages, municipality reports). The map line matches `map.attribution` (P4) and the search line `location.search_attribution` (P5). Check the OpenFreeMap wording at build time (lawyer briefing LQ-63). (Changed in 0.4) The search line names the GURS geocoder data; `{data_date}` is the data-state date of the geocoder snapshot in `supabase/seed/geo/LICENSE.md` (TASK-15.7), and the data-type names must match that file once it is written. MapTiler is no longer used (ADR-007; LQ-64 N/A).
