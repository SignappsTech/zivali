---
doc: discovery/README
date: 2026-10-15
owner: Discovery Analyst
mode: full
status: Draft
---

# Discovery: Izgubljene živali (working brand "Najdimo")

| File | Content |
|---|---|
| [competitors.md](competitors.md) | International and SI/regional competitors: core loop, matching, monetisation, what's good, what we beat |
| [seo-baseline.md](seo-baseline.md) | Slovenian keyword map with intent and volume signals, URL structure recommendation |
| [regulatory.md](regulatory.md) | Chipping, register, holding period, municipal duties, dohodnina, with sources and confidence. **Input for the legal check, not legal advice** |
| site-audit.md, redirects.csv, content-inventory.md | **N/A**: new product, no existing site (brief §References) |

## Top insights

1. **Cat chipping is mandatory from 1 Jan 2027** (ZZZiv 6.a, as amended by ZZZiv-G).
   - Cats go into the same central register as dogs. The register is called **CRHŽ** (centralni register hišnih živali); "CRPsi" is the old name.
   - The state pays vets up to €30 per cat during the transition.
   - The EU dog and cat traceability regulation (adopted April 2026) adds chip and register duties EU-wide.
   - Chip matching becomes the main path for cats too, and "čipiranje mačk" is the fastest-rising related search.
2. **No public chip lookup exists right now.** UVHVVR shut down "Javni vpogled v podatke o hišnih živalih" at the end of June 2026 for security reasons, and a renewed service has no date. Finders can only get a chip read by a vet or a shelter. Our links to "the official CRPsi lookup" (FR-002 R-002.5, FR-016 R-016.2) point to nothing. This also makes our own chip matching (pet profiles ↔ found reports) more valuable.
3. **The reclaim window is 8 days, not 30** (ZZZiv 30, to verify).
   - After 8 days in a shelter, an unclaimed animal may be rehomed. Shelters must call chipped owners within 24 h (ZZZiv 29).
   - Owners pay the costs (up to 60 days), and municipalities pay for unknown owners.
   - A match between a shelter intake and an open lost report is therefore urgent, and it saves municipalities money.
4. **Only 17 registered shelters serve all 212 municipalities** (UVHVVR register, Feb 2026).
   - Covering the whole country is feasible.
   - Each municipality must report its shelter(s) to UVHVVR by 31 March, and must meet new capacity rules by 20 Aug 2027. Several shelters cancelled contracts in 2025–26.
   - A "responsible shelter for this municipality" lookup is missing in the market. It is our strongest utility feature and our strongest SEO asset.
5. **Demand lives on Facebook and radio, not on Google.**
   - Lost-pet search volume is tiny: `izgubljen pes` ≈ 1/150 of `zavetišče`.
   - FB groups and Radio Aktual "Živalski radio" (read on air twice a day, sponsored by Mr. Pet) are the channels people use today.
   - No SI site combines matching, a map, safe contact and shelter intake.
   - Acquisition means share kits, posters, shelters and a media partner. The organic play is shelter directory pages plus guides.

## Implications for product (CHANGE suggestions)

Format: `CHANGE <file>§<id>: <change>` → owner.

| # | CHANGE | Why | Owner |
|---|---|---|---|
| 1 | `CHANGE docs/02-product-requirements.md§FR-002 R-002.5, §FR-016 R-016.2, §A-003; docs/01-project-brief.md§References, Q-004`: replace "link to the official CRPsi lookup" with "Ask a vet or the responsible shelter to read the chip", plus the responsible-shelter contact. Keep the lookup URL in config, off by default, for when UVHVVR relaunches. Rename CRPsi → **CRHŽ** in all docs and copy. Q-004 now has a stronger pitch: offer UVHVVR an owner-consented contact relay (the TASSO model). | R-16 | product-manager |
| 2 | `CHANGE 02§FR-002 R-002.1/2`: make the chip equally prominent for cats; add "Is the chip registered and your phone up to date in CRHŽ?" (yes / no / don't know) with a reminder to update at the vet. Shelters call the register contacts, so outdated contacts are a key failure point. Add attributes **ear tip (prirezan uhelj = sterilised free-living cat)** and **indoor/outdoor cat**. | R-05, R-09, R-10; found cats reunite at half the rate of dogs (PawBoost) | product-manager |
| 3 | `CHANGE 02§FR-005`: after submit, show a legal checklist: report the escape to the vet or **responsible shelter within 3 days** (dogs; cats from 2027), and to the nearest shelter within 72 h, with one-tap call. The app never claims to replace these reports. Possible event `shelter_contact_click`. | R-02, R-03 | product-manager |
| 4 | `CHANGE 02§FR-006`: **after** submit (to keep the < 60 s target), show "Po zakonu najdbo v 24 urah prijavite zavetišču" with the responsible shelter's call button and "the chip can be read by any vet or shelter". Option for M3: "Send this report to the shelter for me" (email to partner shelters). | R-04, R-16 | product-manager |
| 5 | **New FR** (or extend FR-015/FR-019): a **municipality → shelter directory** dataset (212 → 17; source: UVHVVR register plus municipal reports), editable in admin. It powers changes 3 and 4, the shelter pages and the SEO hubs. | R-08, R-15, SEO #1 | product-manager → tech-lead |
| 6 | `CHANGE 02§FR-015 R-015.2, §A-004; 01§Q-006`: set the default holding period to **8 days** (configurable). Add a shelter dashboard countdown ("dni do možne oddaje") and urgent intake-match alerts (push + email; SMS later). Consider raising G-4: 17 shelters in total, and Ljubljana plus Maribor cover a large share. | R-06, R-15 | product-manager |
| 7 | `CHANGE 02§FR-024, §A-018; 01§Q-008`: dohodnina needs an NGO with **public-interest status** listed in AJPES. A new društvo or zavod cannot qualify before ~2029 (first payout ~2030), and Signapps d.o.o. never can. Proposal: a **partner-NGO model** (promote 1 % for a partner animal-protection NGO that already has the status), or move it to a later phase. | D-01…D-05 | product-manager + client |
| 8 | `CHANGE 02§FR-029/FR-031, §FR-018`: ad policy blocklist with **no ads for selling or giving away animals** (breeders, "podarim/prodam"). ZZZiv 10(3) makes the ad-space provider verify chip data. Moderators remove user listings that offer animals. | R-11 | product-manager |
| 9 | `CHANGE 02§FR-035 R-035.4; docs/tech/contracts/C15-routes-deeplinks.md`: add hubs `/izgubljene-zivali/{lokacija}`, `/izgubljeni-psi/…`, `/izgubljene-macke/…`, `/najdene-zivali/…` (+ dogs, cats), `/zavetisca/{slug}` and `/nasveti/{slug}`; keep `/r/{code}`; add the thin-content index rule; add **AnimalShelter** JSON-LD on shelter pages (an exception to "LocalBusiness N/A"). | seo-baseline.md | product-manager → tech-lead, content-strategist |
| 10 | `CHANGE 02§Content`: guides `/nasveti/cipiranje-mack` (publish **before 1 Jan 2027**), `izgubil-sem-psa` (answers "kam poklicati"), `nasel-sem-zival`, `vpogled-v-register`, and a December `petarde-in-zivali` campaign. | SEO, R-09 | content-strategist |
| 11 | `CHANGE 02§FR-011 R-011.2`: an FB-ready share kit (pre-written SL text + square image + a list of the regional FB groups and Radio Aktual's form as links). Facebook is where the demand is. | competitors §B | product-manager |
| 12 | `CHANGE 02§FR-025, §FR-026, §A-007`: confirm **one-off pricing, no auto-renew, auto-stop on reunion** (PawBoost is criticised for auto-renew). Price anchors: Pet Alert €25/€49 one-off and FB boost €30–100; our €9 Boost is low and could rise to €15–19. Keep scam filtering and masked contact free (Pet Alert paywalls them, and gets scam warnings). | competitors §A | product-manager |
| 13 | **Partners** (client, not a FR): Radio Aktual "Živalski radio" (feed listings to the on-air slot); Mr. Pet (already sponsors lost pets: first "Oglas" prospect); pet insurers (pay for owner boosts, the ASUK model); municipalities (cost pressure, Aug 2027 deadline: a B2G angle for Shelter Pro or a municipal dashboard). | competitors, R-07, R-08 | client |

## Risks

- **Legal facts R-06 (8 days) and R-03/R-04 (72 h / 24 h)** come from older texts; PISRS could not be machine-read. Copy must not state them as law until the legal check (Q-006) confirms them.
- **The public lookup may come back** (UVHVVR's "renewed form") and change change 1. Keep it behind config.
- **Shelter contracts are changing** (2025–27), so the municipality → shelter data needs a yearly refresh (after the 31 March reports).
- Keyword volumes are relative only, with no absolute numbers. Verify with GSC after launch.
