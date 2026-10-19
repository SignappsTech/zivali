**Draft — requires client/legal review.**
source: 02§FR-045, §Content, SEO and legal requirements, NFR-PRIV; brief v1.1 (architecture, monetisation without reward escrow, Q-001…Q-013); docs/discovery/regulatory.md; 06§Risks R-001…R-028; docs/content/legal/*.md (notes for legal review); docs/content content notes

| Field | Value |
|---|---|
| Document | Lawyer briefing pack: Najdimo |
| Version | 0.5 (Premium Protect) |
| Date | 19 October 2026 |
| Owner | Content Strategist, for the client (Signapps) |
| Story | TASK-91 (FR-045, Q-013); unblocks TASK-71 (final legal pages) |
| Language | English; Slovenian statute names and product terms in Slovenian. Slovenian version: `lawyer-briefing.sl.md` and `najdimo-pravni-pregled.docx` (CD-02). |

> **Not legal advice. For lawyer review.** The product team (not lawyers) wrote this pack to brief a Slovenian lawyer. Where we describe the law, it is our reading of primary texts and secondary sources, often not checked against the consolidated text on PISRS. Our "proposed answers" are proposals for you to confirm, correct or reject. Nobody should rely on them until you have.

# 0. How to use this pack

**What we ask from you**

1. Answer the open questions in §6. Please reply by ID (for example "LQ-07: agree", "LQ-19: change to …", "LQ-40: need more information"). Start with the questions marked **Launch** in the last column.
2. Review and mark up the five draft legal pages listed in §4, including the Slovenian legal terminology.
3. Confirm or correct the DPIA outline (§7), the retention table (§8) and the processor-agreement checklist (§9).
4. Tell us which documents are missing. Our list of missing B2B documents is in §4.2.

**Reading guide**

| Part | What it gives you | Time |
|---|---|---|
| §1 Summary | The product, the operator and the main legal topics on one page | 5 min |
| §2–3 Product and features | How it works and every legally relevant feature with its data and safeguards | 20 min |
| §4 Drafts | Links to the legal drafts and their known gaps | 5 min |
| §5 Data flows | Every processor and recipient, the data it gets and where | 10 min |
| §6 Open questions | 71 question IDs, each with our proposed answer; 66 open, 5 no longer apply (N/A) | 50 min |
| §7–9 DPIA, retention, DPA | Working drafts for you to confirm | 20 min |
| §10 Client decisions | What the client must decide, with your input | 5 min |

**Versions.** Features will change after this pack is sent. Each new version lists its changes in §11, and every changed row is marked "(changed in v0.x)".

# 1. Summary on one page

- **Product.** Najdimo is a website and a mobile app (iOS, Android) that helps reunite lost dogs and cats with their owners in Slovenia. Owners report a lost pet. Finders and passers-by report found or sighted animals without an account. Shelters upload animals they take in. The system suggests matches (chip number, photo similarity, place, time, attributes), and the people then talk through an in-app chat.
- **Operator and controller.** Signapps (company details: CD-01). The client is the controller for all processing described here.
- **Status.** Not launched. A pilot is planned in Ljubljana and Maribor. All payments run in Stripe test mode, and live payments are blocked by configuration. There is no App Store or Play Store release in this phase.
- **Mission rule.** Everything that gets animals home is free for everyone, forever: reporting, map and alerts, matching, chat, the PDF poster with a QR code, sharing and chip lookup. Shelters and municipalities use everything free. Paid options never limit these.
- **Revenue.** Voluntary contributions ("prispevek", never "donacija"), a monthly supporter plan (Podpornik), Boost (€4.99), Premium Protect (€2.99 a month or €24.99 a year), ads ("Oglas") and a paid visibility plan for vet clinics (Vet Partner, about €39 a month). There is no reward escrow (removed from scope on 15 October 2026): an owner may show a display-only reward line, and owner and finder arrange any reward between themselves, outside the app.
- **Data location.** The database and sign-in are at Supabase in the EU (AWS Frankfurt). Our servers run on one Hetzner server in the EU (Germany or Finland). Photos and backups are on Cloudflare R2 (buckets in the EU jurisdiction). Place search runs on our own server from GURS open data; no third party receives a search or a point. Email goes through Brevo (France). US providers: Anthropic and Voyage AI (photo analysis), Expo (push), Cloudflare (captcha and CDN), Google (analytics, only with consent), Stripe (partly).
- **Main legal topics.**
  1. Animal-protection duties (ZZZiv) and how the app words them, without claiming to replace them.
  2. GDPR: owners' locations, photos, chip numbers, anonymous reporting, AI providers in the US, DPIA and retention.
  3. Platform duties under the DSA: notices, moderation, automatic hiding.
  4. Consumer law for Boost and the subscriptions: pre-contract information, withdrawal and cancellation.
  5. The owner's display-only reward line: whether it is a public promise of a reward, and how we warn against "pay first" scams.
  6. Ads and Vet Partner: labelling, ranking and "nearest vet" claims (ZVPot-1, ZEPT, P2B).
  7. Contributions: legal nature, VAT, fiscal invoices (ZDavPR) and dohodnina.
  8. Accessibility (EAA) and open-data licences.
- **Launch blockers.** The 34 questions marked "Launch" in §6. The rest gate a single feature, live payments or a store release. Five questions no longer apply: LQ-48, LQ-49 and LQ-53 because reward escrow was removed, LQ-21 and LQ-64 because place search now runs on our own geocoder.

# 2. How the product works

| Flow | What happens | Account needed? |
|---|---|---|
| Report a lost pet | The owner picks a saved pet or enters details, adds 1–5 photos, marks the last-seen place with a radius, the time and what happened, and chooses contact through chat only (default) or chat plus phone after a confirmed match. Optionally the owner adds a reward line ("Nagrada", with an amount, a short note or both); no money passes through Najdimo. On publish, the report is listed, matching runs and nearby users get an alert. A checklist then tells the owner to report the escape to a vet or the responsible shelter, with one-tap call buttons. | Yes (the form can be filled first) |
| Report a found or sighted animal | Photo, place (GPS or photo metadata), "the animal is with me" or "not with me", an optional note and an optional email address. The finder gets a private link (manage link) to edit, close and chat. After sending, a notice tells the finder to report the find to the responsible shelter, with call buttons. Target: under 60 seconds. | No |
| Map, list and detail | Public map and list of open reports with filters. The detail page shows photos, attributes, an approximate area, the date and the description. Actions: send a message, share, poster, report abuse, "I saw this pet". | No |
| Matching | Every new or changed report is compared with reports of the other type: equal chip number (score 1.0), otherwise species, distance, time and attributes, later also photo similarity. The owner sees suggestions with reasons and confirms or rejects. Neither side sees contact data before the owner confirms. | Owner: yes |
| Chat | Opens when the owner confirms a match or when someone writes from a listing. A fixed safety banner ("Never send money in advance"), links are not clickable, report and block are built in. Read-only after the report closes. | Finder: manage link is enough |
| Alerts | In-app inbox, push and email. Nearby alerts for a home area (default 5 km, 1–25 km), species, daily cap and quiet hours. | Yes |
| Poster and sharing | A4 PDF with photo, details, approximate area and a QR code that opens the public listing. No phone number. Share texts for WhatsApp, Facebook and others. | Owner: yes |
| Reunited | The owner marks the pet home again; reports close, alerts stop. A thank-you screen offers an optional contribution and one ad slot. | Yes |
| Shelter portal (M3) | Verified organisations upload intake animals (photo batch, CSV or API), see probable owners and chat with them. Staff never see owners' personal data. Chip lookup notifies an owner registered with us without showing anything personal. | Organisation account |
| Shelter directory | Maps all 212 municipalities to the 17 registered shelters (public organisation data), used for the call buttons and public pages. | No |
| Payments | Stripe Checkout on the web (the mobile app opens it in an in-app browser). Test mode only. | Yes |
| Ads | Four fixed slots (feed, detail page, reunited screen, web sidebar), targeted only by region and species. Never in the report flows, sign-in, chat or payment. | No |
| Admin | Moderation queue, organisation verification, ads, KPIs. Strong authentication and an audit log. | Admin role |

# 3. Legally relevant features

Question IDs refer to §6. "Mx" is the delivery milestone in which the feature is built.

| ID | Feature | Personal data | Safeguards built in | Questions |
|---|---|---|---|---|
| F-01 | **Accounts and roles** (M1): email and password, Google or Apple sign-in; roles user, shelter member, moderator, admin | Email, display name, language, home area, optional phone (never public), notification settings, push tokens | Email verification before alerts and chat; phone shown only in a confirmed conversation if the owner chose it; admin strong authentication | LQ-16, LQ-33 |
| F-02 | **Anonymous found and sighted reports** (M2): no account; a private manage link (only its hash is stored) | Photo, place, time, optional email, anonymous session, random device id, hashed IP address (48 h) | Captcha (Cloudflare Turnstile), rate limits (default 5 per hour, 20 per day per IP and device), duplicate-photo detection, hold for moderation on abuse patterns; delete through the manage link | LQ-14, LQ-30, LQ-34, LQ-39 |
| F-03 | **Location blurring** (M1): the public sees an approximate area, never the exact point | Coarsened point (20–30 m from the real position, often near the owner's home), public point and radius, municipality and region | LOST at least 500 m radius, FOUND and SIGHTED at least 150 m; deterministic per report so repeated views do not reveal the centre; the raw GPS point is never stored: a random 20–30 m offset is applied once at write time, on the device and again on the server, and the stored point is never re-randomised; the public blur derives from this coarsened point; the stored point is visible only to the reporter (labelled "approximate"), or to a chat partner if the reporter shares it; 30 days after closure the stored point is blurred further (N proposed, LQ-19); coordinates are never logged; the place where a found animal is kept is never asked for | DPIA risk D-01 (LQ-21: N/A) |
| F-04 | **On-device geofencing and offline cache** (mobile, M2–M3): the phone keeps public reports nearby for offline use and can notify the user when they enter a lost pet's area | None leaves the device. The phone stores public fuzzed areas, thumbnails, drafts and queued reports | Geofencing is strictly opt-in with a primer for "Always" location; only the operating system's geofencing, no continuous GPS; the location is never uploaded; daily cap 3; one switch removes all geofences; cache at most 50 MB and 7 days, wiped on sign-out | LQ-28 |
| F-05 | **AI photo analysis** (M3–M4): a vision model suggests species, breed, colours, size, collar and marks, and gives a moderation signal; an embedding model computes a vector for photo similarity; Premium adds AI-written listing and social texts, AI poster designs and an AI search plan | Photos (which may show people), as a re-encoded copy of at most 1024 px; no EXIF, user, report or photo identifiers, location, user text or language are sent (changed in v0.4) | Suggestions are labelled "Predlog", editable and never saved unconfirmed; low confidence leaves the field empty; one call per photo, results cached by image hash (no user id), per-user daily and monthly caps, fails open to manual entry; nothing about people is kept beyond four yes/no safety flags; photos the model flags (prominent person, nudity, no dog or cat) are never embedded; vectors are deleted with the photo; call records are kept 62 days; Premium texts never include the chip number or exact location; from M4, flagged images are held for a moderator (TASK-63) | LQ-36, LQ-37, LQ-38, LQ-68 to LQ-71 |
| F-06 | **Matching** (M2–M3): automated suggestions between lost and found reports | Report data, chip numbers, photo vectors | Suggestion only; the owner confirms or rejects; reasons shown; contact data hidden until confirmation | LQ-17 |
| F-07 | **Chat** (M2): real-time messages between the two sides | Messages, aliases, read state, blocks | Safety banner, links not clickable, report and block; moderators read a conversation only after a message in it is reported; deleted 6 months after the report closes | LQ-24, LQ-39 |
| F-08 | **Moderation and automatic hiding** (M2, M4): anyone can report abuse; three independent reports hide a listing until review; image screening holds flagged photos | Abuse reports, decisions, audit log | Reversible decisions, audit log, target of 90 % reviewed in 24 hours, contest by email; reports from accounts younger than 24 hours count half | LQ-17, LQ-38, LQ-40 |
| F-09 | **Notifications and nearby alerts** (M2): inbox, push (Expo) and email (Brevo) | Email, push token, home area, notification texts | Per-type preferences, quiet hours, daily cap, only fuzzed areas in alerts; no paid content in push or email without marketing consent | LQ-35 |
| F-10 | **Poster and sharing** (M2) | Pet photo, name, area; no contact data | QR opens the public listing only; no phone, chip, exact place or holding place; the optional Vet Partner line is labelled "Oglas" and the owner can remove it | LQ-55 |
| F-11 | **Chip lookup for shelters and vets** (M3) | Chip number entered by a verified organisation member | Verified members only; result is "owner notified" or "not found"; never a name, contact or address; 30 lookups per hour per member; audit log stores a hash, not the number; no link to the closed public CRHŽ lookup | LQ-11 |
| F-12 | **Shelter data uploads** (M3): photo batches, CSV (max 500 rows), API with hashed keys; adoption page; municipality reports | Intake animals with chip, species, found place and time, photos; organisation members | Organisation verification; unverified uploads held for moderation; CSV template has no fields for people's data; counts under 5 aggregated in reports | LQ-09, LQ-12, LQ-22 |
| F-13 | **Shelter directory and legal-duty checklists** (M2) | None (public organisation data) | Source and last-verified date shown; unconfirmed numbers never shown; statutory timings appear only when a legal-content flag is on | LQ-06, LQ-07, LQ-08 |
| F-14 | **Payments** (M2, M4): contributions after a reunion, after a report and on the profile (€3 / €5 / €10 / custom, minimum €2), Podpornik from €2 a month, Boost €4.99 for 7 days, Premium €2.99 a month or €24.99 a year, Vet Partner | Payment id, purpose, amount, status, time; card data only at Stripe | Test mode only; no pre-selected amount; Skip as visible as Pay; never in the report flows; anonymous finders see no payment prompt; mobile opens web checkout | LQ-41 to LQ-43, LQ-51, LQ-52 |
| F-15 | **Reward line, display only** (M4; changed in v0.2, reward escrow removed from scope 2026-10-15): the owner may add "Nagrada" (EN "Reward offered") to a lost report, with an optional amount in whole euros (1–10,000) and an optional note of up to 80 characters that may not contain contact data (no URL, email address or run of 6 or more digits); it appears on the detail page and the poster. Najdimo does not hold, pay or guarantee rewards; owner and finder arrange them outside the app | The optional amount and note, as part of the report | Shown as the owner's own offer; a scam warning next to every reward line ("Nikoli nikomur ne plačajte vnaprej …"); terms chapter 6 says Najdimo is not a party; no payment data collected | LQ-67 (LQ-48, LQ-49, LQ-53: N/A) |
| F-16 | **Ads and partner enquiries** (M2) | Ads: none (counts aggregated per ad, slot, day and region, no cookies or identifiers). Enquiry form: company, contact name, email, optional phone, message, consent time | "Oglas" label, `rel="sponsored"`, contextual targeting only, blocklist for animal sale or give-away, Premium is ad-free; sponsors get aggregate reports only | LQ-54, LQ-58, LQ-59 |
| F-17 | **Vet Partner** (M4): paid clinic profile, featured placement in the vet slot for its area, a labelled line on posters and in-app alerts for its region, monthly aggregate report | Clinic data, contact person, billing data and VAT ID (via Stripe Billing) | Always "Oglas"; title "Veterinar v vaši regiji", never "nearest" unless true; a "Kako razvrščamo" ranking link; feature flag until you confirm | LQ-47, LQ-55, LQ-56, LQ-57 |
| F-18 | **Analytics and consent** (M1): Google Analytics 4 on the web, Firebase Analytics in the app | Pseudonymous analytics events (region, municipality, species, report type, ad slot, amount); no names, emails, chip numbers, coordinates or free text | Consent banner with equal Accept and Reject; nothing loads before consent (basic Consent Mode v2); only `analytics_storage` granted; 14-month retention; Google signals and data sharing off | LQ-26, LQ-27 |
| F-19 | **Success stories** (M5) | Text and photos the owner chooses | Explicit opt-in, moderation, unpublished within 24 hours of withdrawal | LQ-32 |
| F-20 | **Privacy rights** (M3): self-service export (JSON or ZIP within 5 minutes) and account deletion | All stores in the data inventory | Re-authentication; account disabled at once, data erased or anonymised within 30 days; a test fails if a new table is missing from the inventory | LQ-30, LQ-31 |
| F-21 | **Admin console** (M2–M4) | Access to moderation data, organisations, leads | Strong authentication (TOTP), role-filtered access, audit log of every action, last admin cannot be removed | LQ-29 |

# 4. Legal drafts

## 4.1 Drafts for your review

All drafts carry "Draft — requires client/legal review" at the top and end with internal "Notes for legal review". Every note is consolidated in §6 below, so you can answer there.

| Document | File | Version | Route (SL / EN) | Known gaps |
|---|---|---|---|---|
| Privacy policy | [privacy-policy.md](../content/legal/privacy-policy.md) | 0.8 (changed in v0.4: AI assistance as built, chapters 1, 3, 4, 6, 8, 12, 14, 16; new claims marked [legal review]) | `/zasebnost` / `/en/privacy` | Company details (CD-01); features not live yet are described as at launch (LQ-04); AI providers' retention, training, entities and transfer basis are client markers (privacy note 23, LQ-36) |
| Cookie policy | [cookie-policy.md](../content/legal/cookie-policy.md) | 0.3 (place search on our servers) | `/piskotki` / `/en/cookies` | Real cookie durations to verify in the built product |
| Terms of use | [terms-of-use.md](../content/legal/terms-of-use.md) | 0.2 (reward escrow removed; reward line in chapter 6) | `/pogoji-uporabe` / `/en/terms` | Finder duties (LQ-08), withdrawal right (LQ-41), dispute body (LQ-44), DSA wording (LQ-40) |
| Imprint | [imprint.md](../content/legal/imprint.md) | 0.4 (place search on GURS data; MapTiler removed) | `/impresum` / `/en/imprint` | Company details (CD-01) |
| Accessibility statement | [accessibility-statement.md](../content/legal/accessibility-statement.md) | 0.1 | `/dostopnost` / `/en/accessibility` | Authority and act (LQ-62); status after the M5 audit |

Related content with legal relevance:

| Content | File | Why it matters |
|---|---|---|
| Regulatory research | [regulatory.md](../discovery/regulatory.md) | Our reading of ZZZiv, the dohodnina rules and the ad-labelling rules, with confidence levels and sources |
| Public pages (safety tips, FAQ, For shelters) | [P3-public-pages.md](../content/pages/P3-public-pages.md) | Lines marked **[legal review]** describe finder and shelter duties |
| Consent banner | [P17-consent.md](../content/pages/P17-consent.md) | Exact consent wording |
| Support asks | [P15-support-moments.md](../content/pages/P15-support-moments.md) | Contribution wording ("prispevek", never "donacija") |
| Partners page and enquiry form | [P22-partners.md](../content/pages/P22-partners.md) | Consent line, audience statistics |
| Notifications and emails | [notifications-and-emails.md](../content/notifications-and-emails.md) | Receipt wording, the Vet Partner line in alerts |
| Poster | [P18-poster-share.md](../content/pages/P18-poster-share.md) | Vet Partner line on posters and the owner's switch |
| Report flows | [P6-report-lost.md](../content/pages/P6-report-lost.md), [P7-report-found.md](../content/pages/P7-report-found.md) | Post-submit duty notices, privacy lines |
| AI pre-fill and photo similarity (added in v0.4) | [P7-report-found.md](../content/pages/P7-report-found.md) §3a, [P11-match-review.md](../content/pages/P11-match-review.md) §3 | The "Suggested" label, "AI can be wrong" notes, the disclosure text `ai_prefill.info_body` (marked †) and the similarity caveat (LQ-37) |
| Wording rules | [voice-and-tone.md](../content/voice-and-tone.md), [glossary.md](../content/glossary.md) | Banned words (for example "donacija"), "Oglas" label |

## 4.2 Documents that do not exist yet

| Document | Needed before | Proposal |
|---|---|---|
| Vet Partner terms (B2B order form and terms: price, VAT, monthly cancellation, ranking rules, labelling, the clinic's warranty on opening hours and 24-hour claims, compliance with veterinary professional rules) | Vet Partner goes live | We draft a short version from §6 H for your review (LQ-60) |
| Advertiser terms (order form, content rules, blocklist, aggregate reporting, no tracking) | First paid ad | Same (LQ-60) |
| Organisation and API terms (shelters, municipalities, vets: verification, data rules for uploads, API key use) | Shelter portal (M3) | Same (LQ-22, LQ-60) |
| Reward escrow terms | N/A | N/A: removed from scope 2026-10-15 (no escrow, brief v1.1) |
| "Kako razvrščamo" page (how vet placements are ranked) | Vet Partner goes live | Content team drafts (LQ-56) |
| "Kam gre vaš denar" transparency page | Live contributions | Content team drafts (FR-024); no dohodnina text until LQ-50 |
| Record of processing activities (Article 30) | Launch | Generated from the data inventory and §5 (LQ-29) |
| DPIA, legitimate-interest assessments, transfer impact assessments | Launch | From §7 and §9 (LQ-15, LQ-18, LQ-20) |

# 5. Data flows and processors

## 5.1 Architecture (brief v1.0)

```
Web browser / mobile app
 ├─ HTTPS ─► Hetzner server, EU (Germany or Finland): Caddy ─► website (Next.js), API (Express, incl. our geocoder), job worker
 │            ├─► Supabase, AWS Frankfurt: Postgres (all app data, GURS place register), Auth (accounts, sessions), Realtime (chat delivery)
 │            ├─► Cloudflare R2, EU storage: photo originals (private), published photo copies (public, via Cloudflare CDN), nightly database dumps (30 days)
 │            ├─► Anthropic, US: photo only ─► suggested attributes and a moderation signal           [M3]
 │            ├─► Voyage AI, US: photo only ─► image vector                                            [M3]
 │            ├─► Brevo, EU: email address, name, language, message text
 │            ├─► Expo Push, US ─► Apple APNs / Google FCM: push token, notification text
 │            ├─► Stripe, EU (and US): checkout sessions, subscriptions, webhooks                    [test mode]
 │            ├─► Cloudflare Turnstile, US: captcha token check
 │            └─► Sentry, EU region: error events with personal data scrubbed                          [M5]
 ├─ direct ─► Supabase Auth (sign-in) and Supabase Realtime (chat channel)
 ├─ direct ─► Cloudflare R2 (one-time upload link for a photo)
 ├─ direct ─► Stripe Checkout page (card data never reaches us)
 ├─ direct ─► OpenFreeMap (map tiles: IP address)
 ├─ direct ─► Cloudflare Turnstile widget (device and browser signals)
 ├─ direct ─► Google Analytics 4 / Firebase Analytics (only after consent)
 └─ direct ─► Google or Apple sign-in (if the user chooses it)
On the device only: geofences, offline cache of public reports, drafts, queued found reports, manage-link token
```

The database is not exposed to the internet: all app data goes through our API, which checks permissions. The tables sit in a non-exposed schema with deny-all row-level security.

## 5.2 Processors and recipients

"In use from" is the milestone in which data starts to flow to the provider.

| Provider | Role (proposed) | Purpose | Data it receives | Location; transfer tool | In use from |
|---|---|---|---|---|---|
| Supabase, Inc. (US company) | Processor | Database, sign-in, chat delivery | Everything in the privacy policy chapter 3 except photos | Data in the EU (AWS eu-central-1, Frankfurt); support access from the US possible: DPF or SCCs (verify) | M1 |
| Hetzner Online GmbH, Germany | Processor | Server for the website, API and job worker; server logs | All data passing through the service; logs with IP addresses (about 7 days) | EU (Germany or Finland, CD-10); no transfer | M1 (staging) |
| Cloudflare, Inc., US: R2 | Processor | Photo storage, public photo delivery (CDN), nightly backups | Photos; backups contain the whole database; visitors' IP addresses at the CDN | Storage in the EU (buckets created in the EU jurisdiction, ADR-014); CDN worldwide; DPF or SCCs | M1 |
| Cloudflare, Inc., US: Turnstile | Processor | "Not a robot" check on sign-up, anonymous reports and the partner form | Device and browser signals, IP address | US; DPF or SCCs | M1 (test keys until credentials arrive) |
| Brevo (Sendinblue SAS), France | Processor | Transactional email (sign-in, alerts, receipts) | Email address, name, language, message text | EU | M1 |
| Expo (650 Industries, Inc.), US | Processor | Push delivery to Apple and Google | Push token, notification text (no contact data) | US; DPF or SCCs (verify) | M2 |
| Apple (APNs, Sign in with Apple) and Google (FCM, Google sign-in) | Independent controllers (infrastructure and identity) | Push transport; sign-in if chosen | Push token and payload; identity data at sign-in | Their terms | M2 |
| Stripe Payments Europe, Ltd., Ireland | Processor, and independent controller for fraud prevention and its legal duties | Checkout, subscriptions, VAT invoices for Vet Partner | Card and billing data entered on Stripe's page | EU, US processing possible; DPF or SCCs | M2 (test mode) |
| Anthropic (Anthropic PBC, US, or its EU contracting entity: verify) | Processor | Attribute suggestions and four yes/no safety flags from photos; Premium AI texts; automatic chat translation in chats with a Premium participant (new in v0.5) | A re-encoded copy of the photo of at most 1024 px, no EXIF, identifiers, location or text (changed in v0.4); for Premium texts, the report's public attributes; for translation, the message text with phone numbers, emails, URLs and chip-like numbers masked, and the target language | US; DPF or SCCs (verify); retention and training: client to confirm (privacy note 23 (b)) | M3 |
| Voyage AI (part of MongoDB, Inc. since 2025: verify the contracting entity) | Processor | Image vectors for photo similarity | The same copy; never photos the model flagged (changed in v0.4) | US; DPF or SCCs (verify); training opt-out and retention: client to confirm (privacy note 23 (a)) | M3 |
| Google Ireland Ltd. | Processor (Google Analytics data processing terms) | GA4 on the web, Firebase Analytics in the app | Pseudonymous events and device or browser identifiers, only after consent | EU, US processing possible; DPF | M1 (after consent only) |
| OpenFreeMap | Independent controller (we cannot instruct it) | Map tiles | IP address | Public tile servers | M1 |
| Sentry (Functional Software, Inc.), EU data region | Processor | Error tracking | Technical error data, personal data scrubbed | EU region; US company: DPF or SCCs | M5, credential-gated |
| Uptime monitor (provider to choose) | Processor | Health checks of public endpoints | No personal data | to choose | M5 |
| Fiscal verification provider (if required, LQ-52) | Processor | Fiscal verification of invoices (ZOI and EOR codes) | Invoice data: amount, time, premises; for B2B the buyer's VAT ID | Slovenia | Before live payments |
| GitHub (Microsoft) | Not a processor of user data | Source code, CI, container images | No production personal data (tests use synthetic data) | US | Now |

**Other recipients:** other users (only what §3 says is public or shared in a chat), authorities on a legal order, advertisers and Vet Partner clinics (aggregate reports only), organisations using chip lookup (only "owner notified" or "not found").

**What never leaves our side:** chip numbers (never public, never sent to AI or analytics), exact points (never public and never sent to a third party: place search and the area name for a point run on our own geocoder, changed in v0.2), phone numbers (only to a confirmed chat partner, if the owner chose it), email addresses (only to Brevo for sending), the holding place of a found animal (never collected).

# 6. Open legal questions

Every open legal point from the draft notes, the regulatory research, the risk register (R-0xx) and the brief's open questions (Q-0xx) appears once here. "Needed before" values: **Launch** (public launch), **Live payments**, **Store** (App Store or Play release) or a named feature, which stays behind a flag until answered. **N/A** marks a question that no longer applies because its feature left the scope; the ID is kept so earlier replies still match.

## A. Operator, texts and process

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-01 | Who is the controller and operator named in all texts? | Signapps as a company operates the service and is the controller. A separate non-profit is considered only for dohodnina (LQ-50). | Brief; privacy note 1; D-03 | Launch |
| LQ-02 | What must the company-information page ("Podatki o podjetju", formerly the imprint) contain (ZGD-1, ZEPT)? Owner decision 2026-10-16: no media imprint under ZMed (Najdimo is not a medium) and no names of directors or procurators; the public register has them. Do we need a supervisory authority or professional rules? | The page table: full name and legal form, seat, registration number, tax number and VAT ID, register entry, share capital (d.o.o.), contact (email, phone). No representative and no responsible editor. No regulated activity, so no supervisory authority. | Imprint notes 1–2 | Launch |
| LQ-03 | Which language version of the legal texts prevails? Do we need anything beyond Slovenian under the public-use-of-Slovenian act (ZJRS)? | Slovenian is the source and prevails; English is a courtesy translation. Add one sentence saying so to the terms and the privacy policy. | Content team | Launch |
| LQ-04 | May the privacy policy and terms describe features that are not live yet (AI, payments, Boost, Premium, Vet Partner, the reward line, success stories), or must the texts be versioned per release? | Version per release: publish only the parts for live features; add a part when its feature flag goes on; keep a dated change log. | Privacy note 14; terms note 13 | Launch |
| LQ-05 | Is the Slovenian legal terminology in the drafts correct (upravljavec, obdelovalec, zakoniti interes, standardne pogodbene klavzule, višja sila, "kot je")? | Please mark up the Slovenian texts directly. | All drafts, last note | Launch |

## B. Animal protection (ZZZiv) and product wording

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-06 | Are these duties and timings current: owner reports a dog's escape within 3 days (ZZZiv 6(4)); owner reports a loss to the nearest shelter within 72 hours (Pravilnik o zaščiti hišnih živali 5(1)); finder notifies the shelter or a vet within 24 hours (ZZZiv 29(1), Pravilnik 5(2)); the 8-day reclaim period before a shelter may rehome (ZZZiv 30) and how the "pisni poziv" works? | Until you confirm, the app shows no timings. It says "Report it to the responsible shelter or a vet as soon as possible" with call buttons. The timings sit behind a legal-content flag that we switch on only with your confirmed wording. | R-02 to R-06; regulatory open points 1–2; R-027; A-029 | Launch |
| LQ-07 | Can a report on Najdimo ever count as the legal report to a shelter or vet? | No. Copy says that a report on Najdimo does not replace the duty and offers one-tap calls to the responsible shelter from the directory. | Regulatory open point 3; FR-005; FR-006 | Launch |
| LQ-08 | Does a finder who keeps a found animal at home breach the 24-hour duty? What may the found flow say ("Žival je pri meni")? | The flow only records the fact; it never advises keeping the animal. After sending, the notice tells the finder to report the find to the responsible shelter, with call buttons. The FAQ says: if you cannot keep the animal, call the shelter your municipality works with. | Regulatory open point 4; P3 [legal review] lines; terms chapter 7 | Launch |
| LQ-09 | Shelter portal: the default 8-day "days until possible rehoming" countdown. Any liability if a shelter relies on it? | It is labelled a reminder, set by the shelter, not a legal deadline. The terms (chapter 9) say Najdimo gives no legal advice. | R-014; FR-015; terms note 3 | Shelter portal (M3) |
| LQ-10 | SPZ rules on found property (notify the owner or police; ownership after 1 year): should the product mention them? | No. We refer only to the shelter and vet route of ZZZiv. | R-14 | Launch |
| LQ-11 | Chip numbers: may we store owners' chip numbers and let verified shelters and vets look them up so that we notify the owner (no data shown)? We do not link to CRHŽ, whose public lookup closed in June 2026. | Yes, as part of the service the owner asked for (contract) and our legitimate interest in reuniting animals. Throttled, audited by hash, nothing personal shown. Copy says that a vet or the responsible shelter reads the chip in CRHŽ. | R-16; FR-016; A-003; Q-004 | Shelter portal (M3) |
| LQ-12 | Adoption page for shelters (FR-028) and pet ads: under ZZZiv 10(3), an ad for a dog's change of ownership must state the marking data and the ad-space provider must check it. Does an adoption listing count? Must the chip number then be public, against our rule that chip numbers are never public? | Users may not post sale or give-away listings; moderators remove them and the ad blocklist refuses them. For the adoption page we propose: the shelter confirms the marking data in the upload (stored, not public), the listing shows "Označen s čipom: da" and the shelter as the responsible party. If the law requires the number itself, we postpone the adoption page (CD-17). | R-11; regulatory open point 5; FR-018; FR-029 | Adoption page (M3–M4) |
| LQ-13 | The EU regulation on the welfare and traceability of dogs and cats (adopted 2026): does it impose duties on platforms that show adoption or sale listings (for example, verifying identification before publishing), and from when? | Monitor. We already ban sale listings. Revisit before the adoption page goes live. | R-17 | Adoption page |

## C. GDPR and ePrivacy

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-14 | Legal bases in privacy policy chapter 4: (a) anonymous finders: contract or legitimate interest? (b) partner enquiries: pre-contractual steps plus consent? (c) push: the alerts the user turned on are contract, the OS permission is not GDPR consent? (d) "establishing and defending legal claims" as a purpose? | (a) Legitimate interest (no account, minimal data). (b) Pre-contractual steps; keep the consent tick as a courtesy and as proof. (c) Yes. (d) Yes, legitimate interest. | Privacy note 3 | Launch |
| LQ-15 | We rely on legitimate interest for: captcha and rate limits, moderation and automatic hiding, AI suggestions and image screening, ad counting, service statistics from our database. Are the one-page assessments we plan (balancing test per purpose) enough? | Yes. We draft one assessment per purpose from the DPIA material (§7) for your review. | Privacy note 3(d) | Launch |
| LQ-16 | Minimum age 15 for an account (ZVOP-2, art. 8, to verify) and paid options for adults only. How should we check age? | Sign-up asks the user to confirm "I am at least 15". Checkout asks to confirm 18 or over. No document checks. | Privacy note 6; terms note 2 | Launch |
| LQ-17 | Article 22 GDPR: are automatic temporary hiding (three reports) and match suggestions automated decisions with a legal or similarly significant effect? | No. Hiding is temporary and reviewed by a person (target within 24 hours), with a contest route by email. Matching only suggests; the owner decides. | Privacy note 5; terms note 11 | Launch |
| LQ-18 | Is a DPIA mandatory (Article 35 and the Information Commissioner's list), given owners' locations, photos, AI analysis and matching of reports? | We do one anyway, using the outline in §7, and keep it updated per milestone. | Privacy note 4 | Launch |
| LQ-19 | Retention: are the values in §8 acceptable? In particular: what remains of a closed report after 12 months, 24 months for abuse reports and the audit log, and 10 years for payment records. Also: is 30 days after closure acceptable for blurring the stored point (the raw point is never stored; it is coarsened by 20–30 m at write time)? | §8 as proposed. The stored point is blurred 30 days after closure (proposed N; confirm). After 12 months a closed report loses its photos, exact point and free text; the remaining fields are unlinked from the account and kept only for statistics. | A-012; NFR-PRIV; privacy note 7 | Launch |
| LQ-20 | Transfers to the US (Supabase support access, Cloudflare, Expo, Anthropic, Voyage AI, Stripe, Google, Sentry): DPF where certified, otherwise SCCs plus a transfer impact assessment? | Yes. We check each provider on the DPF list at go-live and keep a short TIA for those without certification (§9). | Privacy note 8 | Launch |
| LQ-21 | N/A: own geocoder on GURS data, no third party (2026-10-15). (Was: MapTiler as processor or controller for the exact point, and rounding it.) | No answer needed. | ADR-007; privacy note 10 | N/A |
| LQ-22 | Shelters and other organisations uploading intake data (photo, chip, found place and time): are they independent controllers, our processors or joint controllers? | Independent controllers for their own records; Najdimo is the controller for what is published on the platform. The organisation terms forbid uploading data about finders or owners; the CSV template has no such fields. No processing agreement needed. | Privacy note 16; FR-015 | Shelter portal (M3) |
| LQ-23 | Photos and free text may show other people (faces, children, car plates, house numbers). Is our approach enough? | Terms forbid it, upload screens remind users, AI screening flags prominent people and holds the photo, and moderators remove or blur on request within 72 hours. | Privacy note 17; FR-014 | Launch |
| LQ-24 | Moderators read a conversation only after a message in it is reported. Enough for confidentiality of correspondence? | Yes, with every access in the audit log and the rule stated in the privacy policy (chapter 5). | Privacy chapter 5; FR-018 | Launch |
| LQ-25 | Device storage without consent (ZEKom-2 cookie rules): sign-in session, consent choice, language, drafts, manage-link token, random device id for rate limits, offline cache, geofence areas, Turnstile. Are all strictly necessary? | Yes for all of them. The Firebase app-instance id is created only after consent. | Cookie notes 3, 4, 8 | Launch |
| LQ-26 | Proof of consent (Article 7(1)): the choice, text version and time are stored only in the `zz_consent` cookie (stored up to 400 days; the choice counts for 12 months) and in the app's secure storage. Do we also need a server-side record? | Add a server-side log with a random consent id, choice, version and time and no other identifier, kept for 24 months. We need your view on whether this proves anything without linking to a person. | Privacy note 7; cookie note 5 | Launch |
| LQ-27 | Google Analytics 4 and Firebase in the EU: acceptable with consent, DPF, basic Consent Mode (no requests before consent), 14-month retention, Google signals and data sharing off and no personal data in events? Any position of the Information Commissioner we must follow? | Acceptable. Our own database stays the source of truth for KPIs and ad reports. | R-004; FR-038 | Launch |
| LQ-28 | On-device geofencing: the phone checks whether the user enters a public, blurred area; the location never leaves the device. Is this processing by us at all? What must the privacy policy say? | Not processing by us in the GDPR sense, but we explain it (privacy policy chapter 6) and keep it strictly opt-in with an off switch that removes all geofences. Store disclosures follow in LQ-66. | FR-043; R-024; privacy note 13 | Geofencing (M3) |
| LQ-29 | Records and breaches (Articles 30, 33, 34): is a record generated from our data inventory plus §5 acceptable? Who notifies the Information Commissioner within 72 hours? | Yes; the client names a responsible person (CD-21) and we add a one-page breach procedure to the runbook. | Content team | Launch |
| LQ-30 | Rights of anonymous finders: the only proof of identity is possession of the manage link. Enough? | Yes. Without the link we cannot identify the person (Article 11) unless they gave an email address. | FR-034; privacy chapter 7 | Launch |
| LQ-31 | Account deletion: messages of a deleted user are anonymised ("Izbrisan uporabnik") so the other person keeps the conversation until the 6-month chat retention ends. Acceptable? | Yes; the content is shared correspondence and is deleted on schedule anyway. | FR-034; TDD retention | Export and delete (M3) |
| LQ-32 | Success stories: explicit consent, other people in the photos, withdrawal within 24 hours. | Consent tick plus moderation; the owner confirms that people shown agree; a story is unpublished within 24 hours of withdrawal. | FR-012; A-023 | Success stories (M5) |
| LQ-33 | Do we need a DPO (Article 37)? | Not mandatory: no special categories and no systematic monitoring as a core activity. Document the assessment and name a privacy contact. | Privacy note 2 | Launch |
| LQ-34 | Anonymous reports have no age check. Acceptable for minors who report a found animal? | Yes: no account, minimal data, optional email only. | Content team | Launch |
| LQ-35 | Email and push: no marketing messages are planned. Would a paid Vet Partner line in an alert email or push turn it into a commercial communication that needs prior consent (ZEKom-2 226, ZEPT 6)? | Yes, treat it so. No paid line in email or push without marketing consent; in-app and on posters only. | V-07; notifications note Q7; privacy note 15 | Vet Partner (M4) |
| LQ-73 | (new in v0.5) Report statistics (Premium, PRD R-026.6). For every report we count views of the public page, shares by channel and alerts sent by channel, aggregated per report and day, with no identifier, cookie or device storage. The server knows a signed-in viewer at request time only to leave out the owner's own views, organisation members and moderators, and stores nothing about them. Only the report's creator with Premium (or the organisation's members) sees the figures. (a) Is legitimate interest the right basis, and is ePrivacy consent not needed because nothing is stored on or read from the device? (b) Retention: we propose "together with the report" (the counters hold no personal data). (c) Is privacy chapter 11 enough, or must the public listing say that views are counted? | (a) Yes to both. (b) Yes. (c) Chapter 11 is enough; no notice on the listing. | Privacy chapters 3, 4, 11, 14; privacy note 25(d); cookie policy chapter 5 | Report statistics (M4) |

## D. Artificial intelligence

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-36 | (changed in v0.4) Anthropic and Voyage AI contract terms: training on our photos, retention period, DPA, sub-processors, contracting entity (Voyage AI is part of MongoDB, Inc. since 2025), data location. What the providers' own pages say (read 2026-10-18, not yet checked against our account): Voyage stores and uses customer data for future model training unless the organisation opts out; the opt-out gives "zero-day retention", needs a payment method and an organisation Admin, and cannot be reversed in the dashboard. Anthropic deletes API inputs and outputs within 30 days by default, keeps them longer when flagged under its Usage Policy (up to 2 years) or when the law requires it, and its privacy page does not address training. The client confirms our account settings, entities and DPAs (privacy note 23). What may the privacy policy say, and in which words? | The policy states retention and training only after the client confirms the account settings and we have read the current terms and DPAs. Until then chapter 8 carries client markers and the AI parts are not published. No real photos go to Voyage before the opt-out is confirmed (C20, TASK-40.7). The text says "USA" for both, because our technical design names no other region; if a provider may process elsewhere, we add "and other countries". | Privacy notes 11 and 23 | AI features (M3) |
| LQ-37 | (changed in v0.4) AI Act: as a deployer, what applies to us? AI literacy (art. 4) for staff; transparency (art. 50, from 2 August 2026, check any postponement) for AI-written listing and social texts and AI poster designs (Premium). Must shared posts be labelled as AI-generated? For the M3 pre-fill: is our labelling enough, and does the disclosure on the form count as the information at the time of collection (GDPR art. 13), also for anonymous finders? | AI suggestions are labelled in the app: the mark "Predlog" on every filled field, with the confidence as a whole percent since 2026-10-19 ("Predlog · 81 %", owner decision); the note "Nekatera polja smo izpolnili s predlogi iz fotografije. Umetna inteligenca se lahko moti, zato jih preverite, preden nadaljujete."; in the found flow "Predlog iz fotografije. Umetna inteligenca se lahko moti."; a "Kako nastanejo predlogi?" disclosure that names what is sent and links to privacy chapter 8 (P7 §3a, `ai_prefill.info_body`); and in match review "Podobnost fotografij oceni umetna inteligenca, ki se lahko moti." (P11 §3). Art. 50 does not apply to the suggestions, which are classifications the user confirms and not published AI content. Premium texts and designs are labelled "Pripravljeno s pomočjo umetne inteligence" in the app; the user edits and publishes them as their own, so no label in the shared post. A short AI-literacy note for admins and moderators. | Terms note 12; FR-026; FR-013 | AI features (M3–M4) |
| LQ-38 | AI image screening holds a flagged photo before publication. Does the DSA statement of reasons (art. 17) need to say that automated means were used? | Yes. The hold notice says an automatic check flagged the photo and a person will review it. | FR-018 R-018.4 | Image screening (M4) |
| LQ-68 | (new in v0.4) Legal basis for AI assistance as built. AI runs on every accepted photo (lost and found reports, pet profiles, finders without an account) and there is no per-person choice. We propose legitimate interest for (a) attribute suggestions and safety flags (Anthropic), (b) image vectors for matching (Voyage AI) and (c) the record of each provider call kept for cost control. Is that right, or is contract (the user asks for a report and for matching) or consent (an AI switch) the better basis? | Legitimate interest for (a) to (c), with one assessment: faster reports and better matching; minimised input (a copy of at most 1024 px, no identifiers); the output is only a suggestion. Contract would also hold for (b) as part of matching. Consent is not proposed, because a switch would slow down the 60-second found report. | Privacy chapter 4; privacy note 3(d); C19, C20 | AI features (M3) |
| LQ-69 | (new in v0.4) Right to object (art. 21) without an in-product switch. How do we honour an objection to AI processing? | By email to the privacy contact. We delete the vectors of that person's photos and, for future photos, need a per-account "no AI" setting. That setting is not built (it is a tech change). Anonymous finders object per report, through the private link and email. If objections are rare, handling by email until the setting exists is enough. | Privacy chapter 15; privacy note 24(c) | AI features (M3) |
| LQ-70 | (new in v0.4) People in photos. The copy sent to Anthropic shows whoever is in the photo. The model is told to describe only the animal, and we keep only four yes/no flags (prominent person, nudity, violence, visible contact details). Nobody is identified. (a) Is this biometric data (art. 4(14), art. 9)? (b) If extraction did not run (AI off, a cap, a refusal, a failure), the photo goes to Voyage AI without the safety check. Acceptable, or must embedding wait for a safety result (a tech change)? (c) Private pet profile photos are processed and embedded too. Any issue? | (a) No: there is no specific technical processing to identify a person. (b) Acceptable, given the upload reminder, the terms and later image screening (M4). We tighten it if you disagree. (c) No issue, because the purpose (faster matching when the pet goes missing) is stated in chapter 8. | Privacy chapter 8; privacy note 24(a)(b); C19 §Pipeline 7 | AI features (M3) |
| LQ-71 | (new in v0.4) Storage of AI results. (a) Results are stored under the image hash, with no user id, and are reused when anyone uploads the same image. (b) Each provider call is recorded (photo, provider, model, outcome, usage, cost, duration) and kept 62 days; the record loses its link to the photo when the photo is deleted. (c) Vectors are deleted with the photo. (d) A result is deleted once no photo with its hash remains. Are these retention rules acceptable, and does chapter 8 describe them enough? | Yes to all. The shared cache reveals nothing about the first uploader, because the result holds no personal data. | Privacy chapters 8 and 14; §8 | AI features (M3) |
| LQ-72 | (new in v0.5) Automatic chat translation (Premium, PRD R-026.7, A-032). In a chat with a Premium participant (translation on by default, switch in the chat menu), Anthropic translates messages SL ⇄ EN both ways, so the other person, often an anonymous finder, also has their messages sent to the provider. Phone numbers, emails, URLs and chip-like numbers are masked before the call and restored after; names or addresses written in words are not masked. No training use; the translation is kept with the chat (deleted 6 months after the report closes). Both people see a notice ("messages in this chat are machine-translated by an AI service") and each translated message is labelled with the original one tap away. (a) Legal basis for the other person: legitimate interest, or must they be able to refuse? (b) Is the notice plus label enough information under art. 13 and transparent under the AI Act? (c) Anything else for the masking claim? | (a) Legitimate interest: both people understanding each other helps the animal home; minimised input, no training, the notice. If you see a right-to-refuse need, a per-chat "do not translate my messages" switch for the other person is a tech change. (b) Yes. (c) The text claims only what is masked. | Privacy chapters 1, 3, 4, 8, 12, 14; privacy note 25(a)–(c); P12 §4a | Chat translation (M4) |

## E. Platform duties (DSA) and user content

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-39 | Anonymous found reports with captcha and rate limits only (Q-003): any legal reason to require identification, for example to deter scams? What is our liability for scams by users, and do we have to report fraud to the police? | No identification. We rely on the hosting exemption, act on notices quickly, keep contact data hidden, show the safety banner and cooperate with the police on request. | Q-003; R-007 | Launch |
| LQ-40 | DSA: we see ourselves as a hosting service and an online platform that qualifies as a micro or small enterprise (exempt from most of Section 3, art. 19, and from transparency reports, art. 15(2)). Which duties apply, and is our plan enough: points of contact for authorities and users (arts. 11–12), moderation rules in the terms (art. 14), "Prijavi zlorabo" as the notice mechanism, open to anyone (art. 16), statements of reasons when we hide or remove content (art. 17), notification of suspected crimes against life or safety (art. 18)? Which authority is the Slovenian Digital Services Coordinator (we believe AKOS)? | Yes: add a contact-point paragraph to the imprint and terms, extend terms chapter 8 with the moderation rules and the statement-of-reasons process, and keep the abuse form open to visitors. | Terms note 11 | Launch |

## F. Consumer law and paid options

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-41 | Boost (7 days, starts at once), Premium and Podpornik (subscriptions): pre-contract information, the 14-day right of withdrawal and its loss when performance starts at once with express consent, the online "withdrawal function" (Directive (EU) 2023/2673, from 19 June 2026; check its transposition into ZVPot-1), and online cancellation of subscriptions. Please also check that the terms cover payment terms, renewal, cancellation and refunds of subscriptions (Premium, Podpornik, Vet Partner) and donations/contributions, and that the privacy policy covers payment data (Stripe as processor). | Checkout shows price with VAT, duration, renewal and how to cancel. For Boost: a tick "Povečan doseg naj začne veljati takoj. Razumem, da s tem izgubim pravico do odstopa od pogodbe.". Subscriptions cancel in two clicks (Stripe customer portal, linked in the app) and end at period end. A withdrawal link in the account and in every receipt email. | Terms note 5 | Live payments |
| LQ-42 | Contributions ("prispevek"): legal nature (a gift to a company?), whether consumer law applies, and "not refundable except where the law requires". | A voluntary payment without anything in return, so not a consumer contract for a service. Wording stays "prispevek", never "donacija". We propose refunds on request within 14 days as a goodwill policy (the terms draft now says "not refundable"). | Terms note 6; Q-008; P15 | Live payments |
| LQ-43 | Prices: shown with 22 % VAT included; receipts itemise VAT (FR-046). Anything else for price indication? | All prices final and with VAT; the test-mode badge stays until live payments. | FR-046 | Live payments |
| LQ-44 | Out-of-court consumer dispute resolution (ZIsRPS): must we name a provider, and must we say whether we take part? (The EU ODR platform closed in 2025.) | Name the competent provider and state that the company does not commit to take part at first (CD-16). | Terms note 8 | Launch |
| LQ-45 | Liability limits in terms chapter 15, including for agreements between users such as a reward: compatible with mandatory consumer law and the Obligacijski zakonik? (Changed in v0.2: the escrow rule was removed.) | Keep the carve-outs (intent, gross negligence, personal injury). | Terms note 9 | Launch |
| LQ-46 | Licence that users grant us (terms chapter 12): store, process, show, use for matching, the poster and sharing, no sublicensing beyond our providers. Enough, and consistent with the privacy policy? | Yes, as drafted. | Terms note 10 | Launch |
| LQ-74 | (new in v0.5) Premium Protect terms (PRD FR-026, terms chapter 10 v0.3). Monthly (EUR 3.99) or yearly (EUR 29.99, shown first) subscription, test prices; automatic renewal for the same period; reminder email 7 days before a yearly renewal; cancel at any time in account settings, Premium stays until the period ends, no refund of a paid period except on withdrawal or where the law requires; 14-day right of withdrawal, and with an express request to start at once a refund reduced in proportion to the time used; one free Boost in 12 months (yearly at once, monthly after the 3rd paid month, OQ-004); on lapse, extra pet profiles read-only for 90 days, statistics, translation and the heatmap lock. (a) Is the proportional-refund reading right for a digital service (not digital content)? (b) The express-consent line before checkout ("Želim, da Premium Zaščita začne veljati takoj.") and its help text: enough? (c) Does the online withdrawal function (Directive (EU) 2023/2673) require a button for withdrawal, not only email? (d) Is "37 % manj kot pri mesečnem plačevanju" a fair saving claim (compared with 12 monthly payments, no "was" price)? | (a) Yes. (b) Yes, shown next to the plan buttons with a tick, not pre-ticked. (c) Probably yes from 19 June 2026: we add a "Odstopi od pogodbe" action in account settings if you confirm. (d) Yes: it compares two current prices. | Terms chapter 10 and note 5; plan page copy P24; PRD R-026.1 | Live payments |

## G. Payments, rewards, tax and fiscal rules

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-47 | Stripe Billing VAT invoices for Vet Partner (B2B, all clinics in Slovenia): are Stripe's invoices enough for ZDDV-1 (numbering, mandatory fields)? | Yes, with our numbering series and company details; the accountant confirms. | Privacy note 19(b); A-026 | Vet Partner (M4) |
| LQ-48 | N/A: removed from scope 2026-10-15. (Was: payment-services rules for a reward held in the app.) | No answer needed. | Brief v1.1; Q-011 closed | N/A |
| LQ-49 | N/A: removed from scope 2026-10-15. (Was: tax and platform reporting of rewards paid through the app.) | No answer needed. | Brief v1.1 | N/A |
| LQ-50 | Dohodnina: Signapps cannot qualify, and a new society needs about 2 years. Is a partner-NGO model lawful and how may we word it ("Namenite del dohodnine društvu X, ki podpira Najdimo")? | Keep the section hidden. Later, partner with an NGO that already has public-interest status for animal protection, with a written agreement, and promote dohodnina for that NGO only. | D-01 to D-05; Q-008; R-005; regulatory open point 6 | Dohodnina section |
| LQ-51 | VAT and accounting of contributions: if a contribution has no consideration, is it outside the scope of VAT? FR-046 currently says every invoice shows 22 % VAT. Which document does the payer get ("potrdilo o prispevku", never "potrdilo o donaciji")? | For the accountant: if outside VAT, the payer gets a payment confirmation, not an invoice; the receipt email wording follows. | Q-008; notifications note Q6; FR-046 | Live payments |
| LQ-52 | Fiscal verification of invoices (ZDavPR): do online card payments (Boost, Premium, contributions, Vet Partner) need it? Which certified provider? | For the accountant (Q-012). The adapter is ready; live payments stay blocked until the decision is recorded. | Q-012; FR-046; TASK-92 | Live payments |
| LQ-53 | N/A: removed from scope 2026-10-15. (Was: platform duties for payouts to finders.) | No answer needed. | Brief v1.1 | N/A |
| LQ-67 | Display-only reward line (new in v0.2). An owner may show "Nagrada" on a lost report, with an optional amount and a short note, and arranges any reward with the finder outside the app. Is the line a public promise of a reward (javna obljuba nagrade, Obligacijski zakonik) that binds the owner, and does it create any liability for us? Is our wording enough: terms chapter 6 ("This is the owner's statement, not ours. Najdimo does not hold, pay or guarantee rewards.") and the scam warning next to every reward line? | It binds only the owner, if anyone; Najdimo is not a party and only shows the owner's statement (hosting exemption). Keep the terms wording and the warning "Nikoli nikomur ne plačajte vnaprej. Nagrado lastnik izroči šele, ko je žival spet doma." The line allows an amount in whole euros and a note of up to 80 characters; a note with a URL, an email address or a run of 6 or more digits is refused, and a note asking for payment up front is removed by moderation. | Brief v1.1; terms chapter 6 and note 4; P6, P9, P18 | Reward line (M4) |

## H. Advertising and Vet Partner

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-54 | Every ad and paid placement carries "Oglas" (EN "Ad") and links use `rel="sponsored"`. House ads (our own promotion: become a supporter, partner with us, adopt from a shelter) also carry "Oglas". Enough under ZVPot-1 50(2) and ZEPT 6? | Yes. Advertiser name shown on each ad; no editorial content mentions a paying partner without a "sponsored" mark. | V-01, V-04, V-06; R-030.1 | Ads (M2) |
| LQ-55 | Posters: the Vet Partner line ("Oglas · Potrebujete veterinarja? {clinic}") is on by default on the owner's own poster, and the owner can switch it off before download (client decision). Acceptable? | Yes, if the switch and its explanation ("Paid ad from a local vet partner") are shown before download. | V-01; R-026; P18 | Vet Partner (M4) |
| LQ-56 | Vet slot on detail and reunited screens: the paid clinic shown first under "Veterinar v vaši regiji", labelled "Oglas", with a "Kako razvrščamo" link; "nearest" only when geographically true; 24-hour badge verified. Enough under ZVPot-1 49, 50(5)–(6) and 51 pt 12? | Yes, together with the ranking rules in the Vet Partner terms. | V-02, V-03, V-05; FR-028 | Vet Partner (M4) |
| LQ-57 | P2B Regulation (EU) 2019/1150: are clinics "business users" of an online intermediation service? Do veterinary professional rules (Veterinarska zbornica Slovenije) limit clinic advertising? | Treat them as business users: ranking parameters and the effect of payment go into the Vet Partner terms. The clinic warrants that its content follows professional rules; we ask the chamber informally. | V-06, V-09 | Vet Partner (M4) |
| LQ-58 | Contextual ads targeted only by region and species, with aggregate, cookieless counting (no identifiers, nothing on the device): no consent needed under ePrivacy and GDPR? DSA art. 26 and 28 not applicable to a micro or small platform? | Yes to both. We still show "Oglas · Partner: X" on each ad. | Privacy note 12; cookie note 9; V-08 | Ads (M2) |
| LQ-59 | Ad content rules: no ads that sell, give away or rehome animals (ZZZiv 10(3)); what other categories need care (veterinary medicines, health claims for pet food, insurance)? | Blocklist plus manual approval of every ad by an admin; advertiser terms list prohibited content. | R-11; FR-029; FR-031 | Ads (M2) |
| LQ-60 | B2B documents (Vet Partner terms, advertiser terms, organisation and API terms): do you draft them, or do we draft short versions for your review? | We draft short versions for your review (§4.2). | Terms note 7 | Ads sales, Vet Partner, M3 |

## I. Accessibility, licences and name

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-61 | Name "Najdimo": trademark clearance and registration, domain. When can the "working name" lines go? | The client runs a SIPO, EUIPO and TMview search and registers the word mark if clear; the "working name" lines go once the name is final. | Q-001; imprint note 5; P1 footer | Launch |
| LQ-62 | EAA: does the service fall under the EAA (consumer e-commerce through the paid options)? Does the microenterprise exemption for services apply to Signapps? Which Slovenian act transposes the EAA and which authority enforces it? Is our approach to third-party pages (Stripe, Google and Apple sign-in, Turnstile) and generated alt text for user photos acceptable? | We treat the service as in scope regardless, target WCAG 2.2 AA, publish the statement after the M5 audit and name the authority once you confirm it. | Accessibility notes 2, 3, 6, 7 | Launch |
| LQ-63 | Open data and maps: GURS boundaries and the GURS settlement, street and house-number data behind our own place search (all CC BY 4.0), and OpenStreetMap data through OpenFreeMap and OpenMapTiles (ODbL). Is our attribution enough: in the imprint ("Viri podatkov in zemljevidi"), on every map, under place search and next to statistics by region? (Changed in v0.2: MapTiler removed.) | Yes; texts are in the imprint draft and the content slices. | R-019; supabase/seed/geo/LICENSE.md | Launch |
| LQ-64 | N/A: own geocoder on GURS data, no third party (2026-10-15). (Was: MapTiler's plan and commercial use; Photon's public API.) | No answer needed. | ADR-007 | N/A |
| LQ-65 | Image, font and icon licences: Unsplash photos appear only in design mockups; icons are Phosphor (MIT). Anything else to credit in the imprint? | No stock photos in production; credits listed in the imprint. | Imprint note 4 | Launch |

## J. App stores

| ID | Question | Our proposed answer | Source | Needed before |
|---|---|---|---|---|
| LQ-66 | App Store and Google Play: in-app purchase rules for contributions to a company, Boost, Premium and Podpornik; the web checkout from the app; store privacy disclosures (Apple privacy labels, Google Data safety); justification for background location. | Written decision before any store release (TASK-75). In this phase the app opens web checkout. We prepare the disclosures from §5. | R-003; R-024; A-014 | Store |

# 7. DPIA outline

A working outline under Article 35(7). The client signs it off as controller after your review, and we update it per milestone and whenever a feature in §3 changes.

## 7.1 Screening

| Criterion (EDPB guidelines) | Applies? | Why |
|---|---|---|
| Evaluation or scoring | Partly | Match scores between reports (about animals, but linked to owners) |
| Automated decision with legal or similar effect | No | Suggestions only; hiding is temporary and reviewed (LQ-17) |
| Systematic monitoring | No | No tracking; geofencing stays on the device |
| Sensitive or highly personal data | Partly | Location near people's homes; no special categories |
| Large scale | Not yet | Pilot sizing 5,000 monthly users; national later |
| Matching or combining datasets | Yes | Reports matched by chip, place, time, attributes and photo vectors |
| Vulnerable data subjects | Partly | Owners in distress are targets for scams; minors may report anonymously |
| Innovative technology | Yes | AI vision and image embeddings |
| Prevents use of a service or right | No | Nothing is gated by the processing |

Result: at least two criteria apply, so we carry out a DPIA (LQ-18).

## 7.2 Description of the processing

- Purposes, data, recipients and retention: §3, §5 and §8 of this pack, and privacy policy chapters 3, 4, 12 and 14.
- Data subjects: owners, finders and passers-by (with or without an account), community members with alerts, organisation staff, Vet Partner contact persons, advertisers' contacts, people who happen to appear in photos.
- Assets: Supabase (database, auth, realtime), Hetzner server, Cloudflare R2, the mobile devices.

## 7.3 Necessity and proportionality

- Legal bases per purpose (privacy policy chapter 4; LQ-14, LQ-15).
- Data minimisation: no account for finders; blurred public locations; the holding place never collected; no personal data in analytics or ad counting; photos sent to AI without identifiers or metadata; chip numbers never public and logged only as hashes.
- Accuracy: users edit their reports; AI suggestions never saved unconfirmed.
- Storage limitation: §8, enforced by a scheduled purge job.
- Rights: self-service export and deletion, manage link for anonymous finders, contact address.
- Processors and transfers: §9.

## 7.4 Risks and measures

| ID | Risk to people | Likelihood / severity (before measures) | Measures | Residual |
|---|---|---|---|---|
| D-01 | A lost report reveals where the owner lives (pets are often lost near home) | High / high | Raw GPS never stored (random 20–30 m offset once at write time, on device and server), public area of at least 500 m derived from the coarsened point, deterministic blurring, coarsened point visible only to the reporter and blurred 30 days after closure, coordinates never logged, point never in the offline cache, analytics or OG images, and never sent to a third party (own geocoder) | Low |
| D-02 | A scammer uses a found or lost listing to extort an owner ("pay and I return your dog") | High / high | Contact through chat only by default, safety banner, links not clickable, report and block, chip and marks kept back ("keep one detail to yourself"), a scam warning next to every reward line ("never pay anyone before you have your animal back") | Medium |
| D-03 | Someone finds and steals a found animal or a valuable pet | Medium / high | The holding place is never asked for; found areas are blurred (at least 150 m); contact data hidden until the owner confirms | Low |
| D-04 | Chip numbers are enumerated to identify owners | Low / high | Lookup only for verified organisation members, 30 per hour, audit by hash, response never contains personal data | Low |
| D-05 | Photos show people, children, car plates or house numbers | Medium / medium | Upload reminder, terms, AI flags prominent people, moderator removal on request, metadata stripped from all stored copies | Low |
| D-06 | Photos are processed by AI providers in the US | Medium / medium | A re-encoded copy of at most 1024 px, no identifiers, metadata, location or text; results under the image hash with no user id; flagged photos never embedded; vectors deleted with the photo; call records 62 days; DPF or SCCs; caps; Voyage training opt-out confirmed before real photos (LQ-36, privacy note 23) (changed in v0.4) | Low to medium |
| D-07 | Harassment or abuse through chat | Medium / medium | Report and block, moderation queue, suspension and bans, chat deleted 6 months after close | Low |
| D-08 | Unjust automatic hiding of a genuine listing | Medium / medium | Three independent reports needed, new accounts count half, human review target 24 hours, contest by email | Low |
| D-09 | Fake anonymous reports used to lure owners or to spam | Medium / medium | Captcha, rate limits, duplicate-photo detection, hold for moderation on patterns | Low to medium |
| D-10 | Breach of the database or backups | Low / high | Database not exposed (API only, deny-all row-level security), encrypted connections, encrypted backups with 30-day lifecycle, admin TOTP, secrets only on the server, security review before launch | Low |
| D-11 | Background location is collected without users understanding it | Low / medium | Opt-in with a primer, OS geofencing only, location never uploaded, one switch removes everything | Low |
| D-12 | A lost or stolen phone exposes cached data | Low / low | Cache holds only public blurred data, at most 7 days; wiped on sign-out | Low |
| D-13 | Profiling through analytics | Low / medium | Consent only; no personal data in events; Google signals off; 14-month retention | Low |
| D-14 | Data kept longer than needed | Medium / medium | Purge job per §8, data inventory test in CI | Low |
| D-15 | Misuse by admins or moderators | Low / high | Role-based access, audit log of every action, chat access only after a report | Low |

## 7.5 Consultation and sign-off

- Data protection officer: none appointed (LQ-33); the privacy contact reviews.
- Views of data subjects: pilot feedback from owners, finders and two or three shelters.
- Prior consultation with the Information Commissioner only if a residual risk stays high after measures.
- Sign-off: the client as controller, after your review. Review triggers: AI features (M3), geofencing (M3), the reward line and Vet Partner (M4), national launch.

# 8. Retention table (draft)

All values are proposals for your review (A-012). "Policy" says whether the privacy policy already states the value.

| Data | Where | Retention | How it is enforced | Policy |
|---|---|---|---|---|
| Account, settings, pet profiles | Supabase, R2 | Until the user deletes them or the account; on account deletion: disabled at once, erased or anonymised within 30 days | Deletion job, data inventory | Yes |
| Extra pet profiles after a Premium downgrade | Supabase, R2 | Read-only for 90 days, then the owner chooses which 2 to keep; the rest are deleted after a reminder | Job | No (add) |
| Anonymous sign-in sessions without a live report | Supabase Auth | 30 days | Purge job | Yes |
| Open reports | Supabase, R2 | While open; lost reports close after 90 days (one-tap extension); found and sighted after 30 days without update | Lifecycle job | Yes |
| Closed reports: stored point (already coarsened by 20–30 m at write time) | Supabase | Blurred 30 days after closing (N proposed, LQ-19); only the blurred point and area label remain | Retention job | No (add) |
| Closed reports: photos, point, free text | Supabase, R2 | 12 months after closing | Purge job | Yes (photos and point); add free text |
| Closed reports: remaining fields (species, municipality, dates, outcome) | Supabase | Kept for statistics, unlinked from any account after 12 months | Purge job | No (add, LQ-19) |
| Matches and reasons | Supabase | With the reports they link | Cascade | No (add) |
| Chat messages | Supabase | 6 months after the related report closes; a deleted user's messages are anonymised at once | Purge job | Yes |
| Finder's email for the manage link | Supabase | 30 days after the report closes | Purge job | Yes |
| Manage-link hash | Supabase | With the report | Cascade | Yes |
| Hashed IP addresses and rate-limit counters | Supabase | 48 hours | Purge job | Yes |
| Uploaded files not attached to a report | R2 | 24 hours | Purge job | Yes |
| AI results (stored under the image hash, no user id) | Supabase | Until no photo with that hash remains (changed in v0.4) | Retention job | Yes (privacy 0.8) |
| Image vectors | Supabase | With the photo (changed in v0.4) | Cascade | Yes (privacy 0.8) |
| AI provider call records (photo, provider, model, outcome, usage, cost, duration) | Supabase | 62 days; the link to the photo is cleared when the photo is deleted (new in v0.4) | Retention job | Yes (privacy 0.8) |
| Photo copies at Anthropic and Voyage AI | Provider | Client to confirm (privacy note 23 (a)(b)); Voyage: zero-day retention only after the training opt-out (new in v0.4) | Provider setting | No (client marker) |
| Chip lookup log (hash only) | Supabase | 12 months | Purge job | No (add) |
| Abuse reports, moderation decisions, admin audit log | Supabase | 24 months | Purge job | Yes |
| Notification inbox | Supabase | 12 months, or until account deletion if sooner | Purge job | No (change "until account deletion") |
| Push tokens | Supabase | Until sign-out, uninstall or rejection by Apple or Google; inactive for 90 days | Job | No (add) |
| Nearby-alert subscription | Supabase | Until turned off or account deletion | User action | Yes |
| Payment records and invoices | Supabase, Stripe | As tax and accounting law requires (expected 10 years, ZDDV-1; accountant to confirm) | Excluded from deletion | Yes |
| Vet Partner clinic profile and contact person | Supabase | Until the subscription ends, then deleted within 30 days; invoices as above | Job | Yes |
| Partner enquiries (leads) | Supabase | 24 months after the last contact | Purge job | Yes |
| Organisation members, API keys (hashed) | Supabase | Until removed or revoked | User action | No (add) |
| CSV import files | R2 | Deleted when the import finishes, at most 24 hours | Job | No (add) |
| Ad statistics | Supabase | Aggregate, no personal data; 36 months | Purge job | Not needed |
| Success stories | Supabase, R2 | Until consent is withdrawn; removed within 24 hours | Admin action | Yes |
| Consent choice (web cookie, app secure storage) | Device | 12 months, then the user is asked again | Expiry | Yes |
| Server-side consent log (if LQ-26 says yes) | Supabase | 24 months | Purge job | No (add) |
| Google Analytics 4 and Firebase | Google | 14 months | GA4 setting | Yes |
| Email delivery log | Supabase | 30 days | Purge job | Yes |
| Job queue archive | Supabase | 7 days | pg-boss setting | Not needed (technical) |
| Server logs (website, API) | Hetzner | 7 days | Log rotation | Yes ("about 7 days") |
| Error tracking | Sentry | 30 days | Sentry setting | No (add) |
| Backups (nightly database dump) | R2 | 30 days rolling | Bucket lifecycle rule | Yes |
| Offline cache of public reports | Device | At most 7 days and 50 MB; wiped on sign-out and account deletion | App | Yes (privacy chapter 6) |
| Drafts and queued found reports | Device | Until sent or discarded; wiped on sign-out | App | Yes (cookie policy) |
| Geofence areas | Device | Until the report closes or the user turns the feature off | App | Yes (privacy chapter 6) |
| Shelter directory | Supabase | Public organisation data, no personal data; versions kept | Admin | Not needed |

# 9. Processor-agreement (DPA) checklist

## 9.1 Tracker

Status today: no agreement has been signed or accepted for production; staging uses test or free-tier accounts.

| Processor | How the DPA is concluded | Transfer tool | Settings to check | Status |
|---|---|---|---|---|
| Supabase | DPA available from Supabase (signed through the dashboard) | DPF or SCCs for US support access; TIA | Region eu-central-1; no Edge Functions or Storage used; sub-processor list | Open |
| Hetzner | Data processing agreement in the Hetzner console | None (EU) | Server location Germany or Finland (CD-10) | Open |
| Cloudflare (R2, CDN, Turnstile) | DPA incorporated in Cloudflare's terms | DPF or SCCs | R2 buckets created with EU jurisdiction; CDN caching only for public photos; Turnstile mode and cookies | Open |
| Brevo | DPA incorporated in Brevo's terms | None (EU) | EU data hosting; no marketing lists; tracking pixels and link tracking off in transactional email | Open |
| Expo (650 Industries) | DPA on request or in terms (verify) | DPF or SCCs (verify) | Push only; no EAS Insights or analytics with personal data | Open |
| Stripe | DPA in the Stripe Services Agreement | DPF or SCCs | Test mode only; Checkout; Billing tax settings | Open |
| Anthropic | DPA in the commercial terms (verify entity) | DPF or SCCs (verify) | No training on inputs; retention (default 30 days per Anthropic's privacy page, longer when flagged); zero-retention option if available; client confirms the account terms (privacy note 23 (b)) | Open |
| Voyage AI (MongoDB) | DPA (verify entity after the acquisition) | DPF or SCCs (verify) | Training opt-out in the organisation settings (needs a payment method and an Admin; irreversible) gives zero-day retention: client confirms the opt-out and its date before real photos (privacy note 23 (a), C20) | Open |
| Google (GA4, Firebase) | Accept the Google Analytics data processing terms and the Firebase data processing terms in the consoles | DPF | Retention 14 months, Google signals off, data sharing off, IP handling, Consent Mode basic | Open |
| Sentry | DPA in Sentry's terms | EU region; DPF or SCCs for the US company | PII scrubbing on; 30-day retention | Open (M5) |
| Uptime monitor | Provider's DPA | to choose | No personal data in checks | Open (M5) |
| Fiscal verification provider | Provider's DPA | None (Slovenia) | Only if LQ-52 requires it | Open |

## 9.2 Article 28(3) checklist for each agreement

- [ ] Subject matter, duration, nature and purpose of the processing
- [ ] Types of personal data and categories of data subjects
- [ ] Processing only on documented instructions, including on transfers
- [ ] Confidentiality of the people who process the data
- [ ] Security measures under Article 32
- [ ] Conditions for sub-processors: prior authorisation, a list, notice of changes, the same obligations flowed down
- [ ] Assistance with data subject requests
- [ ] Assistance with security, breach notification (with a deadline, ideally without undue delay and within 48 hours), DPIAs and prior consultation
- [ ] Deletion or return of all data at the end, including backups
- [ ] Information and audit rights
- [ ] Where data leaves the EEA: transfer tool named (DPF or SCC module), and a TIA where needed
- [ ] Data location commitment where we rely on it (Supabase Frankfurt, R2 EU jurisdiction, Sentry EU, Brevo EU)
- [ ] Subscribed to each provider's sub-processor change notices

# 10. Decisions the client must make

| ID | Decision | Options and our recommendation | Needed before |
|---|---|---|---|
| CD-01 | Company details for all legal texts: full name and legal form, seat, registration number, tax number and VAT ID, register entry, share capital, representative, person responsible for content, privacy, contact and accessibility email addresses, phone | Supply them before the lawyer review, so the drafts can be reviewed complete | Lawyer review |
| CD-02 | Lawyer: who, scope (this pack), budget and timeline; language of the pack | Send the Slovenian version (`najdimo-pravni-pregled.docx`, ready since v0.2) with the English pack as a reference | Now |
| CD-03 | Data protection officer | Document that none is required; name a privacy contact (LQ-33) | Launch |
| CD-04 | Retention values | Approve §8 after the lawyer's answer to LQ-19 | Launch |
| CD-05 | Age limits | Account from 15, paid options from 18 (LQ-16) | Launch |
| CD-06 | Anonymous reporting (Q-003) | Keep captcha and rate limits, no phone verification (LQ-39) | Launch |
| CD-07 | Statutory timings in the product | Switch the legal-content flag on only with the lawyer's wording; name who keeps it current (LQ-06) | Launch |
| CD-08 | AI features | Enable AI pre-fill and image similarity in M3 after LQ-36 and the confirmations in privacy note 23 (Voyage training opt-out, Anthropic terms, entities, DPAs, transfer basis); label Premium AI texts (LQ-37) | M3 |
| CD-09 | Geocoding | Decided 2026-10-15: our own geocoder on GURS data (ADR-007), no third party and no cost. Remaining: name who refreshes the GURS data (yearly) and updates the date in the attribution | Launch |
| CD-10 | Hosting settings | Hetzner location (Germany recommended, closest to Supabase Frankfurt); whether the website also runs behind the Cloudflare CDN. R2 buckets in the EU jurisdiction are decided (ADR-014); the client creates them so | Launch |
| CD-11 | Monitoring providers | Sentry EU region and an EU uptime monitor in M5 | M5 |
| CD-12 | Reward escrow | N/A: removed from scope 2026-10-15 (brief v1.1, Q-011 closed). Only the display-only reward line remains (LQ-67). | N/A |
| CD-13 | Vet Partner go-live | Only after LQ-55 to LQ-57; poster line on by default with the owner's switch (decided 2026-10-15); no paid line in email or push without marketing consent | M4 |
| CD-14 | Contributions and fiscal rules | With the accountant: VAT treatment (LQ-51), fiscal verification and provider (LQ-52), refund policy (LQ-42) | Live payments |
| CD-15 | Dohodnina | Partner NGO or no dohodnina section (LQ-50) | Before enabling |
| CD-16 | Out-of-court dispute resolution | Name the provider; no commitment to take part at first (LQ-44) | Launch |
| CD-17 | Adoption page | Build only after LQ-12 and LQ-13; otherwise postpone | M3–M4 |
| CD-18 | Name and trademark | Run the clearance search and register "Najdimo" if clear (LQ-61) | Launch |
| CD-19 | Liability insurance | Ask the insurer whether professional or general liability cover fits the service (for example, a wrong handover) | Launch |
| CD-20 | Store release | Written IAP decision (TASK-75, LQ-66) | Store |
| CD-21 | Responsible people | Who answers data subject requests (1 month), abuse notices (24-hour target), accessibility feedback (14 days) and breach notifications (72 hours) | Launch |
| CD-22 | B2B documents | Lawyer drafts, or we draft and the lawyer reviews (LQ-60) | Ads sales, M3, M4 |

# 11. Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-15 | First version for the lawyer: features, processors per brief v1.0 (Hetzner, Supabase Free for database, auth and realtime, Cloudflare R2, Brevo, no Vercel), 66 consolidated questions, DPIA outline, retention table, DPA checklist, client decisions. Drafts refreshed with it: privacy policy 0.3, cookie policy 0.2, imprint 0.3 (with the data sources chapter). |
| 0.2 | 2026-10-15 | Brief v1.1: reward escrow removed from scope. F-15 is now a display-only reward line; LQ-48, LQ-49 and LQ-53 marked N/A (IDs kept); new LQ-67 on the reward line; LQ-04 and LQ-45 changed; CD-12 N/A; CD-02 Slovenian version; Stripe Connect removed from §1, §5, §8 (escrow ledger, dispute statements) and §9; DPIA D-02 measure changed. Own geocoder on GURS data (ADR-007): MapTiler and Photon removed from §1, §5 and §9; LQ-21 and LQ-64 N/A; LQ-63 and CD-09 changed; R2 EU jurisdiction decided (§5, CD-10). The reward line gained a short note (F-15, LQ-67). Launch questions: 34. Drafts refreshed with it: privacy policy 0.4, terms of use 0.2, cookie policy 0.3, imprint 0.4. Slovenian version added (`lawyer-briefing.sl.md`, `najdimo-pravni-pregled.docx`). |
| 0.3 | 2026-10-15 | Location minimisation (client decision): raw GPS never stored; random 20–30 m offset once at write time on device and server; public blur (500 m / 150 m) derives from the coarsened point; stored point blurred 30 days after closure (N proposed). Changed: F-03, LQ-19, DPIA D-01, §8 retention. Privacy policy 0.5. |
| 0.5 | 2026-10-19 | Premium Protect (PRD v0.11, CH-641): privacy policy 0.9 (chat translation, report statistics), terms 0.3 (Premium chapter 10), cookie policy 0.6 (cookieless report counters); §5.2 Anthropic row adds chat translation; new LQ-72 (chat translation), LQ-73 (report statistics), LQ-74 (Premium terms). The Slovenian pack (`lawyer-briefing.sl.md`, docx) still needs these three questions. |
| 0.4 | 2026-10-18 | AI assistance as built (TASK-40.6, C19, C20): F-05, §4.1 (privacy policy 0.8, AI copy row), §5.2 Anthropic and Voyage AI rows, LQ-36 and LQ-37 changed, new LQ-68 to LQ-71 (legal basis, right to object, people in photos, storage of AI results), DPIA D-06, §8 AI rows, §9.1 Anthropic and Voyage AI, CD-08. Questions: 71 IDs, 66 open; launch questions unchanged (34). |
