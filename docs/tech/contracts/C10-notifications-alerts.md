source: docs/04-technical-design.md§Data model, ADR-010; FR-010, NFR-LAT

# C10 Notifications and nearby alerts

## Tables

```sql
notifications(id, user_id, type text, payload jsonb, read_at, dedupe_key text, created_at, unique(user_id, dedupe_key))
notification_prefs(user_id, type text, in_app bool default true, push bool default true, email bool default true, pk(user_id,type))
profiles.quiet_from time null, profiles.quiet_to time null       -- Europe/Ljubljana; added by the notifications task
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
| `chat_message` | `{ conversation_id, preview_alias (≤ 24 chars, alias or chosen display name), unread_count }` (no body) | ignored | in-app, push; email after 30 min unread | search | `/inbox/<id>` |
| `nearby_lost` | `{ report_code, species, distance_band, has_area, area_name? (public approximate area), reported_at }`; email only: `{ has_vet_partner, clinic_name?, clinic_area?, clinic_url? (tracked click), ad_id?, unsubscribe_url }` | apply | in-app, push; email opt-in (default off) | alert | `/r/<code>` |
| `report_reminder` | `{ report_code, day: 7|14|30, has_name, pet_name?, species }` | apply | in-app, push, email | search | `/my-reports?r=<code>&action=keep|close|extend` |
| `report_expiring` | `{ report_code, report_type, days_left, has_name, pet_name?, species }` | apply | in-app, email | search / finder | same with action |
| `report_closed` | `{ report_code, report_type, idle_days, reopen_days, has_name, pet_name?, species }` | apply | in-app, email | search / finder | `/my-reports` |
| `report_hidden` | `{ report_code, report_type, support_email }` (no free-text reason) | apply | in-app, email | search / finder | `/my-reports` |
| `report_reunited` | `{ report_code, species }` | apply | in-app, push | search | `/r/<code>` |
| `manage_link` | `{ report_code, report_type: 'found'|'sighted', species, manage_url }` (email only, to `report_contacts`; transactional, not governed by prefs; URL in the recipient locale: `/m#token` or `/en/m#token`) | n/a | email | finder | `/m#token` |
| `payment_receipt` | `{ payment_id, amount_cents, purpose, paid_at, receipt_ref, is_test }` (`is_test` when APP_ENV is not production or the provider is mock/test) | n/a | email, in-app | payment | `/account/payments` |

The handler derives `has_name` (`yes`/`no`) and truncates `pet_name` to 18 and `preview_alias` to 24 characters; `species` may be `other` in copy for future-proofing. The email layout picks the footer reason line from the category (account, search, alert, finder, payment). Vet Partner fields are resolved from the report's region (M4) and never appear in push or in-app payloads. `unsubscribe_url` is a signed one-click link that turns the type's email channel off without sign-in.

Email-only types to unverified addresses are skipped (FR-010 edge). Text comes from i18n namespace `notifications` and `email` in the recipient's `profiles.locale`.

## Local proximity alerts (M3, TASK-87)

Not server notifications: the mobile app raises them locally from OS geofences around cached lost-report areas (C17). They are not stored in `notifications`, never upload location, use the profile quiet hours (cached on the device), a local daily cap (default 3) and once per pet per area. Category `nearby_local`; deep link `/r/<code>`.

## API

```sql
enqueue_notification(p_user_id uuid, p_type text, p_payload jsonb, p_dedupe_key text default null) returns void
-- inserts nothing itself; enqueues job 'notify' (C1). Safe to call inside any RPC or trigger.
```
`notify` handler: load prefs + quiet hours → insert inbox row (dedupe) → push (Expo, adapter) and/or email (Brevo, adapter) → record outcomes; invalid push tokens deleted. Quiet-hour deferral re-enqueues for `quiet_to`.

Client (`@zivali/api/notifications`):
```ts
listNotifications({ cursor?, limit? }) / unreadCount() / markRead(ids | 'all')
subscribeNotifications(onInsert)                        // realtime on notifications for auth.uid()
getPrefs() / setPref(type, { inApp?, push?, email? }) / setQuietHours(from|null, to|null)
registerPushToken(token, platform) / unregisterPushToken(token)   // rpc; called on sign-in and sign-out
```

## Nearby alerts (owned by TASK-23)

```ts
getAlertSubscription() / upsertAlertSubscription({ center, radiusKm, species, paused })   // verified email required
```
`fanout_alerts {report_id}` on a visible LOST report: recipients = subscriptions not paused, species match, `ST_DWithin(center_point, report.public_point, radius_km*1000)` (GiST), excluding the report's managers, users already delivered for this report, users at `daily_cap` today; chunks of 500 → `enqueue_notification(…,'nearby_lost', …, dedupe 'nearby:'||report_id)`. At most 1 push per report per user (`alert_deliveries`). Pending deliveries for a report closed/reunited are dropped by the `notify` handler (status check). Target: 1000 recipients < 60 s.

## Example

```json
{ "id": "n1…", "type": "match_chip", "payload": { "match_id": "m1…", "lost_code": "Pq7…", "other_code": "Hk3…" }, "read_at": null, "created_at": "…" }
```
