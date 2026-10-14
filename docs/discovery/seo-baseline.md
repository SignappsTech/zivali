---
doc: discovery/seo-baseline
date: 2026-10-15
owner: Discovery Analyst
status: Draft (input for content-strategist and tech-lead); aligned with brief v0.9
---

# SEO baseline (Slovenian)

New product. No legacy URLs, so there is no site audit and no redirect map (see README).

## Method and limits

- **Signals used:** Google autocomplete (`hl=sl&gl=si`), checked 2026-10-14. Google Trends, geo SI, last 12 months, relative index. SERP spot checks.
- **No paid keyword tool:** there are no absolute monthly volumes (no Keyword Planner, Ahrefs or Semrush access). The tiers below are order-of-magnitude guesses. Verify them with Search Console after launch, or with Keyword Planner once the Ads account exists.
- **Trends calibration (12 m, SI):** `zavetišče` ≈ 5× `zavetišče ljubljana`. Measured against `zavetišče ljubljana` = 29: `čipiranje mačk` 1.4, `gps za psa` 1.1, `izgubljen pes` 0.9, `izgubljene živali` 0.8, and `najdene živali`, `pogrešane živali` and `izgubljena mačka` ≈ 0.
- **So:** "lost pet" search demand in Slovenia is **small and spiky**, roughly 1/30 of `zavetišče ljubljana` and 1/150 of `zavetišče`. Demand clusters around shelters, not around lost-pet terms. The real lost-pet traffic lives in Facebook groups (see competitors.md).

## Keyword map

Tier guess: **A** = thousands/month, **B** = hundreds, **C** = tens or fewer, spiky. Autocomplete = the city and region variants Google suggests (a proxy for real usage).

| Keyword family | Intent | Signal | Tier (guess) | Target page |
|---|---|---|---|---|
| zavetišče, zavetišče za živali + city | navigational (find the shelter, its contacts and animals) | biggest family by far. Autocomplete: ljubljana, horjul, maribor, turk, gmajnice, mala hiša, vitovlje, koper, celje, kranj, murska sobota, novo mesto, sevnica, trebnje, obalno | A | `/zavetisca`, `/zavetisca/{slug}` |
| zavetišče gmajnice najdene živali, zavetišče najdene živali | transactional (is my pet at the shelter?) | autocomplete present | B–C | shelter page + `/najdene-zivali/{lokacija}` |
| izgubljene živali + region/city | browse lost listings locally | autocomplete: maribor, ljubljana, kranj, celje, obala, novo mesto, domžale, savinjska, medvode, koper, ptuj, pomurje, posavje, murska sobota; also "prijava izgubljene živali", "aktual izgubljene živali" | C | `/izgubljene-zivali/{lokacija}` |
| najdene živali + city | browse found listings or a shelter list | autocomplete: ljubljana, novo mesto, murska sobota, maribor, kranj, celje | C | `/najdene-zivali/{lokacija}` |
| pogrešane živali + city | same as lost (regional media wording) | autocomplete: maribor, kranj, pomurje, radenci, "radio aktual pogrešane živali" | C | `/izgubljene-zivali/{lokacija}` (synonym in copy) |
| izgubljeni psi (+ facebook, ljubljana, slovenija) | browse; people expect FB groups | autocomplete present ("facebook" variant shows a FB habit) | C | `/izgubljeni-psi/{lokacija}` |
| izgubljen pes, izgubljen pes **kam poklicati** | urgent how-to (who to call) | Trends 0.9; "kam poklicati" variant | C | `/nasveti/izgubil-sem-psa` + CTA "Prijavi izgubljenega" |
| izgubljena mačka / izgubljene mačke / pogrešana mačka / izgubljena muca, izgubljen muc / mucek | browse or how-to (cats) | singular forms ≈ 0. Suggestions are dominated by HR/RS/BA queries (shared language noise) | C | `/izgubljene-macke/{lokacija}`, `/nasveti/izgubila-se-je-macka` |
| najden pes / najdena mačka / najdena muca | finder: what to do | single suggestion only | C | `/nasveti/nasel-sem-zival` + CTA "Prijavi najdeno" |
| kako najti izgubljeno mačko / izgubljenega psa | how-to | autocomplete present | C | the guides above |
| **čipiranje mačk** (+ 2026, zakon, kazen, subvencija, brezplačno, do kdaj, kje, cena, starost), ali je čipiranje mačk obvezno | informational, **rising** (law from 1 Jan 2027) | Trends 1.4 (> izgubljen pes). Spike Aug 2025 (law passed) | B by early 2027 | `/nasveti/cipiranje-mack` (evergreen + seasonal) |
| čipiranje psa (+ cena, zakon), mikročip pes | informational | autocomplete present | C | `/nasveti/cipiranje-psa` (or merge into the cats guide) |
| centralni register psov, **vpogled v centralni register psov**, register hišnih živali, crpsi | find the official chip lookup | autocomplete present; "crpsi" mostly noise (medical) | C | `/nasveti/vpogled-v-register` (links to the official lookup) |
| gps za psa / za mačko, gps ovratnica, ploščica z imenom za psa, obesek za psa z imenom | commercial (prevention) | Trends 1.1; many variants | B–C | sponsor slots (pet shops, GPS trackers) + `/nasveti` prevention guide (QR/NFC tags are out of scope since brief v0.7) |
| posvojitev psa / mačke (+ city, iz zavetišča) | commercial (adopt) | autocomplete strong | B | out of scope: house ad and links to shelter pages |
| lost dog slovenia, lost cat ljubljana | EN | no suggestions | C | `/en/...` hubs (low priority) |

**Language notes**
- Slovenian **gender and number agreement** matters: izgubljen **pes** / izgubljena **mačka** / izgubljeni **psi** / izgubljene **mačke** / izgubljene **živali**. A path like `/izgubljeni/pes/` is ungrammatical for cats (`/izgubljeni/macka/`). Use whole-phrase plural slugs.
- People use the plural for browsing ("izgubljene živali Maribor") and the singular for their own case ("izgubljen pes kam poklicati").
- Regional names are colloquial: **obala, pomurje, posavje, savinjska, gorenjska**, plus štajerska, dolenjska, prekmurje. Map them to the 12 statistical regions in copy, titles and synonyms.
- "Pogrešane živali" is media wording (Radio Aktual, regional portals). Use it as a synonym in titles and descriptions; it does not need its own URL.
- Seasonality: data is too sparse in Trends. Shelter data shows a clear **New Year peak**:
  - Gmajnice (Ljubljana): holiday intake about **+50 %**; the last 10 days of the year bring almost a month's usual dogs, mostly fireworks plus pets left with sitters. Almost all were returned.
  - Horjul (21 municipalities): **3 dogs a day** from 28 Dec to 2 Jan, against about 15 animals a month otherwise.
  - Source: a 24ur.com report quoting both shelters, date unverified.
  - Plan a December campaign and capacity for it. Summer storms are a likely second peak (assumption).

## URL structure recommendation

Principles: whole-phrase SL slugs that match queries; ASCII without diacritics (`macke`, `skofja-loka`); one location namespace; short stable detail URLs for QR codes; next-intl `pathnames` (SL unprefixed, EN under `/en`), as in C15.

| Page | SL path | EN path | Index rule |
|---|---|---|---|
| Lost hub (all SI) | `/izgubljene-zivali` | `/en/lost-pets` | index |
| Lost hub by location | `/izgubljene-zivali/{lokacija}` | `/en/lost-pets/{location}` | see thin-content rule |
| Lost dogs / cats | `/izgubljeni-psi/{lokacija?}`, `/izgubljene-macke/{lokacija?}` | `/en/lost-dogs/…`, `/en/lost-cats/…` | see rule |
| Found hub (found + sighted, labelled) | `/najdene-zivali/{lokacija?}` | `/en/found-pets/…` | see rule |
| Found dogs / cats | `/najdeni-psi/{lokacija?}`, `/najdene-macke/{lokacija?}` | `/en/found-dogs/…`, `/en/found-cats/…` | see rule |
| Report detail | **keep `/r/{code}`** (C15) | `/en/r/{code}` | open: index; closed > 30 d: 410 (already planned) |
| Shelter directory | `/zavetisca`, `/zavetisca/{slug}` | `/en/shelters/…` | index (evergreen) |
| Guides | `/nasveti/{slug}`: `izgubil-sem-psa`, `izgubila-se-je-macka`, `nasel-sem-zival`, `cipiranje-mack`, `vpogled-v-register`, `petarde-in-zivali` | `/en/guides/…` | index |
| Map | `/zemljevid` (C15) | `/en/map` | index the shell; list hubs carry the SEO |

**`{lokacija}`**: one namespace with 12 statistical regions plus 212 municipalities (GURS names, ASCII slugs: `ljubljana`, `novo-mesto`, `murska-sobota`, `obalno-kraska`, `gorenjska`). Region slugs win on a collision; add the suffix `-regija` if one ever occurs. These are the same entities as the `region` / `municipality` analytics dimensions and ad targeting, so there is one dataset for everything.

**Thin-content rule:** 2 types × 3 species × 225 locations ≈ 1,350 possible hub URLs.
- **Index** the national hubs, the 12 regions and the 12 city municipalities (mestne občine). Their evergreen block is the responsible shelter, what to do, and nearby shelters.
- **Index** any other hub while it has ≥ 3 open listings in the last 90 days.
- Otherwise use `noindex,follow` and keep the page out of the sitemap.
- Filters (colour, size, date) are query params: `noindex,follow`, canonical to the base hub.
- Pagination is `?stran=N`, self-canonical.

**Why keep `/r/{code}` for detail pages** (and not `/izgubljen/pes/ljubljana/luna-…`):
- Listings live ≤ 90 days.
- Owners edit the name or area, which would cause slug drift and redirects.
- QR posters need a short URL.
- URL keywords are a weak ranking signal.

Put the keywords in the title, H1 and breadcrumbs instead:

- Title: `Izgubljen pes · Luna, labradorec · Ljubljana (Bežigrad) · 12. 10. 2026 | Najdimo`
- H1: `Izgubljen pes Luna, Ljubljana Bežigrad`
- Breadcrumb: `Domov › Izgubljeni psi › Osrednjeslovenska › Ljubljana › Luna`. This links every detail page to its hubs, and that internal linking is what makes the hubs rank.

**Structured data**
- schema.org has no LostPet type, and no rich result exists for it.
- Hubs: `CollectionPage` + `ItemList` + `BreadcrumbList`.
- Details: `BreadcrumbList` (+ `ImageObject`). Do not fake `Event`, `Product` or `JobPosting`.
- Shelter pages: **`AnimalShelter`**, a schema.org LocalBusiness subtype, with address, phone, opening hours and areaServed = municipalities. Make clear in copy that it is a directory entry and not the shelter's own site, unless the shelter is a partner.
- Home: `Organization` + `WebSite`.

**Sitemaps:** an index split into `sitemap-hubs.xml` (indexable hubs only), `sitemap-reports.xml` (open reports, `lastmod`), `sitemap-shelters.xml` and `sitemap-guides.xml`.

## Biggest organic opportunities (ranked)

1. **Shelter directory + "responsible shelter per municipality".** It targets the largest query family (`zavetišče` + city) and answers "izgubljen pes kam poklicati". Few sites list which shelter serves which municipality; shelter sites list only their own. The data source is the UVHVVR shelter register and the yearly municipal reports (see regulatory.md R-07).
2. **`/nasveti/cipiranje-mack` before 1 Jan 2027.** Interest in the new cat-chipping law is rising. The page converts to pet profiles with the chip number and alerts.
3. **Regional lost/found hubs.** Low volume, but they match how people phrase queries ("izgubljene živali Maribor") and they collect long-tail traffic from listings.
4. Guides for "kam poklicati" and "kaj storiti, ko najdem psa", with the legal duties explained (24 h finder, 3 days for the owner).

Sources: Google autocomplete and Google Trends (SI), 2026-10-14; schema.org/AnimalShelter.
