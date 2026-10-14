---
doc_id: DOC-02
title: Product Requirements
version: 0.7
status: Draft
date: 2026-10-14
owner: Product Manager
audience: Client, team
approvals:
  - Client | | |
  - Product Manager | Claude | 2026-10-14 |
---

<!-- Owner: product-manager. IDs are stable (FR-001, NFR-PERF…); never renumber. "N/A — reason" where not applicable. -->

# Summary

- Izgubljene živali (working name) reunites lost dogs and cats with their owners in Slovenia, on web (Next.js) and mobile (Expo), in Slovenian (default) and English.
- Owners report LOST pets. Finders, passers-by and shelters report FOUND or SIGHTED animals, finders without an account.
- The system matches both sides (chip, location, time, attributes, then photo similarity) and connects people through in-app chat with hidden contact data.
- The core loop is free forever. Revenue comes only from early ads (Oglas), voluntary support (tips, contributions, Podpornik, escrow fee), owner extras (Boost, Premium, which is also ad-free) and the B2B Vet Partner plan, all Stripe test mode in this phase. Shelters and municipalities use everything free forever; vets get everything that reunites animals free and pay only for visibility.
- Google Analytics 4 (web) and Firebase Analytics (mobile) are core from M1, behind consent, with no personal data in events.
- Delivery: M1 Foundation, M2 Core loop MVP (with ads and voluntary support), M3 AI and shelters, M4 Monetisation and moderation, M5 Hardening and launch prep, M6 Ads self-serve (post-launch). See `06-delivery-plan.md`.

**Product rules (apply to every FR)**

- P-1: Everything that gets animals home is free for everyone, forever, including basic AI (pre-fill, photo matching) and up to 2 pet profiles: reporting lost/found/sighted, map and alerts in the default radius, matching (chip, photo AI, attributes), chat, the printable PDF poster with QR, sharing and chip lookup. Paid extras never gate these; Boost only adds reach on top of an effective free radius.
- P-7: Shelters and municipalities never pay (no plan, entitlement or upgrade prompt). Vets pay only for the optional Vet Partner visibility plan. Mission first: help animals and stay self-sustaining, not maximise profit.
- P-8: QR/NFC pet tags (physical and printable) are out of scope; the poster QR links to the public listing only.
- P-2: No ad and no payment prompt inside the report-lost or report-found flows.
- P-3: Public locations are always fuzzed; chip numbers, phone numbers and emails are never public.
- P-4: Every user-facing feature ships on web and mobile unless marked web-only (shelter portal, admin, legal pages).
- P-5: Every user-facing string exists in SL and EN.
- P-6: Local development and CI run without cloud credentials (mocked AI, Stripe, email, push, analytics).

**Success metrics (definitions)**

| Metric | Definition | Target (brief) |
|---|---|---|
| Reunite rate (G-1) | LOST reports in REUNITED status within 30 days ÷ LOST reports created in the period (pilot region) | ≥ 25 % |
| Time to first match (G-2) | Median minutes from report creation to first stored suggestion, when a matching counterpart exists | < 10 min |
| Found-report time (G-3) | Median seconds from opening Report found to submit, on mobile | < 60 s |
| Shelter adoption (G-4) | Verified organisations with ≥ 1 upload in the last 30 days | 2–3 within 3 months |
| Revenue cover (G-5) | Net revenue (ads, contributions, subscriptions, fees) minus infrastructure and AI cost | ≥ 0 by month 6 |

# Users and needs

| User | Needs | Key tasks |
|---|---|---|
| Owner (25–65, mostly mobile, stressed) | One place to report, be told about matches, stay safe from scams | Register pets, report lost, review matches, chat, alerts, poster, mark reunited |
| Finder / passer-by (no account) | Report in under a minute, stay anonymous, be sure the right person is reached | Report found or sighted, chat via private link, close report |
| Community member | Know about lost pets nearby, help with sightings | Set alert area, browse map, report sighting, share |
| Shelter, vet, municipality | Less work, find owners, emptier kennels, trust | Bulk or CSV upload, matches dashboard, chip lookup, outcomes, reports |
| Admin / moderator | Keep content safe, verify shelters, manage ads, see KPIs | Moderation queue, organisation verification, ad booking, KPI dashboard |
| Sponsor (vet, pet shop, groomer, insurer, food brand) | Reach local pet owners with a trusted, measurable placement | Read Partners page, contact, receive impression and click reports |
| Supporter | Help keep the service free | Tip after reunion, contribute at report, monthly Podpornik |
| Client (Signapps) | Pitch sponsors early, learn from analytics, stay compliant | Use Partners page, admin ads, GA4, KPIs |

# Functional requirements

## FR-001: Accounts and sign-in

- **Priority:** Must · **Milestone:** M1
- **User story:** As an owner or shelter staff member, I want a quick account on web and mobile so that I get alerts, chat and pet profiles.
- **Requirements**
  - R-001.1 Register and sign in with email and password, Google or Apple; email verification before alerts and chat, not before saving a draft.
  - R-001.2 Profile: name, language (SL/EN), home area, default alert radius, optional phone (never public).
  - R-001.3 Roles: user, shelter_member, moderator, admin; enforced by RLS and route guards.
  - R-001.4 Password reset by localised email; rate limited.
  - R-001.5 One session across web and mobile for the same account.
- **Acceptance criteria**
  - [ ] Given a visitor, when they sign up with Google on mobile, then an account exists and they are signed in on web with the same credentials.
  - [ ] Given a user, when they request another user's profile through the API, then access is denied by RLS.
  - [ ] Given a new email account, when unverified, then reporting drafts work but alerts and chat are blocked with a clear prompt.
- **Edge cases**
  - Apple hides email: use the relay address; account linking when the same verified email signs in with another provider asks for confirmation.
  - Deleted account re-registering with the same email starts clean.

## FR-002: Pet profiles

- **Priority:** Must · **Milestone:** M2
- **User story:** As an owner, I want to register my pets with chip and photos in advance so that reporting a loss takes seconds and matching has data.
- **Requirements**
  - R-002.1 Fields: species (dog, cat), name, breeds, colours, pattern, size, sex, birth year, chip number (equally prominent for cats and dogs; cat chipping is mandatory from 1 Jan 2027), collar, 1–5 photos, notes (medication, temperament); for cats also ear tip (sterilised free-living cat) and indoor or outdoor.
  - R-002.2 Chip number normalised and validated (digits, 9–15; 15-digit ISO 11784 expected; Slovenian dog chips typically start 705, not enforced).
  - R-002.3 Duplicate chip across owners is flagged to moderators without revealing the other owner.
  - R-002.4 Free accounts can save up to 2 profiles (Premium: unlimited); the limit never blocks a lost report (P-1).
  - R-002.5 Question "Is the chip registered in CRHŽ with your current phone number?" (yes / no / don't know) with a reminder to update it at the vet; a note that a vet or the responsible shelter can read the chip. No link to the closed public CRPsi lookup; a future public lookup URL lives in config, off.
- **Acceptance criteria**
  - [ ] Given an owner, when they add a pet with a 15-digit chip, then it is saved normalised and the chip is never shown publicly.
  - [ ] Given a free account with two profiles, when they add a third, then they see the Premium option and can still report that pet lost with inline details.
  - [ ] Given an owner deletes a pet, when confirmed, then its photos are removed.
- **Edge cases**
  - Invalid or short chip numbers are accepted as "unknown" with a warning, not blocked.
  - Pets without photos can be saved but a lost report requires at least one photo.

## FR-003: Photo capture and upload

- **Priority:** Must · **Milestone:** M2
- **User story:** As any reporter, I want to add photos quickly from a weak mobile connection so that matching and strangers can recognise the animal.
- **Requirements**
  - R-003.1 Camera or gallery, 1–5 photos, client-side resize (long edge ≤ 1600 px, < 1 MB each), progress and retry.
  - R-003.2 EXIF GPS and time suggested to the form; EXIF stripped from stored public copies.
  - R-003.3 Drafts keep photos locally and resume after a failed upload.
  - R-003.4 Originals private, derived variants public; server-side type and size validation; orphan cleanup after 24 h.
  - R-003.5 A photo-uploaded hook feeds AI extraction, embeddings and image screening (M3, M4).
- **Acceptance criteria**
  - [ ] Given a 6 MB phone photo, when selected, then the uploaded file is under 1 MB and EXIF GPS is absent from the public copy.
  - [ ] Given the connection drops mid-upload, when it returns, then the upload resumes without re-selecting.
  - [ ] Given a non-image file, when uploaded, then it is rejected server-side with a clear message.
- **Edge cases**
  - HEIC from iPhones converted to JPEG client-side.
  - Same image uploaded twice is deduplicated by hash (cost cap, FR-013).

## FR-004: Location capture and privacy-preserving display

- **Priority:** Must · **Milestone:** M2
- **User story:** As a reporter, I want to set an accurate place from my phone so that matches are relevant, while the public never sees exact addresses.
- **Requirements**
  - R-004.1 Picker: GPS, drop pin, search place, radius (lost); MapLibre with OpenFreeMap tiles; web and mobile.
  - R-004.2 Public display fuzzed: LOST ≥ 500 m radius area, FOUND/SIGHTED ≥ 150 m; deterministic per report; configurable.
  - R-004.3 Exact point visible only to owner or reporter and, by explicit share, to chat participants.
  - R-004.4 The place where a found animal is kept is never asked for or shown.
  - R-004.5 Shared MapView API (markers, clusters, circles, paths) with a text alternative.
- **Acceptance criteria**
  - [ ] Given a lost report at a home address, when anyone else views it, then only an area of ≥ 500 m radius is shown and the API never returns the exact point.
  - [ ] Given GPS permission is denied, when the picker opens, then manual pin and search work.
  - [ ] Given repeated page views, when a report is fetched many times, then the fuzzed centre is identical.
- **Edge cases**
  - Locations outside Slovenia show a notice (out of launch market) but are not blocked.
  - Search results default to Slovenia.

## FR-005: Report a lost pet

- **Priority:** Must · **Milestone:** M2
- **User story:** As an owner, I want to report my pet lost in minutes so that matching and alerts start immediately.
- **Requirements**
  - R-005.1 Choose a saved pet or enter details inline; last-seen place and radius, date and time (default now), circumstances, contact preference (chat only by default).
  - R-005.2 Visitors can fill the form first; sign-up or sign-in completes the report without data loss.
  - R-005.3 On submit: listed within 1 minute, matching runs, nearby alerts fan out, confirmation shows next steps (poster, share, tips) and a checklist: report the escape to a vet or the responsible shelter (within 3 days; the nearest shelter within 72 h) with a one-tap call from the shelter directory (FR-044). The app never claims to replace the legal duty; legal timings show only when the legal-content flag is on.
  - R-005.4 Confirmation reserves a slot for the optional contribution (FR-021); never an ad (P-2).
  - R-005.5 Events `report_lost_start`, `report_lost_submit` (FR-038).
- **Acceptance criteria**
  - [ ] Given a signed-out visitor who completed the form, when they register at the end, then the report is created with all data.
  - [ ] Given a submitted report, when the map is opened, then the report appears with fuzzed location within 1 minute.
  - [ ] Given the lost flow, when any screen renders, then no ad slot is present.
- **Edge cases**
  - Same pet reported twice: second submission offers to update the open report.
  - Date in the future is rejected; very old dates (> 30 days) warn.

## FR-006: Report a found or sighted animal without an account

- **Priority:** Must · **Milestone:** M2
- **User story:** As a finder or passer-by, I want to report an animal in under a minute without registering so that its owner can find it.
- **Requirements**
  - R-006.1 Sequence: photo, location (GPS or EXIF), "I have the animal" vs "I only saw it", optional note, optional email; median < 60 s on mobile (G-3). After submit (not before) a notice: report the find to the responsible shelter within 24 hours, with call buttons (FR-044) and "any vet or shelter can read the chip"; legal timing behind the legal-content flag; also shown once a queued offline report is sent (FR-042).
  - R-006.2 Private manage link (high entropy) to edit, close, mark returned and chat on any device; optional email delivery.
  - R-006.3 Safeguards: captcha, rate limit per IP and device (default 5/hour, 20/day), duplicate-photo detection, hold for moderation on abuse patterns.
  - R-006.4 "I saw this pet" on a lost listing creates a SIGHTED report linked to it.
  - R-006.5 Anonymous finder can later claim the report by creating an account.
  - R-006.6 Events `report_found_start`, `report_found_submit`; no ad in the flow (P-2).
- **Acceptance criteria**
  - [ ] Given a visitor on mobile, when they complete the flow, then the report is live and a manage link is shown (median task time < 60 s in usability tests).
  - [ ] Given a sixth submission from one device within an hour, when sent, then it is refused with a friendly message.
  - [ ] Given the finder opens the manage link on another device, when they open chat, then they can reply without signing in.
- **Edge cases**
  - Lost manage link: if an email was given, a resend is possible; otherwise the report expires after 30 days.
  - Captcha provider outage: whether anonymous submissions fail closed or continue under tighter limits is decided in the TDD.

## FR-007: Map, list and report detail

- **Priority:** Must · **Milestone:** M2
- **User story:** As an owner or community member, I want to browse lost and found animals on a map and in a list so that I can spot a match or help.
- **Requirements**
  - R-007.1 Map with clustered pins by type, icon and colour; list with the same filters and pagination as full alternative.
  - R-007.2 Filters: type, species, distance, date range, colour, size; URL-persisted on web; SL plural-aware counts.
  - R-007.3 Detail page: photos, attributes, chip-on-file indicator (never number), fuzzed area, status, circumstances, action slots (Contact, Share, Poster, Report abuse, owner actions, ad slot).
  - R-007.4 Server-rendered detail with Open Graph and structured data; closed or hidden reports not indexable.
  - R-007.5 Boosted reports sort first and highlight (purchase in FR-025).
- **Acceptance criteria**
  - [ ] Given 500 reports in view, when the map loads on 4G, then pins appear within 2 s.
  - [ ] Given a keyboard-only user, when they use the list, then they can reach every report and filter without the map.
  - [ ] Given a hidden report URL, when opened, then a clear "no longer available" page is shown with HTTP 410 or noindex.
- **Edge cases**
  - Empty region: friendly empty state with the "Report" and "Set alert" actions.
  - Expired or closed reports excluded by default, visible with a filter for 30 days.

## FR-008: Matching v1 and match review

- **Priority:** Must · **Milestone:** M2
- **User story:** As an owner, I want the system to suggest likely matches and let me confirm or reject them so that I find my pet faster.
- **Requirements**
  - R-008.1 Runs on every new or updated report; suggestions stored within 2 min (p95).
  - R-008.2 Equal normalised chip number between LOST and FOUND/SIGHTED = score 1.0, chip-match flag, immediate owner notification.
  - R-008.3 Otherwise species must match; score blends distance decay, time proximity (found after lost, ≤ 30 days), attribute overlap (size, colour, sex); threshold 0.5, top 10; all in config; reasons stored.
  - R-008.4 Review screen: photo comparison, distance, time gap, reasons, strength label; confirm opens chat, reject hides for good.
  - R-008.5 Neither side sees contact data before the owner confirms.
  - R-008.6 Events `match_suggested`, `match_confirmed`.
- **Acceptance criteria**
  - [ ] Given a LOST and a FOUND report with the same chip, when the second is saved, then the owner is notified within 2 minutes with a chip-match label.
  - [ ] Given a rejected suggestion, when matching reruns, then the same pair does not reappear.
  - [ ] Given a cat reported lost and a dog found, when matching runs, then no suggestion is made.
- **Edge cases**
  - Chip on a SIGHTED report that is not "I have the animal": still a chip match, owner told the animal may be elsewhere.
  - Multiple owners claiming one found animal: each reaches a separate chat; finder decides; moderators can intervene via abuse report.

## FR-009: In-app chat

- **Priority:** Must · **Milestone:** M2
- **User story:** As an owner or finder, I want to talk in the app without sharing my phone number so that I stay safe from scams.
- **Requirements**
  - R-009.1 Real-time text chat created on match confirmation or via Contact on a listing; web and mobile; p95 delivery < 2 s.
  - R-009.2 Anonymous finder participates through the manage-link session.
  - R-009.3 Persistent safety banner (never send money first); links shown as plain text with a caution; no preview unfurling.
  - R-009.4 Report and block from the chat; offline recipient gets a notification (FR-010).
  - R-009.5 Read-only after the report closes; deleted after the retention period (default 6 months).
  - R-009.6 Event `chat_started`.
- **Acceptance criteria**
  - [ ] Given a confirmed match, when either party writes, then the other receives the message within 2 s (p95) and a push if offline.
  - [ ] Given a blocked user, when they write, then the message is refused.
  - [ ] Given a message with a URL, when displayed, then it is not clickable preview and shows a caution.
- **Edge cases**
  - Chat attachments (photos) are out of MVP (Could).
  - Both parties never see phone or email unless they type it; the banner reminds them of the risk.

## FR-010: Notifications and nearby alerts

- **Priority:** Must · **Milestone:** M2
- **User story:** As a community member, I want alerts about lost pets near me so that I can help; as an owner I want to be told about matches and messages immediately.
- **Requirements**
  - R-010.1 In-app inbox, Expo push and email, in the recipient language; preferences per type and channel; quiet hours (not for chip match or chat).
  - R-010.2 Nearby alerts: home area, radius default 5 km (1–25), species, daily cap default 5; fuzzed location only; cancelled when the report closes.
  - R-010.3 Deduplication and rate limits (≤ 1 push per report per hour for nearby alerts).
  - R-010.4 Fan-out of 1000 recipients < 60 s.
  - R-010.5 Event `alert_opt_in`.
- **Acceptance criteria**
  - [ ] Given a user with a 5 km area, when a lost report is created 3 km away, then they get one alert within 2 minutes.
  - [ ] Given quiet hours 22:00–07:00, when a nearby alert is due, then it waits; a chip-match alert still arrives.
  - [ ] Given the owner marks the pet reunited, when pending alerts exist, then they are cancelled.
- **Edge cases**
  - Push permission denied: fall back to in-app and email.
  - Users with unverified email get no email alerts.

## FR-011: Poster and sharing

- **Priority:** Should · **Milestone:** M2
- **User story:** As an owner, I want a printable poster and one-tap sharing so that I reach neighbours and Facebook groups.
- **Requirements**
  - R-011.1 A4 PDF, SL or EN, large photo, key details, area, QR and short link that resolve to the public listing only, no phone number; high-contrast, greyscale-safe.
  - R-011.2 Share to WhatsApp, Facebook, copy link, native sheet with localised text; Facebook-ready share kit: SL text, square image, list of regional Facebook lost-pet groups (names supplied by the client) and the Radio Aktual submission form.
  - R-011.3 Open Graph preview shows photo and type, never exact location or where an animal is kept.
  - R-011.4 Events `poster_download`, `share`.
- **Acceptance criteria**
  - [ ] Given an open lost report, when the owner downloads the poster, then the PDF is generated in under 5 s and the QR opens the listing.
  - [ ] Given a link pasted in WhatsApp, when the preview loads, then it shows the pet photo and title.
  - [ ] Given a greyscale print, when scanned, then the QR still resolves.
- **Edge cases**
  - Report without good photo: poster blocks with a prompt to add one.
  - Closed report: poster shows "reunited" or is unavailable.

## FR-012: Reunited and report lifecycle

- **Priority:** Must · **Milestone:** M2 (success stories page M5)
- **User story:** As an owner or finder, I want to close the loop and keep my listings fresh so that the map stays trustworthy.
- **Requirements**
  - R-012.1 Statuses OPEN, MATCHED, REUNITED, CLOSED; owner or manage-link holder can mark reunited, close with a reason, reopen within 7 days.
  - R-012.2 LOST reminders at 7, 14, 30 days; auto-close at 90 days with one-tap extension. FOUND/SIGHTED expire after 30 days without update; shelter intakes exempt.
  - R-012.3 Reunited screen: warm message, next steps, slots for thank-you tip (FR-021) and one ad (FR-030); opt-in consent for a success story.
  - R-012.4 Record time to reunite and time to first match.
  - R-012.5 Public success stories page, opt-in and moderated (M5).
  - R-012.6 Event `reunited`.
- **Acceptance criteria**
  - [ ] Given a lost report with a confirmed match, when the owner marks reunited, then both reports show REUNITED and pending alerts and boosts stop.
  - [ ] Given a 90-day-old lost report, when no action, then it closes and the owner can extend with one tap.
  - [ ] Given a story is published, when the owner withdraws consent, then it is unpublished within 24 h.
- **Edge cases**
  - Finder marks reunited but owner disagrees: owner can reopen within 7 days.
  - Multiple matches: owner picks which one reunited.

## FR-013: AI attribute pre-fill

- **Priority:** Must · **Milestone:** M3
- **User story:** As a reporter, I want the app to fill breed, colour and size from my photo so that I only confirm.
- **Requirements**
  - R-013.1 Vision model returns structured JSON (species, breeds with confidence, colours, pattern, size band, collar, marks) validated against a schema.
  - R-013.2 Suggestions are labelled, editable, never saved unconfirmed; confidence < 0.6 leaves the field empty.
  - R-013.3 Caps: 1 call per photo, cache by image hash, per-device daily limit for anonymous users, monthly budget; fail open to manual entry.
  - R-013.4 Output also carries a moderation signal for FR-018.
  - R-013.5 No user identifiers or EXIF sent to the provider; provider named in the privacy policy.
- **Acceptance criteria**
  - [ ] Given a clear dog photo, when uploaded, then species, breed and colour are suggested within 6 s (p95) and the user can edit them.
  - [ ] Given the budget cap is reached, when a photo is uploaded, then the form works manually with no error.
  - [ ] Given the found flow with AI, when tested, then median completion stays < 60 s.
- **Edge cases**
  - Multiple animals in one photo: ask the user to crop or pick.
  - Non-animal photo: suggest retake.

## FR-014: Image-similarity matching (v2)

- **Priority:** Must · **Milestone:** M3
- **User story:** As an owner, I want visually similar found animals suggested so that I find my pet even if descriptions differ.
- **Requirements**
  - R-014.1 Embedding per photo (async, versioned), pgvector ANN index, backfill, mock for local use.
  - R-014.2 Score blends visual similarity into v1; chip match stays 1.0; reasons include a similarity band.
  - R-014.3 Reverse search on every new found report across open lost reports in range (< 5 s at 1000 reports).
  - R-014.4 Evaluation harness (≥ 100 labelled pairs): v2 not worse than v1; thresholds documented.
- **Acceptance criteria**
  - [ ] Given a lost and a found photo of the same animal at different angles, when scored, then the found report ranks in the owner's top 10.
  - [ ] Given a new found report, when saved, then open lost reports within range are re-scored and owners notified.
  - [ ] Given the embedding model changes, when re-embedding runs, then matching stays available.
- **Edge cases**
  - Similar-looking animals (black cats): similarity alone never exceeds the notification threshold without a geo-time fit.
  - Photos with owners or other people: ignored for scoring if the model flags the face prominently.

## FR-015: Organisations and shelter portal

- **Priority:** Must · **Milestone:** M3
- **User story:** As a shelter, vet or municipality worker, I want to upload intake animals fast and see probable owners so that kennels empty sooner.
- **Requirements**
  - R-015.1 Organisation registration (shelter, vet, municipality), admin verification with badge, roles owner/editor/viewer, invitations.
  - R-015.2 Portal (web): dashboard, animals table, status (in care, returned, adopted, transferred), holding period default 8 days after placement (configurable per organisation) with a countdown "days until possible rehoming" and urgent intake-match alerts near its end.
  - R-015.8 Shelter uploads (bulk and CSV) must capture where and when the animal was found, which shelters do not publish today.
  - R-015.3 Bulk photo upload: up to 30 photos to draft rows with chip, species, intake date, found location; publish valid rows as FOUND reports.
  - R-015.4 CSV import: template, dry run, row-level errors, safe photo URL fetch, limit 500 rows / 5 MB.
  - R-015.5 Matches dashboard: top probable owners per animal, contact through chat, no personal data shown to staff, automatic matching of new lost reports.
  - R-015.6 Unverified organisations: listings held for moderation.
  - R-015.7 Free forever for shelters and municipalities; vets free for found-animal reports, chip lookup, matches and chat (see FR-028).
- **Acceptance criteria**
  - [ ] Given a verified shelter, when staff upload 10 photos with chips, then 10 FOUND reports exist within 5 minutes of user time.
  - [ ] Given a CSV with 3 invalid rows, when dry-run, then errors list row, field and message and nothing is saved.
  - [ ] Given a new lost report matches an intake animal, when saved, then the shelter is notified and sees the match in the dashboard.
- **Edge cases**
  - Viewer role cannot edit.
  - Holding-period default (8 days, no 30-day rule exists) is a configurable reminder; the app never asserts legal obligations (Q-006).

## FR-016: Chip lookup for shelters and vets

- **Priority:** Must · **Milestone:** M3
- **User story:** As a shelter or vet, I want to enter a scanned chip and learn whether the owner can be reached so that I can return the animal.
- **Requirements**
  - R-016.1 Verified organisation members only; chip normalised.
  - R-016.2 Result: registered (owner notified, nothing personal shown) or not found (message: a vet or the responsible shelter reads the chip and registry data in CRHŽ; a public lookup link only behind a config flag, off).
  - R-016.3 Throttle (default 30/hour/member); audit log stores a chip hash, not the number.
  - R-016.4 Response never contains owner name, contact or address.
- **Acceptance criteria**
  - [ ] Given a chip on an open lost report, when looked up, then the owner receives an alert and the lookup shows only "owner notified".
  - [ ] Given 31 lookups within an hour, when the last is sent, then it is throttled.
  - [ ] Given an unknown chip, when looked up, then the screen says a vet or the responsible shelter reads the chip and shows no CRPsi link.
- **Edge cases**
  - Chip registered on a pet profile without a lost report: owner gets an informational notification only if they enabled it.

## FR-017: Sighting trail

- **Priority:** Could · **Milestone:** M3
- **User story:** As an owner, I want sightings of my pet shown as a path so that I can predict where it is going.
- **Requirements**
  - R-017.1 Linked sightings drawn as numbered points in time order using fuzzed positions.
  - R-017.2 Owner can mark a sighting "not my pet"; new sighting notifies the owner.
  - R-017.3 Chronological text list as screen-reader alternative.
- **Acceptance criteria**
  - [ ] Given 3 linked sightings, when the detail page opens, then a path with 3 numbered points is shown in time order.
  - [ ] Given the owner marks one as not theirs, when saved, then it leaves the path.
  - [ ] Given a screen reader, when the trail is read, then the list conveys times and areas.
- **Edge cases**
  - Sightings > 48 h apart shown with a gap marker.

## FR-018: Abuse reporting and moderation

- **Priority:** Must · **Milestone:** M2 (reporting), M4 (queue, image screening)
- **User story:** As a user, I want to flag scams and inappropriate content so that moderators remove them.
- **Requirements**
  - R-018.1 Report abuse on listings, profiles and chat messages; reasons (scam, fake, spam, inappropriate image, other); anonymous visitors can report listings (rate limited). Listings and messages offering to sell or give away animals (podarim, prodam) are removed.
  - R-018.2 Three independent reports hide a listing pending review (configurable).
  - R-018.3 Moderation queue: age/severity order, dismiss, hide/remove, warn, suspend, ban, notify, audit log, reversible; target 90 % reviewed in 24 h.
  - R-018.4 Automated image screening from the vision result: held and queued within 60 s when flagged.
- **Acceptance criteria**
  - [ ] Given three distinct reports, when the third is filed, then the listing is hidden and the owner informed.
  - [ ] Given a moderator bans a user, when they sign in, then they see the reason and cannot post.
  - [ ] Given a flagged image, when uploaded, then it is not public until a moderator approves.
- **Edge cases**
  - Brigading: reports from accounts created < 24 h earlier count at half weight (decision in TDD).
  - Private chats are visible to moderators only when a message was reported.

## FR-019: Admin panel

- **Priority:** Must · **Milestone:** M2 (shell), M3 (organisation verification), M4 (KPI, users)
- **User story:** As an admin, I want one console for ads, organisations, moderation and KPIs so that I can run the service.
- **Requirements**
  - R-019.1 Role-filtered navigation, strong authentication for admin roles, audit log of every action, scripted bootstrap of the first admin.
  - R-019.2 Organisation verification screens (M3).
  - R-019.3 KPI dashboard from our DB (metric definitions above), filterable by region and species; GA4 funnels verified.
  - R-019.4 Leads list (partner enquiries, Vet Partner applications).
- **Acceptance criteria**
  - [ ] Given a non-admin user, when they open the admin URL, then access is denied.
  - [ ] Given an admin changes an ad, when saved, then an audit entry exists.
  - [ ] Given users who declined analytics, when the KPI page loads, then DB-based KPIs are complete.
- **Edge cases**
  - Last admin cannot be removed.

## FR-020: Payments core (Stripe test mode)

- **Priority:** Must · **Milestone:** M2 (one-off payments), M4 (subscriptions, entitlements)
- **User story:** As a payer, I want a safe, simple card payment so that I can support or buy.
- **Requirements**
  - R-020.1 Stripe Checkout in test mode; webhook-driven ledger; idempotent; EUR; integer cents; minimum card amount EUR 2.00 for user-chosen amounts; fixed plan prices come from config.
  - R-020.2 Mock provider for local and CI; live mode impossible by configuration in this phase.
  - R-020.3 Subscriptions and entitlements (`hasEntitlement`) for Premium, Supporter (individual users) and Vet Partner (vet organisation only); never for shelters or municipalities; customer portal for cancel and invoices.
  - R-020.4 Confirmation email in the user language; My payments list.
  - R-020.5 Mobile opens web checkout in an in-app browser; no native purchase UI in this phase (see Risks in the delivery plan).
- **Acceptance criteria**
  - [ ] Given a payment of EUR 1.50, when started, then it is refused with the minimum-amount message.
  - [ ] Given a duplicate webhook, when received, then the ledger has one entry.
  - [ ] Given no Stripe keys, when tests run, then the mock provider simulates success, failure and cancel.
- **Edge cases**
  - Payment succeeds but the user closes the browser: the webhook still applies the effect.
  - Refunds only by admin; entitlement ends at once.

## FR-021: Voluntary support "Pomagajte nam izboljšati Najdimo"

- **Priority:** Should · **Milestone:** M2
- **User story:** As a grateful user, I want to leave a small contribution at a good moment so that the service stays free for others.
- **Requirements**
  - R-021.1 After marking reunited: one-tap EUR 3 / EUR 5 (highlighted, not pre-selected) / EUR 10 and custom (≥ EUR 2); Skip as visible as Pay.
  - R-021.2 After a report (lost-report confirmation): the same optional ask, collapsed by default, not repeated for that report once skipped.
  - R-021.3 On the profile: a support card with the same amounts and the monthly Podpornik option (FR-022); no repeated prompts.
  - R-021.4 Wording is "podpora / prispevek", not charitable donation, unless the legal entity allows (FR-024).
  - R-021.5 Never blocks or delays reporting, matching or alerts (P-1, P-2).
  - R-021.6 Event `donation` with value and currency EUR.
- **Acceptance criteria**
  - [ ] Given the reunited screen, when shown, then EUR 3, 5 (highlighted, not selected), 10, a custom field and an equally visible Skip are present.
  - [ ] Given the lost confirmation, when shown, then no amount is selected by default.
  - [ ] Given the profile screen, when opened, then the support card shows the amounts and Podpornik without a pop-up.
  - [ ] Given a completed payment, when recorded, then a receipt email is sent and `donation` fires with consent only.
- **Edge cases**
  - Anonymous finders have no tip flow (account needed for receipts).
  - Declined card: friendly retry; nothing else changes.

## FR-022: Monthly supporter "Podpornik"

- **Priority:** Should · **Milestone:** M4
- **User story:** As a supporter, I want to give monthly without needing features so that I help sustainably.
- **Requirements**
  - R-022.1 from EUR 2 per month, amount chosen by the user (test mode); ads are still shown to supporters; badge on profile and listings with an opt-out toggle; no features, no ranking advantage.
  - R-022.2 Cancel anytime; badge ends at period end.
  - R-022.3 Event `supporter_subscribe`.
- **Acceptance criteria**
  - [ ] Given a supporter, when their listing is shown, then a small badge appears; when they opt out, it does not.
  - [ ] Given a cancellation, when the period ends, then the badge is gone.
  - [ ] Given a non-supporter, when using any feature, then nothing is degraded.
- **Edge cases**
  - Supporter sees ads like everyone else; only Premium is ad-free (A-017).

## FR-023: Finder reward escrow

- **Priority:** Should · **Milestone:** M4
- **User story:** As an owner, I want to secure a reward in the app so that nobody asks me to pay first.
- **Requirements**
  - R-023.1 Reward EUR 10–500 funded in Stripe (test); funds held through Stripe Connect (Stripe holds funds, no own wallet).
  - R-023.2 Release after owner confirms reunion; finder paid via Connect Express (test) minus platform fee (default 5 %, configurable, shown before funding).
  - R-023.3 Refund to owner after 30 days or on admin-resolved dispute; audit-logged.
  - R-023.4 Finder without an account claims their report and onboards to receive payment.
  - R-023.5 Legal review of the operating model before any live use (Q-011).
- **Acceptance criteria**
  - [ ] Given a funded reward, when the owner confirms release, then the finder payout is created in test mode and both get receipts.
  - [ ] Given no reunion in 30 days, when it elapses, then funds return to the owner.
  - [ ] Given test mode, when running, then no live money moves.
- **Edge cases**
  - Dispute: both sides give a statement; admin decides; decision is final within the app.

## FR-024: Transparency page and dohodnina

- **Priority:** Should · **Milestone:** M4
- **User story:** As a prospective supporter, I want to see where my money goes so that I trust the service.
- **Requirements**
  - R-024.1 Public page (SL/EN): what contributions fund, fees (Stripe fixed fees, EUR 2 minimum, escrow percent), latest published totals.
  - R-024.2 Dohodnina (income-tax share via eDavki) is deferred: it needs a non-profit with public-interest status on the tax authority list; Signapps d.o.o. can never qualify and a new society needs about 2 years. Option: a partner-NGO model (Q-008). Until then the section stays hidden by a flag.
  - R-024.3 Wording never implies charitable status where none exists.
- **Acceptance criteria**
  - [ ] Given the flag is off, when the page loads, then no dohodnina text is present.
  - [ ] Given the flag is on, when the page loads, then the eDavki steps and entity identifiers are shown.
  - [ ] Given SL and EN, when switched, then both versions are complete.
- **Edge cases**
  - Eligibility requires a non-profit entity; if only Signapps (a company) operates the service, the section stays hidden and contribution wording stays commercial.

## FR-025: Boost a lost listing

- **Priority:** Should · **Milestone:** M4
- **User story:** As an owner, I want to boost my listing so that more people see it quickly.
- **Requirements**
  - R-025.1 One-off purchase, EUR 4.99 fixed (config), 7 days, via Stripe Checkout (test).
  - R-025.2 Effects: alert radius up to 25 km (daily cap respected), sort first, top of the map, an auto-generated social post (template text and image, one-tap share; Premium may use the AI-written version, FR-026).
  - R-025.3 No auto-renew; ends on expiry and stops automatically on reunion; refunds by admin only. Premium users have 1 free Boost per year.
  - R-025.4 Event `boost_purchase` with value and currency EUR.
  - R-025.5 Boost adds reach on top of an already effective free alert radius; nothing in the free loop is removed.
- **Acceptance criteria**
  - [ ] Given a paid boost, when active, then the report sorts first, shows at the top of the map and alerts reach users within 25 km.
  - [ ] Given a cancelled checkout, when returning, then the report is unchanged.
  - [ ] Given a non-paying owner, when using the product, then all core features remain.
- **Edge cases**
  - Boosting a closed report is blocked; boosting twice extends the end date.

## FR-026: Premium "Protect"

- **Priority:** Should · **Milestone:** M4
- **User story:** As an owner, I want convenience and AI help so that I am prepared and effective when my pet is lost.
- **Requirements**
  - R-026.1 Test price EUR 2.99 per month or EUR 24.99 per year; honest plan page listing what stays free (reporting, matching incl. basic AI, chat, poster, up to 2 pet profiles).
  - R-026.2 Perks: unlimited pet profiles; one-tap lost mode (≤ 2 taps); 1 free Boost per year; ad-free (no sponsor and no house ads; Podpornik does not remove ads).
  - R-026.3 AI extras (capped, SL/EN, mock locally): AI-written listing and social posts; AI poster designs (standard poster stays free); AI search plan (species and behaviour-based guidance; free users see a generic checklist).
  - R-026.4 Downgrade keeps extra pets read-only 90 days; ads return.
  - R-026.5 Core matching, chat and alerts are never part of Premium.
- **Acceptance criteria**
  - [ ] Given a Premium user, when they tap Lost mode, then a prefilled lost report is created in ≤ 2 taps.
  - [ ] Given a Premium user, when an ad slot is requested, then none is returned.
  - [ ] Given a Premium user, when they tap Write for me, then SL and EN listing and social texts are generated without chip number or exact location.
  - [ ] Given a lapse, when the period ends, then premium-only features lock and data stays.
- **Edge cases**
  - Free accounts keep matching, chat, alerts and the standard poster for their open lost reports.
  - AI cap reached: the manual text, standard poster and generic checklist remain.

## FR-027: QR/NFC pet tags (withdrawn)

- **Priority:** Out of scope · **Milestone:** none
- **Status:** Withdrawn in v0.3 (brief v0.7). Physical and printable tags, tag ordering, the tag scan page, tag prices and tag order fulfilment are out of scope because a tag linking a pet to its owner feels too close to personal data. Revisit later with a privacy-first design. The ID is kept so numbering stays stable. Stories TASK-56 and TASK-57 are archived.
- **Still in scope:** the poster PDF QR (FR-011), which links to the public listing only.

## FR-028: Free shelter tools and Vet Partner

- **Priority:** Should (reports, adoption page, Vet Partner) / Could (API) · **Milestone:** M3 (shelter tools), M4 (Vet Partner)
- **User story:** As a shelter, municipality or vet, I want tools that save time and, for vets, visibility, so that more animals get home.
- **Requirements**
  - R-028.1 Shelters and municipalities: everything free forever (portal, bulk and CSV upload, matches, chip lookup, API keys, analytics, municipality reports, adoption page). No plan, entitlement or upgrade prompt; rate limits are abuse protection and equal for every organisation.
  - R-028.2 Vets: free for found-animal reports, chip lookup, matches and chat with owners.
  - R-028.3 API keys (hashed, scoped, revocable), idempotent intake endpoint with OpenAPI docs.
  - R-028.4 Analytics and municipality PDF/CSV reports (counts < 5 aggregated); public adoptable animals page.
  - R-028.5 Vet Partner (B2B, Stripe Billing with VAT invoices, test EUR 39 per month): verified clinic profile (hours, 24h emergency badge, services, booking or phone link); featured placement in vet slots of its area titled "Veterinar v vaši regiji", always labelled "Oglas" (never called "nearest" unless it truly is, with a "Kako razvrščamo" ranking link); one labelled "Oglas" vet line on posters of its region and none in alert push or email without marketing consent; ranking rules stated in the contract; live only after a lawyer confirms; monthly stats report (views, clicks, impressions, reunions in the area, aggregate only).
  - R-028.6 Lapsed Vet Partner keeps a basic verified entry; free features are unaffected. Pet shops, groomers and insurers buy ads (FR-029..031).
- **Acceptance criteria**
  - [ ] Given a shelter or municipality member, when they use any portal feature, then no payment, entitlement check or upgrade prompt exists.
  - [ ] Given an API key, when it posts the same external id twice, then one report exists.
  - [ ] Given a vet without Vet Partner, when they use chip lookup, found reports, matches and chat, then all work unrestricted.
  - [ ] Given an active Vet Partner clinic, when a nearest-vet slot is requested in its area, then the clinic is shown first and labelled Oglas.
  - [ ] Given the plan lapses, when the period ends, then featured placement and mentions stop within 1 hour.
- **Edge cases**
  - Two partner clinics in one area rotate fairly; alerts and posters carry at most one clinic.
  - Municipality invoicing is not needed (nothing is sold to them).

## FR-029: Ad serving, targeting, house ads and tracking

- **Priority:** Must (client priority) · **Milestone:** M2
- **User story:** As the client, I want a cheap, privacy-safe ad core so that I can pitch sponsors as soon as users exist.
- **Requirements**
  - R-029.1 Fixed slots: feed (every N cards), lost-pet detail, reunited screen, web sidebar. No slot exists in report-lost or report-found flows (enforced by API and test).
  - R-029.2 Targeting by statistical region or municipality and by species; dates; status; fair rotation between matches.
  - R-029.3 House ads (supporter, partner with us, adopt) fill every empty slot. Blocklist: no ads that sell, give away or rehome animals (the ad-space provider must verify marking data for pet ads).
  - R-029.4 Impressions and clicks aggregated per ad, slot, day, region in our DB with no user identifiers, cookies or device storage; clicks via counting redirect, `rel="sponsored"`. This DB is the source of truth for sponsor reports.
  - R-029.5 Slovenian regions (12) and municipalities (212) loaded as open reference data (licence checked).
- **Acceptance criteria**
  - [ ] Given a sponsor ad for Gorenjska/dogs, when a Ljubljana cat owner opens a slot, then a house ad is returned.
  - [ ] Given any request for a report-flow slot, when made, then the API refuses.
  - [ ] Given 100 impressions and 5 clicks, when queried, then the DB shows 100 and 5 for that ad, slot and day.
- **Edge cases**
  - No location known: use language and house ads only.
  - Impressions are rendered counts, not viewability (A-016).

## FR-030: Ad placements

- **Priority:** Must · **Milestone:** M2
- **User story:** As a sponsor, I want a clearly labelled, trusted placement so that users respond to it.
- **Requirements**
  - R-030.1 Label "Oglas" (EN "Ad") on every ad including paid vet lines on posters; distinct but calm styling; never first in a feed, never adjacent to another ad; paid clinics are never called nearest unless truthful.
  - R-030.2 One slot on lost-pet detail ("nearest 24h vet", "pet shop near you"), one on the reunited screen, one in the web sidebar (≥ lg).
  - R-030.3 Alt text, keyboard focus, `rel="sponsored noopener"`, 44 px targets, reserved size (CLS budget); silent collapse on failure.
  - R-030.4 No ads on report-lost, report-found, sign-in, chat or payment screens.
  - R-030.6 Premium users get no ads and no house ads; slots collapse.
  - R-030.5 Events `ad_impression`, `ad_click` to GA4 with consent; DB counts always (R-029.4).
- **Acceptance criteria**
  - [ ] Given the feed, when 9 cards are shown with N = 8, then one "Oglas" card appears after card 8.
  - [ ] Given the excluded routes, when rendered, then no ad is present (automated).
  - [ ] Given consent is denied, when an ad is shown, then no GA event is sent and the DB still counts.
- **Edge cases**
  - Ad blockers hide slots: layout must not break.

## FR-031: Ad management in admin

- **Priority:** Must · **Milestone:** M2
- **User story:** As an admin, I want to create and schedule ads and see their results so that I can run campaigns by hand.
- **Requirements**
  - R-031.1 Create/edit: image with required alt, title, text, https link, languages, slots, region or municipality, species, dates, status; live preview per slot.
  - R-031.2 Validation: missing alt, non-https, wrong image size, overlapping dates in an exclusive slot, animal sale or give-away content.
  - R-031.3 Per-ad stats (impressions, clicks, CTR by day, slot, region) and CSV export.
  - R-031.4 Manage the three house ads; every change audit-logged.
- **Acceptance criteria**
  - [ ] Given an ad without alt text, when saved, then it is rejected.
  - [ ] Given an active ad, when opened, then CTR per day is shown and exportable.
  - [ ] Given an edit, when saved, then it appears in the audit log.
- **Edge cases**
  - Ending an ad mid-day keeps its stats; deleting is soft.

## FR-032: Partners page "Oglašujte pri nas"

- **Priority:** Must · **Milestone:** M2
- **User story:** As a company, I want to see the audience and placements and contact the team so that I can decide to advertise.
- **Requirements**
  - R-032.1 Public SL/EN page: pitch, formats and slots (media kit), live audience stats (users, active reports, reunions by region), contact form.
  - R-032.2 Stats from our DB, optionally enriched from the GA Data API behind a flag; cached ≤ 1 h; values < 5 shown as "< 5".
  - R-032.3 Contact form: validated, captcha, rate limit, lead stored for admins and emailed to the client, explicit consent to be contacted.
  - R-032.4 Honest when small: no invented numbers; shows pilot status.
- **Acceptance criteria**
  - [ ] Given the DB has 12 users in a region, when the page loads, then that figure shows as "12" and fewer than 5 as "< 5".
  - [ ] Given a valid enquiry, when submitted, then the lead is visible in admin and an email is sent.
  - [ ] Given SL and EN, when switched, then final copy appears in both.
- **Edge cases**
  - GA Data API unavailable: stats fall back to DB-only.

## FR-033: Self-serve ads and invoicing

- **Priority:** Could · **Milestone:** M6 (post-launch)
- **User story:** As a sponsor, I want to book and pay for slots myself so that I do not depend on an admin.
- **Requirements**
  - R-033.1 Sponsor account, availability and price by region, species, slots and dates; creative upload; admin approval.
  - R-033.2 Card payment (Stripe) and Stripe invoices with VAT; founding-partner pricing; VAT ID validation.
  - R-033.3 Sponsor reports from our DB.
- **Acceptance criteria**
  - [ ] Given an approved paid booking, when its start date arrives, then the ad goes live.
  - [ ] Given an invoice booking, when issued, then payment status updates the booking.
  - [ ] Given a running campaign, when the sponsor opens reports, then impressions and clicks are shown.
- **Edge cases**
  - Overbooked slots are blocked at checkout.

## FR-034: Privacy rights: export and delete

- **Priority:** Must · **Milestone:** M3
- **User story:** As a user, I want to download or erase my data so that I control it.
- **Requirements**
  - R-034.1 Self-service export (JSON/ZIP) of profile, pets, photos, reports, sent messages, settings, payment metadata and consents within 5 minutes.
  - R-034.2 Account deletion with re-authentication: disabled at once, data erased or anonymised within 30 days; minimal legal retention (payment records).
  - R-034.3 Data inventory register; a test fails if a store is not covered.
  - R-034.4 Anonymous reporters can delete their report and data from the manage link.
- **Acceptance criteria**
  - [ ] Given an export request, when processed, then a file with all registered data stores is downloadable.
  - [ ] Given a deletion, when confirmed, then open reports are closed and the account cannot sign in.
  - [ ] Given a new table without register entry, when CI runs, then it fails.
- **Edge cases**
  - Organisation owners must transfer or delete the organisation first.

## FR-035: Public site, SEO and legal pages

- **Priority:** Must · **Milestone:** M1 (shell), M2 (copy, drafts), M5 (SEO, final legal)
- **User story:** As a visitor, I want clear, trustworthy pages in my language so that I know how to use the service and how my data is handled.
- **Requirements**
  - R-035.1 Header, footer (About, Safety tips, Partners, Privacy, Cookies, Terms, Imprint, Accessibility, Cookie settings), skip link, responsive layout, reserved sidebar slot.
  - R-035.2 Final SL/EN copy: home, how it works, safety tips (scam awareness), FAQ, For shelters.
  - R-035.3 Legal pages SL/EN (see Content, SEO and legal); drafts M2, final M5.
  - R-035.4 SEO routes (M5, shelter pages M3): plural phrase hubs /izgubljene-zivali/{lokacija}, /izgubljeni-psi/…, /izgubljene-macke/…, /najdene-…; /zavetisca/{slug} (AnimalShelter JSON-LD); /nasveti/{slug} with the cat-chipping guide /nasveti/cipiranje-mack live before 1 Jan 2027; /r/{code} for listings. Index rules: national, regional and the 12 city hubs; other locations only with ≥ 3 open listings; structured data, sitemap, robots, hreflang.
- **Acceptance criteria**
  - [ ] Given any page, when rendered, then footer links to every legal page resolve.
  - [ ] Given a regional page, when crawled, then it has unique title, description and valid structured data.
  - [ ] Given a legal page, when published before review, then it is marked "requires client/legal review".
- **Edge cases**
  - Language fallback: untranslated EN page shows SL with a notice (should not occur; CI check).

## FR-036: Slovenian and English

- **Priority:** Must · **Milestone:** M1
- **User story:** As a user, I want the product in Slovenian or English so that I understand it under stress.
- **Requirements**
  - R-036.1 SL default; EN second; choice persists; language-aware public URLs with hreflang.
  - R-036.2 ICU plurals with SL one/two/few/other; SL date, time, number and EUR formats.
  - R-036.3 CI fails on missing keys; server text (notifications, emails) in recipient language.
- **Acceptance criteria**
  - [ ] Given "2 reports" in SL, when rendered, then the dual form is used.
  - [ ] Given a missing EN key, when CI runs, then it fails.
  - [ ] Given an email to an EN user, when sent, then it is in English.
- **Edge cases**
  - Breed names localised; unknown fall back to "Mixed / Unknown".

## FR-037: Native app capabilities

- **Priority:** Must · **Milestone:** M1 (shell), M5 (release candidate)
- **User story:** As a mobile user, I want a fast native app with camera, location, push and links that open in the app.
- **Requirements**
  - R-037.1 Tab navigation (Map, Report, Inbox, Profile) for signed-in and out users; prominent Report action.
  - R-037.2 Universal and app links for listings and poster QR; web fallback.
  - R-037.3 Permission primers before camera, location, notifications; denial leaves a working fallback.
  - R-037.4 Push token lifecycle; EAS development, preview and release profiles; store submission out of scope (Q-007).
  - R-037.5 Offline tolerance: cache of nearby reports (FR-041), queue for found and sighting reports (FR-042) and local proximity alerts (FR-043).
- **Acceptance criteria**
  - [ ] Given a listing link on a phone with the app, when tapped, then the report opens in the app.
  - [ ] Given location denied, when reporting, then manual pin works.
  - [ ] Given no connectivity, when a found report is submitted, then it is queued and sent when online.
- **Edge cases**
  - Without the app installed, the link opens the web page.

## FR-038: Analytics (GA4 and Firebase)

- **Priority:** Must · **Milestone:** M1 (foundation), per-feature events in M2–M4
- **User story:** As the client, I want product and audience analytics so that I can decide and pitch sponsors with data.
- **Requirements**
  - R-038.1 GA4 on web and Firebase Analytics on mobile, one property, separate data streams; mock adapter locally.
  - R-038.2 Consent Mode v2: all four signals denied by default; no GA script or analytics cookie before consent (FR-039).
  - R-038.3 Typed taxonomy through one `track()`: `report_lost_start`, `report_lost_submit`, `report_found_start`, `report_found_submit`, `match_suggested`, `match_confirmed`, `chat_started`, `reunited`, `boost_purchase`, `donation`, `supporter_subscribe`, `ad_impression`, `ad_click`, `share`, `poster_download`, `alert_opt_in`.
  - R-038.4 Dimensions: region or municipality and species. No names, emails, chip numbers, exact locations or free text; unit test on allowlisted parameters.
  - R-038.5 Ad impressions and clicks are also stored in our DB (FR-029); GA is for audience, funnels and geography.
  - R-038.6 GA4 setup checklist: custom dimensions, key events, 14-month retention, Google signals off, data sharing off.
- **Acceptance criteria**
  - [ ] Given consent not granted, when browsing, then no request to Google is sent and no `_ga` cookie exists.
  - [ ] Given consent granted, when a lost report is submitted, then `report_lost_submit` is received with region and species.
  - [ ] Given an event with a non-allowlisted parameter, when `track()` is called, then it is rejected in tests.
- **Edge cases**
  - Server-originated milestones (a match created while the user is away) are logged in our DB; `match_suggested` is sent to GA only when the user views the suggestion in a consenting session.

## FR-039: Consent management

- **Priority:** Must · **Milestone:** M1
- **User story:** As a visitor, I want a clear choice about analytics so that my privacy is respected.
- **Requirements**
  - R-039.1 Banner (web) and sheet (mobile) with Accept all, Reject all, Customise at equal weight; nothing pre-selected; categories: strictly necessary, analytics.
  - R-039.2 Rejecting or ignoring keeps Consent Mode denied (GA4 may model conversions).
  - R-039.3 Stored: choice, version, timestamp; changeable from the footer and app settings as easily as given.
  - R-039.4 Re-ask after 12 months or when vendors or purposes change.
  - R-039.5 WCAG 2.2 AA, focus-managed, SL/EN.
- **Acceptance criteria**
  - [ ] Given a first visit, when the banner shows, then Accept and Reject are the same size and prominence.
  - [ ] Given a withdrawn consent, when saved, then analytics stops at once and cookies are cleared.
  - [ ] Given consent version bumps, when the user returns, then the banner reappears.
- **Edge cases**
  - Ad impression and click counting in our DB is aggregate and cookieless, so it does not need consent (A-016).

## FR-040: Marketing and go-to-market plan

- **Priority:** Could · **Milestone:** M5 (startable any time; no code)
- **User story:** As the client, I want a go-to-market plan so that I can start outreach and grow users, listings and sponsors.
- **Requirements**
  - R-040.1 `docs/07-marketing-plan.md`: positioning and messaging (SL/EN), launch phases (pilot region to Slovenia), channels and partners (Radio Aktual Živalski radio, Mr. Pet, K9 iskanje pogrešanih, pet insurers; December fireworks campaign; Facebook lost-pet groups and admins, shelters and vets as distribution, SEO landing pages, Instagram and TikTok success stories, local media and PR, municipalities, influencers and pet communities).
  - R-040.2 Sponsor and Vet Partner pitch and an outreach list template.
  - R-040.3 Referral and word-of-mouth loop; 3-month content calendar; budget scenarios EUR 0 / 500 / 2000.
  - R-040.4 KPIs tied to GA4 events and DB metrics.
- **Acceptance criteria**
  - [ ] Given the plan, when reviewed, then every channel has a goal, actions, owner and KPI.
  - [ ] Given the KPIs, when listed, then each maps to an existing event or metric.
- **Edge cases**
  - Budget EUR 0 scenario relies on community, shelters and SEO only.

## FR-041: Offline cache of nearby reports (mobile)

- **Priority:** Should · **Milestone:** M2 (data layer from the start)
- **User story:** As a user outdoors with weak signal, I want the map and list to keep working so that I can still check nearby lost and found animals.
- **Requirements**
  - R-041.1 While online, cache active lost and found reports around the home area and the current area: thumbnails and public fuzzed locations only; default limits 50 MB and 7 days.
  - R-041.2 Offline, map and list show cached reports with a clear "offline, last updated …" state; connection-only actions explain why they are unavailable.
  - R-041.3 Never cached: exact locations, chip numbers, contact data, chat. Cache wiped on logout, account deletion and on request.
  - R-041.4 Incremental, battery- and data-friendly refresh; closed, hidden and expired reports removed.
- **Acceptance criteria**
  - [ ] Given airplane mode, when the map opens, then cached reports show with a last-updated label.
  - [ ] Given a logout, when it completes, then the cache is empty.
  - [ ] Given a cache dump, when inspected, then it holds only public fuzzed locations.
- **Edge cases**
  - Cache full: oldest and farthest reports are evicted first.
  - First launch offline: empty state with explanation.

## FR-042: Offline queue for found and sighting reports (mobile)

- **Priority:** Should · **Milestone:** M2
- **User story:** As a finder without signal, I want to create a report now and have it sent later so that the owner can still be reached.
- **Requirements**
  - R-042.1 Found and sighted reports (photo, GPS, capture time) can be created offline and show "waiting to send".
  - R-042.2 Automatic send on reconnect with idempotency keys; original capture time used for matching; manage link shown after sending.
  - R-042.3 Failures show a reason with retry or delete; nothing is lost silently.
- **Acceptance criteria**
  - [ ] Given no connectivity, when a found report is completed, then it is stored and shown as waiting to send.
  - [ ] Given connectivity returns, when the app is open, then it is sent once, even if the send is retried.
  - [ ] Given a rate-limit or captcha failure, when sending, then the user sees the reason and can retry.
- **Edge cases**
  - App killed while offline: the queue survives and sends on next launch.
  - Lost reports need an account and a connection to submit (not queued in this phase).

## FR-043: Local proximity alerts (mobile)

- **Priority:** Should · **Milestone:** M3
- **User story:** As a community member, I want a gentle alert when I am near where a pet was last seen so that I can keep an eye out, even offline.
- **Requirements**
  - R-043.1 Explicit opt-in with a primer for background ("Always") location; everything else works if declined.
  - R-043.2 OS geofences around cached lost-pet areas, nearest and most recent first, within OS limits (about 20 regions on iOS); no continuous GPS.
  - R-043.3 On entry, a local notification ("You are near where Maks was last seen yesterday, keep an eye out") with a deep link.
  - R-043.4 Quiet hours, daily cap (default 3), each pet once per area, easy off switch removing all geofences.
  - R-043.5 Only public fuzzed areas monitored; location never uploaded.
- **Acceptance criteria**
  - [ ] Given opt-in and a cached area, when the user enters it offline, then a local notification appears once.
  - [ ] Given 20 cached areas on iOS, when registering, then only the nearest and most recent are registered.
  - [ ] Given the toggle off, when saved, then all geofences are removed.
- **Edge cases**
  - Permission downgraded by the OS: feature disables itself with an explanation.
  - Reunited or closed report: geofence removed on next refresh.

## FR-044: Responsible-shelter directory

- **Priority:** Must · **Milestone:** M2 (data and API), M3 (admin editing, public pages)
- **User story:** As an owner or finder, I want to reach the shelter that is responsible for my municipality so that I can meet my reporting duty and get help fast.
- **Requirements**
  - R-044.1 Directory mapping the 212 municipalities to the 17 registered shelters (name, address, phone, opening hours, website, source, last verified), public data without personal data, available online and in the offline cache.
  - R-044.2 Powers the post-submit checklists and call buttons in FR-005 and FR-006.
  - R-044.3 Editable in the admin console, versioned and audit-logged; reminder to refresh yearly after 31 March.
  - R-044.4 Public pages /zavetisca/{slug} and an index with municipality search, AnimalShelter structured data, SL/EN (the strongest SEO asset).
  - R-044.5 Unknown or unconfirmed municipality: say so, never show a wrong number.
- **Acceptance criteria**
  - [ ] Given a municipality, when the directory is queried, then the responsible shelter and its phone are returned.
  - [ ] Given an admin edit, when saved, then it is versioned and visible in the app at once.
  - [ ] Given /zavetisca/{slug}, when crawled, then valid AnimalShelter JSON-LD is present.
- **Edge cases**
  - Shelters serving several municipalities appear on each municipality result.

## FR-045: Lawyer briefing pack

- **Priority:** Must · **Milestone:** M5 (start now for lead time)
- **User story:** As the client, I want one document a Slovenian lawyer can review quickly so that legal sign-off (Q-013) does not delay launch.
- **Requirements**
  - R-045.1 `docs/legal/lawyer-briefing.md`: what the app does and the legally relevant features (anonymous found reports, location blurring, on-device geofencing, AI photo analysis, chat, payments, reward escrow, ads and Vet Partner, shelter data uploads).
  - R-045.2 Data flows and processors with locations (Supabase EU, Hetzner, Cloudflare R2, Stripe, Anthropic, Voyage, Brevo, Google/GA4/Firebase, Expo); links to `docs/content/legal/` drafts.
  - R-045.3 All open legal questions consolidated (content legal notes, `discovery/regulatory.md`, delivery-plan risks) each with our proposed answer; DPIA outline, draft retention table, DPA checklist; client decisions list.
  - R-045.4 Marked "not legal advice; for lawyer review".
- **Acceptance criteria**
  - [ ] Given the briefing, when a lawyer reads it, then features, flows, processors, open questions, DPIA outline, retention table and DPA checklist are all present.
  - [ ] Given a legal draft in docs/content/legal/, when checked, then the briefing links it.
- **Edge cases**
  - Features change after the briefing is sent: the document is versioned and the delta is flagged.

## FR-046: Fiscal invoices for card payments

- **Priority:** Must for live payments · **Milestone:** M2
- **User story:** As the operator, I want card payments invoiced in line with Slovenian fiscal rules so that going live is lawful.
- **Requirements**
  - R-046.1 The client's accountant decides whether online card payments (Boost, Premium, tips/contributions, Vet Partner) need fiscally verified invoices (davčno potrjevanje računov, ZDavPR: payment cards count as cash); decision recorded (Q-012).
  - R-046.2 If required: verification through a FURS-certified provider API behind an adapter with a mock; ZOI and EOR on the receipt email and PDF; retry on failure; premises/device registration note in the runbook.
  - R-046.3 Every invoice shows a VAT 22 % breakdown.
  - R-046.4 Live payments are blocked by config until this is done or the decision is "not required" (extends R-020.2).
- **Acceptance criteria**
  - [ ] Given a succeeded payment and "required", when invoiced, then ZOI and EOR appear on the receipt and a failed verification is retried.
  - [ ] Given any invoice, when issued, then VAT 22 % is itemised.
  - [ ] Given live mode without a recorded decision or a finished story, when enabled, then it is refused.
- **Edge cases**
  - Refunds need a fiscally verified credit note when verification applies.

# Non-functional requirements

| ID | Area | Requirement | Target / measure |
|---|---|---|---|
| NFR-PERF | Performance | Public web pages (home, detail, partners): Lighthouse mobile performance, LCP, JS weight. Map page heavier | ≥ 90 (map ≥ 80) · LCP < 2.5 s · initial JS < 250 KB gz (map excluded) |
| NFR-LAT | Latency | Match suggestion stored after report save; push after suggestion; chat delivery; nearby alert fan-out; image upload per photo on 4G | < 2 min p95 · < 60 s p95 · < 2 s p95 · < 60 s per 1000 · < 10 s |
| NFR-A11Y | Accessibility | WCAG 2.2 AA (EAA), keyboard, VoiceOver and TalkBack; outdoor contrast; map always has a list alternative; reduced motion | axe: 0 violations · body text ≥ 4.5:1 · primary actions ≥ 7:1 · targets ≥ 44 px |
| NFR-SEO | SEO | Titles/meta, structured data, sitemap, hreflang on public pages; closed/hidden reports noindex | Lighthouse SEO ≥ 95 |
| NFR-SEC | Security | RLS on every table; captcha and rate limits on anonymous endpoints; hashed API keys; SSRF-safe fetches; webhook signatures; admin strong auth. See `05-quality-security-plan.md` | RLS test matrix green · 0 high/critical findings at launch |
| NFR-PRIV | Privacy and consent | GDPR: EU region (Frankfurt); fuzzed public location; no PII in analytics; consent before analytics; export and delete; retention: chat 6 months after close, closed-report photos and locations 12 months, payment records as legally required | 0 analytics requests without consent · export < 5 min · deletion ≤ 30 days |
| NFR-BROWSER | Browsers and devices | Latest 2 versions of Chrome, Edge, Firefox, Safari; iOS and Android via Expo (minimum OS versions set by the Expo SDK, confirmed in the TDD) | No blocking defects on spot checks |
| NFR-I18N | Language | SL default, EN second; ICU plurals incl. SL dual; SL formats; translation completeness check in CI | 100 % keys translated; CI gate |
| NFR-AVAIL | Availability | Monthly uptime; daily backups; restore drill; staging and production environments | 99.5 % · RPO ≤ 24 h · RTO ≤ 8 h |
| NFR-SCALE | Capacity | Pilot sizing: 5k monthly users, 2k open reports, 50k photos; design for 10× | Map 500 pins < 2 s; embedding search 50k photos < 300 ms |
| NFR-AI | AI cost and safety | 1 vision call and 1 embedding per photo, cache by image hash, per-device daily limit, monthly budget, fail open; no PII to providers; mock for local use | Cost per report ≤ EUR 0.05 · 0 requests above cap |
| NFR-DEVX | Developer experience | One-command local stack without cloud credentials; mocked AI, Stripe, email, push, analytics; contracts first | Fresh clone to running apps < 15 min |
| NFR-QUAL | Quality gates | CI on every PR: lint, types, unit, e2e smoke, axe, Lighthouse budgets, dependency and secret scan | All green to merge |
| NFR-OFFLINE | Offline and cache privacy | Mobile cache holds only public fuzzed data and thumbnails, size and age limited, wiped on logout; offline states are explicit; queued reports are idempotent | 0 exact locations in cache · 50 MB / 7 days defaults · 0 duplicate sends |
| NFR-BATT | Battery | OS geofencing only (no continuous GPS), incremental background refresh, caps on alerts | No background location use unless opted in · alerts ≤ 3/day |
| NFR-OBS | Observability | Error tracking with PII scrubbing, uptime checks, structured logs, runbook | Alert within 5 min of outage |

# Content, SEO and legal requirements

- **Content (Content Strategist):**
  - Tone: warm, calm, hopeful, trustworthy; never cutesy-chaotic. SL is the source language, EN translated; native Slovenian review before sign-off.
  - Final copy (no placeholders) for: home, how it works, safety tips and scam awareness, FAQ, For shelters, Partners page (pitch, formats, media kit), "Where your money goes", success stories page, shelter onboarding kit (SL guide, CSV template, FAQ), house-ad creatives (supporter, partner with us, adopt), consent banner, notification and email templates, error and empty states.
  - Alt text for every image; ad images require alt text in admin.
  - A tone-of-voice guide and SL/EN glossary exist before copy work (M1).
- **SEO:**
  - New site: no legacy URLs, so no 301 redirect map. `discovery/redirects.csv`: N/A — no existing site, no discovery audit.
  - Keyword focus per public page (for example izgubljen pes, najden mačka, izgubljena mačka Ljubljana); regional and species landing pages; unique titles and descriptions; hreflang SL/EN.
  - Structured data on detail pages and Organization data on the home page; XML sitemap with fresh listings; robots.txt; closed or hidden reports noindex or 410.
  - Open Graph images for listings, never showing exact or holding location.
  - Structured data: Organization on the home page; AnimalShelter on /zavetisca pages (an exception to LocalBusiness being N/A); no LocalBusiness for the product itself.
- **Ads and commercial labelling:**
  - Every ad labelled "Oglas" (EN "Ad"); links `rel="sponsored noopener"`; no ads in the report-lost, report-found, sign-in, chat or payment screens.
  - Wording for contributions: "podpora / prispevek". "Donacija" and charity wording only if a qualifying non-profit entity operates the service (Q-008).
- **Legal (EU, drafts marked requires client and legal review):**
  - Privacy policy: data categories (account, pet, photos, location, chat, payments, ad counters, analytics), purposes and legal bases, retention, processors and transfers (Supabase, Vercel, Stripe, AI provider, Google Analytics and Firebase), user rights, contact.
  - Cookie policy: strictly necessary storage and GA4/Firebase identifiers (such as `_ga`) with purpose, duration and consent mechanism.
  - GDPR consent: Consent Mode v2 with all four signals denied by default; no analytics before consent; consent record with version and timestamp; withdrawal as easy as giving; re-ask after 12 months. Our own ad counting is aggregate and cookieless.
  - Terms of use: acceptable use, scams, finder rewards and escrow, boosts, subscriptions and contributions, ad labelling, shelter terms, liability.
  - Imprint: company legal details supplied by the client (name, address, registration and VAT numbers, contact).
  - Accessibility statement (European Accessibility Act): conformance level, known gaps, date, feedback contact; updated after the M5 audit.
  - To verify before public launch: animal-protection rules and shelter holding periods (Q-006), payment-services regulation for reward escrow (Q-011), VAT and accounting treatment of contributions, dohodnina eligibility (Q-008).

# Scope

| | Features |
|---|---|
| **MVP** (M1–M2) | Responsible-shelter directory and post-submit checklists; Offline cache and offline report queue (mobile); monorepo, design system, UI kit, SL/EN, auth, analytics (GA4/Firebase) and consent; pet profiles, photos, location with fuzzing; report lost; report found without account; map, list, detail; matching v1 and review; chat; notifications and nearby alerts; poster and sharing; reunited and lifecycle; abuse reporting; admin shell; payments core (Stripe test); Reunited tip and report contribution; ads (serving, placements, admin, Partners page); public copy and legal drafts |
| **Version 1** (M3–M5) | AI pre-fill; image-similarity matching; organisations and shelter portal (bulk, CSV, matches, chip lookup); sighting trail; local proximity alerts (mobile geofences); export and delete; subscriptions; boost; Premium (incl. AI extras, ad-free); Podpornik; reward escrow; free shelter tools (API, analytics, municipality reports, adoption page); Vet Partner; transparency page; moderation queue and image screening; KPI dashboard; security, accessibility and performance audits; observability and backups; SEO pages; success stories; final legal pages; pilot onboarding kit; mobile release candidate builds |
| **Future** | Self-serve ad booking and Stripe invoicing, founding-partner pricing (M6); IAP or RevenueCat for mobile purchases; social auto-posting for boosts; privacy-first pet tags (redesign); chat photo attachments; CRHŽ integration (needs an agreement); server-side GA tagging; more species, countries and languages; vets, shop and insurer partnerships beyond ads |
| **Out of scope** | Species other than dogs and cats; countries other than Slovenia; live payments; App Store and Play Store submission; QR/NFC pet tags (physical and printable); official CRHŽ integration |

# User flows

    Report lost (owner)
    Home / Report → pick saved pet or enter details → photos (AI pre-fill from M3) → place + radius → date/time → [sign in or sign up if needed]
      → submit → confirmation (poster, share, alerts, optional contribution) → matching + nearby alerts run

    Report found without account (finder)
    Report found → photo → location (GPS/EXIF) → "I have it" / "I saw it" → submit → live + private manage link
      → matching runs → owner confirms → chat via manage link → returned → mark closed

    Browse (anyone)
    Map ⇄ List (filters) → report detail → Contact (chat) | Share | Poster | Report abuse | "I saw this pet" → ad slots only on feed, detail, reunited, sidebar

    Matching and confirm
    New report → matching v1 (chip, geo, time, attributes) [+ v2 photo similarity] → suggestion stored (≤ 2 min)
      → owner notified → review (photos, reasons) → confirm → chat opens | reject → hidden for good

    Chat to reunion
    Chat (safety banner) → agree meeting off-app → owner marks Reunited → thank-you screen (tip, ad slot, story consent) → report closed

    Alerts
    Set home area + radius + species → opt in → new lost report nearby → push/in-app alert (cap per day) → open listing → sighting or share

    Shelter portal
    Register organisation → admin verifies → bulk photos or CSV → intake animals published as FOUND
      → matching vs open lost reports → probable owners → contact owner (chat) → mark returned

    Chip lookup (shelter/vet)
    Enter chip → registered with us: owner notified, nothing personal shown | not found: a vet or the responsible shelter reads the chip

    Monetisation (Stripe test)
    Boost: lost report → Boost → Checkout → wider alerts + top of list
    Premium / Podpornik: plan page → Checkout → entitlement → manage in Stripe portal
    Vet Partner: verified vet org → plan page → Billing Checkout (VAT invoice) → clinic profile, featured slot, alert/poster line, monthly report
    Reward: confirmed chat → fund reward → reunion confirmed → release (fee) → finder paid via Connect

    Ads
    Admin creates ad (region, species, dates) → slot request with context → sponsor ad or house ad → DB counts impression/click
      → admin exports sponsor report

    Moderation
    Report abuse → queue → moderator: dismiss | hide | warn | suspend | ban → audit log → notify

    Consent
    First visit → banner (Accept / Reject / Customise) → Consent Mode update → analytics on or off → change later via Cookie settings

# Assumptions

- A-001: Working name "Izgubljene živali" stays until the design team's proposal is approved (Q-001).
- A-002: Anonymous found reports are allowed with captcha and rate limits; no phone verification (Q-003 default).
- A-003: The public CRPsi lookup was closed in June 2026 and the register is now CRHŽ; we do not link to it. A vet or the responsible shelter reads the chip. A future public lookup stays behind config (Q-004).
- A-004: Shelter holding period default is 8 days after placement (the owner may demand return; after 8 days the shelter may rehome); configurable; the product states no other legal rules before review (Q-006).
- A-005: Cloud credentials (Q-002 hosting: Hetzner VPS, Supabase Free for DB and Auth, R2 storage, Stripe; Q-007 Apple, Google, Firebase push) are pending; everything is built and tested locally first; deploy, push delivery and real GA4/Firebase data wait for them.
- A-006: Pilot regions Ljubljana (shelter Gmajnice) and Maribor; 2–3 shelters onboarded by hand (Q-005).
- A-007: Prices are test-mode placeholders from the client monetisation model (brief v0.8), configurable: Boost EUR 4.99 fixed (7 days); Premium EUR 2.99 per month or EUR 24.99 per year (includes 1 free Boost per year); Podpornik from EUR 2 per month (user chooses); support amounts EUR 3 / 5 (highlighted) / 10 / custom with a EUR 2 minimum (Stripe fees of about EUR 0.25 + 1.5 % and store cuts eat most of a EUR 1 payment); Vet Partner EUR 39 per month (B2B); escrow fee 5 %.
- A-008: Free forever (P-1): reporting, matching, chat, alerts in the default radius, poster, 1 saved pet profile. The pet-profile limit never blocks a lost report.
- A-009: Fuzzing defaults: LOST ≥ 500 m, FOUND/SIGHTED ≥ 150 m, configurable.
- A-010: Matching defaults: threshold 0.5, top 10, found within 30 days after loss; tuned with pilot data.
- A-011: Lifecycle defaults: reminders at 7/14/30 days, auto-close at 90 days (lost), 30 days (found/sighted).
- A-012: Retention defaults (NFR-PRIV) are proposals for legal review.
- A-013: AI cost cap per report ≤ EUR 0.05 and per-device daily limits for anonymous users.
- A-014: Mobile purchases (tips, Boost, subscriptions) open web checkout in this phase; the App Store and Play rules on in-app purchase, including tips and donations to non-charities, are handled before any store submission (risk in the delivery plan).
- A-015: The client provides the GA4 property and Firebase project (Q-009); until then events go to the mock adapter.
- A-016: Ad impressions are rendered counts without viewability; counting is aggregate and cookieless; sponsor reports state this method.
- A-017: Premium is ad-free (Q-010 decided); Podpornik supporters still see ads.
- A-018: Dohodnina is deferred: the operating company can never qualify; a new society needs about 2 years; a partner-NGO model is an option (Q-008). "Donation" wording stays out until a qualifying non-profit exists.
- A-019: Reward escrow uses Stripe Connect (Stripe holds funds); live use needs legal review (Q-011).
- A-020: Region and municipality reference data come from Slovenian open data; licence to be verified.
- A-021: Minimum mobile OS versions follow the Expo SDK chosen in the TDD.
- A-022: Social auto-posting for boosts is deferred; Boost provides a share kit instead.
- A-023: Success stories require explicit opt-in consent and moderation.
- A-024: Shelters and municipalities are free forever; vets are free for reunite features and pay only for Vet Partner visibility (brief v0.5). Shelter Pro no longer exists.
- A-025: QR/NFC pet tags are out of scope (brief v0.7); the poster QR links to the public listing only.
- A-026: Vet Partner needs verified vet organisations (FR-015) and the ads infrastructure (FR-029..031); VAT invoices via Stripe Billing, company VAT ID collected.
- A-027: Offline cache defaults 50 MB and 7 days; geofence alerts default cap 3 per day; iOS allows about 20 monitored regions, Android has its own limit, so the nearest and most recent areas are chosen.
- A-028: The Always location permission is opt-in only, with a primer; store justification is prepared before store release (risk R-024).
- A-029: Legal timings (3 days / 72 h owner duty, 24 h find notice, 8-day holding) appear in the product only after legal confirmation, behind a content flag.
- A-030: The municipality-to-shelter directory (212 municipalities, 17 registered shelters) is refreshed yearly after 31 March.

# Glossary

| Term | Meaning |
|---|---|
| LOST / FOUND / SIGHTED | Report types: owner's missing pet; animal found and held or known; animal only seen |
| Match | System-suggested pairing of a LOST and a FOUND/SIGHTED report; states SUGGESTED, CONFIRMED, REJECTED |
| Chip match | Equal normalised microchip numbers; score 1.0 |
| Reunited | Owner and animal back together; report status REUNITED |
| Fuzzing | Showing an approximate area instead of the exact point |
| Manage link | Secret URL that lets an anonymous finder manage and chat on their report |
| CRHŽ / CRPsi | CRHŽ is the current central register of dogs and (from 2027) cats; the former public dog lookup CRPsi (Javni vpogled) was closed in June 2026 |
| Oglas | Slovenian for ad; mandatory label on sponsored placements |
| House ad | Own promotion shown when no sponsor ad matches a slot |
| Slot | Fixed ad position: feed, detail, reunited screen, web sidebar |
| Podpornik | Supporter: monthly voluntary contribution with a badge, no features |
| Boost | Fixed-price (EUR 4.99) 7-day visibility extension for a lost listing |
| Premium "Protect" | Owner subscription (EUR 2.99/month or 24.99/year): unlimited pets, AI extras, one-tap lost mode, 1 free Boost per year, ad-free |
| Vet Partner | Paid B2B plan for vets: clinic profile, featured nearest-vet slot, alert and poster mention, monthly report |
| Entitlement | Server-side right to a paid feature, derived from a subscription |
| Escrow | Reward held by Stripe until the owner confirms reunion |
| Dohodnina | Slovenian income tax; eligible non-profits can receive a share by taxpayer choice via eDavki |
| eDavki | Slovenian tax authority online portal |
| Društvo / zavod | Non-profit association / institute (possible eligible legal forms) |
| GA4 / Firebase Analytics | Google analytics for web / mobile, same property, separate streams |
| Consent Mode v2 | Google signals (analytics_storage, ad_storage, ad_user_data, ad_personalization) set by user consent |
| EAA | European Accessibility Act (WCAG 2.2 AA in this product) |
| IAP | In-app purchase required by Apple and Google for digital goods |
| RLS | Row-level security in Postgres |
| pgvector / PostGIS | Postgres extensions for vector similarity and geography queries |
| Embedding | Numeric vector describing a photo for similarity search |
| Statistical region / občina | Slovenia's 12 statistical regions and 212 municipalities used for ad targeting and stats |

# Change log

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-10-14 | Template |
| 0.2 | 2026-10-14 | Initial requirements from brief v0.2 plus client additions: voluntary support (tips, contribution, Podpornik, escrow fee, dohodnina, transparency page), early ads (M2) with Partners page, GA4/Firebase analytics and Consent Mode v2 as core from M1. FR-001…FR-039, NFRs, assumptions A-001…A-023 |
| 0.3 | 2026-10-15 | Brief v0.4-v0.7: Shelter Pro removed (FR-028 now free shelter tools + Vet Partner), explicit free-forever list (P-1, P-7), QR/NFC tags withdrawn (FR-027, P-8), new assumptions A-024..A-026 |
| 0.4 | 2026-10-15 | Brief v0.8 monetisation model: Boost EUR 4.99 fixed; Premium EUR 2.99/month or EUR 24.99/year with unlimited pets, AI extras (written listing and posts, poster designs, search plan), one-tap lost mode, 1 free Boost per year, ad-free (Q-010 decided: Podpornik not ad-free); free tier includes basic AI and up to 2 pet profiles; support asks after reunion, after report and on profile (EUR 3 / 5 / 10 / custom, min EUR 2); Vet Partner EUR 39; prices in A-007; FR-040 marketing plan (low priority) added |
| 0.5 | 2026-10-15 | Offline mode: FR-041 offline cache and FR-042 offline report queue (M2), FR-043 local proximity alerts (M3), NFR-OFFLINE, NFR-BATT, A-027, A-028 |
| 0.6 | 2026-10-15 | Discovery changes: CRPsi lookup closed, now CRHŽ (FR-002, FR-016, A-003); cats first (FR-002); post-submit checklists (FR-005, FR-006); new FR-044 shelter directory; holding period 8 days and found location/time capture (FR-015, A-004); dohodnina deferred (FR-024, A-018); no animal sale ads (FR-018, FR-029, FR-031); Vet Partner labelling (FR-028, FR-030); SEO routes (FR-035); share kit (FR-011); marketing partners (FR-040); backend wording per brief v1.0 (A-005) |
| 0.7 | 2026-10-15 | New FR-045 lawyer briefing pack (Q-013) and FR-046 fiscal invoices for card payments (Q-012) |
