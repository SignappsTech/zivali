source: docs/04-technical-design.md§Data model (conversations, messages), ADR-020, ADR-023; FR-009, NFR-LAT, NFR-PRIV

# C9 Chat

## Models (Prisma `prisma/schemas/chat.prisma`, schema `app`)

```sql
conversations(id, lost_report_id null, other_report_id null, about_report_id, match_id null,
              status text check (status in ('active','read_only')), created_at, closed_at)
conversation_participants(conversation_id, user_id, role text ('owner'|'finder'|'contact'), alias text,
              last_read_at, muted boolean default false, pk(conversation_id, user_id))
messages(id, conversation_id, sender_id, kind text check (kind in ('text','location','system')),
         body text check (char_length(body) between 1 and 2000), location jsonb null, has_link boolean,
         created_at)
blocks(blocker_id, blocked_id, created_at, pk(blocker_id, blocked_id))
```
Access only through the API (RLS deny-all, ADR-021). Moderators (aal2) read messages of a conversation only when an abuse report targets one of its messages (FR-018 edge).

## Realtime (ADR-023)

Supabase Realtime **Broadcast** on private channels; no table is published.
- Topics: `conversation:<id>` (events `message.created`, `conversation.read`), `user:<id>` (events `notification.created`, `conversation.updated` for inbox badges).
- The chat service broadcasts after insert in the same transaction: `select realtime.send(<payload jsonb>, 'message.created', 'conversation:' || <id>, true)` (Prisma `$executeRaw`). Payload = the `Message` DTO below, nothing more. One broadcast reaches every participant, so `sender_alias_key` is always the sender's role alias (never `you`); a client recognises its own messages by comparing it with `my_alias_key` from `ConversationSummary`.
- Policy (migration SQL): `create policy "members receive" on realtime.messages for select to authenticated using (app.can_join_topic(auth.uid(), realtime.topic()))`; `app.can_join_topic` is `security definer` and checks `conversation_participants` or `user:<own id>`. No insert policy: clients cannot broadcast.
- `conversation.read` payload: `{ conversation_id, reader_id, last_read_message_id, read_at }`. `conversation.updated` payload (on `user:<id>`): `{ conversation_id, status: 'active'|'read_only', updated_at }`. Minimal by design: no body, no names; clients refetch `GET /v1/conversations` for badges and previews.
- Clients: `supabase.channel(topic, { config: { private: true } })`; on (re)subscribe they fetch `GET /v1/conversations/:id/messages?after=<last message id>` so nothing is lost; offline recipients get push (C10).

## REST (owned by TASK-21.2)

| Method and path | Guards | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/conversations` | auth, verified email or anonymous manager; rate limit `contact` 10/day | `{ about_report_code, match_id? }` | `200 { id }` (idempotent per report and caller; participants: caller + report managers) | `FORBIDDEN`, `NOT_FOUND`, `GONE`, `UNVERIFIED_EMAIL`, `RATE_LIMITED` |
| `GET /v1/conversations` | auth | `?cursor` | `{ items: ConversationSummary[], next_cursor }`, ordered by latest activity | - |
| `GET /v1/conversations/:id/messages` | participant | `?after=&before=&limit` | `{ items: Message[], next_cursor }`; items are ordered **oldest-first** (`created_at`, then `id`) in every mode. `after=<message id>` is an exclusive cursor moving forward (returns messages newer than that id, so catch-up after reconnect); `before=<message id>` is exclusive and pages backwards but still returns each page oldest-first; no cursor returns the latest `limit` messages. `next_cursor` is the id to pass as `after` (forward) or `before` (backward) for the next page, `null` at the end | `FORBIDDEN` |
| `POST /v1/conversations/:id/messages` | participant, rate limit 30/min and 500/day | `{ body, kind?: 'text' | 'location', location?: { lat, lng } }` | `201 Message` (+ broadcast, + `notify.send` `chat_message` for offline participants, deduped per conversation per 5 min; `Idempotency-Key` optional; "offline" = no `POST /read` in the last 2 min, clients mark read while the conversation is open; the notify handler derives `preview_alias` and `unread_count` from `thread_id`; CH-172) | `FORBIDDEN` (not participant or blocked), `GONE` (read-only), `VALIDATION`, `RATE_LIMITED` |
| `POST /v1/conversations/:id/read` | participant | - | `204` (+ broadcast `conversation.read`); also marks the caller's unread `chat_message` notifications for this conversation (payload `conversation_id`) read, in the same transaction; clients re-fetch notifications afterwards (C10) | - |
| `POST /v1/conversations/:id/block` | participant | `{ participant_id }` | `204` (blocks row; further messages from them refused) | - |

```ts
type Message = { id; conversation_id; sender_alias_key?: 'owner'|'finder'|'sighter'|'contact'|'shelter' /* absent for kind 'system' (CH-171) */; sender_display_name?: string;
                 kind: 'text'|'location'|'system'; body; has_link: boolean; location?: { lat; lng }; created_at }
type ConversationSummary = { id; about_report: { short_code, type, species, thumb_url }; my_alias_key; other_alias_key; other_display_name?;
                             other_participant_id: Uuid | null; last_message_preview; unread: number; status: 'active'|'read_only' }
```
`other_participant_id` is the other participant's user id (the one `other_alias_key` names; `null` when none is left): the `participant_id` for block and the `target_id` of a `profile` abuse report (C11). It is the only participant id in any DTO; never their email or phone.
System messages (CH-171, CH-361): `body` is a key the client words, not text: `confirmed`, `contact`, `closed`, `home`, `reopened` → i18n `chat.system_<key>` (P12 copy §5). A client shows any other body as sent.
`has_link` is set by the service (URL regex): a scheme (`https://`, …), `www.`, or a bare host on any TLD (dot-separated labels ending in 2+ letters, e.g. `is.gd/x`, `foo.dev`); numbers (`3.14`, `17.30`), ordinals (`2.nadstropje`) and abbreviations (`e.g.`) are not links. Location messages only from a manager of the related report (explicit exact-point share, R-004.3).
Aliases: conversation lists and messages return alias keys (`owner` | `finder` | `sighter` | `contact` | `shelter`) or the participant's chosen `display_name`; clients render the neutral i18n keys `chat.alias_owner` ("Oseba, ki išče žival" / "Person searching"), `chat.alias_finder`, `chat.alias_sighter`, `chat.alias_contact`, `chat.alias_shelter` (P12 content slice). Never email or phone.

## Messages (translation) (Premium, M4, TASK-118, ADR-024)

- **When**: a conversation translates while at least one participant has Premium (`hasEntitlement(user, 'premium')`, C13) and that participant's switch is on: `conversation_participants.translate boolean default true`, set with `PUT /v1/conversations/:id/translation { on: boolean }` (participant with Premium; others `UPGRADE_REQUIRED`) → `204`. Both directions: the free or anonymous party reads the Premium user's messages in their language, and the Premium user reads theirs.
- **Target languages**: each participant's `profiles.locale` (`sl`, `en` now; more through app_config `chat_translate.languages`). A message is translated into every participant locale that differs from its detected language.
- **Order**: `POST …/messages` stores and broadcasts the original as today (R-009.1 p95 < 2 s unchanged) and sends `chat.translate { message_id }` in the same transaction (only `kind: 'text'`). The worker masks phone numbers, emails, URLs and chip-like numbers with placeholders, calls the provider once for all missing languages, restores the placeholders, stores the rows and broadcasts `message.translated` on `conversation:<id>`: `{ message_id, detected_lang, lang, text, status }`.
- **Model**: `messages.detected_lang text null`; `message_translations(message_id → messages on delete cascade, lang text, text text null, status text check (status in ('ok','unsupported','capped','failed')), created_at, pk(message_id, lang))`. Translated once per message and language (the row is the cache). Retention follows the message (cascade; `retention.chat_months`), data inventory as chat content.
- **DTO**: `Message` gains `detected_lang?: string` and `translations?: { [lang]: { text: string | null; status: 'ok' | 'unsupported' | 'capped' | 'failed' } }` (only the caller's locale is returned on reads).
- **Caps** (app_config, fail closed): `chat_translate.monthly_messages_per_user` 300 and `chat_translate.max_chars` 2000 per message; a translation counts against the reader if they have Premium, otherwise against the Premium partner; Premium AI spend ≤ EUR 0.50 per user per month (extraction for a Premium user plus translation, from `ai_calls` with `user_id`); `chat_translate.monthly_budget_usd` 10 for the whole service, with one email to the admins at 80 % per month (C10 type `ai_budget_alert`, transactional, added by TASK-118). Over a cap, a provider outage or an unsupported language → status `capped` / `failed` / `unsupported`: the reader sees the original and a notice (`chat.translation_unavailable`).
- **Ledger**: one `ai_calls` row per call: `purpose` `translate`, `user_id` (the charged user), `photo_id` null (C19 §Models gains `purpose` and `user_id`, TASK-118 migration).
- **Rules**: moderation and abuse reports (C11) use the original only. The client shows the translation with a "Prevedeno · Pokaži izvirnik" toggle (copy: content strategist). Provider per ADR-024; `CHAT_TRANSLATE_PROVIDER` (`mock` locally and in CI, `off` unless `anthropic` in staging and production).

## Client rendering rules

- Body rendered as plain text; URLs **not** linkified, shown with a caution icon and text (`chat.link_caution`); no previews.
- Persistent safety banner at the top (`chat.safety_banner`: never send money or codes first).
- `chat_started` analytics event when the user sends the first message in a conversation (consent only, C12).
- Read-only conversations show the input disabled with an explanation; retention: `app_config` key `retention.chat_months` (6); `retention.purge` deletes the conversation with its participants and messages that many months after the related report closes (CH-174). Close, reunite and expiry of the report call `ChatDomain.closeForReport` (C4, CH-173).

## Errors

`FORBIDDEN` (not participant / blocked), `GONE` (read-only), `RATE_LIMITED`, `UNVERIFIED_EMAIL`, `VALIDATION` (empty/too long).

## Example

```json
// broadcast on conversation:c9… (event message.created)
{ "id": "…", "conversation_id": "c9…", "sender_alias_key": "finder", "kind": "text", "body": "Je pri meni, lahko pridete po 17h.", "has_link": false, "created_at": "2026-10-14T16:02:11Z" }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-61: message order oldest-first, after cursor exclusive forward; CH-62: conversation.read and conversation.updated payloads |
| 1.2 | 2026-10-15 | CH-75: sender_alias_key is the role alias (no 'you'); ConversationSummary gets my_alias_key |
| 1.3 | 2026-10-16 | CH-170: ConversationSummary gets other_participant_id (user id, for block and the profile abuse report); has_link matches bare hosts on any TLD (TASK-21.7, TASK-21.8) |
| 1.4 | 2026-10-18 | CH-493 (TASK-114.10): `POST /conversations/:id/read` also marks the caller's unread `chat_message` notifications for it read, same transaction |
| 1.5 | 2026-10-18 | CH-171: sender_alias_key optional for system messages; CH-172: POST /conversations 200 {id} and extra errors, inbox order, optional Idempotency-Key, offline = no read in 2 min; CH-173/CH-174: closeForReport, retention.chat_months |
| 1.6 | 2026-10-18 | CH-361: system message body keys |
| 1.7 | 2026-10-19 | CH-637: §Messages (translation): Premium chat translation (ADR-024), per-chat switch, async `message.translated`, masking, caps and ledger |
