# GURS geo reference data: licence, attribution, processing

| File | Content |
|---|---|
| `regions.geojson` | 12 statistical regions: `id`, `slug`, `name_sl`, `name_en` |
| `municipalities.geojson` | 212 municipalities: `id`, `slug`, `name_sl`, `name_en`, `region_id` (→ `regions.id`) |
| `places.ndjson.gz` | geocoder places (C6 `geo_places`): 6,035 settlements, 65 city districts, 10,498 streets; see [Geocoder snapshot](#geocoder-snapshot-places-and-house-numbers) |
| `addresses.tsv.gz` | geocoder house numbers (C6 `geo_addresses`): 580,251 |

WGS84 (EPSG:4326) GeoJSON, RFC 7946 ring order. `scripts/geo-to-sql.mjs <out.sql>` turns both files into plain SQL for `public.regions` and `public.municipalities` (C6, ADR-006).

## Source and licence

- Publisher: Geodetska uprava Republike Slovenije (GURS), Surveying and Mapping Authority of the Republic of Slovenia.
- Dataset: Register prostorskih enot (RPE, Register of Spatial Units), WFS layers `SI.GURS.RPE:OBCINE` and `SI.GURS.RPE:STATISTICNE_REGIJE` from `https://ipi.eprostor.gov.si/wfs-si-gurs-rpe/wfs`.
- Data as of: 15 October 2026 (downloaded 2026-10-14T23:05Z; latest change in the municipalities layer 2026-10-14, in the regions layer 2025-10-09).
- Licence: **Creative Commons Attribution 4.0 International (CC BY 4.0)**, https://creativecommons.org/licenses/by/4.0/, under the GURS general terms for geodetic data (https://www.e-prostor.gov.si/en/access-to-geodetic-data/). Commercial use, sharing and adaptation are allowed with attribution. GURS gives no warranty for quality or availability.

## Required attribution

The GURS terms require every publication of the data, or of products made from them, to name the source: "Geodetska uprava Republike Slovenije", the type of data and the date of the data state. CC BY 4.0 adds a licence link and a note that the data were changed. Use:

- SL: Vir: Geodetska uprava Republike Slovenije, Register prostorskih enot, stanje 15. 10. 2026 (licenca CC BY 4.0). Meje so poenostavljene.
- EN: Source: Surveying and Mapping Authority of the Republic of Slovenia, Register of Spatial Units, as of 15 October 2026 (CC BY 4.0). Boundaries simplified.

Show it on the data sources / legal page of the web and mobile apps, and wherever boundaries or figures by municipality or region are published (for example partner statistics). Update the date when the data are refreshed.

## Changes made

- Region of each municipality: the GURS statistical region with the largest overlap (all 212 match exactly one region).
- Region geometry: dissolved from the simplified municipalities, so region and municipality borders coincide exactly.
- Simplified with mapshaper 0.7.70: weighted Visvalingam, 12 % of removable vertices kept, `keep-shapes`, shared borders simplified once (no gaps or slivers between neighbours); mean displacement 12 m; coordinates rounded to 0.00001°. Area total 20,273 km²; every polygon is valid in PostGIS (`ST_IsValid`).
- Attributes: `id` = GURS code (`SIFRA`); `name_sl` = GURS name (`NAZIV`, kept as published except the one abbreviation below); `name_en` = `name_sl` for municipalities and the common English name for regions (Mura, Drava, Carinthia, Savinja, Central Sava, Lower Sava, Southeast Slovenia, Central Slovenia, Upper Carniola, Littoral–Inner Carniola, Gorizia, Coastal–Karst); `slug` = `name_sl` without diacritics, lower case, other characters replaced by `-`.
- Municipality 182: GURS publishes the abbreviated "Sveti Andraž v Slov. goricah"; `name_sl` and `name_en` are written out as "Sveti Andraž v Slovenskih goricah" and the slug is `sveti-andraz-v-slovenskih-goricah`, like the other "… v Slovenskih goricah" municipalities (glossary, 2026-10-15).
- Known source artefact: Ivančna Gorica and Žužemberk overlap by about 330 m² in the GURS data (about 400 m² after simplification). A point there matches both municipalities.

## Reproduce

```bash
WFS='https://ipi.eprostor.gov.si/wfs-si-gurs-rpe/wfs?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326&typeName=SI.GURS.RPE:'
curl -o obcine.json "${WFS}OBCINE"
curl -o regije.json "${WFS}STATISTICNE_REGIJE"
npx --yes mapshaper@0.7.70 -i obcine.json regije.json combine-files \
  -join target=obcine source=regije largest-overlap fields=SIFRA prefix=region_ \
  -each target=obcine 'id=SIFRA, region_id=region_SIFRA, name_sl=NAZIV.replace("Slov. goricah","Slovenskih goricah"), name_en=name_sl' \
  -each target=regije 'id=SIFRA, name_sl=NAZIV, name_en=["Mura","Drava","Carinthia","Savinja","Central Sava","Lower Sava","Southeast Slovenia","Central Slovenia","Upper Carniola","Littoral–Inner Carniola","Gorizia","Coastal–Karst"][SIFRA-1]' \
  -each target=obcine,regije 'slug=name_sl.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")' \
  -simplify 12% keep-shapes stats \
  -dissolve target=obcine region_id + name=regions \
  -join target=regions source=regije keys=region_id,id fields=slug,name_sl,name_en \
  -each target=regions 'id=region_id' \
  -filter-fields target=obcine id,slug,name_sl,name_en,region_id \
  -filter-fields target=regions id,slug,name_sl,name_en \
  -sort target=obcine id -sort target=regions id \
  -o target=obcine supabase/seed/geo/municipalities.geojson format=geojson precision=0.00001 rfc7946 \
  -o target=regions supabase/seed/geo/regions.geojson format=geojson precision=0.00001 rfc7946
node --test "scripts/*.test.mjs"
```

## Geocoder snapshot: places and house numbers

`places.ndjson.gz` and `addresses.tsv.gz` feed our own geocoder (C6 §Geocoder, ADR-007; seeder `02-geo-places`). Written by `scripts/geo-places.mjs`, gzipped UTF-8, deterministic:

- `places.ndjson.gz`: one JSON object per line, sorted by `id`: `id` (GURS EID as a decimal string, a bigint beyond JavaScript number precision), `kind` (1 settlement, 2 city district, 3 street), `name`, `alt_name`, `search`, `search_alt`, `municipality_id` (= `municipalities.id`), `settlement_id` (streets only), `weight`, `point` (`[lng, lat]`), `geom` (GeoJSON MultiPolygon for settlements and districts, `null` for streets).
- `addresses.tsv.gz`: tab-separated with the header `place_id number suffix lng lat`, sorted by `place_id`, `number`, `suffix`; `place_id` is a street or, in settlements without streets, the settlement; `suffix` is empty when there is none.

### Source and licence

- Publisher: Geodetska uprava Republike Slovenije (GURS), as above.
- Datasets: Register prostorskih enot (RPE) layers `SI.GURS.RPE:NASELJA` (settlements), `SI.GURS.RPE:CETRTNE_SKUPNOSTI` (city districts), `SI.GURS.RPE:ULICE` (streets) and `SI.GURS.RPE:OBCINE` (municipality codes only) from `https://ipi.eprostor.gov.si/wfs-si-gurs-rpe/wfs`; house numbers `SI.GURS.KN:HISNE_STEVILKE` from `https://ipi.eprostor.gov.si/wfs-si-gurs-kn/wfs`. Data types: spatial units (settlements, city districts, streets) and house numbers.
- Data as of: 15 October 2026 (downloaded 2026-10-15T01:50Z; latest change in the settlements layer 2026-10-08, districts 2026-05-04, streets 2026-09-10, house numbers 2026-10-14).
- Licence: **CC BY 4.0**, https://creativecommons.org/licenses/by/4.0/, under the same GURS general terms as above (commercial use allowed with attribution, no warranty).

| Layer | Features | In the snapshot |
|---|---|---|
| `SI.GURS.RPE:NASELJA` | 6,035 | 6,035 settlements (kind 1) |
| `SI.GURS.RPE:CETRTNE_SKUPNOSTI` | 65 | 65 city districts (kind 2) |
| `SI.GURS.RPE:ULICE` | 10,499 | 10,498 streets (kind 3) |
| `SI.GURS.KN:HISNE_STEVILKE` | 580,251 | 580,251 addresses |

`node --test` checks the snapshot against the last column, so update it with the data.

### Attribution under place search

Content key `location.search_attribution` (P5), with `{data_date}` = the data-state date above:

- SL: Vir: Geodetska uprava Republike Slovenije, prostorske enote in hišne številke, stanje 15. 10. 2026 (CC BY 4.0)
- EN: Source: Surveying and Mapping Authority of the Republic of Slovenia, spatial units and house numbers, as of 15 October 2026 (CC BY 4.0)

"CC BY 4.0" links to the licence and "Geodetska uprava Republike Slovenije" to the imprint (P5), whose data sources chapter lists this dataset and says that the data were changed (see below).

### Changes made

- Names: `NAZIV` as published, except city districts: the prefixes "Četrtna skupnost ", "Četrt " and "Mestna skupnost " are removed (Šiška, Jezero, Litija), and the four names published in capitals or lower case get an initial capital (ČEČOVJE → Čečovje, JAVORNIK - ŠANCE → Javornik - Šance, TRG → Trg, dobja vas → Dobja vas). `alt_name` = `NAZIV_DJ`, the official Italian or Hungarian name (685 places: 54 settlements, 631 streets). `search` and `search_alt` = `normalisePlace` of the names (C6).
- `municipality_id`: `EID_OBCINA` mapped to the municipality code `SIFRA` of `SI.GURS.RPE:OBCINE`; `settlement_id` of a street: its `EID_NASELJE`.
- Polygons: simplified with mapshaper 0.7.70, weighted Visvalingam, 5 % of removable vertices kept, `keep-shapes`, each layer in its own topology so shared borders are simplified once; mean displacement 46 m (settlements) and 51 m (districts); coordinates rounded to 0.00001°; every polygon passes the validity check. They are not aligned with the simplified municipality borders above, so near a border a point can fall in no settlement (C6 then falls back to the municipality).
- Points: settlements and districts get the mapshaper inner point of the simplified polygon (always inside it); streets the point half way along the longest part of the street line. One street without geometry and without house numbers is dropped (Ravne, EID 110400000162251188).
- `weight`: house numbers per settlement (`EID_NASELJE`) or street (`EID_ULICA`); for a district, the house numbers inside its simplified polygon.
- Addresses: `place_id` = `EID_ULICA`, or `EID_NASELJE` for the 342,214 house numbers in settlements without streets; `number` = `HS_STEVILKA` (1–740), `suffix` = `HS_DODATEK` or empty; point rounded to 0.00001° (about 1 m). Building, postal area and the other attributes are dropped.

### Reproduce

```bash
node scripts/geo-places.mjs ../gurs-work   # downloads missing layers into ../gurs-work (house numbers in pages of 20,000), runs mapshaper there, writes both .gz files
node --test "scripts/*.test.mjs"
```

The work directory holds about 400 MB of raw GeoJSON; keep it outside the repository. On a refresh, update the data-state dates, the counts and the attribution lines above, and the `{data_date}` shown with `location.search_attribution`.
