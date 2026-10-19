---
doc_id: DOC-92
title: Dependency Graph
version: 2026-10-19
status: Generated
date: 2026-10-19
owner: Product Manager
audience: Client, team
---

# Work waves

Each wave can run in parallel once the previous waves are done. Green = done, blue = in progress, purple = in review, grey = to do.

```mermaid
flowchart LR
 subgraph W1["Wave 1"]
  TASK_11_3["TASK-11.3 QA: Web app shell and navigation<br/>@qa"]
  TASK_112["TASK-112 Web performance budgets: LCP over 2.5 s and JS over budget on the report flows and the map<br/>@frontend-dev"]
  TASK_114_33["TASK-114.33 Retention purge job: purge per the data-inventory windows, reports last (CH-184)<br/>@backend-dev"]
  TASK_114_35["TASK-114.35 API client: token in the body for unregisterPushToken, run gen:api and drop hand-written stubs (CH-156, CH-192, CH-197)<br/>@frontend-dev"]
  TASK_117_1["TASK-117.1 Wireframe: report statistics view (approval gate)<br/>@design-lead"]
  TASK_12_4["TASK-12.4 QA: Mobile app shell, navigation and deep links<br/>@qa"]
  TASK_13_4["TASK-13.4 QA: Consent banner and preferences (web and mobile)<br/>@qa"]
  TASK_16_1["TASK-16.1 Image: empty state, no pets registered yet<br/>@image-generator"]
  TASK_17_13["TASK-17.13 Manage view offers 'Create an account' (anonymous conversion) on web /m and mobile<br/>@"]
  TASK_17_4["TASK-17.4 QA: Anonymous reporter safeguards and manage link<br/>@qa"]
  TASK_18_4["TASK-18.4 QA: Report detail page<br/>@qa"]
  TASK_21_5["TASK-21.5 QA: In-app chat between owner and finder<br/>@qa"]
  TASK_22_1["TASK-22.1 Image: empty state, nothing in the inbox yet<br/>@image-generator"]
  TASK_22_9["TASK-22.9 Web inbox: photo thumbnail on nearby-alert rows<br/>@frontend-dev"]
  TASK_23_4["TASK-23.4 QA: Nearby lost-pet alerts<br/>@qa"]
  TASK_24_4["TASK-24.4 QA: Printable poster and sharing<br/>@qa"]
  TASK_25_6["TASK-25.6 QA: Report a listing, message or user<br/>@qa"]
  TASK_26_1["TASK-26.1 Image: reunited celebration illustration<br/>@image-generator"]
  TASK_27_3["TASK-27.3 QA: Public pages copy: home, how it works, safety tips, FAQ, for shelters<br/>@qa"]
  TASK_27_4["TASK-27.4 House ads seeded with placeholder copy, not the final P21 creatives<br/>@content-strategist"]
  TASK_27_5["TASK-27.5 P3 copy still marked Draft, client and native SL approval pending<br/>@content-strategist"]
  TASK_28_2["TASK-28.2 QA: Legal page drafts: privacy, cookies, terms, imprint, accessibility statement<br/>@qa"]
  TASK_29_14["TASK-29.14 Web lost flow: skip the photo step for a saved pet with photos<br/>@frontend-dev"]
  TASK_29_15["TASK-29.15 Mobile lost flow: skip the photo step for a saved pet with photos<br/>@frontend-dev"]
  TASK_29_7["TASK-29.7 QA: Report a lost pet<br/>@qa"]
  TASK_3_14["TASK-3.14 Image: mobile app icon and adaptive icon<br/>@image-generator"]
  TASK_30_4["TASK-30.4 QA: Quick found or sighted report without an account<br/>@qa"]
  TASK_31_1["TASK-31.1 Image: empty state, no reports nearby<br/>@image-generator"]
  TASK_33_4["TASK-33.4 QA: Voluntary support: Pomagajte nam izboljšati Najdimo<br/>@qa"]
  TASK_34_9["TASK-34.9 API: grant admin to three pilot staff accounts (owner request 2026-10-19)<br/>@backend-dev"]
  TASK_35_3["TASK-35.3 QA: Ad serving, targeting, house ads and tracking<br/>@qa"]
  TASK_36_1["TASK-36.1 Image: house ad, support the service<br/>@image-generator"]
  TASK_36_2["TASK-36.2 Image: house ad, partner with us<br/>@image-generator"]
  TASK_36_3["TASK-36.3 Image: house ad, adopt from a shelter<br/>@image-generator"]
  TASK_37_4["TASK-37.4 QA: Ad management in admin<br/>@qa"]
  TASK_38_4["TASK-38.4 QA: Partners page: Oglašujte pri nas<br/>@qa"]
  TASK_38_6["TASK-38.6 Partner stats: real GA Data API enrichment behind partners.ga_enrichment<br/>@backend-dev"]
  TASK_39_1["TASK-39.1 Core-loop end-to-end suite on web (SL and EN)<br/>@frontend-dev"]
  TASK_39_2["TASK-39.2 Mobile smoke flows (Maestro) on an Android dev build<br/>@frontend-dev"]
  TASK_4_3["TASK-4.3 QA: Quality kit and CI pipeline<br/>@qa"]
  TASK_4_7["TASK-4.7 Deploy: Dockerfiles install dependencies before copying the source (layer cache)<br/>@tech-lead"]
  TASK_40_11["TASK-40.11 API: never send photos uploaded before AI was switched on<br/>@backend-dev"]
  TASK_40_6["TASK-40.6 AI disclosure copy, privacy policy and data table update (requires legal review)<br/>@content-strategist"]
  TASK_40_9["TASK-40.9 Real-photo extraction eval run and model decision (owner-gated)<br/>@backend-dev"]
  TASK_43_7["TASK-43.7 Real-photo matching eval run and threshold picks (owner-gated)<br/>@backend-dev"]
  TASK_5_3["TASK-5.3 QA: Environments and deployment pipeline<br/>@qa"]
  TASK_54_1["TASK-54.1 Wireframe: Premium plan page, yearly first (approval gate)<br/>@design-lead"]
  TASK_6_11["TASK-6.11 QA: Domain contracts v1 and data platform conventions<br/>@qa"]
  TASK_7_4["TASK-7.4 QA: Analytics foundation: GA4 web, Firebase mobile, event taxonomy<br/>@qa"]
  TASK_85_4["TASK-85.4 QA: Offline cache of nearby reports (mobile)<br/>@qa"]
  TASK_86_3["TASK-86.3 QA: Offline queue for found and sighting reports (mobile)<br/>@qa"]
  TASK_87_3["TASK-87.3 QA: Local proximity alerts with OS geofences (mobile)<br/>@qa"]
  TASK_87_7["TASK-87.7 Mobile: paused alerts also stop proximity alerts<br/>@frontend-dev"]
  TASK_89_3["TASK-89.3 QA: Admin: edit the shelter directory and yearly refresh<br/>@qa"]
  TASK_9_5["TASK-9.5 QA: Accounts and sign-in (email, Google, Apple)<br/>@qa"]
  TASK_90_2["TASK-90.2 QA: Public shelter pages /zavetisca/{slug}<br/>@qa"]
  TASK_90_7["TASK-90.7 Public pages: cut first-load JS for mobile LCP 2.5 s, then make the Lighthouse quality job blocking<br/>@tech-lead"]
  TASK_92_2["TASK-92.2 QA: Fiscal invoices for card payments (davčno potrjevanje računov)<br/>@qa"]
 end
 subgraph W2["Wave 2"]
  TASK_16_8["TASK-16.8 QA: Pet profiles with chip number<br/>@qa"]
  TASK_22_6["TASK-22.6 QA: Notification infrastructure (in-app, push, email)<br/>@qa"]
  TASK_26_6["TASK-26.6 QA: Mark reunited, close and expire reports<br/>@qa"]
  TASK_3_6["TASK-3.6 QA: Monorepo scaffold and local-first dev environment<br/>@qa"]
  TASK_31_6["TASK-31.6 QA: Browse lost and found on a map and in a list<br/>@qa"]
  TASK_36_7["TASK-36.7 QA: Ad placements in feed, detail, reunited screen and sidebar<br/>@qa"]
  TASK_39_3["TASK-39.3 QA: Core loop end-to-end acceptance<br/>@qa"]
  TASK_40_7["TASK-40.7 Staging: wire the Anthropic and Voyage keys and AI settings, deploy, smoke on najdimo.si<br/>@tech-lead"]
  TASK_41_3["TASK-41.3 Mobile: AI pre-fill in PetFields (pet profile, lost flow) and the found flow<br/>@frontend-dev"]
  TASK_43_5["TASK-43.5 Mobile match review: visual similarity reason and most similar photo first<br/>@frontend-dev"]
 end
 subgraph W3["Wave 3"]
  TASK_40_8["TASK-40.8 QA: AI attribute extraction service<br/>@qa"]
  TASK_41_6["TASK-41.6 Mobile: crop tool for form photos (gesture frame, expo-image-manipulator), first photo checked again<br/>@frontend-dev"]
  TASK_43_6["TASK-43.6 QA: Matching v2 with image similarity<br/>@qa"]
 end
 subgraph W4["Wave 4"]
  TASK_41_4["TASK-41.4 QA: AI pre-fill in pet, lost and found forms<br/>@qa"]
 end
  TASK_1_1["TASK-1.1 Tokens pipeline: packages/tokens generated from docs/design/tokens.json"]
  TASK_1_2["TASK-1.2 QA: Design system: brand direction and design tokens"]
  TASK_10_1["TASK-10.1 packages/i18n: ICU catalogues, key-parity and plural check, formatting helpers"]
  TASK_10_2["TASK-10.2 Web i18n: next-intl with shared catalogues, localised pathnames, hreflang, switcher"]
  TASK_10_3["TASK-10.3 Mobile i18n: use-intl with shared catalogues, SL plural support, persisted choice"]
  TASK_10_4["TASK-10.4 QA: Slovenian and English localisation infrastructure"]
  TASK_10_5["TASK-10.5 Web analytics: ScreenViews reports the next-intl internal route template"]
  TASK_100["TASK-100 Bug: web unit tests flaky on first run under load"]
  TASK_101["TASK-101 Test global-setup refuses unmerged migrations on the shared local DB"]
  TASK_102["TASK-102 Test global-setup flags unmerged migrations already applied to the shared DB"]
  TASK_103["TASK-103 Audit: pin @grpc/grpc-js >= 1.13.6 via override (firebase transitive)"]
  TASK_104["TASK-104 Bug: match_* notification sources missing; admin FailedJob.id rejects pg-boss job ids"]
  TASK_105["TASK-105 e2e: verifiable test session for signed-in and admin specs"]
  TASK_106["TASK-106 Report PATCH: row lock against a racing close; pet species check on species change"]
  TASK_107["TASK-107 Monorepo: resolve @zivali/* packages from the checkout, not from node_modules links"]
  TASK_108["TASK-108 API tests: find and fix the test that flakes under load in the merge-queue verify"]
  TASK_109["TASK-109 API tests: purge finished pg-boss jobs before the run so the shared local DB does not slow the job-drain tests"]
  TASK_11_1["TASK-11.1 Design: Web shell (P1)"]
  TASK_11_2["TASK-11.2 Web shell: header, footer, layout, route groups and guards, shared states"]
  TASK_110["TASK-110 API tests: alerts fan-out test isolation (random test location, cleanup that cannot time out, residue purge)"]
  TASK_111["TASK-111 Web a11y follow-ups from the e2e fixes: empty-state headings, modal menus, accessible names"]
  TASK_112_1["TASK-112.1 Web: the consent banner is the LCP element on content pages"]
  TASK_113["TASK-113 Cookie policy: verify the five cookie lifetimes still marked for the client"]
  TASK_114_1["TASK-114.1 Sign-up with an existing email: flag it before the check-your-email screen, offer sign-in"]
  TASK_114_10["TASK-114.10 Inbox: the Sporočila/Obvestila tabs do not show where the unread items are"]
  TASK_114_11["TASK-114.11 Shelter directory: 'Uporabi mojo lokacijo' finds the responsible shelter"]
  TASK_114_12["TASK-114.12 Lost report, pet step: 'Enter details' looks like an action but only selects; skip the step without saved pets"]
  TASK_114_13["TASK-114.13 Map filters: type and species may be all off (none selected means all)"]
  TASK_114_14["TASK-114.14 Notification and alert settings: free choice, nothing selected means none"]
  TASK_114_15["TASK-114.15 'Kako vas obvestimo': a collapsible section, not a separate page"]
  TASK_114_16["TASK-114.16 Accessibility statement: microenterprise exemption (EAA, ZDPSI); decide voluntary page or remove"]
  TASK_114_17["TASK-114.17 Imprint → 'Podatki o podjetju' (ZEPT), not a media imprint (ZMed)"]
  TASK_114_18["TASK-114.18 Legal pages: headings, tables and lists render unstyled (MDX HTML tags bypass mdx-components)"]
  TASK_114_19["TASK-114.19 Legal tables are hard to read: row separation, column widths, cards on mobile"]
  TASK_114_2["TASK-114.2 Switching language turns the site light in dark mode"]
  TASK_114_20["TASK-114.20 Cookie settings: link the 'politika piškotkov' mention to the cookies page"]
  TASK_114_21["TASK-114.21 Legal pages: the 'Na tej strani' menu marks the section you are reading"]
  TASK_114_22["TASK-114.22 Matching too loose: species, distance and time alone make a 'possible' match; require evidence"]
  TASK_114_23["TASK-114.23 Mobile parity: pilot fixes from the web (existing-email sign-up, photo-step message, inbox unread tabs)"]
  TASK_114_24["TASK-114.24 Found-flow unit tests flaky since TASK-114.5 (photo upload hook)"]
  TASK_114_25["TASK-114.25 Unit tests: the same 'online' event race in the chat, manage and photo-picker tests"]
  TASK_114_26["TASK-114.26 Auth e2e still expects the old taken-address behaviour (TASK-114.1)"]
  TASK_114_27["TASK-114.27 Leftovers from the 2026-10-18 CHANGE batch: dev-kit sample text and the lawyer briefing's consent-cookie line"]
  TASK_114_28["TASK-114.28 e2e flake: lifecycle.spec.ts:52 finds the close toast inside main"]
  TASK_114_29["TASK-114.29 Sync the i18n catalogue with the content slices after the CHANGE batch (2026-10-18)"]
  TASK_114_3["TASK-114.3 Header nav: Zemljevid stays underlined on Izgubljene and Najdene (the same page with a filter)"]
  TASK_114_30["TASK-114.30 CSP: allow the R2 upload origin in img-src (CH-297)"]
  TASK_114_31["TASK-114.31 API test flake: reports.search 'sorts by distance … boosted first' compares a planar estimate"]
  TASK_114_32["TASK-114.32 Report writes queue match.report on relevant updates and photo.publish on every visibility or photo change (CH-180, CH-191)"]
  TASK_114_34["TASK-114.34 Align packages/types with the built schema and C9: enums, chat, Organisation (CH-136, CH-139)"]
  TASK_114_36["TASK-114.36 API dev tooling: realtime stub in scratch DBs, seeded photos through PhotosDomain, fixed seed short codes (CH-182, CH-193, CH-409)"]
  TASK_114_37["TASK-114.37 GET /v1/admin/queues: accept any uuid-shaped job id in FailedJob (CH-194)"]
  TASK_114_38["TASK-114.38 Mock payment checkout_url keeps return_to (CH-252)"]
  TASK_114_39["TASK-114.39 Ads: allow an empty cta; public AdView falls back to t(learn_more) (CH-467)"]
  TASK_114_4["TASK-114.4 Sign-up from the report flow: the confirmation link does not return to the report"]
  TASK_114_40["TASK-114.40 Mobile test flake: report-lost 'time edit after a network failure' fails between 00:00 and 01:00 local"]
  TASK_114_41["TASK-114.41 Web test flake: manage.test 'sends the private link again' second click under load"]
  TASK_114_42["TASK-114.42 Web: owner choices 2026-10-19 for the footer, the alerts section and legal tables"]
  TASK_114_43["TASK-114.43 Web: uploaded photos are cropped so hard that the animal is cut off"]
  TASK_114_5["TASK-114.5 Lost report for a saved pet: Confirm loops back to the photo step"]
  TASK_114_6["TASK-114.6 Short pages: the footer floats mid-screen (page at least the viewport height)"]
  TASK_114_7["TASK-114.7 Poster PDF and square image file names carry the language"]
  TASK_114_8["TASK-114.8 Lost report: the reward note reads like a general note; make its copy reward-specific"]
  TASK_114_9["TASK-114.9 Facebook share: one tap copies the post text and opens the share dialog; verify the link preview"]
  TASK_115_1["TASK-115.1 Wireframe: homepage rework (person approval gate)"]
  TASK_115_10["TASK-115.10 Web: homepage option B (replaces the live option A)"]
  TASK_115_11["TASK-115.11 Web: homepage B polish from the live design check"]
  TASK_115_2["TASK-115.2 Mockup: homepage rework (skip if 115.1 is a component mock)"]
  TASK_115_3["TASK-115.3 Content: homepage rework copy"]
  TASK_115_4["TASK-115.4 API: public homepage numbers (only if the approved wireframe has them)"]
  TASK_115_5["TASK-115.5 Web: implement the homepage rework"]
  TASK_115_6["TASK-115.6 QA: homepage rework"]
  TASK_115_7["TASK-115.7 Home: recent-report card photo alt shows the pet''s name"]
  TASK_115_8["TASK-115.8 Home: focused recent-report card stays mostly off-screen in the mobile strip"]
  TASK_115_9["TASK-115.9 Home latest reports: 4th card orphaned in 3-column grid at desktop"]
  TASK_116_1["TASK-116.1 Wireframe: footer rework (person approval gate)"]
  TASK_116_2["TASK-116.2 Web: implement the footer rework"]
  TASK_12_1["TASK-12.1 Design: Mobile shell (P2)"]
  TASK_12_2["TASK-12.2 Mobile shell: tabs, Report action, permission primer, settings stack"]
  TASK_12_3["TASK-12.3 Deep links (App Links, universal links) and push token registration path"]
  TASK_12_5["TASK-12.5 Mobile local data layer: expo-sqlite store, local migrations, network state, wipe"]
  TASK_12_6["TASK-12.6 Mobile deep links: /r/<code>/ujemanja, /matches, /spet-doma, /reunited and /poster.pdf open the app on the map"]
  TASK_12_7["TASK-12.7 Mobile has no +not-found screen: routes without a screen show Expo's English Unmatched Route page with a Sitemap link"]
  TASK_13_1["TASK-13.1 Design: Consent banner and preferences (P17)"]
  TASK_13_2["TASK-13.2 Web consent banner and Cookie settings"]
  TASK_13_3["TASK-13.3 Mobile consent sheet and settings entry"]
  TASK_13_5["TASK-13.5 Consent banner hides focused footer controls while open (WCAG 2.4.11)"]
  TASK_13_6["TASK-13.6 Consent banner does not take focus on the manage page (/m) first visit"]
  TASK_13_7["TASK-13.7 Web re-ask after 12 months never says a year has passed (consent cookie expires with the choice)"]
  TASK_14_1["TASK-14.1 Photos: R2 presigned uploads, sharp processing, publishing and cleanup"]
  TASK_14_2["TASK-14.2 Web PhotoPicker: resize, EXIF read and strip, drafts, upload with retry"]
  TASK_14_3["TASK-14.3 Mobile PhotoPicker: camera/gallery, resize, EXIF, drafts, upload with retry"]
  TASK_14_5["TASK-14.5 Web CSP img-src blocks published report photos from the public media origin outside local"]
  TASK_14_6["TASK-14.6 Report photo alt text has no colour (or area): API builds it from type, species and name only"]
  TASK_14_7["TASK-14.7 Web preparePhoto checks the 320 px short edge before scaling: a panorama fails at the API with a generic error"]
  TASK_14_8["TASK-14.8 Mobile: picked photos beyond the 5-photo room keep their picker cache copy with full EXIF and GPS"]
  TASK_15_1["TASK-15.1 Design: Location picker and fuzzed area (P5)"]
  TASK_15_2["TASK-15.2 Web MapView: MapLibre + OpenFreeMap, markers, clusters, areas, list alternative"]
  TASK_15_3["TASK-15.3 Web LocationPicker: GPS, pin, search, radius, permission fallback"]
  TASK_15_4["TASK-15.4 Mobile MapView: MapLibre React Native, markers, clusters, areas, list alternative"]
  TASK_15_5["TASK-15.5 Mobile LocationPicker: GPS, pin, search, radius, permission fallback"]
  TASK_15_6["TASK-15.6 QA: Location picker and privacy-preserving map display"]
  TASK_15_7["TASK-15.7 GURS settlements, districts, streets and house numbers: data, licence, generator"]
  TASK_15_8["TASK-15.8 Geocoder API: geo_places and geo_addresses, seeder, POST /v1/geo/search and /v1/geo/reverse"]
  TASK_16_2["TASK-16.2 Design: Pet profiles (P8)"]
  TASK_16_3["TASK-16.3 Pets API: owner CRUD, chip rules incl. CRHŽ question, duplicate-chip flag, free limit"]
  TASK_16_4["TASK-16.4 Web PetFields form section (shared by pet profiles and the lost flow)"]
  TASK_16_5["TASK-16.5 Mobile PetFields form section (shared by pet profiles and the lost flow)"]
  TASK_16_6["TASK-16.6 Web My pets: list, create, edit, archive, delete"]
  TASK_16_7["TASK-16.7 Mobile My pets: list, create, edit, archive, delete"]
  TASK_16_9["TASK-16.9 Pets: POST /v1/pets honours Idempotency-Key; web and mobile send one key per create chain"]
  TASK_17_1["TASK-17.1 Anonymous safeguards: submission guard, holds, manage token, claim and resend endpoints"]
  TASK_17_10["TASK-17.10 Web manage page: focus is lost after the 'Zival je spet doma' confirm dialog closes"]
  TASK_17_11["TASK-17.11 EAS preview profile lacks EXPO_PUBLIC_CAPTCHA while staging Auth requires Turnstile"]
  TASK_17_12["TASK-17.12 Create an account from an anonymous session converts it (C7 §6) on web and mobile success screens"]
  TASK_17_14["TASK-17.14 Mobile manage screen (/m) never tracks reunited when the finder marks the animal home"]
  TASK_17_2["TASK-17.2 Web anonymous session, Turnstile captcha and manage-link page"]
  TASK_17_3["TASK-17.3 Mobile anonymous session, captcha WebView and manage-link screen"]
  TASK_17_5["TASK-17.5 Manage page Close sends no reason: the API refuses it (VALIDATION) on web and mobile"]
  TASK_17_6["TASK-17.6 PATCH /v1/reports photo_ids skips the photo-hash hold: a visible anonymous report can take a held or removed report's photo"]
  TASK_17_7["TASK-17.7 Web manage page Edit links to /r/<code>, which is a 404 on main"]
  TASK_17_8["TASK-17.8 Mobile manage screen has no Edit action"]
  TASK_17_9["TASK-17.9 Manage page /m ships 415 KB of JS, over the 256 KB Lighthouse script budget"]
  TASK_18_1["TASK-18.1 Design: Report detail (lost, found, sighted) (P9)"]
  TASK_18_2["TASK-18.2 Web report detail /r/[code]: SSR, slots, OG image, JSON-LD, 410"]
  TASK_18_3["TASK-18.3 Mobile report detail screen with slots"]
  TASK_19_1["TASK-19.1 Matching engine v1: match.report job, TypedSQL candidates, scoring, idempotent suggestions"]
  TASK_19_2["TASK-19.2 Matching fixture suite: 30+ synthetic pairs"]
  TASK_19_3["TASK-19.3 QA: Matching engine v1"]
  TASK_20_1["TASK-20.1 Design: Match review (P11)"]
  TASK_20_2["TASK-20.2 Match review API: suggestions, confirm (opens chat), reject with feedback"]
  TASK_20_3["TASK-20.3 Web match review: compare, confirm, reject"]
  TASK_20_4["TASK-20.4 Mobile match review: compare, confirm, reject"]
  TASK_20_6["TASK-20.6 C8: add other.id to the match public subset; show 'Prijavi zlorabo' on web and mobile match review"]
  TASK_20_7["TASK-20.7 Mobile match list empty state lacks poster and alerts next steps"]
  TASK_21_1["TASK-21.1 Design: Chat (P12)"]
  TASK_21_2["TASK-21.2 Chat API: conversations and messages endpoints, Realtime Broadcast with membership policy, retention"]
  TASK_21_3["TASK-21.3 Web inbox and conversation: realtime chat with safety banner"]
  TASK_21_4["TASK-21.4 Mobile inbox and conversation: realtime chat with safety banner"]
  TASK_21_6["TASK-21.6 Detail slot A contact actions: 'Pošlji sporočilo' and 'To je moja žival' start a conversation (C9) on web and mobile"]
  TASK_21_7["TASK-21.7 Chat: block is unreachable in web and mobile (no other_participant_id from C9, CH-170)"]
  TASK_21_8["TASK-21.8 Chat: link caution misses bare domains on uncommon TLDs (has_link regex)"]
  TASK_22_2["TASK-22.2 Design: Notifications, nearby alerts and settings (P13)"]
  TASK_22_3["TASK-22.3 Notifications: notify.send job, inbox and preferences API, push tokens, Expo and Brevo adapters"]
  TASK_22_4["TASK-22.4 Web notifications view, unread badge and notification settings"]
  TASK_22_5["TASK-22.5 Mobile notifications, push registration and notification settings"]
  TASK_22_7["TASK-22.7 Web inbox: load more via next_cursor and quiet-hours form validation"]
  TASK_22_8["TASK-22.8 Nearby-alert payload carries a public thumbnail URL (C10 nearby_lost)"]
  TASK_23_1["TASK-23.1 Nearby alerts: subscription API and spatial fan-out job"]
  TASK_23_2["TASK-23.2 Web nearby-alert settings"]
  TASK_23_3["TASK-23.3 Mobile nearby-alert settings"]
  TASK_24_1["TASK-24.1 Design: Poster and sharing (P18)"]
  TASK_24_2["TASK-24.2 Poster PDF route and web share menu"]
  TASK_24_3["TASK-24.3 Mobile share sheet and poster download"]
  TASK_25_1["TASK-25.1 Design: Report abuse (P10)"]
  TASK_25_2["TASK-25.2 Abuse reports API: report, weighting, auto-hide, staff lists"]
  TASK_25_3["TASK-25.3 Web ReportAbuseDialog and detail-page slot"]
  TASK_25_4["TASK-25.4 Mobile report-abuse sheet and detail slot"]
  TASK_25_5["TASK-25.5 Admin list of abuse reports and moderation flags"]
  TASK_26_2["TASK-26.2 Design: Reunited and lifecycle (P14)"]
  TASK_26_3["TASK-26.3 Report lifecycle: transitions endpoint, reminders and expiry job, reunite effects"]
  TASK_26_4["TASK-26.4 Web My reports, owner actions and reunited screen"]
  TASK_26_5["TASK-26.5 Mobile My reports, owner actions and reunited screen"]
  TASK_26_7["TASK-26.7 Retention job: blur the stored point 30 days after a report is closed"]
  TASK_26_8["TASK-26.8 Mobile /m: marking the pet returned fires no reunited analytics event"]
  TASK_26_9["TASK-26.9 Mobile: owner has no extend or reminder card, and the C10 reminder link drops its action"]
  TASK_27_1["TASK-27.1 Design: Public pages: home and content templates (P3)"]
  TASK_27_2["TASK-27.2 Public pages: home, how it works, safety tips, FAQ, for shelters"]
  TASK_28_1["TASK-28.1 Legal pages from MDX with review notice"]
  TASK_28_3["TASK-28.3 Legal pages render <p> nested in <p> (invalid HTML, hydration risk)"]
  TASK_28_4["TASK-28.4 Cookie policy omits the web sessionStorage key manage_token"]
  TASK_29_1["TASK-29.1 Design: Report lost flow (P6)"]
  TASK_29_10["TASK-29.10 Mobile lost hand-off: auto-publish only for the sign-in round trip that started it; consume the mark"]
  TASK_29_11["TASK-29.11 Mobile lost flow: RATE_LIMITED shows the generic text, not the wait in minutes"]
  TASK_29_12["TASK-29.12 Mobile lost flow: VALIDATION on photo_ids, location or radius does not go back to its step"]
  TASK_29_13["TASK-29.13 Lost report for a saved pet reuses that pet''s photos (C4/C5, API)"]
  TASK_29_2["TASK-29.2 Report write API: POST and PATCH /v1/reports with idempotency, guard hook and jobs"]
  TASK_29_3["TASK-29.3 Web report-lost flow"]
  TASK_29_4["TASK-29.4 Web lost flow: signed-out draft hand-off and confirmation screen"]
  TASK_29_5["TASK-29.5 Mobile report-lost flow"]
  TASK_29_6["TASK-29.6 Mobile lost flow: signed-out draft hand-off and confirmation screen"]
  TASK_29_8["TASK-29.8 Mobile: lost-flow confirmation uses the shared ShelterRow"]
  TASK_29_9["TASK-29.9 Mobile lost flow: keep the idempotency key on 5xx/429/network, re-key on a time edit, reset the duplicate choice on pet change"]
  TASK_3_1["TASK-3.1 Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README"]
  TASK_3_10["TASK-3.10 Web: Redux store Provider and RTK Query api replace the TanStack QueryClientProvider"]
  TASK_3_11["TASK-3.11 Web scaffold hardening from the TASK-3.3 review: env default, 404 nonce, Playwright standalone, nonce e2e"]
  TASK_3_12["TASK-3.12 Swagger UI at /docs from apps/api/openapi.json"]
  TASK_3_13["TASK-3.13 Mobile: Redux store Provider and generated RTK Query api, font-scale caps, URL polyfill"]
  TASK_3_2["TASK-3.2 Local Supabase stack for Postgres, Auth and Realtime (no Edge Functions)"]
  TASK_3_3["TASK-3.3 Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers"]
  TASK_3_4["TASK-3.4 Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build"]
  TASK_3_5["TASK-3.5 packages/api foundation: REST client, ApiError, idempotency and query helpers, fixtures"]
  TASK_3_7["TASK-3.7 apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer"]
  TASK_3_8["TASK-3.8 Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api"]
  TASK_3_9["TASK-3.9 API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory)"]
  TASK_30_1["TASK-30.1 Design: Report found or sighted (no account) and manage page (P7)"]
  TASK_30_2["TASK-30.2 Web quick found or sighted report without an account"]
  TASK_30_3["TASK-30.3 Mobile quick found or sighted report (submits through the outbox)"]
  TASK_30_5["TASK-30.5 Mobile found flow: sightings link only to lost listings, keep startedAt on draft restore, held linked sighting copy"]
  TASK_30_6["TASK-30.6 Web: held linked sighting says the owner was told"]
  TASK_30_7["TASK-30.7 Mobile: CONFLICT and RATE_LIMITED drop the Idempotency-Key on the next Publish"]
  TASK_31_2["TASK-31.2 Design: Map and list (browse) (P4)"]
  TASK_31_3["TASK-31.3 Report search API: list and map endpoints through TypedSQL"]
  TASK_31_4["TASK-31.4 Web map and list browse with filters"]
  TASK_31_5["TASK-31.5 Mobile Map tab with list sheet and filters"]
  TASK_31_7["TASK-31.7 Browse result count caps at 500 (counts map pins, ignores total_estimate)"]
  TASK_32_1["TASK-32.1 Payments core: checkout endpoint, Stripe webhook ledger, mock provider, live-key and live-mode gates"]
  TASK_32_2["TASK-32.2 Web mock checkout, payment return page and My payments"]
  TASK_32_3["TASK-32.3 Mobile checkout hand-off and My payments"]
  TASK_32_4["TASK-32.4 QA: Payments core (Stripe test mode)"]
  TASK_32_5["TASK-32.5 Web build fails to load next.config.ts: SWC rejects two-entry non-wildcard tsconfig paths (TASK-107)"]
  TASK_32_6["TASK-32.6 Mobile checkout: premium_unavailable never shows (instanceof ApiError vs QueryError)"]
  TASK_33_1["TASK-33.1 Design: Support moments: tip and contribution (P15)"]
  TASK_33_2["TASK-33.2 Web support ask: reunited tip, lost-report contribution, profile card"]
  TASK_33_3["TASK-33.3 Mobile support ask: reunited tip, lost-report contribution, profile card"]
  TASK_34_1["TASK-34.1 Design: Admin console shell (P19)"]
  TASK_34_2["TASK-34.2 Admin API: aal2 enforcement, users and roles, audit log, queues, admin bootstrap script"]
  TASK_34_3["TASK-34.3 Web admin shell: role navigation, TOTP enrolment and challenge, audit log"]
  TASK_34_5["TASK-34.5 Admin pages are not disallowed in robots.txt"]
  TASK_34_6["TASK-34.6 Admin: lost authenticator has no recovery path; 'use a backup code' (P19 F7) not built"]
  TASK_34_7["TASK-34.7 Admin API: ad list/stats/image-upload and directory reads write no audit entry"]
  TASK_34_8["TASK-34.8 Web admin: idle session timeout dialog (P19)"]
  TASK_35_1["TASK-35.1 Ad serving API: slot endpoint, targeting and rotation, house ads, impressions, no animal-sale ads"]
  TASK_35_2["TASK-35.2 Ad click endpoint GET /v1/ads/:id/click (counting redirect, no open redirect)"]
  TASK_36_4["TASK-36.4 Design: Ad slots and house ads (P21)"]
  TASK_36_5["TASK-36.5 Web AdSlot and placements: feed, detail, reunited, sidebar"]
  TASK_36_6["TASK-36.6 Mobile AdSlot and placements: feed, detail, reunited"]
  TASK_36_8["TASK-36.8 Mobile AdSlot: send region_id, reserve 200 px for detail and reunited, count impressions like web"]
  TASK_36_9["TASK-36.9 Web AdSlot: AdUnit throws 'window is not defined' during streamed SSR (every slot)"]
  TASK_37_1["TASK-37.1 Design: Admin ad management (P20)"]
  TASK_37_2["TASK-37.2 Ad administration API: validated create and edit, image upload, status, soft delete, stats"]
  TASK_37_3["TASK-37.3 Web admin ad management: editor with preview, stats and CSV"]
  TASK_37_5["TASK-37.5 Admin ad form: after the first save the draft URL stays on /admin/oglasi/nov in Slovenian"]
  TASK_37_6["TASK-37.6 Admin ad form: button text labelled optional with a default, but required for two languages"]
  TASK_37_7["TASK-37.7 Ads API: blocked terms are also checked on image_alt and link_url"]
  TASK_38_1["TASK-38.1 Design: Partners page 'Oglašujte pri nas' (P22)"]
  TASK_38_2["TASK-38.2 Partner stats job and endpoint, lead endpoint with captcha"]
  TASK_38_3["TASK-38.3 Web Partners page (Oglašujte pri nas) with live stats and contact form"]
  TASK_38_5["TASK-38.5 P22: both Region selects share the accessible name ''Region''"]
  TASK_4_1["TASK-4.1 Quality kit: axe, visual, Lighthouse CI, links, PR template"]
  TASK_4_2["TASK-4.2 CI pipeline and `pnpm verify`"]
  TASK_4_4["TASK-4.4 Bug: photos e2e hardcodes API :4000, fails since TASK-98 free ports"]
  TASK_4_5["TASK-4.5 Bug: /dev/kit light axe spec times out at the 30 s default"]
  TASK_4_6["TASK-4.6 CI: cut Actions minutes (private repo): cancel superseded runs, Lighthouse nightly, images on change, docs-only skip, 4 e2e workers, CI without the local unit gates"]
  TASK_40_1["TASK-40.1 M3 AI foundation: ai.prisma models and HNSW index, queues with stubs, config keys, data inventory, photo hook"]
  TASK_40_10["TASK-40.10 Public config: ai.enabled is false when AI_PROVIDER is off (like payments.enabled)"]
  TASK_40_2["TASK-40.2 AI wire types, zod extraction schema and client fixtures (C19, C8 visual reason)"]
  TASK_40_3["TASK-40.3 ai.extract job: Claude vision via the Anthropic SDK, hash cache, caps, moderation signal, fail open"]
  TASK_40_4["TASK-40.4 GET /v1/photos/:id/attributes: pending, unavailable or ready suggestions"]
  TASK_40_5["TASK-40.5 Extraction evaluation set and model check (claude-haiku-5-5 vs claude-sonnet-5-5)"]
  TASK_41_1["TASK-41.1 Wireframe: AI pre-fill in the pet, lost and found forms (person approval gate)"]
  TASK_41_2["TASK-41.2 Web: AI pre-fill in PetFields (pet profile, lost flow) and the found flow"]
  TASK_41_5["TASK-41.5 Web: crop tool for form photos (react-image-crop), first photo checked again"]
  TASK_42_1["TASK-42.1 photo.embed job: Voyage multimodal-3.5 adapter, hash reuse, flagged photos skipped, budget, retries and dead-letter log"]
  TASK_42_2["TASK-42.2 Vector queries: best-pair similarity and nearest by species and radius (HNSW), 50k perf test"]
  TASK_42_3["TASK-42.3 Embedding backfill and model change: embedding.backfill job, deploy seeder 41, prune"]
  TASK_42_4["TASK-42.4 QA: Photo embeddings and vector index"]
  TASK_43_1["TASK-43.1 Matching v3 scorer: visual term and bands, lifted veto, geo-time cap, v2 fallback"]
  TASK_43_2["TASK-43.2 Matching engine v3: similarity per candidate, fallback, re-score on new vectors, photo order, reverse-search budget"]
  TASK_43_3["TASK-43.3 Matching evaluation harness: at least 100 labelled pairs, recall@10 and precision, v2 vs v3, thresholds"]
  TASK_43_4["TASK-43.4 Web match review: visual similarity reason and most similar photo first"]
  TASK_5_1["TASK-5.1 Hetzner deploy: Docker Compose + nginx/certbot, direct image transfer (no registry), migrations, rollback, nightly backup to R2"]
  TASK_5_2["TASK-5.2 EAS build profiles, mobile env per environment, Firebase config as secrets"]
  TASK_5_4["TASK-5.4 Deploy: reference-data seed after migrate deploy"]
  TASK_6_1["TASK-6.1 GURS municipalities and statistical regions: data, licence, generator"]
  TASK_6_10["TASK-6.10 REST and Realtime clients in @zivali/api: chat, notifications, alerts, abuse, payments, ads, partners"]
  TASK_6_12["TASK-6.12 API auth and platform middleware: JWKS verification, guards, rate limits, idempotency, ctx, audit, public config"]
  TASK_6_13["TASK-6.13 Validation: make zod-to-openapi extension opt-in (lean client bundles)"]
  TASK_6_14["TASK-6.14 Validation: coarsenPoint() in packages/validation/geo"]
  TASK_6_15["TASK-6.15 API rate limits: key anonymous actors by ip_hash, never device_hash alone"]
  TASK_6_16["TASK-6.16 Schema follow-up: report FKs on collab and commerce tables, ads.species as SPECIES[]"]
  TASK_6_17["TASK-6.17 API follow-ups from the 6.3 and 3.12 reviews: typed notification payload, stopJobs on shutdown, no /docs in production"]
  TASK_6_2["TASK-6.2 DB foundation and lockdown: schema app, extensions, deny-all RLS, security tests, platform models, fixture users"]
  TASK_6_3["TASK-6.3 Worker and jobs: pg-boss, queue registry with stubs, schedules, keep-alive, drain"]
  TASK_6_4["TASK-6.4 Geo reference models, GURS seeder and TypedSQL geo lookup"]
  TASK_6_5["TASK-6.5 Domain wire types and DTOs, zod request schemas, chip normalisation and breed codes"]
  TASK_6_6["TASK-6.6 Reports, pets and photos models, deterministic fuzz, public report endpoint, seed"]
  TASK_6_7["TASK-6.7 Matching, chat, notification and alert models with seed"]
  TASK_6_8["TASK-6.8 Abuse, payments, ads, leads and organisations models with seed"]
  TASK_6_9["TASK-6.9 REST clients in @zivali/api: auth, me, pets, reports, photos, geocode, matches"]
  TASK_7_1["TASK-7.1 packages/analytics: typed track(), event registry, consent store, adapters"]
  TASK_7_2["TASK-7.2 GA4 on web with basic Consent Mode v2"]
  TASK_7_3["TASK-7.3 Firebase Analytics on mobile with consent"]
  TASK_8_1["TASK-8.1 Design: UI kit gallery (P23)"]
  TASK_8_2["TASK-8.2 Web UI kit: shadcn primitives styled to the design system, /dev/kit gallery"]
  TASK_8_3["TASK-8.3 Mobile UI kit: RN Reusables primitives styled to the design system, gallery screen"]
  TASK_8_4["TASK-8.4 QA: UI kit core primitives for web and mobile"]
  TASK_8_5["TASK-8.5 Web kit: use the new type and state tokens (replace text-[15px]/[17px] and button color-mix)"]
  TASK_85_1["TASK-85.1 Sync feed API: GET /v1/sync/reports, incremental area sync with removals"]
  TASK_85_2["TASK-85.2 Mobile offline cache engine: area sync, thumbnails, limits, eviction, background refresh"]
  TASK_85_3["TASK-85.3 Mobile offline states for map and list, offline data settings"]
  TASK_85_5["TASK-85.5 Offline cache: a fresh area snapshot keeps closed reports it no longer lists"]
  TASK_85_6["TASK-85.6 Offline cache: list and detail views write closed and non-visible reports into the public cache"]
  TASK_85_7["TASK-85.7 Offline cache: thumbnails purged by the OS are never downloaded again"]
  TASK_86_1["TASK-86.1 Mobile outbox engine: queued found and sighting submissions sent once"]
  TASK_86_2["TASK-86.2 Mobile queue UI: waiting to send, sent, failed with retry or delete, sign-out prompt"]
  TASK_86_4["TASK-86.4 Outbox: a report waiting after a rate limit or server error shows no reason and cannot be retried or deleted"]
  TASK_86_5["TASK-86.5 Reports: dedupe outbox submissions beyond the 24 h Idempotency-Key window"]
  TASK_87_1["TASK-87.1 Mobile geofence engine: region selection, offline handler, caps, local notifications"]
  TASK_87_2["TASK-87.2 Mobile proximity-alert settings and Always-location primer"]
  TASK_87_4["TASK-87.4 Bug (TASK-87 AC#3): nearby reminders never alert without notification permission"]
  TASK_87_5["TASK-87.5 Bug (TASK-87 AC#4): daily cap exceeded when areas are entered at once"]
  TASK_87_6["TASK-87.6 Bug (TASK-87 AC#6): reminders and cache survive a session ended outside the app"]
  TASK_88_1["TASK-88.1 Shelter directory data: 17 shelters, 212 municipality assignments, sources"]
  TASK_88_2["TASK-88.2 Shelter directory API: models, versioned seed, public lookup endpoints"]
  TASK_88_3["TASK-88.3 Directory endpoints in @zivali/api (RTK Query) and useResponsibleShelter hook"]
  TASK_88_4["TASK-88.4 QA: Responsible-shelter directory: data and API (municipality to shelter)"]
  TASK_88_5["TASK-88.5 @zivali/api/directory: likely/nearest fallback per C18"]
  TASK_88_6["TASK-88.6 Bug: /v1/shelters/responsible accepts empty lat/lng and answers outside_slovenia"]
  TASK_89_1["TASK-89.1 Directory admin API: edits with versions, CSV import with dry run, yearly reminder job"]
  TASK_89_2["TASK-89.2 Web admin directory: edit shelters and assignments, history, CSV import"]
  TASK_89_4["TASK-89.4 Design: Shelter directory admin (P19)"]
  TASK_9_1["TASK-9.1 Design: Sign in, account creation and gates (P16)"]
  TASK_9_2["TASK-9.2 Auth configuration and /v1/me: localised emails, providers, verified-email gate"]
  TASK_9_3["TASK-9.3 Web sign-in, sign-up, verification, reset, account page and guards"]
  TASK_9_4["TASK-9.4 Mobile sign-in, sign-up, verification, reset and profile"]
  TASK_9_6["TASK-9.6 API: rename SUPABASE_SERVICE_ROLE_KEY to SUPABASE_SECRET_KEY; raise api vitest default timeout"]
  TASK_90_1["TASK-90.1 Public shelter pages /zavetisca and /zavetisca/[slug] with AnimalShelter JSON-LD and sitemap"]
  TASK_90_3["TASK-90.3 Design: Shelter directory and shelter pages (P3 T5, T6)"]
  TASK_90_4["TASK-90.4 Shelter directory page ships 315 KB JS, over the 256 KB Lighthouse script budget"]
  TASK_90_5["TASK-90.5 Public pages: mobile LCP ≤ 2.5 s and make the Lighthouse quality job blocking again"]
  TASK_90_6["TASK-90.6 Public pages: self-hosted font cuts for mobile LCP ≤ 2.5 s, then make the Lighthouse quality job blocking"]
  TASK_92_1["TASK-92.1 Fiscal invoices: FURS provider adapter with mock, invoice model, VAT breakdown, ZOI/EOR on receipts, live gate"]
  TASK_92_3["TASK-92.3 Fiscal invoices: resubmit FAILED invoices within the FURS deadline, with a longer retry delay"]
  TASK_92_4["TASK-92.4 Fiscal invoices: credit note (dobropis) for refunded payments"]
  TASK_93["TASK-93 Bug: @zivali/validation registerSchemas order is fragile (GeoReverseResponse.place loses null under Node)"]
  TASK_94["TASK-94 Bug: packages/api gen:api must mkdir src/generated before writing"]
  TASK_95["TASK-95 Remove pnpm minimumReleaseAgeExclude for Expo SDK 57 after 2026-10-15 17:00 UTC and confirm pnpm install --frozen-lockfile"]
  TASK_96["TASK-96 Serialize web typecheck and build in turbo (both write .next/types; flaky verify)"]
  TASK_97["TASK-97 Bug sweep: .nullable() on .openapi()-named schemas loses null in generated spec"]
  TASK_98["TASK-98 e2e and quality runs: free port per run, no foreign server reuse"]
  TASK_99["TASK-99 Env sync: postinstall appends missing .env.example keys to .env.local"]
  TASK_1_1 --> TASK_1_2
  TASK_3_1 --> TASK_10_1
  TASK_3_8 --> TASK_10_1
  TASK_10_1 --> TASK_10_2
  TASK_3_3 --> TASK_10_2
  TASK_10_1 --> TASK_10_3
  TASK_3_4 --> TASK_10_3
  TASK_10_1 --> TASK_10_4
  TASK_10_2 --> TASK_10_4
  TASK_10_3 --> TASK_10_4
  TASK_10_2 --> TASK_10_5
  TASK_7_2 --> TASK_10_5
  TASK_29_2 --> TASK_106
  TASK_8_2 --> TASK_11_2
  TASK_10_2 --> TASK_11_2
  TASK_11_1 --> TASK_11_2
  TASK_11_2 --> TASK_11_3
  TASK_11_1 --> TASK_11_3
  TASK_114_18 --> TASK_114_19
  TASK_114_18 --> TASK_114_21
  TASK_112_1 --> TASK_115_11
  TASK_115_1 --> TASK_115_2
  TASK_115_1 --> TASK_115_3
  TASK_115_1 --> TASK_115_4
  TASK_115_2 --> TASK_115_5
  TASK_115_3 --> TASK_115_5
  TASK_115_4 --> TASK_115_5
  TASK_115_5 --> TASK_115_6
  TASK_116_1 --> TASK_116_2
  TASK_8_3 --> TASK_12_2
  TASK_10_3 --> TASK_12_2
  TASK_12_1 --> TASK_12_2
  TASK_12_2 --> TASK_12_3
  TASK_3_3 --> TASK_12_3
  TASK_12_2 --> TASK_12_4
  TASK_12_3 --> TASK_12_4
  TASK_12_1 --> TASK_12_4
  TASK_3_4 --> TASK_12_5
  TASK_11_1 --> TASK_13_1
  TASK_12_1 --> TASK_13_1
  TASK_11_2 --> TASK_13_2
  TASK_7_2 --> TASK_13_2
  TASK_13_1 --> TASK_13_2
  TASK_12_2 --> TASK_13_3
  TASK_7_3 --> TASK_13_3
  TASK_13_1 --> TASK_13_3
  TASK_13_2 --> TASK_13_4
  TASK_13_3 --> TASK_13_4
  TASK_13_1 --> TASK_13_4
  TASK_6_6 --> TASK_14_1
  TASK_6_3 --> TASK_14_1
  TASK_3_9 --> TASK_14_1
  TASK_8_2 --> TASK_14_2
  TASK_6_9 --> TASK_14_2
  TASK_30_1 --> TASK_14_2
  TASK_29_1 --> TASK_14_2
  TASK_8_3 --> TASK_14_3
  TASK_6_9 --> TASK_14_3
  TASK_30_1 --> TASK_14_3
  TASK_29_1 --> TASK_14_3
  TASK_12_5 --> TASK_14_3
  TASK_11_1 --> TASK_15_1
  TASK_12_1 --> TASK_15_1
  TASK_8_2 --> TASK_15_2
  TASK_6_9 --> TASK_15_2
  TASK_15_1 --> TASK_15_2
  TASK_31_2 --> TASK_15_2
  TASK_15_2 --> TASK_15_3
  TASK_15_1 --> TASK_15_3
  TASK_6_14 --> TASK_15_3
  TASK_8_3 --> TASK_15_4
  TASK_6_9 --> TASK_15_4
  TASK_15_1 --> TASK_15_4
  TASK_31_2 --> TASK_15_4
  TASK_15_4 --> TASK_15_5
  TASK_15_1 --> TASK_15_5
  TASK_6_14 --> TASK_15_5
  TASK_15_1 --> TASK_15_6
  TASK_15_2 --> TASK_15_6
  TASK_15_3 --> TASK_15_6
  TASK_15_4 --> TASK_15_6
  TASK_15_5 --> TASK_15_6
  TASK_15_7 --> TASK_15_6
  TASK_15_8 --> TASK_15_6
  TASK_15_7 --> TASK_15_8
  TASK_6_4 --> TASK_15_8
  TASK_6_5 --> TASK_15_8
  TASK_11_1 --> TASK_16_2
  TASK_12_1 --> TASK_16_2
  TASK_6_6 --> TASK_16_3
  TASK_6_8 --> TASK_16_3
  TASK_14_1 --> TASK_16_3
  TASK_6_12 --> TASK_16_3
  TASK_8_2 --> TASK_16_4
  TASK_6_9 --> TASK_16_4
  TASK_16_2 --> TASK_16_4
  TASK_8_3 --> TASK_16_5
  TASK_6_9 --> TASK_16_5
  TASK_16_2 --> TASK_16_5
  TASK_16_4 --> TASK_16_6
  TASK_14_2 --> TASK_16_6
  TASK_9_3 --> TASK_16_6
  TASK_16_2 --> TASK_16_6
  TASK_16_5 --> TASK_16_7
  TASK_14_3 --> TASK_16_7
  TASK_9_4 --> TASK_16_7
  TASK_16_2 --> TASK_16_7
  TASK_16_3 --> TASK_16_8
  TASK_16_4 --> TASK_16_8
  TASK_16_5 --> TASK_16_8
  TASK_16_6 --> TASK_16_8
  TASK_16_7 --> TASK_16_8
  TASK_16_1 --> TASK_16_8
  TASK_16_2 --> TASK_16_8
  TASK_16_6 --> TASK_16_9
  TASK_16_7 --> TASK_16_9
  TASK_29_2 --> TASK_17_1
  TASK_6_12 --> TASK_17_1
  TASK_11_2 --> TASK_17_2
  TASK_6_9 --> TASK_17_2
  TASK_30_1 --> TASK_17_2
  TASK_12_2 --> TASK_17_3
  TASK_12_3 --> TASK_17_3
  TASK_6_9 --> TASK_17_3
  TASK_30_1 --> TASK_17_3
  TASK_17_1 --> TASK_17_4
  TASK_17_2 --> TASK_17_4
  TASK_17_3 --> TASK_17_4
  TASK_11_1 --> TASK_18_1
  TASK_12_1 --> TASK_18_1
  TASK_11_2 --> TASK_18_2
  TASK_15_2 --> TASK_18_2
  TASK_6_9 --> TASK_18_2
  TASK_18_1 --> TASK_18_2
  TASK_12_2 --> TASK_18_3
  TASK_15_4 --> TASK_18_3
  TASK_6_9 --> TASK_18_3
  TASK_18_1 --> TASK_18_3
  TASK_18_2 --> TASK_18_4
  TASK_18_3 --> TASK_18_4
  TASK_18_1 --> TASK_18_4
  TASK_6_7 --> TASK_19_1
  TASK_6_3 --> TASK_19_1
  TASK_6_5 --> TASK_19_1
  TASK_19_1 --> TASK_19_2
  TASK_19_1 --> TASK_19_3
  TASK_19_2 --> TASK_19_3
  TASK_11_1 --> TASK_20_1
  TASK_12_1 --> TASK_20_1
  TASK_6_7 --> TASK_20_2
  TASK_21_2 --> TASK_20_2
  TASK_18_2 --> TASK_20_3
  TASK_9_3 --> TASK_20_3
  TASK_6_9 --> TASK_20_3
  TASK_7_1 --> TASK_20_3
  TASK_20_1 --> TASK_20_3
  TASK_18_3 --> TASK_20_4
  TASK_9_4 --> TASK_20_4
  TASK_6_9 --> TASK_20_4
  TASK_7_1 --> TASK_20_4
  TASK_20_1 --> TASK_20_4
  TASK_11_1 --> TASK_21_1
  TASK_12_1 --> TASK_21_1
  TASK_6_7 --> TASK_21_2
  TASK_6_12 --> TASK_21_2
  TASK_11_2 --> TASK_21_3
  TASK_9_3 --> TASK_21_3
  TASK_6_10 --> TASK_21_3
  TASK_25_3 --> TASK_21_3
  TASK_21_1 --> TASK_21_3
  TASK_12_2 --> TASK_21_4
  TASK_9_4 --> TASK_21_4
  TASK_6_10 --> TASK_21_4
  TASK_25_4 --> TASK_21_4
  TASK_21_1 --> TASK_21_4
  TASK_21_2 --> TASK_21_5
  TASK_21_3 --> TASK_21_5
  TASK_21_4 --> TASK_21_5
  TASK_21_1 --> TASK_21_5
  TASK_11_1 --> TASK_22_2
  TASK_12_1 --> TASK_22_2
  TASK_15_1 --> TASK_22_2
  TASK_6_7 --> TASK_22_3
  TASK_6_3 --> TASK_22_3
  TASK_10_1 --> TASK_22_3
  TASK_3_9 --> TASK_22_3
  TASK_11_2 --> TASK_22_4
  TASK_9_3 --> TASK_22_4
  TASK_6_10 --> TASK_22_4
  TASK_22_2 --> TASK_22_4
  TASK_12_2 --> TASK_22_5
  TASK_9_4 --> TASK_22_5
  TASK_12_3 --> TASK_22_5
  TASK_6_10 --> TASK_22_5
  TASK_22_2 --> TASK_22_5
  TASK_22_3 --> TASK_22_6
  TASK_22_4 --> TASK_22_6
  TASK_22_5 --> TASK_22_6
  TASK_22_1 --> TASK_22_6
  TASK_22_2 --> TASK_22_6
  TASK_22_3 --> TASK_22_8
  TASK_22_8 --> TASK_22_9
  TASK_6_7 --> TASK_23_1
  TASK_6_3 --> TASK_23_1
  TASK_6_12 --> TASK_23_1
  TASK_15_3 --> TASK_23_2
  TASK_9_3 --> TASK_23_2
  TASK_6_10 --> TASK_23_2
  TASK_7_1 --> TASK_23_2
  TASK_22_2 --> TASK_23_2
  TASK_15_5 --> TASK_23_3
  TASK_9_4 --> TASK_23_3
  TASK_6_10 --> TASK_23_3
  TASK_7_1 --> TASK_23_3
  TASK_22_2 --> TASK_23_3
  TASK_23_1 --> TASK_23_4
  TASK_23_2 --> TASK_23_4
  TASK_23_3 --> TASK_23_4
  TASK_11_1 --> TASK_24_1
  TASK_12_1 --> TASK_24_1
  TASK_18_2 --> TASK_24_2
  TASK_7_1 --> TASK_24_2
  TASK_24_1 --> TASK_24_2
  TASK_18_3 --> TASK_24_3
  TASK_7_1 --> TASK_24_3
  TASK_24_1 --> TASK_24_3
  TASK_24_2 --> TASK_24_4
  TASK_24_3 --> TASK_24_4
  TASK_24_1 --> TASK_24_4
  TASK_11_1 --> TASK_25_1
  TASK_12_1 --> TASK_25_1
  TASK_6_8 --> TASK_25_2
  TASK_6_12 --> TASK_25_2
  TASK_18_2 --> TASK_25_3
  TASK_6_10 --> TASK_25_3
  TASK_25_1 --> TASK_25_3
  TASK_18_3 --> TASK_25_4
  TASK_6_10 --> TASK_25_4
  TASK_25_1 --> TASK_25_4
  TASK_34_3 --> TASK_25_5
  TASK_6_10 --> TASK_25_5
  TASK_34_1 --> TASK_25_5
  TASK_25_2 --> TASK_25_6
  TASK_25_3 --> TASK_25_6
  TASK_25_4 --> TASK_25_6
  TASK_25_5 --> TASK_25_6
  TASK_25_1 --> TASK_25_6
  TASK_11_1 --> TASK_26_2
  TASK_12_1 --> TASK_26_2
  TASK_33_1 --> TASK_26_2
  TASK_36_4 --> TASK_26_2
  TASK_6_6 --> TASK_26_3
  TASK_6_3 --> TASK_26_3
  TASK_6_12 --> TASK_26_3
  TASK_18_2 --> TASK_26_4
  TASK_9_3 --> TASK_26_4
  TASK_6_9 --> TASK_26_4
  TASK_7_1 --> TASK_26_4
  TASK_26_2 --> TASK_26_4
  TASK_18_1 --> TASK_26_4
  TASK_18_3 --> TASK_26_5
  TASK_9_4 --> TASK_26_5
  TASK_6_9 --> TASK_26_5
  TASK_7_1 --> TASK_26_5
  TASK_26_2 --> TASK_26_5
  TASK_18_1 --> TASK_26_5
  TASK_26_3 --> TASK_26_6
  TASK_26_4 --> TASK_26_6
  TASK_26_5 --> TASK_26_6
  TASK_26_1 --> TASK_26_6
  TASK_26_2 --> TASK_26_6
  TASK_26_7 --> TASK_26_6
  TASK_6_6 --> TASK_26_7
  TASK_6_3 --> TASK_26_7
  TASK_26_3 --> TASK_26_7
  TASK_11_1 --> TASK_27_1
  TASK_11_2 --> TASK_27_2
  TASK_27_1 --> TASK_27_2
  TASK_27_2 --> TASK_27_3
  TASK_27_1 --> TASK_27_3
  TASK_11_2 --> TASK_28_1
  TASK_27_1 --> TASK_28_1
  TASK_28_1 --> TASK_28_2
  TASK_11_1 --> TASK_29_1
  TASK_12_1 --> TASK_29_1
  TASK_15_1 --> TASK_29_1
  TASK_9_1 --> TASK_29_1
  TASK_29_13 --> TASK_29_14
  TASK_29_4 --> TASK_29_14
  TASK_29_13 --> TASK_29_15
  TASK_29_5 --> TASK_29_15
  TASK_6_6 --> TASK_29_2
  TASK_6_3 --> TASK_29_2
  TASK_6_12 --> TASK_29_2
  TASK_16_4 --> TASK_29_3
  TASK_14_2 --> TASK_29_3
  TASK_15_3 --> TASK_29_3
  TASK_6_9 --> TASK_29_3
  TASK_7_1 --> TASK_29_3
  TASK_29_1 --> TASK_29_3
  TASK_29_3 --> TASK_29_4
  TASK_9_3 --> TASK_29_4
  TASK_29_1 --> TASK_29_4
  TASK_33_1 --> TASK_29_4
  TASK_88_3 --> TASK_29_4
  TASK_16_5 --> TASK_29_5
  TASK_14_3 --> TASK_29_5
  TASK_15_5 --> TASK_29_5
  TASK_6_9 --> TASK_29_5
  TASK_7_1 --> TASK_29_5
  TASK_29_1 --> TASK_29_5
  TASK_29_5 --> TASK_29_6
  TASK_9_4 --> TASK_29_6
  TASK_29_1 --> TASK_29_6
  TASK_33_1 --> TASK_29_6
  TASK_88_3 --> TASK_29_6
  TASK_29_2 --> TASK_29_7
  TASK_29_3 --> TASK_29_7
  TASK_29_4 --> TASK_29_7
  TASK_29_5 --> TASK_29_7
  TASK_29_6 --> TASK_29_7
  TASK_29_1 --> TASK_29_7
  TASK_88_2 --> TASK_29_7
  TASK_29_6 --> TASK_29_8
  TASK_30_3 --> TASK_29_8
  TASK_3_5 --> TASK_3_10
  TASK_3_3 --> TASK_3_11
  TASK_3_7 --> TASK_3_12
  TASK_3_4 --> TASK_3_13
  TASK_3_5 --> TASK_3_13
  TASK_3_10 --> TASK_3_13
  TASK_3_1 --> TASK_3_3
  TASK_1_1 --> TASK_3_3
  TASK_3_8 --> TASK_3_3
  TASK_3_1 --> TASK_3_4
  TASK_1_1 --> TASK_3_4
  TASK_3_8 --> TASK_3_4
  TASK_3_1 --> TASK_3_5
  TASK_3_8 --> TASK_3_5
  TASK_3_1 --> TASK_3_6
  TASK_3_2 --> TASK_3_6
  TASK_3_3 --> TASK_3_6
  TASK_3_4 --> TASK_3_6
  TASK_3_5 --> TASK_3_6
  TASK_3_7 --> TASK_3_6
  TASK_3_8 --> TASK_3_6
  TASK_3_9 --> TASK_3_6
  TASK_3_13 --> TASK_3_6
  TASK_3_14 --> TASK_3_6
  TASK_3_2 --> TASK_3_7
  TASK_3_8 --> TASK_3_7
  TASK_3_7 --> TASK_3_9
  TASK_11_1 --> TASK_30_1
  TASK_12_1 --> TASK_30_1
  TASK_15_1 --> TASK_30_1
  TASK_14_2 --> TASK_30_2
  TASK_15_3 --> TASK_30_2
  TASK_17_2 --> TASK_30_2
  TASK_18_2 --> TASK_30_2
  TASK_7_1 --> TASK_30_2
  TASK_30_1 --> TASK_30_2
  TASK_88_3 --> TASK_30_2
  TASK_14_3 --> TASK_30_3
  TASK_15_5 --> TASK_30_3
  TASK_17_3 --> TASK_30_3
  TASK_18_3 --> TASK_30_3
  TASK_7_1 --> TASK_30_3
  TASK_30_1 --> TASK_30_3
  TASK_86_1 --> TASK_30_3
  TASK_88_3 --> TASK_30_3
  TASK_30_2 --> TASK_30_4
  TASK_30_3 --> TASK_30_4
  TASK_30_1 --> TASK_30_4
  TASK_88_2 --> TASK_30_4
  TASK_11_1 --> TASK_31_2
  TASK_12_1 --> TASK_31_2
  TASK_6_6 --> TASK_31_3
  TASK_15_2 --> TASK_31_4
  TASK_11_2 --> TASK_31_4
  TASK_6_9 --> TASK_31_4
  TASK_31_2 --> TASK_31_4
  TASK_15_4 --> TASK_31_5
  TASK_12_2 --> TASK_31_5
  TASK_6_9 --> TASK_31_5
  TASK_31_2 --> TASK_31_5
  TASK_31_3 --> TASK_31_6
  TASK_31_4 --> TASK_31_6
  TASK_31_5 --> TASK_31_6
  TASK_31_1 --> TASK_31_6
  TASK_31_2 --> TASK_31_6
  TASK_6_8 --> TASK_32_1
  TASK_6_3 --> TASK_32_1
  TASK_3_9 --> TASK_32_1
  TASK_6_12 --> TASK_32_1
  TASK_11_2 --> TASK_32_2
  TASK_9_3 --> TASK_32_2
  TASK_6_10 --> TASK_32_2
  TASK_33_1 --> TASK_32_2
  TASK_12_2 --> TASK_32_3
  TASK_9_4 --> TASK_32_3
  TASK_12_3 --> TASK_32_3
  TASK_6_10 --> TASK_32_3
  TASK_33_1 --> TASK_32_3
  TASK_32_1 --> TASK_32_4
  TASK_32_2 --> TASK_32_4
  TASK_32_3 --> TASK_32_4
  TASK_11_1 --> TASK_33_1
  TASK_12_1 --> TASK_33_1
  TASK_26_4 --> TASK_33_2
  TASK_29_4 --> TASK_33_2
  TASK_32_2 --> TASK_33_2
  TASK_7_1 --> TASK_33_2
  TASK_33_1 --> TASK_33_2
  TASK_26_5 --> TASK_33_3
  TASK_29_6 --> TASK_33_3
  TASK_32_3 --> TASK_33_3
  TASK_7_1 --> TASK_33_3
  TASK_33_1 --> TASK_33_3
  TASK_33_2 --> TASK_33_4
  TASK_33_3 --> TASK_33_4
  TASK_33_1 --> TASK_33_4
  TASK_11_1 --> TASK_34_1
  TASK_6_12 --> TASK_34_2
  TASK_9_2 --> TASK_34_2
  TASK_11_2 --> TASK_34_3
  TASK_9_3 --> TASK_34_3
  TASK_6_9 --> TASK_34_3
  TASK_34_1 --> TASK_34_3
  TASK_34_3 --> TASK_34_8
  TASK_6_8 --> TASK_35_1
  TASK_6_4 --> TASK_35_1
  TASK_6_12 --> TASK_35_1
  TASK_35_1 --> TASK_35_2
  TASK_35_1 --> TASK_35_3
  TASK_35_2 --> TASK_35_3
  TASK_11_1 --> TASK_36_4
  TASK_12_1 --> TASK_36_4
  TASK_35_2 --> TASK_36_5
  TASK_31_4 --> TASK_36_5
  TASK_18_2 --> TASK_36_5
  TASK_26_4 --> TASK_36_5
  TASK_7_1 --> TASK_36_5
  TASK_36_4 --> TASK_36_5
  TASK_31_5 --> TASK_36_6
  TASK_18_3 --> TASK_36_6
  TASK_26_5 --> TASK_36_6
  TASK_6_10 --> TASK_36_6
  TASK_7_1 --> TASK_36_6
  TASK_36_4 --> TASK_36_6
  TASK_36_5 --> TASK_36_7
  TASK_36_6 --> TASK_36_7
  TASK_36_1 --> TASK_36_7
  TASK_36_2 --> TASK_36_7
  TASK_36_3 --> TASK_36_7
  TASK_36_4 --> TASK_36_7
  TASK_34_1 --> TASK_37_1
  TASK_36_4 --> TASK_37_1
  TASK_35_1 --> TASK_37_2
  TASK_34_2 --> TASK_37_2
  TASK_34_3 --> TASK_37_3
  TASK_36_5 --> TASK_37_3
  TASK_6_10 --> TASK_37_3
  TASK_37_1 --> TASK_37_3
  TASK_37_2 --> TASK_37_4
  TASK_37_3 --> TASK_37_4
  TASK_37_1 --> TASK_37_4
  TASK_11_1 --> TASK_38_1
  TASK_36_4 --> TASK_38_1
  TASK_6_8 --> TASK_38_2
  TASK_6_3 --> TASK_38_2
  TASK_6_4 --> TASK_38_2
  TASK_3_9 --> TASK_38_2
  TASK_11_2 --> TASK_38_3
  TASK_6_10 --> TASK_38_3
  TASK_38_1 --> TASK_38_3
  TASK_38_2 --> TASK_38_4
  TASK_38_3 --> TASK_38_4
  TASK_38_1 --> TASK_38_4
  TASK_38_2 --> TASK_38_6
  TASK_29_4 --> TASK_39_1
  TASK_30_2 --> TASK_39_1
  TASK_20_3 --> TASK_39_1
  TASK_21_3 --> TASK_39_1
  TASK_26_4 --> TASK_39_1
  TASK_31_4 --> TASK_39_1
  TASK_22_4 --> TASK_39_1
  TASK_13_2 --> TASK_39_1
  TASK_19_1 --> TASK_39_1
  TASK_20_2 --> TASK_39_1
  TASK_22_3 --> TASK_39_1
  TASK_21_2 --> TASK_39_1
  TASK_17_1 --> TASK_39_1
  TASK_26_3 --> TASK_39_1
  TASK_31_3 --> TASK_39_1
  TASK_14_1 --> TASK_39_1
  TASK_30_3 --> TASK_39_2
  TASK_20_4 --> TASK_39_2
  TASK_39_1 --> TASK_39_3
  TASK_39_2 --> TASK_39_3
  TASK_3_3 --> TASK_4_1
  TASK_4_1 --> TASK_4_2
  TASK_3_4 --> TASK_4_2
  TASK_3_2 --> TASK_4_2
  TASK_3_7 --> TASK_4_2
  TASK_4_1 --> TASK_4_3
  TASK_4_2 --> TASK_4_3
  TASK_4_6 --> TASK_4_7
  TASK_40_1 --> TASK_40_3
  TASK_40_2 --> TASK_40_3
  TASK_40_1 --> TASK_40_4
  TASK_40_2 --> TASK_40_4
  TASK_40_3 --> TASK_40_5
  TASK_40_3 --> TASK_40_7
  TASK_42_1 --> TASK_40_7
  TASK_42_3 --> TASK_40_7
  TASK_40_6 --> TASK_40_7
  TASK_40_11 --> TASK_40_7
  TASK_40_1 --> TASK_40_8
  TASK_40_2 --> TASK_40_8
  TASK_40_3 --> TASK_40_8
  TASK_40_4 --> TASK_40_8
  TASK_40_5 --> TASK_40_8
  TASK_40_6 --> TASK_40_8
  TASK_40_7 --> TASK_40_8
  TASK_41_1 --> TASK_41_2
  TASK_40_2 --> TASK_41_2
  TASK_40_6 --> TASK_41_2
  TASK_40_10 --> TASK_41_2
  TASK_41_1 --> TASK_41_3
  TASK_40_2 --> TASK_41_3
  TASK_40_6 --> TASK_41_3
  TASK_41_1 --> TASK_41_4
  TASK_41_2 --> TASK_41_4
  TASK_41_3 --> TASK_41_4
  TASK_40_3 --> TASK_41_4
  TASK_40_4 --> TASK_41_4
  TASK_41_5 --> TASK_41_4
  TASK_41_6 --> TASK_41_4
  TASK_41_1 --> TASK_41_5
  TASK_41_2 --> TASK_41_5
  TASK_41_1 --> TASK_41_6
  TASK_41_3 --> TASK_41_6
  TASK_40_1 --> TASK_42_1
  TASK_40_1 --> TASK_42_2
  TASK_42_1 --> TASK_42_3
  TASK_42_1 --> TASK_42_4
  TASK_42_2 --> TASK_42_4
  TASK_42_3 --> TASK_42_4
  TASK_40_3 --> TASK_42_4
  TASK_40_2 --> TASK_43_1
  TASK_43_1 --> TASK_43_2
  TASK_42_1 --> TASK_43_2
  TASK_42_2 --> TASK_43_2
  TASK_43_1 --> TASK_43_3
  TASK_42_1 --> TASK_43_3
  TASK_40_2 --> TASK_43_4
  TASK_40_6 --> TASK_43_4
  TASK_40_2 --> TASK_43_5
  TASK_40_6 --> TASK_43_5
  TASK_43_1 --> TASK_43_6
  TASK_43_2 --> TASK_43_6
  TASK_43_3 --> TASK_43_6
  TASK_43_4 --> TASK_43_6
  TASK_43_5 --> TASK_43_6
  TASK_3_7 --> TASK_5_1
  TASK_3_3 --> TASK_5_1
  TASK_6_3 --> TASK_5_1
  TASK_3_4 --> TASK_5_2
  TASK_5_1 --> TASK_5_3
  TASK_5_2 --> TASK_5_3
  TASK_5_1 --> TASK_5_4
  TASK_3_5 --> TASK_6_10
  TASK_6_5 --> TASK_6_10
  TASK_6_1 --> TASK_6_11
  TASK_6_2 --> TASK_6_11
  TASK_6_3 --> TASK_6_11
  TASK_6_4 --> TASK_6_11
  TASK_6_5 --> TASK_6_11
  TASK_6_6 --> TASK_6_11
  TASK_6_7 --> TASK_6_11
  TASK_6_8 --> TASK_6_11
  TASK_6_9 --> TASK_6_11
  TASK_6_10 --> TASK_6_11
  TASK_6_12 --> TASK_6_11
  TASK_6_2 --> TASK_6_12
  TASK_6_12 --> TASK_6_15
  TASK_6_6 --> TASK_6_16
  TASK_6_7 --> TASK_6_16
  TASK_6_8 --> TASK_6_16
  TASK_6_3 --> TASK_6_17
  TASK_3_7 --> TASK_6_2
  TASK_3_7 --> TASK_6_3
  TASK_6_2 --> TASK_6_3
  TASK_6_2 --> TASK_6_4
  TASK_6_1 --> TASK_6_4
  TASK_3_1 --> TASK_6_5
  TASK_3_8 --> TASK_6_5
  TASK_6_2 --> TASK_6_6
  TASK_6_4 --> TASK_6_6
  TASK_6_12 --> TASK_6_6
  TASK_6_6 --> TASK_6_7
  TASK_6_6 --> TASK_6_8
  TASK_3_5 --> TASK_6_9
  TASK_6_5 --> TASK_6_9
  TASK_3_1 --> TASK_7_1
  TASK_3_8 --> TASK_7_1
  TASK_7_1 --> TASK_7_2
  TASK_3_3 --> TASK_7_2
  TASK_7_1 --> TASK_7_3
  TASK_12_2 --> TASK_7_3
  TASK_5_2 --> TASK_7_3
  TASK_7_1 --> TASK_7_4
  TASK_7_2 --> TASK_7_4
  TASK_7_3 --> TASK_7_4
  TASK_3_3 --> TASK_8_2
  TASK_8_1 --> TASK_8_2
  TASK_3_4 --> TASK_8_3
  TASK_8_1 --> TASK_8_3
  TASK_8_2 --> TASK_8_4
  TASK_8_3 --> TASK_8_4
  TASK_8_1 --> TASK_8_4
  TASK_6_6 --> TASK_85_1
  TASK_12_5 --> TASK_85_2
  TASK_6_9 --> TASK_85_2
  TASK_88_3 --> TASK_85_2
  TASK_85_2 --> TASK_85_3
  TASK_31_5 --> TASK_85_3
  TASK_12_2 --> TASK_85_3
  TASK_31_2 --> TASK_85_3
  TASK_22_2 --> TASK_85_3
  TASK_85_1 --> TASK_85_4
  TASK_85_2 --> TASK_85_4
  TASK_85_3 --> TASK_85_4
  TASK_12_5 --> TASK_86_1
  TASK_6_9 --> TASK_86_1
  TASK_17_3 --> TASK_86_1
  TASK_14_3 --> TASK_86_1
  TASK_86_1 --> TASK_86_2
  TASK_9_4 --> TASK_86_2
  TASK_12_2 --> TASK_86_2
  TASK_30_1 --> TASK_86_2
  TASK_86_1 --> TASK_86_3
  TASK_86_2 --> TASK_86_3
  TASK_30_3 --> TASK_86_3
  TASK_29_2 --> TASK_86_3
  TASK_17_1 --> TASK_86_3
  TASK_86_1 --> TASK_86_5
  TASK_85_2 --> TASK_87_1
  TASK_12_3 --> TASK_87_1
  TASK_87_1 --> TASK_87_2
  TASK_23_3 --> TASK_87_2
  TASK_22_2 --> TASK_87_2
  TASK_87_1 --> TASK_87_3
  TASK_87_2 --> TASK_87_3
  TASK_87_1 --> TASK_87_7
  TASK_23_3 --> TASK_87_7
  TASK_88_1 --> TASK_88_2
  TASK_6_4 --> TASK_88_2
  TASK_6_12 --> TASK_88_2
  TASK_3_5 --> TASK_88_3
  TASK_88_1 --> TASK_88_4
  TASK_88_2 --> TASK_88_4
  TASK_88_3 --> TASK_88_4
  TASK_88_3 --> TASK_88_5
  TASK_88_2 --> TASK_89_1
  TASK_34_2 --> TASK_89_1
  TASK_89_4 --> TASK_89_2
  TASK_89_1 --> TASK_89_3
  TASK_89_2 --> TASK_89_3
  TASK_34_1 --> TASK_89_4
  TASK_11_1 --> TASK_9_1
  TASK_12_1 --> TASK_9_1
  TASK_6_12 --> TASK_9_2
  TASK_11_2 --> TASK_9_3
  TASK_6_9 --> TASK_9_3
  TASK_9_1 --> TASK_9_3
  TASK_12_2 --> TASK_9_4
  TASK_6_9 --> TASK_9_4
  TASK_9_1 --> TASK_9_4
  TASK_12_5 --> TASK_9_4
  TASK_9_2 --> TASK_9_5
  TASK_9_3 --> TASK_9_5
  TASK_9_4 --> TASK_9_5
  TASK_9_1 --> TASK_9_5
  TASK_9_2 --> TASK_9_6
  TASK_90_3 --> TASK_90_1
  TASK_90_1 --> TASK_90_2
  TASK_11_1 --> TASK_90_3
  TASK_11_2 --> TASK_90_4
  TASK_90_4 --> TASK_90_5
  TASK_90_5 --> TASK_90_6
  TASK_90_6 --> TASK_90_7
  TASK_32_1 --> TASK_92_1
  TASK_6_3 --> TASK_92_1
  TASK_3_9 --> TASK_92_1
  TASK_92_1 --> TASK_92_2
  TASK_92_3 --> TASK_92_2
  TASK_92_4 --> TASK_92_2
  TASK_92_1 --> TASK_92_3
  TASK_92_1 --> TASK_92_4
  TASK_93 --> TASK_97
  style TASK_1_1 fill:#2e7d32,color:#fff
  style TASK_1_2 fill:#2e7d32,color:#fff
  style TASK_10_1 fill:#2e7d32,color:#fff
  style TASK_10_2 fill:#2e7d32,color:#fff
  style TASK_10_3 fill:#2e7d32,color:#fff
  style TASK_10_4 fill:#2e7d32,color:#fff
  style TASK_10_5 fill:#2e7d32,color:#fff
  style TASK_100 fill:#2e7d32,color:#fff
  style TASK_101 fill:#2e7d32,color:#fff
  style TASK_102 fill:#2e7d32,color:#fff
  style TASK_103 fill:#2e7d32,color:#fff
  style TASK_104 fill:#2e7d32,color:#fff
  style TASK_105 fill:#2e7d32,color:#fff
  style TASK_106 fill:#2e7d32,color:#fff
  style TASK_107 fill:#2e7d32,color:#fff
  style TASK_108 fill:#2e7d32,color:#fff
  style TASK_109 fill:#2e7d32,color:#fff
  style TASK_11_1 fill:#2e7d32,color:#fff
  style TASK_11_2 fill:#2e7d32,color:#fff
  style TASK_11_3 fill:#5b6470,color:#fff
  style TASK_110 fill:#2e7d32,color:#fff
  style TASK_111 fill:#2e7d32,color:#fff
  style TASK_112 fill:#1565c0,color:#fff
  style TASK_112_1 fill:#2e7d32,color:#fff
  style TASK_113 fill:#2e7d32,color:#fff
  style TASK_114_1 fill:#2e7d32,color:#fff
  style TASK_114_10 fill:#2e7d32,color:#fff
  style TASK_114_11 fill:#2e7d32,color:#fff
  style TASK_114_12 fill:#2e7d32,color:#fff
  style TASK_114_13 fill:#2e7d32,color:#fff
  style TASK_114_14 fill:#2e7d32,color:#fff
  style TASK_114_15 fill:#2e7d32,color:#fff
  style TASK_114_16 fill:#2e7d32,color:#fff
  style TASK_114_17 fill:#2e7d32,color:#fff
  style TASK_114_18 fill:#2e7d32,color:#fff
  style TASK_114_19 fill:#2e7d32,color:#fff
  style TASK_114_2 fill:#2e7d32,color:#fff
  style TASK_114_20 fill:#2e7d32,color:#fff
  style TASK_114_21 fill:#2e7d32,color:#fff
  style TASK_114_22 fill:#2e7d32,color:#fff
  style TASK_114_23 fill:#2e7d32,color:#fff
  style TASK_114_24 fill:#2e7d32,color:#fff
  style TASK_114_25 fill:#2e7d32,color:#fff
  style TASK_114_26 fill:#2e7d32,color:#fff
  style TASK_114_27 fill:#2e7d32,color:#fff
  style TASK_114_28 fill:#2e7d32,color:#fff
  style TASK_114_29 fill:#2e7d32,color:#fff
  style TASK_114_3 fill:#2e7d32,color:#fff
  style TASK_114_30 fill:#2e7d32,color:#fff
  style TASK_114_31 fill:#2e7d32,color:#fff
  style TASK_114_32 fill:#2e7d32,color:#fff
  style TASK_114_33 fill:#5b6470,color:#fff
  style TASK_114_34 fill:#2e7d32,color:#fff
  style TASK_114_35 fill:#5b6470,color:#fff
  style TASK_114_36 fill:#2e7d32,color:#fff
  style TASK_114_37 fill:#2e7d32,color:#fff
  style TASK_114_38 fill:#2e7d32,color:#fff
  style TASK_114_39 fill:#2e7d32,color:#fff
  style TASK_114_4 fill:#2e7d32,color:#fff
  style TASK_114_40 fill:#2e7d32,color:#fff
  style TASK_114_41 fill:#2e7d32,color:#fff
  style TASK_114_42 fill:#2e7d32,color:#fff
  style TASK_114_43 fill:#2e7d32,color:#fff
  style TASK_114_5 fill:#2e7d32,color:#fff
  style TASK_114_6 fill:#2e7d32,color:#fff
  style TASK_114_7 fill:#2e7d32,color:#fff
  style TASK_114_8 fill:#2e7d32,color:#fff
  style TASK_114_9 fill:#2e7d32,color:#fff
  style TASK_115_1 fill:#2e7d32,color:#fff
  style TASK_115_10 fill:#2e7d32,color:#fff
  style TASK_115_11 fill:#2e7d32,color:#fff
  style TASK_115_2 fill:#2e7d32,color:#fff
  style TASK_115_3 fill:#2e7d32,color:#fff
  style TASK_115_4 fill:#2e7d32,color:#fff
  style TASK_115_5 fill:#2e7d32,color:#fff
  style TASK_115_6 fill:#2e7d32,color:#fff
  style TASK_115_7 fill:#2e7d32,color:#fff
  style TASK_115_8 fill:#2e7d32,color:#fff
  style TASK_115_9 fill:#2e7d32,color:#fff
  style TASK_116_1 fill:#2e7d32,color:#fff
  style TASK_116_2 fill:#2e7d32,color:#fff
  style TASK_117_1 fill:#5b6470,color:#fff
  style TASK_12_1 fill:#2e7d32,color:#fff
  style TASK_12_2 fill:#2e7d32,color:#fff
  style TASK_12_3 fill:#2e7d32,color:#fff
  style TASK_12_4 fill:#5b6470,color:#fff
  style TASK_12_5 fill:#2e7d32,color:#fff
  style TASK_12_6 fill:#2e7d32,color:#fff
  style TASK_12_7 fill:#2e7d32,color:#fff
  style TASK_13_1 fill:#2e7d32,color:#fff
  style TASK_13_2 fill:#2e7d32,color:#fff
  style TASK_13_3 fill:#2e7d32,color:#fff
  style TASK_13_4 fill:#5b6470,color:#fff
  style TASK_13_5 fill:#2e7d32,color:#fff
  style TASK_13_6 fill:#2e7d32,color:#fff
  style TASK_13_7 fill:#2e7d32,color:#fff
  style TASK_14_1 fill:#2e7d32,color:#fff
  style TASK_14_2 fill:#2e7d32,color:#fff
  style TASK_14_3 fill:#2e7d32,color:#fff
  style TASK_14_5 fill:#2e7d32,color:#fff
  style TASK_14_6 fill:#2e7d32,color:#fff
  style TASK_14_7 fill:#2e7d32,color:#fff
  style TASK_14_8 fill:#2e7d32,color:#fff
  style TASK_15_1 fill:#2e7d32,color:#fff
  style TASK_15_2 fill:#2e7d32,color:#fff
  style TASK_15_3 fill:#2e7d32,color:#fff
  style TASK_15_4 fill:#2e7d32,color:#fff
  style TASK_15_5 fill:#2e7d32,color:#fff
  style TASK_15_6 fill:#2e7d32,color:#fff
  style TASK_15_7 fill:#2e7d32,color:#fff
  style TASK_15_8 fill:#2e7d32,color:#fff
  style TASK_16_1 fill:#5b6470,color:#fff
  style TASK_16_2 fill:#2e7d32,color:#fff
  style TASK_16_3 fill:#2e7d32,color:#fff
  style TASK_16_4 fill:#2e7d32,color:#fff
  style TASK_16_5 fill:#2e7d32,color:#fff
  style TASK_16_6 fill:#2e7d32,color:#fff
  style TASK_16_7 fill:#2e7d32,color:#fff
  style TASK_16_8 fill:#5b6470,color:#fff
  style TASK_16_9 fill:#2e7d32,color:#fff
  style TASK_17_1 fill:#2e7d32,color:#fff
  style TASK_17_10 fill:#2e7d32,color:#fff
  style TASK_17_11 fill:#2e7d32,color:#fff
  style TASK_17_12 fill:#2e7d32,color:#fff
  style TASK_17_13 fill:#5b6470,color:#fff
  style TASK_17_14 fill:#2e7d32,color:#fff
  style TASK_17_2 fill:#2e7d32,color:#fff
  style TASK_17_3 fill:#2e7d32,color:#fff
  style TASK_17_4 fill:#5b6470,color:#fff
  style TASK_17_5 fill:#2e7d32,color:#fff
  style TASK_17_6 fill:#2e7d32,color:#fff
  style TASK_17_7 fill:#2e7d32,color:#fff
  style TASK_17_8 fill:#2e7d32,color:#fff
  style TASK_17_9 fill:#2e7d32,color:#fff
  style TASK_18_1 fill:#2e7d32,color:#fff
  style TASK_18_2 fill:#2e7d32,color:#fff
  style TASK_18_3 fill:#2e7d32,color:#fff
  style TASK_18_4 fill:#5b6470,color:#fff
  style TASK_19_1 fill:#2e7d32,color:#fff
  style TASK_19_2 fill:#2e7d32,color:#fff
  style TASK_19_3 fill:#2e7d32,color:#fff
  style TASK_20_1 fill:#2e7d32,color:#fff
  style TASK_20_2 fill:#2e7d32,color:#fff
  style TASK_20_3 fill:#2e7d32,color:#fff
  style TASK_20_4 fill:#2e7d32,color:#fff
  style TASK_20_6 fill:#2e7d32,color:#fff
  style TASK_20_7 fill:#2e7d32,color:#fff
  style TASK_21_1 fill:#2e7d32,color:#fff
  style TASK_21_2 fill:#2e7d32,color:#fff
  style TASK_21_3 fill:#2e7d32,color:#fff
  style TASK_21_4 fill:#2e7d32,color:#fff
  style TASK_21_5 fill:#5b6470,color:#fff
  style TASK_21_6 fill:#2e7d32,color:#fff
  style TASK_21_7 fill:#2e7d32,color:#fff
  style TASK_21_8 fill:#2e7d32,color:#fff
  style TASK_22_1 fill:#5b6470,color:#fff
  style TASK_22_2 fill:#2e7d32,color:#fff
  style TASK_22_3 fill:#2e7d32,color:#fff
  style TASK_22_4 fill:#2e7d32,color:#fff
  style TASK_22_5 fill:#2e7d32,color:#fff
  style TASK_22_6 fill:#5b6470,color:#fff
  style TASK_22_7 fill:#2e7d32,color:#fff
  style TASK_22_8 fill:#2e7d32,color:#fff
  style TASK_22_9 fill:#5b6470,color:#fff
  style TASK_23_1 fill:#2e7d32,color:#fff
  style TASK_23_2 fill:#2e7d32,color:#fff
  style TASK_23_3 fill:#2e7d32,color:#fff
  style TASK_23_4 fill:#5b6470,color:#fff
  style TASK_24_1 fill:#2e7d32,color:#fff
  style TASK_24_2 fill:#2e7d32,color:#fff
  style TASK_24_3 fill:#2e7d32,color:#fff
  style TASK_24_4 fill:#5b6470,color:#fff
  style TASK_25_1 fill:#2e7d32,color:#fff
  style TASK_25_2 fill:#2e7d32,color:#fff
  style TASK_25_3 fill:#2e7d32,color:#fff
  style TASK_25_4 fill:#2e7d32,color:#fff
  style TASK_25_5 fill:#2e7d32,color:#fff
  style TASK_25_6 fill:#5b6470,color:#fff
  style TASK_26_1 fill:#5b6470,color:#fff
  style TASK_26_2 fill:#2e7d32,color:#fff
  style TASK_26_3 fill:#2e7d32,color:#fff
  style TASK_26_4 fill:#2e7d32,color:#fff
  style TASK_26_5 fill:#2e7d32,color:#fff
  style TASK_26_6 fill:#5b6470,color:#fff
  style TASK_26_7 fill:#2e7d32,color:#fff
  style TASK_26_8 fill:#2e7d32,color:#fff
  style TASK_26_9 fill:#2e7d32,color:#fff
  style TASK_27_1 fill:#2e7d32,color:#fff
  style TASK_27_2 fill:#2e7d32,color:#fff
  style TASK_27_3 fill:#5b6470,color:#fff
  style TASK_27_4 fill:#5b6470,color:#fff
  style TASK_27_5 fill:#5b6470,color:#fff
  style TASK_28_1 fill:#2e7d32,color:#fff
  style TASK_28_2 fill:#5b6470,color:#fff
  style TASK_28_3 fill:#2e7d32,color:#fff
  style TASK_28_4 fill:#2e7d32,color:#fff
  style TASK_29_1 fill:#2e7d32,color:#fff
  style TASK_29_10 fill:#2e7d32,color:#fff
  style TASK_29_11 fill:#2e7d32,color:#fff
  style TASK_29_12 fill:#2e7d32,color:#fff
  style TASK_29_13 fill:#2e7d32,color:#fff
  style TASK_29_14 fill:#5b6470,color:#fff
  style TASK_29_15 fill:#5b6470,color:#fff
  style TASK_29_2 fill:#2e7d32,color:#fff
  style TASK_29_3 fill:#2e7d32,color:#fff
  style TASK_29_4 fill:#2e7d32,color:#fff
  style TASK_29_5 fill:#2e7d32,color:#fff
  style TASK_29_6 fill:#2e7d32,color:#fff
  style TASK_29_7 fill:#5b6470,color:#fff
  style TASK_29_8 fill:#2e7d32,color:#fff
  style TASK_29_9 fill:#2e7d32,color:#fff
  style TASK_3_1 fill:#2e7d32,color:#fff
  style TASK_3_10 fill:#2e7d32,color:#fff
  style TASK_3_11 fill:#2e7d32,color:#fff
  style TASK_3_12 fill:#2e7d32,color:#fff
  style TASK_3_13 fill:#2e7d32,color:#fff
  style TASK_3_14 fill:#5b6470,color:#fff
  style TASK_3_2 fill:#2e7d32,color:#fff
  style TASK_3_3 fill:#2e7d32,color:#fff
  style TASK_3_4 fill:#2e7d32,color:#fff
  style TASK_3_5 fill:#2e7d32,color:#fff
  style TASK_3_6 fill:#5b6470,color:#fff
  style TASK_3_7 fill:#2e7d32,color:#fff
  style TASK_3_8 fill:#2e7d32,color:#fff
  style TASK_3_9 fill:#2e7d32,color:#fff
  style TASK_30_1 fill:#2e7d32,color:#fff
  style TASK_30_2 fill:#2e7d32,color:#fff
  style TASK_30_3 fill:#2e7d32,color:#fff
  style TASK_30_4 fill:#5b6470,color:#fff
  style TASK_30_5 fill:#2e7d32,color:#fff
  style TASK_30_6 fill:#2e7d32,color:#fff
  style TASK_30_7 fill:#2e7d32,color:#fff
  style TASK_31_1 fill:#5b6470,color:#fff
  style TASK_31_2 fill:#2e7d32,color:#fff
  style TASK_31_3 fill:#2e7d32,color:#fff
  style TASK_31_4 fill:#2e7d32,color:#fff
  style TASK_31_5 fill:#2e7d32,color:#fff
  style TASK_31_6 fill:#1565c0,color:#fff
  style TASK_31_7 fill:#2e7d32,color:#fff
  style TASK_32_1 fill:#2e7d32,color:#fff
  style TASK_32_2 fill:#2e7d32,color:#fff
  style TASK_32_3 fill:#2e7d32,color:#fff
  style TASK_32_4 fill:#2e7d32,color:#fff
  style TASK_32_5 fill:#2e7d32,color:#fff
  style TASK_32_6 fill:#2e7d32,color:#fff
  style TASK_33_1 fill:#2e7d32,color:#fff
  style TASK_33_2 fill:#2e7d32,color:#fff
  style TASK_33_3 fill:#2e7d32,color:#fff
  style TASK_33_4 fill:#5b6470,color:#fff
  style TASK_34_1 fill:#2e7d32,color:#fff
  style TASK_34_2 fill:#2e7d32,color:#fff
  style TASK_34_3 fill:#2e7d32,color:#fff
  style TASK_34_5 fill:#2e7d32,color:#fff
  style TASK_34_6 fill:#2e7d32,color:#fff
  style TASK_34_7 fill:#2e7d32,color:#fff
  style TASK_34_8 fill:#2e7d32,color:#fff
  style TASK_34_9 fill:#1565c0,color:#fff
  style TASK_35_1 fill:#2e7d32,color:#fff
  style TASK_35_2 fill:#2e7d32,color:#fff
  style TASK_35_3 fill:#5b6470,color:#fff
  style TASK_36_1 fill:#5b6470,color:#fff
  style TASK_36_2 fill:#5b6470,color:#fff
  style TASK_36_3 fill:#5b6470,color:#fff
  style TASK_36_4 fill:#2e7d32,color:#fff
  style TASK_36_5 fill:#2e7d32,color:#fff
  style TASK_36_6 fill:#2e7d32,color:#fff
  style TASK_36_7 fill:#5b6470,color:#fff
  style TASK_36_8 fill:#2e7d32,color:#fff
  style TASK_36_9 fill:#2e7d32,color:#fff
  style TASK_37_1 fill:#2e7d32,color:#fff
  style TASK_37_2 fill:#2e7d32,color:#fff
  style TASK_37_3 fill:#2e7d32,color:#fff
  style TASK_37_4 fill:#5b6470,color:#fff
  style TASK_37_5 fill:#2e7d32,color:#fff
  style TASK_37_6 fill:#2e7d32,color:#fff
  style TASK_37_7 fill:#2e7d32,color:#fff
  style TASK_38_1 fill:#2e7d32,color:#fff
  style TASK_38_2 fill:#2e7d32,color:#fff
  style TASK_38_3 fill:#2e7d32,color:#fff
  style TASK_38_4 fill:#5b6470,color:#fff
  style TASK_38_5 fill:#2e7d32,color:#fff
  style TASK_38_6 fill:#5b6470,color:#fff
  style TASK_39_1 fill:#5b6470,color:#fff
  style TASK_39_2 fill:#5b6470,color:#fff
  style TASK_39_3 fill:#5b6470,color:#fff
  style TASK_4_1 fill:#2e7d32,color:#fff
  style TASK_4_2 fill:#2e7d32,color:#fff
  style TASK_4_3 fill:#5b6470,color:#fff
  style TASK_4_4 fill:#2e7d32,color:#fff
  style TASK_4_5 fill:#2e7d32,color:#fff
  style TASK_4_6 fill:#2e7d32,color:#fff
  style TASK_4_7 fill:#5b6470,color:#fff
  style TASK_40_1 fill:#2e7d32,color:#fff
  style TASK_40_10 fill:#2e7d32,color:#fff
  style TASK_40_11 fill:#1565c0,color:#fff
  style TASK_40_2 fill:#2e7d32,color:#fff
  style TASK_40_3 fill:#2e7d32,color:#fff
  style TASK_40_4 fill:#2e7d32,color:#fff
  style TASK_40_5 fill:#2e7d32,color:#fff
  style TASK_40_6 fill:#1565c0,color:#fff
  style TASK_40_7 fill:#5b6470,color:#fff
  style TASK_40_8 fill:#5b6470,color:#fff
  style TASK_40_9 fill:#9aa4b1,color:#fff
  style TASK_41_1 fill:#2e7d32,color:#fff
  style TASK_41_2 fill:#2e7d32,color:#fff
  style TASK_41_3 fill:#5b6470,color:#fff
  style TASK_41_4 fill:#5b6470,color:#fff
  style TASK_41_5 fill:#2e7d32,color:#fff
  style TASK_41_6 fill:#5b6470,color:#fff
  style TASK_42_1 fill:#2e7d32,color:#fff
  style TASK_42_2 fill:#2e7d32,color:#fff
  style TASK_42_3 fill:#2e7d32,color:#fff
  style TASK_42_4 fill:#2e7d32,color:#fff
  style TASK_43_1 fill:#2e7d32,color:#fff
  style TASK_43_2 fill:#2e7d32,color:#fff
  style TASK_43_3 fill:#2e7d32,color:#fff
  style TASK_43_4 fill:#2e7d32,color:#fff
  style TASK_43_5 fill:#5b6470,color:#fff
  style TASK_43_6 fill:#5b6470,color:#fff
  style TASK_43_7 fill:#9aa4b1,color:#fff
  style TASK_5_1 fill:#2e7d32,color:#fff
  style TASK_5_2 fill:#2e7d32,color:#fff
  style TASK_5_3 fill:#5b6470,color:#fff
  style TASK_5_4 fill:#2e7d32,color:#fff
  style TASK_54_1 fill:#5b6470,color:#fff
  style TASK_6_1 fill:#2e7d32,color:#fff
  style TASK_6_10 fill:#2e7d32,color:#fff
  style TASK_6_11 fill:#5b6470,color:#fff
  style TASK_6_12 fill:#2e7d32,color:#fff
  style TASK_6_13 fill:#2e7d32,color:#fff
  style TASK_6_14 fill:#2e7d32,color:#fff
  style TASK_6_15 fill:#2e7d32,color:#fff
  style TASK_6_16 fill:#2e7d32,color:#fff
  style TASK_6_17 fill:#2e7d32,color:#fff
  style TASK_6_2 fill:#2e7d32,color:#fff
  style TASK_6_3 fill:#2e7d32,color:#fff
  style TASK_6_4 fill:#2e7d32,color:#fff
  style TASK_6_5 fill:#2e7d32,color:#fff
  style TASK_6_6 fill:#2e7d32,color:#fff
  style TASK_6_7 fill:#2e7d32,color:#fff
  style TASK_6_8 fill:#2e7d32,color:#fff
  style TASK_6_9 fill:#2e7d32,color:#fff
  style TASK_7_1 fill:#2e7d32,color:#fff
  style TASK_7_2 fill:#2e7d32,color:#fff
  style TASK_7_3 fill:#2e7d32,color:#fff
  style TASK_7_4 fill:#5b6470,color:#fff
  style TASK_8_1 fill:#2e7d32,color:#fff
  style TASK_8_2 fill:#2e7d32,color:#fff
  style TASK_8_3 fill:#2e7d32,color:#fff
  style TASK_8_4 fill:#2e7d32,color:#fff
  style TASK_8_5 fill:#2e7d32,color:#fff
  style TASK_85_1 fill:#2e7d32,color:#fff
  style TASK_85_2 fill:#2e7d32,color:#fff
  style TASK_85_3 fill:#2e7d32,color:#fff
  style TASK_85_4 fill:#5b6470,color:#fff
  style TASK_85_5 fill:#2e7d32,color:#fff
  style TASK_85_6 fill:#2e7d32,color:#fff
  style TASK_85_7 fill:#2e7d32,color:#fff
  style TASK_86_1 fill:#2e7d32,color:#fff
  style TASK_86_2 fill:#2e7d32,color:#fff
  style TASK_86_3 fill:#5b6470,color:#fff
  style TASK_86_4 fill:#2e7d32,color:#fff
  style TASK_86_5 fill:#2e7d32,color:#fff
  style TASK_87_1 fill:#2e7d32,color:#fff
  style TASK_87_2 fill:#2e7d32,color:#fff
  style TASK_87_3 fill:#5b6470,color:#fff
  style TASK_87_4 fill:#2e7d32,color:#fff
  style TASK_87_5 fill:#2e7d32,color:#fff
  style TASK_87_6 fill:#2e7d32,color:#fff
  style TASK_87_7 fill:#5b6470,color:#fff
  style TASK_88_1 fill:#2e7d32,color:#fff
  style TASK_88_2 fill:#2e7d32,color:#fff
  style TASK_88_3 fill:#2e7d32,color:#fff
  style TASK_88_4 fill:#2e7d32,color:#fff
  style TASK_88_5 fill:#2e7d32,color:#fff
  style TASK_88_6 fill:#2e7d32,color:#fff
  style TASK_89_1 fill:#2e7d32,color:#fff
  style TASK_89_2 fill:#2e7d32,color:#fff
  style TASK_89_3 fill:#5b6470,color:#fff
  style TASK_89_4 fill:#2e7d32,color:#fff
  style TASK_9_1 fill:#2e7d32,color:#fff
  style TASK_9_2 fill:#2e7d32,color:#fff
  style TASK_9_3 fill:#2e7d32,color:#fff
  style TASK_9_4 fill:#2e7d32,color:#fff
  style TASK_9_5 fill:#5b6470,color:#fff
  style TASK_9_6 fill:#2e7d32,color:#fff
  style TASK_90_1 fill:#2e7d32,color:#fff
  style TASK_90_2 fill:#5b6470,color:#fff
  style TASK_90_3 fill:#2e7d32,color:#fff
  style TASK_90_4 fill:#2e7d32,color:#fff
  style TASK_90_5 fill:#2e7d32,color:#fff
  style TASK_90_6 fill:#2e7d32,color:#fff
  style TASK_90_7 fill:#1565c0,color:#fff
  style TASK_92_1 fill:#2e7d32,color:#fff
  style TASK_92_2 fill:#5b6470,color:#fff
  style TASK_92_3 fill:#2e7d32,color:#fff
  style TASK_92_4 fill:#2e7d32,color:#fff
  style TASK_93 fill:#2e7d32,color:#fff
  style TASK_94 fill:#2e7d32,color:#fff
  style TASK_95 fill:#2e7d32,color:#fff
  style TASK_96 fill:#2e7d32,color:#fff
  style TASK_97 fill:#2e7d32,color:#fff
  style TASK_98 fill:#2e7d32,color:#fff
  style TASK_99 fill:#2e7d32,color:#fff
```
