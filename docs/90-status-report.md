---
doc_id: DOC-90
title: Status Report
version: 2026-10-19
status: Generated
date: 2026-10-19
owner: Project Lead
audience: Client, team
---

# Progress by milestone

| Milestone | Tasks done | Estimate | Remaining |
|---|---|---|---|
| M1 Foundation | 69/80 | 98 d | 6 d |
| (none) | 72/74 | 61.5 d | 3.5 d |
| M2 Core loop MVP | 160/200 | 233 d | 19 d |
| M5 Hardening and launch prep | 2/4 | 5.5 d | 3.5 d |
| M4 Monetisation and moderation | 0/2 | 2 d | 2 d |
| M3 AI and shelters | 29/44 | 54 d | 15 d |

# In progress

- TASK-112 Web performance budgets: LCP over 2.5 s and JS over budget on the report flows and the map (@frontend-dev, in-progress)
- TASK-31.6 QA: Browse lost and found on a map and in a list (@qa, in-progress)
- TASK-34.9 API: grant admin to three pilot staff accounts (owner request 2026-10-19) (@backend-dev, in-progress)
- TASK-40.11 API: never send photos uploaded before AI was switched on (@backend-dev, in-progress)
- TASK-40.6 AI disclosure copy, privacy policy and data table update (requires legal review) (@content-strategist, in-progress)
- TASK-90.7 Public pages: cut first-load JS for mobile LCP 2.5 s, then make the Lighthouse quality job blocking (@tech-lead, in-progress)

# Ready to start

- TASK-13.4 QA: Consent banner and preferences (web and mobile) (@qa)
- TASK-17.4 QA: Anonymous reporter safeguards and manage link (@qa)
- TASK-18.4 QA: Report detail page (@qa)
- TASK-21.5 QA: In-app chat between owner and finder (@qa)
- TASK-29.7 QA: Report a lost pet (@qa)
- TASK-30.4 QA: Quick found or sighted report without an account (@qa)
- TASK-35.3 QA: Ad serving, targeting, house ads and tracking (@qa)
- TASK-37.4 QA: Ad management in admin (@qa)
- TASK-38.4 QA: Partners page: Oglašujte pri nas (@qa)
- TASK-39.1 Core-loop end-to-end suite on web (SL and EN) (@frontend-dev)
- TASK-39.2 Mobile smoke flows (Maestro) on an Android dev build (@frontend-dev)
- TASK-4.3 QA: Quality kit and CI pipeline (@qa)
- TASK-6.11 QA: Domain contracts v1 and data platform conventions (@qa)
- TASK-7.4 QA: Analytics foundation: GA4 web, Firebase mobile, event taxonomy (@qa)
- TASK-9.5 QA: Accounts and sign-in (email, Google, Apple) (@qa)
- TASK-92.2 QA: Fiscal invoices for card payments (davčno potrjevanje računov) (@qa)
- TASK-11.3 QA: Web app shell and navigation (@qa)
- TASK-114.33 Retention purge job: purge per the data-inventory windows, reports last (CH-184) (@backend-dev)
- TASK-114.35 API client: token in the body for unregisterPushToken, run gen:api and drop hand-written stubs (CH-156, CH-192, CH-197) (@frontend-dev)
- TASK-117.1 Wireframe: report statistics view (approval gate) (@design-lead)
- TASK-12.4 QA: Mobile app shell, navigation and deep links (@qa)
- TASK-16.1 Image: empty state, no pets registered yet (@image-generator)
- TASK-22.1 Image: empty state, nothing in the inbox yet (@image-generator)
- TASK-23.4 QA: Nearby lost-pet alerts (@qa)
- TASK-24.4 QA: Printable poster and sharing (@qa)
- TASK-25.6 QA: Report a listing, message or user (@qa)
- TASK-26.1 Image: reunited celebration illustration (@image-generator)
- TASK-27.3 QA: Public pages copy: home, how it works, safety tips, FAQ, for shelters (@qa)
- TASK-28.2 QA: Legal page drafts: privacy, cookies, terms, imprint, accessibility statement (@qa)
- TASK-29.14 Web lost flow: skip the photo step for a saved pet with photos (@frontend-dev)
- TASK-29.15 Mobile lost flow: skip the photo step for a saved pet with photos (@frontend-dev)
- TASK-31.1 Image: empty state, no reports nearby (@image-generator)
- TASK-33.4 QA: Voluntary support: Pomagajte nam izboljšati Najdimo (@qa)
- TASK-36.1 Image: house ad, support the service (@image-generator)
- TASK-36.2 Image: house ad, partner with us (@image-generator)
- TASK-36.3 Image: house ad, adopt from a shelter (@image-generator)
- TASK-4.7 Deploy: Dockerfiles install dependencies before copying the source (layer cache) (@tech-lead)
- TASK-5.3 QA: Environments and deployment pipeline (@qa)
- TASK-54.1 Wireframe: Premium plan page, yearly first (approval gate) (@design-lead)
- TASK-85.4 QA: Offline cache of nearby reports (mobile) (@qa)
- TASK-86.3 QA: Offline queue for found and sighting reports (mobile) (@qa)
- TASK-87.3 QA: Local proximity alerts with OS geofences (mobile) (@qa)
- TASK-87.7 Mobile: paused alerts also stop proximity alerts (@frontend-dev)
- TASK-90.2 QA: Public shelter pages /zavetisca/{slug} (@qa)
- TASK-17.13 Manage view offers 'Create an account' (anonymous conversion) on web /m and mobile (@)
- TASK-22.9 Web inbox: photo thumbnail on nearby-alert rows (@frontend-dev)
- TASK-38.6 Partner stats: real GA Data API enrichment behind partners.ga_enrichment (@backend-dev)
- TASK-89.3 QA: Admin: edit the shelter directory and yearly refresh (@qa)
- TASK-27.4 House ads seeded with placeholder copy, not the final P21 creatives (@content-strategist)
- TASK-27.5 P3 copy still marked Draft, client and native SL approval pending (@content-strategist)
- TASK-3.14 Image: mobile app icon and adaptive icon (@image-generator)

# Waiting on dependencies

- TASK-16.8 QA: Pet profiles with chip number: waits for Pets API: owner CRUD, chip rules incl. CRHŽ question, duplicate-chip flag, free limit merged (TASK-16.3); Web PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.4); Mobile PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.5); Web My pets: list, create, edit, archive, delete merged (TASK-16.6); Mobile My pets: list, create, edit, archive, delete merged (TASK-16.7); Image: empty state, no pets registered yet approved (TASK-16.1); Design: Pet profiles (P8) approved (TASK-16.2)
- TASK-22.6 QA: Notification infrastructure (in-app, push, email): waits for all tasks of TASK-22 merged to main (TASK-22.3, TASK-22.4, TASK-22.5, TASK-22.1, TASK-22.2); leads add any later TASK-22 task to this task's dependencies.
- TASK-26.6 QA: Mark reunited, close and expire reports: waits for all tasks of TASK-26 merged to main (TASK-26.3, TASK-26.4, TASK-26.5, TASK-26.1, TASK-26.2); leads add any later TASK-26 task to this task's dependencies.
- TASK-3.6 QA: Monorepo scaffold and local-first dev environment: waits for Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1); Local Supabase stack for Postgres, Auth and Realtime (no Edge Functions) merged (TASK-3.2); Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3); Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4); packages/api foundation: REST client, ApiError, idempotency and query helpers, fixtures merged (TASK-3.5); apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer merged (TASK-3.7); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8); API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory) merged (TASK-3.9)
- TASK-31.6 QA: Browse lost and found on a map and in a list: waits for all tasks of TASK-31 merged to main (TASK-31.3, TASK-31.4, TASK-31.5, TASK-31.1, TASK-31.2); leads add any later TASK-31 task to this task's dependencies.
- TASK-36.7 QA: Ad placements in feed, detail, reunited screen and sidebar: waits for Web AdSlot and placements: feed, detail, reunited, sidebar merged (TASK-36.5); Mobile AdSlot and placements: feed, detail, reunited merged (TASK-36.6); Image: house ad, support the service approved (TASK-36.1); Image: house ad, partner with us approved (TASK-36.2); Image: house ad, adopt from a shelter approved (TASK-36.3); Design: Ad slots and house ads (P21) approved (TASK-36.4)
- TASK-39.3 QA: Core loop end-to-end acceptance: waits for all tasks of TASK-39 merged to main (TASK-39.1, TASK-39.2); leads add any later TASK-39 task to this task's dependencies.
- TASK-40.7 Staging: wire the Anthropic and Voyage keys and AI settings, deploy, smoke on najdimo.si: waits for ai.extract merged (TASK-40.3); photo.embed merged (TASK-42.1); backfill merged (TASK-42.3); privacy-policy text approved and published (TASK-40.6); owner actions recorded in this task's notes: Voyage payment method added, Voyage training opt-out and retention confirmed
- TASK-40.8 QA: AI attribute extraction service: waits for TASK-40.1 merged; TASK-40.2 merged; TASK-40.3 merged; TASK-40.4 merged; TASK-40.5 merged; TASK-40.6 merged; TASK-40.7 merged
- TASK-41.3 Mobile: AI pre-fill in PetFields (pet profile, lost flow) and the found flow: waits for Wireframe approved by a person and recorded in the wireframe task's notes (TASK-41.1); AI wire types and fixtures merged (TASK-40.2); AI copy delivered (TASK-40.6). Code against createMockApi and the fixtures until TASK-40.4 is in the spec.
- TASK-41.4 QA: AI pre-fill in pet, lost and found forms: waits for TASK-41.1 merged; TASK-41.2 merged; TASK-41.3 merged; TASK-40.3 merged; TASK-40.4 merged; TASK-41.5 merged; TASK-41.6 merged
- TASK-41.6 Mobile: crop tool for form photos (gesture frame, expo-image-manipulator), first photo checked again: waits for the owner's confirmation of wireframe v2 in the TASK-41.1 notes (who, date, version; the v1 approval does not cover the crop) and TASK-41.3 merged (it builds the pre-fill state and polling this task extends).
- TASK-43.5 Mobile match review: visual similarity reason and most similar photo first: waits for AI wire types and the match fixture with a visual reason merged (TASK-40.2); P11 visual reason copy delivered (TASK-40.6). Code against the fixture until TASK-43.2 lands.
- TASK-43.6 QA: Matching v2 with image similarity: waits for TASK-43.1 merged; TASK-43.2 merged; TASK-43.3 merged; TASK-43.4 merged; TASK-43.5 merged

# Critical path

4 remaining wave(s) of dependent work.

# Decisions needed

<!-- Project lead fills in before publishing. -->
- …
