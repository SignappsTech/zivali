source: docs/04-technical-design.md§Data model, ADR-010, ADR-020, ADR-022, ADR-023; FR-010, NFR-LAT

# C10 Notifications and nearby alerts

## Models (Prisma `prisma/schemas/notifications.prisma`, schema `app`)

```sql
notifications(id, user_id, type text, payload jsonb, read_at, dedupe_key text, created_at, unique(user_id, dedupe_key))
notification_prefs(user_id, type text, in_app bool default true, push bool default true, email bool default true, pk(user_id,type))
push_tokens(id, user_id, token text unique, platform text ('ios'|'android'), last_seen_at)
alert_subscriptions(id, user_id unique, center_point geography(Point), radius_km int check (radius_km between 1 and 25),
                    species species[] default '{dog,cat}', paused boolean default false, daily_cap int default 5, created_at, updated_at)
alert_deliveries(report_id, user_id, sent_at, channel, pk(report_id, user_id))
email_outbox(id, user_id, template, locale, to_address_hash, status ('queued'|'sent'|'failed'|'mocked'), provider_id, error, created_at)
```

## Types and channels

| Type | Payload (variables for `docs/content/notifications-and-emails.md`) | Quiet hours | Default channels | Category | Deep link |
|---|---|---|---|---|---|
| `match_chip` | `{ match_id, lost_code, other_code, other_type: 'found'|'sighted', has_name, pet_name?, species }` | ignored | in-app, push, email | search | `/r/<lost_code>/matches` |
| `match_suggested` | `{ match_id, lost_code, strength: 'good'|'strong', other_type, has_name, pet_name?, species }` | apply | in-app, push, email | search | same |
| `match_confirmed` | `{ conversation_id, report_code, species, report_type: 'found'|'sighted' }` | apply | in-app, push, email | search | `/inbox/<id>` |
| `chat_message` | `{ conversation_id, preview_alias (≤ 24 chars, alias or chosen display name), unread_count }` (no body) | ignored | in-app, push; email: one follow-up job 30 min after the first unread message of a streak (CH-161) | search | `/inbox/<id>` |
| `nearby_lost` | `{ report_code, species, distance_band, has_area, area_name? (public approximate area), reported_at, thumb_url: string \| null }` (`thumb_url`, TASK-22.8, CH-285: the public C5 thumbnail `photos.public_thumb_url` of the report's first published photo by `(position, id)`; `null` when it has none; never a private object or a signed URL; always present, stored in the inbox row and in `notification.created`; push data and email copy do not use it; source `AlertsDao.getAlertReport`, allowlist in `templates.ts`); email only: `{ has_vet_partner, clinic_name?, clinic_area?, clinic_url? (tracked click), ad_id?, unsubscribe_url }` | apply | in-app, push; email opt-in (default off) | alert | `/r/<code>` |
| `report_reminder` | `{ report_code, day: 7|14|30, has_name, pet_name?, species }` | apply | in-app, push, email | search | `/my-reports?r=<code>&action=keep|close|extend` |
| `report_expiring` | `{ report_code, report_type, days_left, has_name, pet_name?, species }` | apply | in-app, email | search / finder | same with action |
| `report_closed` | `{ report_code, report_type, idle_days, reopen_days, has_name, pet_name?, species }` | apply | in-app, email | search / finder | `/my-reports` |
| `report_hidden` | `{ report_code, report_type, support_email }` (no free-text reason) | apply | in-app, email | search / finder | `/my-reports` |
| `report_reunited` | `{ report_code, species }` | apply | in-app, push | search | `/r/<code>` |
| `manage_link` | `{ report_code, report_type: 'found'|'sighted', species, manage_url }` (email only, to `report_contacts`; transactional, not governed by prefs; URL in the recipient locale: `/m#token` or `/en/m#token`; **not** a `notify.send` job, see below) | n/a | email | finder | `/m#token` |
| `payment_receipt` | `{ payment_id, amount_cents, purpose, paid_at, receipt_ref, is_test }` (`is_test` when APP_ENV is not production or the provider is mock/test) | n/a | email, in-app | payment | `/account/payments` |
| `premium_renewal_reminder` (M4, TASK-52/54, C13; renamed from `premium_renewal`, nothing built yet, CH-648) | `{ renews_at, amount_cents, is_test }` (from daily `subscription.reminders`, 7 days before a yearly Premium renewal, once per period; transactional: sent even with notification switches off) | n/a | email only | payment | button to `/account` (C15); copy in docs/content/notifications-and-emails.md §2.13 (CH-639) |

The handler derives `has_name` (`yes`/`no`) and truncates `pet_name` to 18 and `preview_alias` to 24 characters; `species` may be `other` in copy for future-proofing. The email layout picks the footer reason line from the category (account, search, alert, finder, payment). Vet Partner fields are resolved from the report's region (M4) and never appear in push or in-app payloads. `unsubscribe_url` is a signed one-click link that turns the type's email channel off without sign-in.

Email-only types to unverified addresses are skipped (FR-010 edge). Text comes from i18n namespace `notifications` and `email` in the recipient's `profiles.locale`.

Prefs: every channel of every switchable type can be off, in-app for `match_*` and `chat_message` too; all channels off for a type = no inbox row, push or email.

**`manage_link` (as built, TASK-22.3, CH-160)**: the secret token must not land in `pgboss.job` and the recipient is `report_contacts`, so `NotificationsDomain.sendManageLink({ to, report_code, report_type, species, manage_token }, ctx)` emails directly with locale = `ctx.locale` and URL `/m#token` or `/en/m#token`. The caller passes only a confirmed address (FR-010).

**`chat_message` email (CH-161)**: one follow-up `notify.send` 30 min after the first unread message of a streak (job id fixed by user + conversation + `last_read_at`; `dedupe_key` `email:<conversation_id>`); it emails only if the source still reports `unread_count > 0`. Without a `dedupe_key`, or with in-app off, there is no inbox-based dedupe.

Web deep links of `report_reminder` as built (TASK-26.4, CH-439): `/moje-prijave?r=<code>&action=…`. `action=keep` and `action=extend` show the reminder note (`lifecycle.reminder_title` and `reminder_body`, or `report_found.expiry_note`) with one primary button (`lifecycle.reminder_keep` "Nadaljuj iskanje" / `report_found.extend`) and send the `extend` transition only when it is pressed (a link must not change state on load; the code is checked against the C1 ShortCode first). `action=close` opens the P14 reason dialog. An ended report says `lifecycle.already_closed`. The query is then dropped so a reload does not repeat it, and focus goes to the h1.

`payment_receipt` also needs a Premium purpose (monthly or yearly) before Premium checkouts send receipts; content writes that variant once the purpose exists (CH-648).

## Local proximity alerts (M3, TASK-87)

Not server notifications: the mobile app raises them locally from OS geofences around cached lost-report areas (C17). They are not stored in `notifications`, never upload location, use the profile quiet hours (cached on the device), a local daily cap (default 3) and once per pet per area. Category `nearby_local`; deep link `/r/<code>`.

## Producing notifications (API and worker)

`NotificationsDomain.enqueueNotification({ user_id, type, payload, dedupe_key? }, ctx)` sends pg-boss job `notify.send` (inside the caller's transaction when given). The `notify.send` handler: load prefs and quiet hours (`profiles.quiet_from/to`) → insert the inbox row (unique `user_id, dedupe_key`) → broadcast `notification.created` on `user:<id>` (ADR-023) → push (Expo adapter) and/or email (Brevo adapter, rendered with `@zivali/i18n` in the recipient locale) → record outcomes; `DeviceNotRegistered` deletes the token. Quiet-hour deferral re-sends the job with `startAfter` = end of quiet hours.

**Variable sources (as built, TASK-22.3, CH-159)**: `notify.send` holds ids + template only (TASK-6.17); the handler loads each type's copy variables (payload column above) from a per-type source in `apps/api/domains/notifications/sources.ts` (a source returning `null` = moot, the job is dropped). The owning features add their sources: matching (`match_*`), chat (`chat_message`: `preview_alias`, `unread_count`), lifecycle and moderation (`report_*`), alerts (`nearby_lost` incl. `distance_band`, `area_name`, `reported_at`), payments (`payment_receipt`). A type without a source fails its job; those tasks' packets say so. `NotificationJobPayload` gains `payment_id` (without it `payment_receipt` cannot be resolved). The handler also writes `alert_deliveries (report_id, user_id, channel)` in the inbox transaction; `alerts.fanout` only reads it (exclusion, daily cap) and never inserts (CH-160).

## REST (owned by TASK-22.3)

| Method and path | Guards | Request | Response |
|---|---|---|---|
| `GET /v1/notifications` | auth | `?cursor&limit` | `{ items: Notification[], next_cursor, unread }` |
| `POST /v1/notifications/read` | auth | `{ ids: uuid[] } | { all: true }` | `204`; `POST /v1/conversations/:id/read` (C9) also marks the caller's unread `chat_message` notifications for that conversation read, so clients re-fetch the inbox after it |
| `GET /v1/notification-prefs` | auth | - | `{ items: { type, in_app, push, email }[], quiet_from, quiet_to }`; lists the 10 switchable types (not `manage_link`, `payment_receipt`: transactional, `PUT` on them = `VALIDATION`); defaults all on except `nearby_lost` email (opt-in) (CH-161) |
| `PUT /v1/notification-prefs/:type` | auth | `{ in_app?, push?, email? }` | the pref |
| `POST /v1/push-tokens` | auth (incl. anonymous managers) | `{ token, platform: 'ios' | 'android' }` | `204` (upsert, `last_seen_at`) |
| `DELETE /v1/push-tokens` | auth | `{ token }` (body, so the token stays out of URLs and access logs) | `204` |
| `GET /v1/notifications/unsubscribe?token=` | none (signed one-click token) | - | HTML confirmation; turns that type's email off. Token `<user_id>.<type>.<HMAC(RATE_SALT)>`, no expiry; alert emails set `List-Unsubscribe` only. A state-changing GET can be triggered by mail link scanners: proposed follow-up = GET shows a confirm page, POST changes (RFC 8058, `List-Unsubscribe-Post`) (CH-162) |

Client (`@zivali/api/notifications`): `listNotifications`, `markRead`, `getPrefs`, `setPref`, `setQuietHours` (`PATCH /v1/me`), `registerPushToken`, `unregisterPushToken`, `subscribeInbox(onEvent)` (Realtime `user:<id>`; events `notification.created` and `conversation.updated`, payload `{ conversation_id, status, updated_at }`, defined in C9 §Realtime; `conversation.read` is on `conversation:<id>` only, payload `{ conversation_id, reader_id, last_read_message_id, read_at }`).

## Nearby alerts (owned by TASK-23.1)

| Method and path | Guards | Request | Response |
|---|---|---|---|
| `GET /v1/alert-subscription` | auth, not anonymous | - | `AlertSubscription | null` |
| `PUT /v1/alert-subscription` | auth, verified email | `{ center: { lat, lng }, radius_km (1–25), species: ('dog'|'cat')[] (0 to 2; empty = no nearby alerts), paused }` | `AlertSubscription` |
| `DELETE /v1/alert-subscription` | auth | - | `204` |

One home area (as built on mobile, TASK-23.3, CH-326): the subscription's `center`/`radius_km` follow the profile's `home`/`home_radius_km` (C3). The home-area picker (account row and alert settings) and the alert radius write both; turning alerts on uses the profile home, or opens the picker first when there is none. Web (TASK-23.2) does the same, else the account "Domače območje" row and the alert area disagree.

`AlertSubscription` = the request fields plus `daily_cap`, `created_at`, `updated_at`. The centre is stored coarsened (20–30 m, C6 §Storage) like every user location.

**No daily-cap setting (decision CH-325: drop, not add).** `PUT` takes no `daily_cap`, and P13 has no "Največ opozoril na dan" stepper on web or mobile (P13 1.3). The cap is the column default 5 (R-010.2), read by `findRecipients`; one reach rule for everyone keeps alerts calm and the free loop equal (P-1), and nobody has asked to raise or lower it. `daily_cap` stays in the response (read-only). The unused `alerts.cap_*` content keys go (content CHANGE).

`alerts.fanout { report_id }` on a visible LOST report: a parameterised `$queryRaw` in `alerts.dao.ts` `findRecipients` (not TypedSQL, as CH-117) finds subscriptions not paused, species match, `st_dwithin(center_point, public_point, radius_km*1000)` plus a constant 25 km `st_dwithin` so the GiST index is used (always `public_point`, never `exact_point`, CH-148), excluding the report's managers, users already in `alert_deliveries` for this report and users at their daily cap (default 5; = `alert_deliveries` in the last 24 h); an empty `species` list matches nothing (`= any(species)`; the DB check allows `'{}'`); chunks of 500 → `notify.send` type `nearby_lost` (dedupe `nearby:<report_id>`). At most 1 push per report per user. Pending deliveries for a report closed or reunited are dropped by the handler (status check); `notify.send` also drops a queued `nearby_lost` when the subscription no longer has the report's species. Fan-out writes `alert_deliveries` (channel `push`) together with the ids-only `notify.send` job in one transaction; `notify.send` resolves the variables or drops the alert via `AlertsDomain.nearbyAlert()`. Guards: `GET`/`DELETE` `rejectAnonymous`, `PUT` `requireVerified` (CH-178). Target: 1000 recipients < 60 s.

## Example

```json
{ "id": "n1…", "type": "match_chip", "payload": { "match_id": "m1…", "lost_code": "Pq7…", "other_code": "Hk3…" }, "read_at": null, "created_at": "…" }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-62: conversation.updated payload referenced (defined in C9) |
| 1.2 | 2026-10-15 | CH-76: DELETE /v1/push-tokens takes { token } in the body, not the path |
| 1.3 | 2026-10-18 | CH-493: conversation read marks `chat_message` notifications read (see C9); CH-504 (TASK-114.14): `species` may be empty (no nearby alerts), notify.send drops a queued nearby_lost on a species change, every channel of every switchable type can be off |
| 1.4 | 2026-10-18 | CH-148: alert matching on public_point; CH-159: per-type variable sources, payment_id; CH-160: manage_link sent directly, notify.send writes alert_deliveries; CH-161: chat_message email follow-up, prefs list; CH-162: unsubscribe token as built; CH-178: findRecipients as built (TASK-23.1) |
| 1.5 | 2026-10-18 | CH-326: subscription area follows the profile home area |
| 1.6 | 2026-10-19 | CH-610 (TASK-22.8, for CH-281/CH-285): `nearby_lost` payload gains `thumb_url` (public thumb or null) for the P13 48 px photo |
| 1.7 | 2026-10-19 | CH-635: `premium_renewal` (yearly renewal reminder, 7 days before) |
| 1.8 | 2026-10-19 | CH-648: type `premium_renewal_reminder` (email only, renamed from `premium_renewal`), Premium receipt purpose pending; CH-439: web reminder deep links as built |
| 1.9 | 2026-10-19 | CH-325: no `daily_cap` in `PUT /v1/alert-subscription` (dropped, as P13 1.3); the cap stays the default 5 |
