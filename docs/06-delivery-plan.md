---
doc_id: DOC-06
title: Delivery Plan
version: 0.7
status: Draft
date: 2026-10-14
owner: Product Manager
audience: Client, team
approvals:
  - Client | | |
  - Product Manager | Claude | 2026-10-14 |
---

<!-- Owner: product-manager. The milestone table and estimates are kept in sync with backlog/ (run backlog.mjs --status). -->

# Milestones

Milestones are delivery themes, not hard phases: dependencies are story-level (contracts and artifacts, not implementations), so a story starts as soon as its own `Unblocks on:` condition is met, even if its milestone is not yet the active one. Requirements: `02-product-requirements.md`.

| ID | Milestone | Goal | Exit criteria | Depends on | Estimate (backlog) | Target date |
|---|---|---|---|---|---|---|
| M1 | Foundation | One repo, one design system, one set of contracts; auth, SL/EN, analytics and consent in place | Fresh clone runs both apps and local database stack in < 15 min without cloud credentials · CI gates green (lint, types, unit, e2e smoke, axe, Lighthouse, dependency and secret scan) · tokens and UI kit core on web and mobile · sign-in works on both · SL/EN switch with CI key check · consent banner blocks GA until accepted and mock events verified · staging pipeline passes dry-run · contracts v1 merged | none | TBD: 13 stories; tasks not yet broken down (0 d in backlog) | T0 + 3 wks |
| M2 | Core loop MVP | The full loop works for a pilot, plus early revenue: ads (Oglas), payments core, voluntary support | E2E gate green (lost, found without account, match, confirm, chat, reunited; SL and EN; web and mobile smoke) · chip match notified < 2 min · found report < 60 s median in usability test · mobile map and list work offline from the cache and queued found reports send on reconnect · ads: admin creates an ad, it shows in the 4 slots, DB counts impressions and clicks, never in report flows · Partners page live with real stats and working contact form · Reunited tip and report contribution work in Stripe test · public copy and legal drafts approved for review · QA report per story | M1 (contracts, auth, UI kit, shells, analytics) | TBD: 29 stories | T0 + 10 wks |
| M3 | AI and shelters | AI pre-fill, visual matching and a free shelter portal (incl. API, analytics, municipality reports, adoption page) so a pilot shelter can onboard | Median found report < 60 s with AI · v2 matching not worse than v1 on the evaluation set · a pilot shelter publishes 10 animals in < 5 min via bulk upload and via CSV · matches dashboard and chip lookup work with no personal data exposed · organisation verification in admin · API keys, analytics, municipality reports and the adoption page work for any verified organisation with no payment path · local proximity alerts (opt-in geofences) work within OS limits · export and delete work and are covered by the data inventory test | M2 contracts (photo, matching, chat, admin shell) | TBD: 18 stories | T0 + 15 wks |
| M4 | Monetisation and moderation | Owner extras and Vet Partner in Stripe test mode and a safe, observable service | Every purchase flow passes in test mode (Boost EUR 4.99, Premium EUR 2.99/24.99 with AI extras and ad-free, Podpornik, Vet Partner EUR 39) with the mock provider in CI · shelters and municipalities never meet a plan or upgrade prompt · moderation queue and image screening live (90 % reviewed < 24 h target) · KPI dashboard matches metric definitions · GA4 funnels verified in DebugView · mobile hand-off to web checkout documented | M2 payments core, ads, admin; M3 organisations | TBD: 15 stories | T0 + 20 wks |
| M5 | Hardening and launch prep | Ready for a public pilot | Security pass (RLS matrix, abuse and load tests) with no high findings · WCAG 2.2 AA audit on key flows, Lighthouse budgets · backup restore drill within RTO · final legal pages reviewed, accessibility statement updated · SEO pages and sitemap · shelter onboarding kit tried by one shelter · launch checklist signed, client UAT | M2–M4 | TBD: 10 stories | T0 + 23 wks |
| M6 | Ads self-serve (post-launch) | Sponsors book and pay without an admin | Booking, approval, card payment and invoice flow pass in test mode | M4 (subscriptions), M2 ads | TBD: 2 stories | after pilot launch |

Notes:

- T0 is the project start date, to be set by the client; dates are relative until then.
- Estimates come from the backlog. Today the backlog holds stories only; the Design Lead and Tech Lead create tasks with `est:` labels, then `backlog.mjs --status` gives days per milestone and this column is refreshed.
- Indicative PM sizing for planning only (replaced by backlog totals): M1 35–45 d, M2 120–145 d, M3 72–88 d, M4 55–70 d, M5 28–33 d, M6 about 8 d of effort; about 18–24 weeks elapsed to launch readiness with design, frontend, backend and content running in parallel.
- Pilot readiness: after M2 the product can run an internal alpha and the client can start pitching sponsors; shelters join after M3; public pilot after M5.

# Phases

Discovery (none: new product) → Specification (brief, PRD, design, TDD) → Foundation (M1) → Build (M2–M4, stories in parallel by contract) → Hardening (M5: security, performance, a11y, cross-browser, backup test) → Launch (domain, monitoring, rollback) → Handover and training. Continuous delivery: each merged story is deployed to staging.

# Parallelism and critical path

- Dependency rule: depend on contracts and artifacts (schemas, types, component APIs, route and slot definitions), not on implementations. Every dependent story names its condition in `## Packet` → `Unblocks on:`.
- Story levels (longest dependency chain from the start; stories on the same level can run in parallel):
  - L1 (start now): TASK-1 design system, TASK-2 voice and glossary, TASK-3 scaffold, TASK-84 marketing plan (no code, low priority)
  - L2: TASK-4 CI, TASK-5 environments, TASK-6 contracts, TASK-7 analytics, TASK-8 UI kit, TASK-10 i18n, TASK-27 public copy, TASK-28 legal drafts
  - L3: TASK-9 auth, TASK-11 and TASK-12 shells, TASK-14 photo, TASK-15 location, TASK-17 anonymous safeguards, TASK-18 detail, TASK-19 matching v1, TASK-35 ad serving, TASK-70 observability
  - L4: 16 stories (consent, pets, match review, chat, notifications, poster, abuse, reunite, found, browse, payments core, admin shell, partners page, AI extraction, embeddings, export)
  - L5–L9: lost report, ad placements and admin, matching v2, organisations, subscriptions, display-only reward, boost, Premium and its AI extras, Vet Partner, moderation, KPI, portal, bulk, shelter matches and tools, hardening, launch
- Critical path (story level): TASK-3 scaffold → TASK-6 contracts → TASK-9 auth → TASK-16 pet profiles → TASK-29 lost report → TASK-39 core loop e2e → TASK-69 accessibility and performance audit → TASK-71 final legal pages → TASK-76 launch readiness (9 levels).
- Shortening levers: contract docs start before the scaffold merges; feature stories build against seeded data (TASK-6) so match review, detail, browse and ad stories do not wait for the lost-report flow; the e2e gate (TASK-39) is the only story that waits for the whole loop; Low-priority stories (TASK-50, 59, 73, 75, 83, 84; TASK-77 and 78 are post-launch) are off the critical path and can be cut without affecting launch.
- Wave counts per task will come from `backlog.mjs` once tasks exist.

# Estimates

Ticket sizes: XS = ½ day · S = 1 day · M = 2–3 days · L = 1 week (split anything bigger). The totals per milestone come from the backlog.

# Stories by milestone

Generated from the backlog on 2026-10-14; the backlog is the source of truth (`backlog task list --plain`). Priority: high = Must for the milestone, medium = Should, low = Could.

### M1 (13 stories)
| ID | Story | Owner | Prio | Req | Depends on |
|---|---|---|---|---|---|
| TASK-1 | Design system: brand direction and design tokens | design-lead | high | NFR-A11Y | - |
| TASK-2 | Tone of voice and SL/EN terminology glossary | content-strategist | medium | FR-036, FR-035 | - |
| TASK-3 | Monorepo scaffold and local-first dev environment | tech-lead | high | NFR-DEVX | - |
| TASK-4 | Quality kit and CI pipeline | tech-lead | high | NFR-QUAL | TASK-3 |
| TASK-5 | Environments and deployment pipeline | tech-lead | medium | NFR-AVAIL | TASK-3 |
| TASK-6 | Domain contracts v1 and data platform conventions | tech-lead | high | NFR-DEVX | TASK-3 |
| TASK-7 | Analytics foundation: GA4 web, Firebase mobile, event taxonomy | tech-lead | high | FR-038, NFR-PRIV | TASK-3 |
| TASK-8 | UI kit core primitives for web and mobile | design-lead | high | NFR-A11Y | TASK-1, TASK-3 |
| TASK-9 | Accounts and sign-in (email, Google, Apple) | tech-lead | high | FR-001 | TASK-6, TASK-8 |
| TASK-10 | Slovenian and English localisation infrastructure | tech-lead | high | FR-036, NFR-I18N | TASK-3 |
| TASK-11 | Web app shell and navigation | design-lead | medium | FR-035 | TASK-8, TASK-10 |
| TASK-12 | Mobile app shell, navigation and deep links | design-lead | medium | FR-037 | TASK-8, TASK-10 |
| TASK-13 | Consent banner and preferences (web and mobile) | design-lead | high | FR-039, NFR-PRIV | TASK-11, TASK-12, TASK-7, TASK-2 |

### M2 (29 stories)
| ID | Story | Owner | Prio | Req | Depends on |
|---|---|---|---|---|---|
| TASK-14 | Photo capture and upload | tech-lead | high | FR-003 | TASK-6, TASK-8 |
| TASK-15 | Location picker and privacy-preserving map display | design-lead | high | FR-004 | TASK-6, TASK-8 |
| TASK-16 | Pet profiles with chip number | design-lead | high | FR-002 | TASK-9, TASK-14, TASK-6 |
| TASK-17 | Anonymous reporter safeguards and manage link | tech-lead | high | FR-006, NFR-SEC | TASK-6 |
| TASK-18 | Report detail page | design-lead | high | FR-007 | TASK-6, TASK-8 |
| TASK-19 | Matching engine v1 | tech-lead | high | FR-008 | TASK-6 |
| TASK-20 | Review and confirm suggested matches | design-lead | high | FR-008 | TASK-6, TASK-8, TASK-9, TASK-7 |
| TASK-21 | In-app chat between owner and finder | tech-lead | high | FR-009 | TASK-6, TASK-9, TASK-17, TASK-7 |
| TASK-22 | Notification infrastructure (in-app, push, email) | tech-lead | high | FR-010 | TASK-6, TASK-9 |
| TASK-23 | Nearby lost-pet alerts | tech-lead | medium | FR-010 | TASK-22, TASK-15, TASK-6, TASK-7 |
| TASK-24 | Printable poster and sharing | design-lead | medium | FR-011 | TASK-18, TASK-12, TASK-7 |
| TASK-25 | Report a listing, message or user | design-lead | medium | FR-018 | TASK-18, TASK-6 |
| TASK-26 | Mark reunited, close and expire reports | design-lead | high | FR-012 | TASK-9, TASK-18, TASK-6, TASK-7 |
| TASK-27 | Public pages copy: home, how it works, safety tips, FAQ, for shelters | content-strategist | medium | FR-035 | TASK-2 |
| TASK-28 | Legal page drafts: privacy, cookies, terms, imprint, accessibility statement | content-strategist | medium | FR-035, NFR-PRIV | TASK-2 |
| TASK-29 | Report a lost pet | design-lead | high | FR-005 | TASK-16, TASK-14, TASK-15, TASK-9, TASK-7, TASK-88 |
| TASK-30 | Quick found or sighted report without an account | design-lead | high | FR-006 | TASK-14, TASK-15, TASK-17, TASK-7, TASK-88 |
| TASK-31 | Browse lost and found on a map and in a list | design-lead | high | FR-007 | TASK-15, TASK-18, TASK-6 |
| TASK-32 | Payments core (Stripe test mode) | tech-lead | medium | FR-020 | TASK-9, TASK-6 |
| TASK-33 | Voluntary support: Pomagajte nam izboljšati Najdimo | design-lead | medium | FR-021 | TASK-32, TASK-26, TASK-29, TASK-7 |
| TASK-34 | Admin console shell | design-lead | high | FR-019 | TASK-9, TASK-8, TASK-11 |
| TASK-35 | Ad serving, targeting, house ads and tracking | tech-lead | high | FR-029 | TASK-6 |
| TASK-36 | Ad placements in feed, detail, reunited screen and sidebar | design-lead | high | FR-030 | TASK-35, TASK-31, TASK-18, TASK-26, TASK-11, TASK-7 |
| TASK-37 | Ad management in admin | design-lead | high | FR-031 | TASK-35, TASK-34 |
| TASK-38 | Partners page: Oglašujte pri nas | content-strategist | high | FR-032 | TASK-11, TASK-2, TASK-35 |
| TASK-39 | Core loop end-to-end acceptance | tech-lead | high | FR-005, FR-006, FR-008, FR-009, FR-012, FR-038 | TASK-29, TASK-30, TASK-19, TASK-20, TASK-21, TASK-22, TASK-26, TASK-31, TASK-17, TASK-7 |
| TASK-85 | Offline cache of nearby reports (mobile) | tech-lead | medium | FR-041, NFR-OFFLINE | TASK-6, TASK-12, TASK-31 |
| TASK-86 | Offline queue for found and sighting reports (mobile) | tech-lead | medium | FR-042, FR-006 | TASK-30, TASK-14, TASK-12 |
| TASK-88 | Responsible-shelter directory: data and API (municipality to shelter) | tech-lead | high | FR-044 | TASK-6 |
| TASK-92 | Fiscal invoices for card payments (davčno potrjevanje računov); gates live payments, not test mode (Q-012) | tech-lead | high | FR-046, FR-020 | TASK-32 |

### M3 (18 stories)
| ID | Story | Owner | Prio | Req | Depends on |
|---|---|---|---|---|---|
| TASK-40 | AI attribute extraction service | tech-lead | high | FR-013, NFR-AI | TASK-6, TASK-14 |
| TASK-41 | AI pre-fill in pet, lost and found forms | design-lead | high | FR-013 | TASK-40, TASK-16, TASK-29, TASK-30 |
| TASK-42 | Photo embeddings and vector index | tech-lead | high | FR-014, NFR-AI | TASK-6, TASK-14 |
| TASK-43 | Matching v2 with image similarity | tech-lead | high | FR-014 | TASK-42, TASK-19 |
| TASK-44 | Organisations, members and verification | tech-lead | high | FR-015 | TASK-9, TASK-6, TASK-34 |
| TASK-45 | Shelter portal shell and animals dashboard | design-lead | high | FR-015 | TASK-44, TASK-8, TASK-11 |
| TASK-46 | Bulk upload of found and intake animals | design-lead | high | FR-015 | TASK-45, TASK-14, TASK-15, TASK-6 |
| TASK-47 | CSV import for shelters | tech-lead | medium | FR-015 | TASK-44, TASK-6 |
| TASK-48 | Shelter matches dashboard: probable owners | design-lead | high | FR-015 | TASK-45, TASK-19, TASK-44 |
| TASK-49 | Chip lookup for shelters and vets | tech-lead | high | FR-016 | TASK-44, TASK-6, TASK-19 |
| TASK-50 | Sighting trail on the map | design-lead | low | FR-017 | TASK-31, TASK-18, TASK-30 |
| TASK-51 | Export my data and delete my account | tech-lead | high | FR-034 | TASK-9, TASK-6 |
| TASK-59 | Shelter API keys and import endpoint | tech-lead | low | FR-028 | TASK-47 |
| TASK-60 | Shelter analytics and municipality reports | design-lead | medium | FR-028 | TASK-48 |
| TASK-61 | Adoptable animals page for shelters | design-lead | medium | FR-028 | TASK-45 |
| TASK-87 | Local proximity alerts with OS geofences (mobile) | tech-lead | medium | FR-043, NFR-BATT, NFR-OFFLINE | TASK-85, TASK-23, TASK-12 |
| TASK-89 | Admin: edit the shelter directory and yearly refresh | design-lead | low | FR-044 | TASK-88, TASK-34 |
| TASK-90 | Public shelter pages /zavetisca/{slug} | design-lead | medium | FR-044, NFR-SEO | TASK-88, TASK-11 |

### M4 (15 stories)
| ID | Story | Owner | Prio | Req | Depends on |
|---|---|---|---|---|---|
| TASK-52 | Subscriptions and entitlements (Stripe test mode) | tech-lead | high | FR-020 | TASK-32, TASK-9 |
| TASK-53 | Boost a lost listing | design-lead | high | FR-025 | TASK-32, TASK-23, TASK-31, TASK-18, TASK-7 |
| TASK-54 | Subscribe to Premium Protect | design-lead | medium | FR-026 | TASK-52 |
| TASK-55 | >- | tech-lead | medium | FR-026 | TASK-52, TASK-16, TASK-53, TASK-35 |
| TASK-62 | Moderation queue and user management | design-lead | high | FR-018, FR-019 | TASK-34, TASK-25 |
| TASK-63 | Automated image screening on upload | tech-lead | medium | FR-018 | TASK-40, TASK-25 |
| TASK-64 | KPI dashboard and GA4 reporting | tech-lead | medium | FR-019, FR-038 | TASK-34, TASK-32 |
| TASK-65 | Monthly supporter Podpornik | design-lead | medium | FR-022 | TASK-52, TASK-18, TASK-7 |
| TASK-67 | Where your money goes page and dohodnina | content-strategist | medium | FR-024 | TASK-11, TASK-2, TASK-32 |
| TASK-79 | Vet Partner subscription and clinic profile | design-lead | medium | FR-028 | TASK-52, TASK-44 |
| TASK-80 | >- | tech-lead | medium | FR-028 | TASK-79, TASK-35, TASK-36, TASK-23, TASK-24 |
| TASK-81 | Premium AI: written listing and social posts (SL/EN) | tech-lead | medium | FR-026, NFR-AI | TASK-52, TASK-40, TASK-24 |
| TASK-82 | Premium AI: poster designs | design-lead | medium | FR-026, NFR-AI | TASK-52, TASK-40, TASK-24 |
| TASK-83 | Premium AI: search plan | tech-lead | low | FR-026, NFR-AI | TASK-52, TASK-40, TASK-18 |

### M5 (10 stories)
| ID | Story | Owner | Prio | Req | Depends on |
|---|---|---|---|---|---|
| TASK-68 | Security hardening and abuse testing | tech-lead | high | NFR-SEC | TASK-17, TASK-49, TASK-66, TASK-35 |
| TASK-69 | Accessibility and performance audit and fixes | design-lead | high | NFR-A11Y, NFR-PERF, NFR-BROWSER | TASK-39, TASK-45, TASK-62, TASK-36 |
| TASK-70 | Observability, backups and recovery drill | tech-lead | medium | NFR-OBS, NFR-AVAIL | TASK-5 |
| TASK-71 | Final legal pages and accessibility statement | content-strategist | high | FR-035, NFR-PRIV | TASK-28, TASK-69, TASK-67, TASK-91 |
| TASK-72 | SEO landing pages, structured data and sitemap | content-strategist | medium | FR-035, NFR-SEO | TASK-18, TASK-31, TASK-27 |
| TASK-73 | Success stories page | design-lead | low | FR-012 | TASK-26, TASK-27, TASK-62 |
| TASK-74 | Pilot onboarding kit for shelters | content-strategist | high | FR-015 | TASK-46, TASK-47, TASK-48, TASK-49 |
| TASK-75 | Mobile release candidate builds and store pack | tech-lead | low | FR-037 | TASK-12, TASK-5, TASK-39 |
| TASK-91 | Lawyer briefing pack (start now for lead time; Q-013) | content-strategist | high | FR-045, NFR-PRIV | - |
| TASK-76 | Launch readiness and go-live checklist | tech-lead | high | NFR-AVAIL | TASK-68, TASK-69, TASK-70, TASK-71, TASK-74, TASK-72 |
| TASK-84 | Marketing and go-to-market plan (docs/07-marketing-plan.md) | content-strategist | low | FR-040 | - |

### M6 (2 stories)
| ID | Story | Owner | Prio | Req | Depends on |
|---|---|---|---|---|---|
| TASK-77 | Self-serve ad booking for sponsors | design-lead | low | FR-033 | TASK-37, TASK-52 |
| TASK-78 | Stripe invoicing for sponsors | tech-lead | low | FR-033 | TASK-77 |

# Responsibilities

| Area | Responsible | Approves | Consulted |
|---|---|---|---|
| Scope and requirements | Product Manager | Client | Project Lead |
| Design (system, UI kit, flows, ad placements, consent UI) | Design Lead | Client | Product Manager |
| Architecture, data contracts, matching, payments, ad serving | Tech Lead | Project Lead | Product Manager |
| Analytics (GA4, Firebase, taxonomy, funnels) | Tech Lead (build), Product Manager (taxonomy and KPIs) | Client | Design Lead, Content Strategist |
| Content and SEO (copy, glossary, Partners page, house ads, legal drafts) | Content Strategist | Client | Design Lead |
| Legal review (privacy, terms, dohodnina, shelter rules) | Client and legal advisor | Client | Content Strategist, Product Manager |
| Sponsor sales and Partners page pitch | Client | Client | Product Manager |
| Credentials (hosting VPS, Supabase, R2, Stripe, GA4, Firebase, Apple, Google) | Client | Client | Tech Lead |
| Pilot shelters and onboarding | Client | Client | Content Strategist, Product Manager |
| Release | Tech Lead | Client | QA |

# Risks

| ID | Risk | Impact | Probability | Mitigation | Owner |
|---|---|---|---|---|---|
| R-001 | Cloud credentials (Q-002, Q-007, Q-009) arrive late: no staging deploy, no real push, no real GA4/Firebase data | Medium | High | Local-first with mocks (P-6); dry-run pipeline; list needed credentials in the environments runbook and ask early | Tech Lead |
| R-002 | Scope is large for a lean budget (87 stories, M2 alone has 29) | High | Medium | Priority tags (Must/Should/Could); low-priority stories off the critical path (TASK-50, 59, 73, 75, 83, 84); M2 reviewed in two checkpoints (loop gate, then ads and support); cut order agreed with client | Product Manager |
| R-003 | App-store in-app purchase rules: tips and donations to non-charities, Premium, Podpornik and Boost may require IAP on iOS and Google Play billing on Android; store submission is out of scope now but the model may not survive review | High | High | Mobile opens web checkout in this phase; purchases designed to be removable on mobile; written decision in TASK-75; RevenueCat or IAP as a later milestone | Product Manager |
| R-004 | GA4 in the EU: transfers to the US, regulator scrutiny, low consent rates make data partial | Medium | Medium | Consent Mode v2 with modelling, no personal data in events, 14-month retention, Google signals off, processor disclosure in privacy policy, our DB is the source of truth for ads and KPIs; server-side tagging later | Tech Lead |
| R-005 | Dohodnina needs a non-profit with public-interest status (Signapps can never qualify; a new society needs about 2 years), so it is deferred or done via a partner NGO;  donation wording and VAT treatment of contributions are unclear for a company (Q-008) | Medium | High | Section hidden behind a flag; commercial wording ("podpora"); legal and accounting check before enabling | Client |
| R-006 | (Retired 2026-10-15) Reward escrow dropped in brief v1.1; rewards are display-only with a scam warning, so no payment-services exposure (Q-011 closed) | n/a | n/a | n/a | Product Manager |
| R-007 | Scams and abuse through anonymous reports and chat | High | High | Captcha, rate limits, hidden contact data, chat safety banner, abuse reports from M2, auto-hide at 3 flags, image screening, moderation queue (M4), security pass (M5) | Tech Lead |
| R-008 | Cold start: no users and no listings on day one, no ad revenue without audience | High | High | Seed from pilot shelters, share into Facebook groups, honest Partners page with live numbers, house ads fill slots, ads kept cheap in M2 | Client |
| R-009 | AI cost overrun or provider outage | Medium | Medium | Caps per photo and per device, image-hash cache, monthly budget, fail-open to manual forms, mocks | Tech Lead |
| R-010 | Match quality too low to earn trust | High | Medium | Explainable v1, evaluation harness for v2, owner confirm and reject feedback stored, thresholds in config, tune with pilot data | Tech Lead |
| R-011 | Location or chip data leak (fuzz bypass, chip enumeration) | High | Low | Fuzzing in the read model, throttled and audited chip lookup, RLS matrix test, security pass | Tech Lead |
| R-012 | Sponsors do not buy before there is an audience | Medium | Medium | Cheap v1, house ads as fallback, Partners page with real stats, self-serve postponed to M6 | Client |
| R-013 | Ads erode trust in a stressful product | Medium | Low | No ads in report flows, chat or payment (tested), clear "Oglas" label, calm styling, 4 slots only | Design Lead |
| R-014 | Shelter holding period (default 8 days) and other animal-protection rules to be confirmed (Q-006) | Medium | Medium | Configurable reminders only, no legal assertions in product copy, legal review before launch | Client |
| R-015 | Free-tier and single-VPS limits (Supabase Free database size and backups, Realtime connections, one server) hurt availability and recovery targets | Medium | Medium | Monitor usage, plan paid tier before launch, restore drill in M5 | Tech Lead |
| R-016 | Accessibility debt on maps, consent banner and portal tables | Medium | Medium | List alternative to the map, axe in CI from M1, formal audit M5 before the accessibility statement | Design Lead |
| R-017 | Slovenian copy quality and consistency | Medium | Medium | Glossary and voice guide first (TASK-2), native review, CI key check | Content Strategist |
| R-018 | Long critical path through auth, pets and lost report delays the loop gate | Medium | Medium | Contracts and seeds let other stories proceed; early PetFields component; track weekly | Product Manager |
| R-019 | Region and municipality reference data licence or quality (ad targeting, stats) | Low | Medium | Verify open-data licence early in TASK-35; fall back to user-selected region | Tech Lead |
| R-020 | Native Firebase Analytics needs dev builds and Firebase config (not Expo Go) | Low | Medium | Dev client in TASK-12; mock adapter until Q-009; documented setup | Tech Lead |
| R-021 | Revenue may not cover costs (G-5): shelters and municipalities pay nothing, vets pay only for visibility, prices are low and the core is free | High | Medium | Lean infrastructure on free tiers, AI caps (NFR-AI), ads from M2 and Vet Partner from M4, the Reunited support ask, a transparent money page, review at month 3 with the client; Premium AI extras are capped per user | Product Manager |
| R-022 | Vet Partner and sponsor sales need an audience first | Medium | High | Marketing plan (TASK-84) starts early, pilot-region focus, honest Partners page, vets get free reunite tools so they join before they pay | Client |
| R-023 | Premium AI extras (listing, poster designs, search plan) raise AI cost and quality risk | Medium | Medium | Per-user and monthly caps, mock locally, SL/EN review of prompts, manual fallbacks stay free | Tech Lead |
| R-024 | Background ("Always") location permission needed for geofence alerts may be refused by App Store or Play review or by users | Medium | High | Strictly opt-in with a clear primer, feature works without it, only OS geofencing and public fuzzed areas, written justification prepared before store release (TASK-75), toggle to remove all geofences | Product Manager |
| R-025 | Offline cache and geofences: OS region limits (about 20 on iOS), OS throttling, stale data, cache leaking exact data | Medium | Medium | Pick nearest and most recent areas, show last-updated state, cache only public fuzzed data and wipe on logout (NFR-OFFLINE), daily cap and once per pet per area | Tech Lead |
| R-026 | Vet Partner labelling and ranking may breach advertising rules (paid clinic presented as nearest; paid lines in alerts without marketing consent) | High | Medium | Always "Oglas", "Veterinar v vaši regiji", "Kako razvrščamo" link, no paid line in push or email without consent, ranking rules in the contract, feature flag until a lawyer confirms | Product Manager |
| R-027 | Legal timings (3 days / 72 h, 24 h, 8-day holding) and ads for animals (duty to verify marking data) misstated | High | Medium | Legal-content flag until confirmed, ad blocklist for animal sale or give-away, moderation removes such listings, lawyer review (Q-006) | Client |
| R-028 | Shelter directory out of date (wrong phone for a municipality) | Medium | Medium | Source and last-verified date shown, admin editing, yearly refresh after 31 March, never show unconfirmed numbers | Product Manager |
| R-029 | VAT treatment of voluntary contributions and tips unclear: FR-046 says VAT 22 % on every invoice, which may not apply to tips (OQ-001, Q-012) | Medium | Medium | Accountant decides under Q-012 before live payments; VAT handling configurable per product type; live payments stay blocked until the decision is recorded (R-046.4) | Client |

# Communication

Status report per milestone (generated from the backlog), demo at each milestone, and a decision log in the Project Brief. Open questions for the client are tracked in the brief (Q-001 to Q-011; Q-010 is decided: Premium is ad-free, Podpornik is not).

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-14 | Template |
| 0.2 | 2026-10-14 | Milestones M1–M6, 78 stories in Backlog.md, critical path, risks. Added client scope: voluntary support, early ads in M2, GA4/Firebase and consent in M1 |
| 0.3 | 2026-10-15 | Brief v0.4-v0.8: Shelter Pro dropped, shelter tools (TASK-59, 60, 61) free and moved to M3; Vet Partner (TASK-79, 80) and Premium AI extras (TASK-81, 82, 83) in M4; QR/NFC tags removed (TASK-56, 57 archived); monetisation model v0.8 (Boost EUR 4.99, Premium EUR 2.99/24.99, Podpornik from EUR 2); marketing plan story TASK-84; 81 stories; risks R-021..R-023 |
| 0.4 | 2026-10-15 | Offline mode: TASK-85 offline cache and TASK-86 offline report queue (M2), TASK-87 local proximity alerts (M3); risks R-024, R-025; 84 stories |
| 0.5 | 2026-10-15 | Discovery changes applied: shelter directory stories TASK-88 (M2), TASK-89, TASK-90 (M3); checklists in TASK-29/30; CRHŽ and cats first (TASK-16, 49); 8-day holding (TASK-45, 46, 47, 48); animal-sale ad blocklist (TASK-35, 37, 61, 62); Vet Partner labelling (TASK-36, 79, 80); SEO routes (TASK-72); share kit (TASK-24); marketing partners (TASK-84); risks R-026..R-028; 87 stories |
| 0.6 | 2026-10-15 | TASK-91 lawyer briefing pack (M5, high, startable now, L1; TASK-71 now depends on it) and TASK-92 fiscal invoices (M2, depends on TASK-32; gates live payments); 89 stories |
| 0.7 | 2026-10-15 | Reward escrow dropped (brief v1.1): TASK-66 archived, TASK-68 no longer depends on it, R-006 retired, M4 text updated; new risk R-029 (VAT on voluntary contributions, Q-012) |
