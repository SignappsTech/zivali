---
doc: discovery/README
date: 2026-10-15
owner: Discovery Analyst
mode: full
status: Draft; aligned with brief v0.9 (Najdimo; shelters, municipalities and reunite features free; Vet Partner paid; no QR tags; Boost €4.99; Premium €2.99/€24.99; offline + geofence alerts)
---

# Discovery: Najdimo

| File | Content |
|---|---|
| [competitors.md](competitors.md) | International references (PawBoost, Petco Love Lost, Pet FBI, TASSO, FINDEFIX, Pet Alert, DogLost, ASUK, Ring, AI apps, Austria) and SI/regional (FB groups, Radio Aktual, 6 shelters, CRPsi/CRHŽ flow, izgubljenpas.com, K9): core loop, matching, monetisation, good, what we beat; SI market gaps |
| [seo-baseline.md](seo-baseline.md) | Slovenian keyword map (intent, volume signals) and the URL structure recommendation |
| [regulatory.md](regulatory.md) | Chipping (dogs, cats 2027, EU 2026), register, holding/reclaim, costs, municipal duties, dohodnina, **Vet Partner ad labelling (ZVPot-1/UCPD)**, with sources and confidence. **Input for the legal check, not legal advice** |
| site-audit.md, redirects.csv, content-inventory.md | **N/A**: new product, no existing site |

## Top 5 insights

1. **Cats are the real problem, and the law is about to change for them.**
   - About 90 % of shelter lost and found listings are cats: Gmajnice had 65 of 72 found and 196 of 214 lost on 2026-10-14.
   - Chipped dogs mostly go home within 24 h through the register.
   - **Cat chipping is mandatory from 1 Jan 2027** (ZZZiv 6.a), with the state paying vets up to €30 per cat in the transition. The EU dog and cat traceability regulation (April 2026) follows.
   - Design and marketing should be cat-first. Publish the `čipiranje mačk` guide before 1 Jan.
2. **There is no public chip lookup.**
   - UVHVVR shut down "Javni vpogled" (the old CRPsi public lookup) at the end of June 2026, and the replacement has no date.
   - Our FR-002 and FR-016 links point to nothing.
   - Our own chip index (pet profiles ↔ found reports ↔ intakes) is now the only self-service chip matching in SI. It is also the pitch for Q-004: an owner-consented relay, as TASSO does.
3. **The reclaim window is 8 days, not 30** (ZZZiv 30, to verify).
   - After 8 days, an unclaimed animal may be rehomed.
   - Owners pay up to 60 days of care. Municipalities pay up to 60 days when the owner is unknown, then the state.
   - An intake ↔ lost-report match is urgent, and it saves municipalities money.
4. **Only 17 registered shelters serve all 212 municipalities, and they publish found animals inconsistently.**
   - None publishes where or when an animal was found, none matches, and lost reports go by phone or email.
   - Gmajnice serves 13 municipalities and Horjul 21. Each municipality reports its shelter to UVHVVR by 31 March.
   - A **municipality → responsible shelter** directory plus intake upload is our biggest utility gap-filler and our biggest SEO asset (`zavetišče` + city is the largest query family).
5. **Demand lives on Facebook and radio, not on Google.**
   - `izgubljen pes` gets about 1/150 the search interest of `zavetišče`.
   - People post their phone numbers publicly in FB groups and on Radio Aktual "Živalski radio" (read on air twice a day, sponsored by Mr. Pet).
   - No SI lost-pet site or app exists.
   - Acquisition means share kits, shelters, posters and a media partner. Our **geofence proximity alerts** and the **offline found-report queue** exist in no reference product.

## SEO URL recommendation (summary)

- Use plural Slovenian slugs that match how people search, and keep the short `/r/{code}` detail URL from C15.
- Hubs: `/izgubljene-zivali/{lokacija}`, `/izgubljeni-psi/{lokacija}`, `/izgubljene-macke/{lokacija}`, `/najdene-zivali/…`, `/najdeni-psi/…` and `/najdene-macke/…`, where `lokacija` is one of 12 regions or 212 municipalities (ASCII slugs).
- Add a shelter directory `/zavetisca/{slug}` (AnimalShelter JSON-LD) and guides `/nasveti/{slug}`.
- Index the national, regional and city-municipality hubs. Index other hubs only while they have ≥ 3 open listings; otherwise `noindex,follow`. Filters are `noindex`; pagination is `?stran=N`.
- Details in seo-baseline.md.

## Implications for product (CHANGE suggestions)

| # | CHANGE | Why | Owner |
|---|---|---|---|
| 1 | `CHANGE docs/02-product-requirements.md§FR-002 R-002.5, §FR-016 R-016.2 + AC, §A-003; docs/01-project-brief.md§References, Q-004`: replace "link to the official CRPsi lookup" with "Ask a vet or the responsible shelter to read the chip", plus the responsible-shelter contact. Keep the lookup URL in config, off, for when UVHVVR relaunches. Rename **CRPsi → CRHŽ** (centralni register hišnih živali) everywhere. Q-004: pitch UVHVVR an owner-consented relay. | regulatory R-16 | product-manager |
| 2 | `CHANGE 02§FR-002 R-002.1`: make the chip equally prominent for cats. Add "Is the chip registered in CRHŽ with your current phone?" (yes / no / don't know) and a reminder to update it at the vet. Add attributes **ear tip** (sterilised free-living cat) and **indoor/outdoor**. | R-05, R-09, R-10; ~90 % of shelter listings are cats | product-manager |
| 3 | `CHANGE 02§FR-005`: after submit, show a checklist: report the escape to the vet or the **responsible shelter within 3 days** (dogs; cats from 2027) and to the nearest shelter within 72 h, with one-tap call. Never claim the app replaces this. | R-02, R-03 | product-manager |
| 4 | `CHANGE 02§FR-006`: **after** submit (keeps < 60 s), show "Najdbo v 24 urah prijavite pristojnemu zavetišču" with call buttons and "any vet or shelter can read the chip". M3 option: send the report to a partner shelter. Also works from the offline queue (FR-042) once sent. | R-04, R-16 | product-manager |
| 5 | **New FR** (or extend FR-015/FR-019): a **municipality → shelter directory** (212 → 17; source: the UVHVVR register plus municipal reports), editable in admin and refreshed yearly after 31 March. It powers changes 3 and 4, `/zavetisca` and the SEO hubs. | R-08, R-15 | product-manager → tech-lead |
| 6 | `CHANGE 02§FR-015 R-015.2, §A-004; 01§Q-006`: set the default holding period to **8 days** (configurable). Add a dashboard countdown ("dni do možne oddaje") and urgent intake-match alerts. Make the shelter upload include **found location and time** (shelters do not publish these today). Pilot shelters: **Gmajnice (Ljubljana)** and **Maribor**. | R-06; competitors §B | product-manager |
| 7 | `CHANGE 02§FR-024, §A-018; 01§Q-008`: dohodnina needs an **NGO with public-interest status** listed in AJPES. A new društvo or zavod could qualify around 2029 (first payout around 2030), and Signapps d.o.o. never can. Proposal: a **partner-NGO model**, or move it to a later phase. | D-01…D-05 | product-manager + client |
| 8 | `CHANGE 02§FR-029, §FR-031, §FR-018`: ad blocklist with **no ads for selling or giving away animals**. ZZZiv 10(3) makes the ad-space provider verify chip data. Moderation removes "podarim/prodam" listings. | R-11 | product-manager |
| 9 | `CHANGE 02§FR-028 R-028.5, §FR-030 R-030.1; content slice P18`: Vet Partner labelling. Every paid placement says **"Oglas"**, including on the printed poster line. **Do not call a paid clinic "najbližji / nearest"** unless it truly is; use "Veterinar v vaši regiji (oglas)". Add a "Kako razvrščamo" link by the vet slot. **No paid vet line in alert emails or push without marketing consent.** The Vet Partner terms cover ranking rules, accurate 24 h and opening-hours claims, and the clinic's compliance with professional rules. | regulatory §Vet Partner (ZVPot-1 50(2), 51 pt 12; ZEPT 6; ZEKom-2 226) | product-manager → content-strategist, tech-lead (C14) |
| 10 | `CHANGE 02§FR-035 R-035.4; docs/tech/contracts/C15-routes-deeplinks.md`: add the hub, `/zavetisca` and `/nasveti` routes, the thin-content index rule, and AnimalShelter JSON-LD on shelter pages (an exception to "LocalBusiness N/A"). | seo-baseline | product-manager → tech-lead, content-strategist |
| 11 | `CHANGE 02§FR-011 R-011.2, §FR-025 R-025.2, §FR-040`: an FB-ready share kit (SL text + square image + **list of regional FB groups** + Radio Aktual's form). The client inventories the group names and admins (sizes unverified). Partners for the GTM plan: Radio Aktual (feed), Mr. Pet (first "Oglas" prospect), K9 iskanje pogrešanih (search help), pet insurers (they pay for owner Boosts, as ASUK does), a December fireworks campaign (holiday intake +50 %). | competitors §B; seo seasonality | product-manager, client |
| 12 | `CHANGE 02§FR-025, §FR-026`: the €4.99 one-off Boost and the €2.99/€24.99 Premium sit well below references (Pet Alert €25/€49 one-off, FB boost €30–100; PawBoost about $10+ a week). That fits the mission-first stance. Keep **no auto-renew on Boost and auto-stop on reunion**, and keep scam filtering and masked contact free (Pet Alert paywalls them). | competitors §A | product-manager (confirm only) |

## Risks

- **R-06 (8 days) and R-03/R-04 (72 h / 24 h)** come from older texts, and PISRS could not be machine-read. Do not state them as law in copy before the legal check (Q-006).
- **The public CRHŽ lookup may return** in a new form. Keep it behind config.
- **Shelter contracts are in flux** (stricter capacity rules by 20 Aug 2027; cancellations in 2025–26), so the municipality → shelter data needs a yearly refresh.
- **Ad-labelling interpretation** (V-02: is a location-triggered slot a "search query"? V-07: alert emails) needs a lawyer's view before Vet Partner goes live.
- Keyword volumes are relative only. FB group sizes are unverified.
