---
doc_id: DOC-01
title: Project Brief
version: 0.8
status: Draft
date: 2026-10-14
owner: Project Lead
audience: Client, team
approvals:
  - Client | Primož Božič | |
  - Project Lead | Claude | 2026-10-14 |
---

# Overview

Izgubljene živali (working name) is a web and mobile app that reunites lost cats and dogs with their owners in Slovenia. Owners report a lost pet. Finders, passers-by and shelters report found or sighted animals. The system matches the two sides by **chip number, photo similarity, location, time and attributes**, then connects the people through in-app chat. Today, lost-pet searching in Slovenia happens in scattered Facebook groups and on paper posters. Dogs have a central chip register (CRPsi), but cats have none, and shelters have no easy way to reach owners. Internal product of Signapps; the plan sketch is in `/readme.md`.

# Problem

- Owners of a lost pet have no single place to report it. Posts in Facebook groups get buried within hours.
- Finders don't know where to report a found animal and won't sign up for anything to do so.
- Shelters hold found animals (especially unchipped cats) without a way to find the owner. Kennels stay full, and municipalities pay for it.
- Scammers exploit panicked owners ("send money and I'll return your dog").

# Goals and success criteria

| ID | Goal | Measure | Target |
|---|---|---|---|
| G-1 | Reunite pets | Reunite rate of lost reports within 30 days | ≥ 25 % in pilot region |
| G-2 | Fast matching | Median time from report to first match suggestion | < 10 min when a matching found report exists |
| G-3 | Frictionless found reports | Time to submit a found report (no account) | < 60 s on mobile |
| G-4 | Shelter adoption | Pilot shelters actively uploading | 2–3 shelters in first 3 months |
| G-5 | Sustainable revenue | Paying users and supporters (boost, Premium, Podpornik, tips, ads, Vet Partner) | Revenue covers infrastructure + AI costs by month 6 |

# Audience

- **Primary:** pet owners in Slovenia (dogs and cats), aged 25–65, mostly mobile, often in a stressful hurry.
- **Secondary:** finders and passers-by (no account, one-off use), community members who want "lost pet near me" alerts, shelters, vets and municipalities (web portal, bulk upload).

# Value proposition

- One place that **actively matches**, instead of a feed you scroll: chip, photo AI and geo matching across owners, finders and shelters.
- A found report without an account in under a minute. AI pre-fills breed, colour and size from the photo.
- Safe contact: hidden phone numbers, in-app chat and reward escrow, which shut down scams.
- For shelters: free, less work, emptier kennels.

# Scope at a glance

- **In:**
  - Web (Next.js) and mobile (Expo: iOS and Android) on one shared monorepo
  - Accounts and pet profiles with chip numbers
  - LOST, FOUND and SIGHTED reports
  - Map and list with filters
  - Matching v1 (chip, geo, time, attributes) and v2 (image embeddings with vector search)
  - AI attribute pre-fill (vision model)
  - Push and in-app notifications and radius alerts
  - In-app chat, a printable QR poster, sharing
  - Shelter portal with bulk/CSV upload and a matches dashboard
  - **Monetisation model (client decision, 2026-10-15). People will pay a few euros when it works.** Stripe in test mode only.
    - **Free:** everything that gets animals home (see the free-forever list), incl. basic AI (breed/colour pre-fill, photo matching) and up to **2 pet profiles**.
    - **Voluntary support "Pomagajte nam izboljšati Najdimo"**, always optional: shown after a reunion, after a report and on the profile. €3 / **€5** (highlighted, not pre-selected) / €10 / custom; or monthly Podpornik from €2/month (badge).
    - **Boost €4.99** (fixed): 7 days of wider alert radius, top of the map, an auto-generated social post.
    - **Premium €2.99/month or €24.99/year:**
      - unlimited pet profiles
      - AI extras: AI-written listing and social posts SL/EN, AI poster designs, and an AI search plan (species and behaviour-based search guidance)
      - one-tap lost mode
      - 1 free Boost per year
      - **ad-free**
  - **Main goal: getting animals home. Everything that does that is free for everyone, forever:** reporting lost/found/sighted, the map and alerts, matching (chip, photo AI, attributes), chat, **the printable PDF poster with QR code** (the QR links to the public listing only), sharing, and chip lookup. Paid extras never gate any of these. Boost only adds reach on top of an already effective free alert radius.
  - **QR/NFC pet tags are out of scope for now** (physical and printable). A tag that links a pet to its owner feels too close to personal data; revisit later with a privacy-first design.
  - **Shelters (and municipalities) use everything for free, forever.** That includes the portal, bulk/CSV upload, matching, API and integrations, analytics, the adoption page and municipality reports. There is no paid shelter tier. Mission first: the goal is to help animals and keep the project self-sustaining, not to maximise profit.
  - **Vets: free for anything that reunites animals, paid for visibility.**
    - Free: reporting found animals brought to the clinic, chip lookup, matches and chat with owners.
    - **Paid "Vet Partner" subscription** (B2B, Stripe Billing with VAT invoices; indicative €29–49/month): a verified clinic profile (hours, 24h emergency badge, services, booking/phone link), featured placement in the "nearest vet" ad slots in its area, a mention in lost-pet alerts and posters for its region ("Need help? Nearest vet: …"), and a monthly stats report (views, clicks, reunions in the area). It is built on the ads infrastructure (M2) plus organisation profiles (M3).
    - Pet shops, groomers and insurers buy ads (see Ads).
  - **Support without premium (donation style):** the core stays free; we ask for voluntary support at emotional high points:
    - **"Reunited" thank-you:** after marking a pet reunited, offer a one-tap tip (€3 / €5 / €10 / custom). This is the highest-converting moment.
    - **Optional contribution when reporting:** a small, never pre-selected "help keep this free" (€2–5) on the lost-report confirmation screen.
    - **Monthly supporter ("Podpornik"):** €2–3/month, no features, only a supporter badge on the profile and listings.
    - **Finder's reward fee:** a small % platform fee when a reward is paid through escrow.
    - **Dohodnina:** if we operate as an eligible društvo or zavod, users can direct part of their income tax to us via eDavki at no cost to them. This needs a legal entity check.
    - Minimum card amount €2 (Stripe fixed fees); a transparent "where your money goes" page.
  - **Ads ("oglasi"), early (core-loop milestone)** so the client can start talking to companies (vets, pet shops, groomers, pet insurers, pet food brands). Revenue is expected only once there are users, so keep the first version cheap:
    - Sponsored placements in a few fixed, non-intrusive slots: listing feed (every N cards, clearly labelled "Oglas"), lost-pet detail page ("nearest 24h vet", "pet shop near you"), reunited/success screen, web sidebar. **Never inside the report-lost or report-found flow.**
    - Ads are targeted by region or municipality and by species. Admins create them (image, title, link, region, dates); no self-serve yet.
    - Until sponsors sign up, the slots show house ads: become a supporter, partner with us, adopt from a shelter.
    - Impression and click counting per ad, to report to sponsors.
    - A public **"Oglašujte pri nas / Partners"** page with live audience stats (users, active reports, reunions by region) and a contact form. This is the client's pitch tool.
    - Later: self-serve booking, Stripe invoicing, "founding partner" pricing.
  - **Analytics: Google Analytics 4 is core (from M1)**, on the web (gtag/GA4) and on mobile (Firebase Analytics, the same GA4 property, a separate data stream). It powers product decisions and the sponsor pitch:
    - **Consent Mode v2** with a proper cookie/consent banner (EU/SI: no analytics cookies before consent; modelled data when declined).
    - A custom event taxonomy:
      - core loop: `report_lost_start/submit`, `report_found_start/submit`, `match_suggested/confirmed`, `chat_started`, `reunited`
      - monetisation: `boost_purchase`, `donation`, `supporter_subscribe`
      - ads: `ad_impression`, `ad_click`
      - sharing and alerts: `share`, `poster_download`, `alert_opt_in`
    - Dimensions: region or municipality and species.
    - Ad impressions and clicks also go to our own DB (the source of truth for sponsor reports). GA is used for audience, funnels and geography.
    - The partners page shows audience stats (from our DB, optionally enriched from the GA Data API).
    - No personal data in events (no names, chip numbers, exact locations).
    - **Already configured on the GA4 property `559038055`** (web stream `G-PKY4SCX3RL`; admin via a service account, key in the gitignored `.secrets/`):
      - Retention is 14 months; Google Signals is off.
      - Event-scoped custom dimensions, which the code must send with exactly these parameter names: `municipality`, `region` (statistical region), `species` (dog|cat), `report_type` (lost|found|sighted), `ad_slot`, `ad_id`, `match_source` (chip|image|attributes).
      - User-scoped property: `user_role` (owner|finder|shelter|admin).
      - Key events: `report_lost_submit`, `report_found_submit`, `match_confirmed`, `reunited`, `donation`, `supporter_subscribe`, `boost_purchase`, `ad_click`.
      - Monetary events send `value` + `currency: "EUR"`.
  - **Maps and geo (no Google Maps):**
    - Map display: MapLibre GL with OpenFreeMap vector tiles (free, no key) on the web; MapLibre React Native on mobile (needs an Expo dev build).
    - Address search and reverse geocoding: MapTiler Geocoding (free tier, key `MAPTILER_API_KEY`), with a Photon/Nominatim fallback for dev.
    - Municipality and region lookup: done in PostGIS from GURS open boundary data (no API calls), and used for the `municipality`/`region` analytics dimensions and ad targeting.
    - Map attribution is shown as required by OSM/OpenFreeMap/MapTiler.
  - Moderation and reporting, an admin panel
  - Slovenian (default) and English
- **Out (non-goals) for this phase:**
  - Species other than dogs and cats
  - Countries other than Slovenia
  - Live payments
  - App Store and Play Store submission
  - QR/NFC pet tags (physical and printable): out of scope for now (privacy)
  - Official CRPsi integration (we link to it; integration later, subject to an agreement)

# Constraints

- **Budget:** lean; prefer free tiers (Supabase, Vercel, Expo EAS, OpenFreeMap tiles). AI calls are capped per upload.
- **Timeline:** MVP (M1) first, then AI and shelters, then monetisation; continuous delivery.
- **Regulatory / legal:**
  - GDPR: fuzzed public locations, owner data never exposed via chip lookup, export and delete.
  - EU Accessibility Act: WCAG 2.2 AA.
  - App-store IAP rules on mobile: they cover digital subscriptions (Premium, Podpornik), Boost and possibly tips or donations to a non-charity (R-003). In this phase mobile opens web checkout; a written decision comes before store release.
  - Animal-protection rules on found animals and shelter holding periods (to verify).
- **Technical:**
  - TypeScript monorepo (pnpm and Turborepo): `apps/web` (Next.js App Router), `apps/mobile` (Expo and Expo Router), shared `packages/*` (types, API client, validation, **design tokens**).
  - Backend: Supabase (Postgres, PostGIS, pgvector, Auth, Storage, Realtime, Edge Functions); EU region (Frankfurt).
  - **UI library:** shadcn/ui (Radix and Tailwind) on web, **React Native Reusables** (the shadcn port for React Native, on NativeWind) on mobile. Both are driven by **one shared token package** (CSS variables and a Tailwind preset), which the design team customises. The two sides use the same component vocabulary.
  - Maps: MapLibre with OpenFreeMap tiles (no key).
  - Hosting: Vercel (web), Supabase cloud, EAS (mobile builds).
  - Payments: Stripe (web, test mode) and RevenueCat or IAP later for mobile.
  - AI: a Claude vision model for attribute extraction; an image-embedding model for similarity (choose in technical design).
  - Local dev and tests must run without cloud credentials (local Supabase in Docker, mocked AI and Stripe).
- **Brand:**
  - No existing identity; the design team proposes a name, logo and palette.
  - Tone: warm, calm, hopeful and trustworthy, never cutesy-chaotic. Users are often panicked.
  - Mobile-first; strong accessibility; works outdoors in sunlight (contrast).

# References

- Competitors and inspiration: PawBoost, Petco Love Lost (photo matching), Pet FBI, Tasso.net (DE pet registry), Facebook groups such as "Izgubljeni psi Slovenija".
- Official registry: CRPsi (Centralni register psov, UVHVVR); Europetnet.
- No existing site, so no discovery audit or redirects needed.

# Open questions

| ID | Question | Owner | Blocking | Status |
|---|---|---|---|---|
| Q-001 | Final app name and brand | Client + design-lead | No (working name used) | Open |
| Q-002 | Supabase, Vercel and Stripe credentials or connectors for cloud deploy | Client | Blocks deploy only | Open |
| Q-003 | Anonymous found reports: rate limit only vs phone verification | Client | No (default: anonymous with rate limit and captcha) | Open |
| Q-004 | CRPsi cooperation / API access | Client | No | Open |
| Q-005 | Pilot shelters | Client | No | Open |
| Q-006 | Shelter holding-period rules and legal review of terms and privacy | Client / legal | Before public launch | Open |
| Q-007 | Apple Developer, Play Console and Firebase accounts for store builds and push | Client | Store release only | Open |
| Q-008 | Legal entity eligible for dohodnina; "donation" wording, VAT and accounting of contributions | Client / accountant | Before the transparency page and dohodnina section are enabled | Open |
| Q-009 | GA4 property and Firebase project access | Client | Real analytics data only | GA4 done (property 559038055); Firebase open |
| Q-010 | Should Premium or Podpornik users be ad-free? | Client | No | Decided: Premium is ad-free; Podpornik is not |
| Q-011 | Legal review of reward escrow and payment-services rules | Client / legal | Before any live use of escrow | Open |

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-14 | Initial plan sketch (readme.md) |
| 0.2 | 2026-10-14 | Brief written from the plan sketch and client decisions (UI library, stack, scope) |
| 0.3 | 2026-10-14 | Added donation-style support, early ads (oglasi), GA4 analytics (configured), maps/geo decisions; Q-008..Q-011 |
| 0.4 | 2026-10-14 | Shelter Pro removed: all shelter, vet and municipality features are free forever; mission-first principle |
| 0.5 | 2026-10-15 | Vets pay for visibility (Vet Partner subscription); reunite features stay free for vets; shelters and municipalities free |
| 0.6 | 2026-10-15 | Explicit free-forever list (poster PDF + QR, printable QR tag PDF, chip lookup); physical tag near cost |
| 0.7 | 2026-10-15 | QR/NFC tags removed from scope (physical and printable); the poster QR links to the public listing only |
| 0.8 | 2026-10-15 | Monetisation model: voluntary support (€5 suggested), Boost €4.99, Premium €2.99/€24.99 (unlimited pets, AI extras, ad-free); free = 2 pets + basic AI |
