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

| Type | Payload | Quiet hours | Default channels | Deep link |
|---|---|---|---|---|
| `match_chip` | `{ match_id, lost_code, other_code }` | ignored | in-app, push, email | `/r/<lost_code>/matches` |
| `match_suggested` | `{ match_id, lost_code, strength }` | apply | in-app, push, email | same |
| `match_confirmed` | `{ conversation_id, report_code }` | apply | in-app, push, email | `/inbox/<id>` |
| `chat_message` | `{ conversation_id, preview_alias }` (no body) | ignored | in-app, push; email after 30 min unread | `/inbox/<id>` |
| `nearby_lost` | `{ report_code, species, distance_band }` | apply | in-app, push | `/r/<code>` |
| `report_reminder` | `{ report_code, day: 7|14|30 }` | apply | in-app, push, email | `/my-reports` |
| `report_expiring` / `report_closed` | `{ report_code }` | apply | in-app, email | `/my-reports` |
| `report_hidden` | `{ report_code, reason }` | apply | in-app, email | `/my-reports` |
| `report_reunited` | `{ report_code }` | apply | in-app, push | `/r/<code>` |
| `manage_link` | `{ report_code, token }` (email only, to `report_contacts`) | n/a | email | `/m#token` |
| `payment_receipt` | `{ payment_id, amount_cents, purpose }` | n/a | email, in-app | `/account/payments` |

Email-only types to unverified addresses are skipped (FR-010 edge). Text comes from i18n namespace `notifications` and `email` in the recipient's `profiles.locale`.

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
