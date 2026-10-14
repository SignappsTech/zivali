# Izgubljene živali: lost pet finder

Web and mobile app that reunites lost cats and dogs with their owners. Owners report a lost animal, finders and shelters report found animals, and the system matches them by photo, chip number and location.

Launch market: Slovenia (then the region and the EU). Launch species: dogs and cats.

---

## 1. Core idea in one loop

```
Owner reports LOST ──┐
                     ├──► Matching engine (chip, photo similarity, location, time, attributes)
Finder / shelter     │              │
reports FOUND ───────┘              ▼
                          "Possible match" alert → owner confirms → contact via in-app chat → REUNITED
```

Everything else (alerts, posters, AI, shelters, payments) exists to feed this loop or speed it up.

---

## 2. Users

| Role | What they do |
|---|---|
| **Owner** | Pre-registers pets (optional, "pet profile"), reports a lost pet, gets match alerts |
| **Finder / passer-by** | Reports a found or sighted animal in about 30 seconds: photo + location, no account required at first |
| **Community member** | Gets push alerts for lost pets nearby, shares listings, reports sightings |
| **Shelter / vet / municipality** | Bulk-uploads found and intake animals, scans chips, sees matches |
| **Admin / moderator** | Handles moderation, scam reports, verifies shelters |

---

## 3. Features by phase

### MVP (phase 1): make the loop work
- Account (email, Google or Apple sign-in, phone optional)
- **Pet profile**: name, species, breed, colour/markings, sex, age, size, chip number, collar, photos (min. 1, ideally 3–5 from different angles), special notes (medication, temperament)
- **Report LOST**: select a pet profile (or create one on the spot), last-seen location on a map plus radius, date and time, circumstances
- **Report FOUND / SIGHTED**: photo, location (auto from GPS/EXIF), time, "I have the animal" vs "I only saw it". Works without an account, which matters a lot for conversion
- **Map + list** of lost and found animals with filters (species, distance, date, colour, size)
- **Matching v1**: exact chip match, then species + location radius + time window + colour/size
- **Notifications**: "possible match" for owners; "lost pet near you" for users within X km
- **In-app chat** between owner and finder (no phone number shown publicly, which protects against scammers)
- **Printable poster** PDF with a QR code linking to the listing
- **Share** to Facebook groups and WhatsApp (Slovenia has lots of "izgubljeni psi" FB groups, and we want to pull traffic from them)
- Mark as **Reunited** (success stories are good for marketing)

### Phase 2: AI + shelters
- **AI on upload** (vision model): detects species, likely breed(s), coat colour and pattern, size, and pre-fills the form. The user only confirms.
- **Image similarity matching**: an embedding per photo, then vector search over found animals near the lost location (and the reverse). Ranked "closest matches" list.
- **Shelter portal (web)**:
  - bulk upload (photos + chip + intake date + location found)
  - CSV import / simple API for shelters that already have software
  - automatic matching against all lost reports, with a dashboard of "probable owners"
  - "adoptable" listing as an extra (more value for shelters, more reasons to come back)
- **Chip lookup flow**: a shelter or vet enters a chip number. If it's in our DB, they see that the owner is notified (no personal data shown). If it isn't, we point to the official registry.
- Sighting trail: multiple sightings shown as a path on the map

### Phase 3: growth + monetisation
- Premium features (see section 5)
- QR / NFC smart tags (physical product)
- Partnerships: vets, pet shops, insurers
- More species, more countries, multiple languages (SI, HR, EN, DE, IT)

---

## 4. Chip numbers and shelters: how it fits

- **Dogs in Slovenia** must be microchipped and registered in the central dog register (CRPsi, run by UVHVVR). Shelters and vets can already look up dog chips there, **so we don't replace it**; we complement it.
- **Cats** mostly aren't in any central register, and this is our real gap and opportunity. A cat chip registered with us = findable.
- Value for shelters (why they'd use us):
  1. Free and less work: one photo upload, and we do matching plus the owner outreach
  2. They empty kennels faster (cost saving for the shelter and the municipality)
  3. Visibility for adoptions
- **To verify early (legal/partnerships):** shelter obligations for found animals (holding period, municipal contracts), whether we can integrate with CRPsi or get read access, and how to link to EU registries (Europetnet).
- Go-to-market: start with **2–3 shelters** (e.g. Ljubljana region) as pilot partners, onboard them by hand, and use their data so the app isn't empty on day 1.

---

## 5. Monetisation

**Rule: never paywall the core "help me find my pet" loop.** That's an ethics problem and a PR problem. Charge for convenience, reach and peace of mind.

| Stream | Who pays | Notes |
|---|---|---|
| **Boost listing** | Owner | One-off (€5–15): push alert to a bigger radius and more users, top of map, auto-posts to social. The most natural thing to pay for in a panic moment |
| **Premium subscription** "Protect" | Owner | ~€2–3/month or ~€20/year: multiple pets, instant alerts, AI continuous matching against all new shelter intakes, vet records storage, lost mode in 1 tap |
| **QR / NFC smart tag** | Owner | Physical tag (€10–20). Scanning it opens the pet profile and notifies the owner with the finder's location. Good margin, good marketing |
| **Shelter Pro** | Shelter / municipality | Basic is free. Paid: integrations, API, analytics, adoption page, reports for municipality contracts |
| **Sponsored / local ads** | Vets, pet shops, insurers | Non-intrusive, local ("nearest 24h vet"). Pet insurance referral fees are a good fit |
| **Donations / reward escrow** | Owners, community | Optional finder's reward held in-app (prevents "pay first" scams); small fee |

Payments: Stripe (web) and in-app purchases (App Store / Google Play), since digital subscriptions in mobile apps must go through IAP. Physical tags can go through Stripe.

---

## 6. Tech stack (proposal)

| Layer | Choice | Why |
|---|---|---|
| Mobile | **React Native + Expo** | One codebase for iOS and Android; camera, GPS and push are easy |
| Web | **Next.js** | SEO for public listings (people Google "izgubljen pes Kranj"), shelter portal |
| Shared | Monorepo (Turborepo/pnpm), shared TS types + API client | |
| Backend / DB | **Supabase** (Postgres + Auth + Storage + Realtime) | Fast to build; chat via Realtime |
| Geo | **PostGIS** | "within X km", radius alerts |
| Image matching | **pgvector** + image embeddings (CLIP / DINOv2-style model) | Similarity search in the same DB |
| AI attributes | Vision LLM (e.g. Claude) for breed/colour/description pre-fill | Structured JSON output → form fields |
| Push | Expo Notifications (FCM/APNs) | |
| Maps | Mapbox or MapLibre + OSM tiles | Cheaper than Google at scale |
| Payments | Stripe + RevenueCat (for IAP) | |
| Hosting | Vercel (web), Supabase cloud, small worker for AI jobs | |

### Core data model (rough)
```
users(id, name, email, phone, home_location, alert_radius_km, plan)
pets(id, owner_id, species, name, breeds[], colors[], pattern, size, sex, birth_year, chip_number, notes)
pet_photos(id, pet_id | report_id, url, embedding vector, ai_attributes jsonb)
reports(id, type LOST|FOUND|SIGHTED, pet_id?, reporter_id?, location geography, radius_m,
        happened_at, status OPEN|MATCHED|REUNITED|CLOSED, has_animal bool, boosted_until)
matches(id, lost_report_id, found_report_id, score, reasons jsonb, status SUGGESTED|CONFIRMED|REJECTED)
organizations(id, type SHELTER|VET|MUNICIPALITY, verified, location)
org_members(org_id, user_id, role)
conversations / messages
subscriptions, payments, tags(qr_code, pet_id)
```

### Matching score (v1 heuristic, tune later)
```
if chip numbers equal → match = 1.0 (instant notify)
else score = w1·image_similarity + w2·distance_decay + w3·time_decay
           + w4·attribute_overlap(species must match, size, colour, sex)
→ show top N above threshold, owner confirms or rejects (feedback improves weights)
```

---

## 7. Trust, safety and legal
- **Scams are a real problem** in lost-pet spaces ("I have your dog, send money first"). Countermeasures: in-app chat, hidden phone numbers, reward escrow, warnings, report button, verified shelter badges.
- **GDPR**: exact home address never public; fuzzed location for lost reports (show an area, not a pin); chip-to-owner data never exposed; data export and deletion.
- Image moderation (no humans/gore/spam), rate limits on anonymous found reports.
- Terms, privacy policy, cookie consent; imprint for an SI company.

---

## 8. Key metrics
- Time from lost report to first match suggestion
- **Reunite rate** (north star) and time to reunite
- Found reports per week (supply side), shelters active
- Push alert opt-in rate, boosts purchased, premium conversion

---

## 9. Open questions
1. App name and brand (Slovenian-only, or neutral for expansion?)
2. Can we get official cooperation or API access to CRPsi, or only link to it?
3. Do we let anonymous users post found reports (better conversion) or require a phone verification (less spam)?
4. Pilot shelters: who do we know?
5. Smart tag: build our own or white-label?
6. Budget for AI calls per upload (cache, only run on new photos)

---

## 10. Suggested next steps
1. Validate: talk to 2–3 shelters and admins of the big FB lost-pet groups (pain points, would they use it?)
2. Clickable prototype of 5 key screens: report lost, report found, map, match view, shelter upload
3. Build the MVP (phase 1) in about 6–8 weeks: monorepo, Supabase schema, report flows, map, chip and attribute matching, push, chat
4. Pilot in one region, then add AI matching (phase 2)
