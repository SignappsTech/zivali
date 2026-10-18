---
doc_id: DOC-90
title: Status Report
version: 2026-10-18
status: Generated
date: 2026-10-18
owner: Project Lead
audience: Client, team
---

# Progress by milestone

| Milestone | Tasks done | Estimate | Remaining |
|---|---|---|---|
| M1 Foundation | 68/78 | 96 d | 5 d |
| (none) | 53/56 | 42 d | 2 d |
| M2 Core loop MVP | 152/193 | 227.5 d | 22 d |
| M5 Hardening and launch prep | 0/3 | 4.5 d | 4.5 d |
| M3 AI and shelters | 12/16 | 18 d | 2.5 d |

# In progress

- TASK-90.7 >- (@tech-lead, in-progress)

# Ready to start

- TASK-115.6 QA: homepage rework (@qa)
- TASK-13.4 QA: Consent banner and preferences (web and mobile) (@qa)
- TASK-17.4 QA: Anonymous reporter safeguards and manage link (@qa)
- TASK-18.4 QA: Report detail page (@qa)
- TASK-21.5 QA: In-app chat between owner and finder (@qa)
- TASK-30.4 QA: Quick found or sighted report without an account (@qa)
- TASK-35.3 QA: Ad serving, targeting, house ads and tracking (@qa)
- TASK-38.4 QA: Partners page: Oglašujte pri nas (@qa)
- TASK-39.2 Mobile smoke flows (Maestro) on an Android dev build (@frontend-dev)
- TASK-4.3 QA: Quality kit and CI pipeline (@qa)
- TASK-6.11 QA: Domain contracts v1 and data platform conventions (@qa)
- TASK-7.4 QA: Analytics foundation: GA4 web, Firebase mobile, event taxonomy (@qa)
- TASK-9.5 QA: Accounts and sign-in (email, Google, Apple) (@qa)
- TASK-92.2 QA: Fiscal invoices for card payments (davčno potrjevanje računov) (@qa)
- TASK-11.3 QA: Web app shell and navigation (@qa)
- TASK-111 >- (@frontend-dev)
- TASK-112 >- (@frontend-dev)
- TASK-114.29 >- (@frontend-dev)
- TASK-114.30 CSP: allow the R2 upload origin in img-src (CH-297) (@frontend-dev)
- TASK-12.4 QA: Mobile app shell, navigation and deep links (@qa)
- TASK-16.1 Image: empty state, no pets registered yet (@image-generator)
- TASK-16.9 >- (@tech-lead)
- TASK-22.1 Image: empty state, nothing in the inbox yet (@image-generator)
- TASK-23.4 QA: Nearby lost-pet alerts (@qa)
- TASK-24.4 QA: Printable poster and sharing (@qa)
- TASK-25.6 QA: Report a listing, message or user (@qa)
- TASK-26.1 Image: reunited celebration illustration (@image-generator)
- TASK-27.3 QA: Public pages copy: home, how it works, safety tips, FAQ, for shelters (@qa)
- TASK-28.2 >- (@qa)
- TASK-29.13 Lost report for a saved pet reuses that pet''s photos (C4/C5, API) (@backend-dev)
- TASK-31.1 Image: empty state, no reports nearby (@image-generator)
- TASK-33.4 QA: Voluntary support: Pomagajte nam izboljšati Najdimo (@qa)
- TASK-34.8 Web admin: idle session timeout dialog (P19) (@frontend-dev)
- TASK-36.1 Image: house ad, support the service (@image-generator)
- TASK-36.2 Image: house ad, partner with us (@image-generator)
- TASK-36.3 Image: house ad, adopt from a shelter (@image-generator)
- TASK-5.3 QA: Environments and deployment pipeline (@qa)
- TASK-85.4 QA: Offline cache of nearby reports (mobile) (@qa)
- TASK-86.3 QA: Offline queue for found and sighting reports (mobile) (@qa)
- TASK-87.3 QA: Local proximity alerts with OS geofences (mobile) (@qa)
- TASK-87.7 Mobile: paused alerts also stop proximity alerts (@frontend-dev)
- TASK-90.2 QA: Public shelter pages /zavetisca/{slug} (@qa)
- TASK-17.13 >- (@)
- TASK-22.7 Web inbox: load more via next_cursor and quiet-hours form validation (@frontend-dev)
- TASK-22.8 Nearby-alert payload carries a public thumbnail URL (C10 nearby_lost) (@backend-dev)
- TASK-38.6 Partner stats: real GA Data API enrichment behind partners.ga_enrichment (@backend-dev)
- TASK-89.3 QA: Admin: edit the shelter directory and yearly refresh (@qa)
- TASK-17.7 Web manage page Edit links to /r/<code>, which is a 404 on main (@frontend-dev)
- TASK-27.4 House ads seeded with placeholder copy, not the final P21 creatives (@content-strategist)
- TASK-27.5 P3 copy still marked Draft, client and native SL approval pending (@content-strategist)
- TASK-3.14 Image: mobile app icon and adaptive icon (@image-generator)

# Waiting on dependencies

- TASK-16.8 QA: Pet profiles with chip number: waits for Pets API: owner CRUD, chip rules incl. CRHŽ question, duplicate-chip flag, free limit merged (TASK-16.3); Web PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.4); Mobile PetFields form section (shared by pet profiles and the lost flow) merged (TASK-16.5); Web My pets: list, create, edit, archive, delete merged (TASK-16.6); Mobile My pets: list, create, edit, archive, delete merged (TASK-16.7); Image: empty state, no pets registered yet approved (TASK-16.1); Design: Pet profiles (P8) approved (TASK-16.2)
- TASK-22.9 Web inbox: photo thumbnail on nearby-alert rows: waits for Web notifications view merged (TASK-22.4, done) and the C10 thumbnail field in the nearby_lost payload (TASK-22.8)
- TASK-26.6 QA: Mark reunited, close and expire reports: waits for all tasks of TASK-26 merged to main (TASK-26.3, TASK-26.4, TASK-26.5, TASK-26.1, TASK-26.2); leads add any later TASK-26 task to this task's dependencies.
- TASK-29.14 Web lost flow: skip the photo step for a saved pet with photos: waits for Contract C4/C5 change merged: create_report copies a saved pet's photos (TASK-29.13); web lost flow merged (TASK-29.4)
- TASK-29.15 Mobile lost flow: skip the photo step for a saved pet with photos: waits for Contract C4/C5 change merged: create_report copies a saved pet's photos (TASK-29.13); mobile lost flow merged (TASK-29.5)
- TASK-3.6 QA: Monorepo scaffold and local-first dev environment: waits for Workspace root: pnpm + Turborepo, TypeScript, lint, scripts, README merged (TASK-3.1); Local Supabase stack for Postgres, Auth and Realtime (no Edge Functions) merged (TASK-3.2); Web app scaffold: Next.js 16, Tailwind 4 + shadcn, tokens, locale routing, Supabase helpers merged (TASK-3.3); Mobile app scaffold: Expo SDK 57, Expo Router, NativeWind + RN Reusables, tokens, dev build merged (TASK-3.4); packages/api foundation: REST client, ApiError, idempotency and query helpers, fixtures merged (TASK-3.5); apps/api scaffold: Express 5 + Prisma 7 in klikni style with the domain layer merged (TASK-3.7); Workspace: klikni Prettier and ESLint style, husky, scripts and workspace for apps/api merged (TASK-3.8); API adapters ported from the TASK-3.2 branch, plus a storage adapter (R2, MinIO, memory) merged (TASK-3.9)
- TASK-36.7 QA: Ad placements in feed, detail, reunited screen and sidebar: waits for Web AdSlot and placements: feed, detail, reunited, sidebar merged (TASK-36.5); Mobile AdSlot and placements: feed, detail, reunited merged (TASK-36.6); Image: house ad, support the service approved (TASK-36.1); Image: house ad, partner with us approved (TASK-36.2); Image: house ad, adopt from a shelter approved (TASK-36.3); Design: Ad slots and house ads (P21) approved (TASK-36.4)
- TASK-39.1 Core-loop end-to-end suite on web (SL and EN): waits for Web lost flow: signed-out draft hand-off and confirmation screen merged (TASK-29.4); Web quick found or sighted report without an account merged (TASK-30.2); Web match review: compare, confirm, reject merged (TASK-20.3); Web inbox and conversation: realtime chat with safety banner merged (TASK-21.3); Web My reports, owner actions and reunited screen merged (TASK-26.4); Web map and list browse with filters merged (TASK-31.4); Web notifications view, unread badge and notification settings merged (TASK-22.4); Web consent banner and Cookie settings merged (TASK-13.2); Matching engine v1: chip, geo, time, attributes; idempotent suggestions merged (TASK-19.1); Match review RPCs: suggestions, confirm (opens chat), reject with feedback merged (TASK-20.2); Notification delivery: inbox, preferences, quiet hours, Expo push and Brevo email adapters merged (TASK-22.3); Chat backend: conversations, send_message rules, realtime, notifications, retention merged (TASK-21.2); Anonymous safeguards: rate limits, holds, manage token, claim, resend merged (TASK-17.1); Report lifecycle: transition_report, reminders, expiry, reunite effects merged (TASK-26.3); search_reports: filters, viewport and distance, map mode, pagination merged (TASK-31.3); Photo registration, server validation, publishing and cleanup merged (TASK-14.1)
- TASK-39.3 QA: Core loop end-to-end acceptance: waits for all tasks of TASK-39 merged to main (TASK-39.1, TASK-39.2); leads add any later TASK-39 task to this task's dependencies.

# Critical path

2 remaining wave(s) of dependent work.

# Decisions needed

<!-- Project lead fills in before publishing. -->
- …
