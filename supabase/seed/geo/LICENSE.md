# GURS geo reference data: licence, attribution, processing

| File | Content |
|---|---|
| `regions.geojson` | 12 statistical regions: `id`, `slug`, `name_sl`, `name_en` |
| `municipalities.geojson` | 212 municipalities: `id`, `slug`, `name_sl`, `name_en`, `region_id` (→ `regions.id`) |

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
- Attributes: `id` = GURS code (`SIFRA`); `name_sl` = GURS name (`NAZIV`, kept as published, e.g. "Sveti Andraž v Slov. goricah"); `name_en` = `name_sl` for municipalities and the common English name for regions (Mura, Drava, Carinthia, Savinja, Central Sava, Lower Sava, Southeast Slovenia, Central Slovenia, Upper Carniola, Littoral–Inner Carniola, Gorizia, Coastal–Karst); `slug` = `name_sl` without diacritics, lower case, other characters replaced by `-`.
- Known source artefact: Ivančna Gorica and Žužemberk overlap by about 330 m² in the GURS data (about 400 m² after simplification). A point there matches both municipalities.

## Reproduce

```bash
WFS='https://ipi.eprostor.gov.si/wfs-si-gurs-rpe/wfs?service=WFS&version=1.0.0&request=GetFeature&outputFormat=application/json&srsName=EPSG:4326&typeName=SI.GURS.RPE:'
curl -o obcine.json "${WFS}OBCINE"
curl -o regije.json "${WFS}STATISTICNE_REGIJE"
npx --yes mapshaper@0.7.70 -i obcine.json regije.json combine-files \
  -join target=obcine source=regije largest-overlap fields=SIFRA prefix=region_ \
  -each target=obcine 'id=SIFRA, region_id=region_SIFRA, name_sl=NAZIV, name_en=NAZIV' \
  -each target=regije 'id=SIFRA, name_sl=NAZIV, name_en=["Mura","Drava","Carinthia","Savinja","Central Sava","Lower Sava","Southeast Slovenia","Central Slovenia","Upper Carniola","Littoral–Inner Carniola","Gorizia","Coastal–Karst"][SIFRA-1]' \
  -each target=obcine,regije 'slug=NAZIV.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")' \
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
