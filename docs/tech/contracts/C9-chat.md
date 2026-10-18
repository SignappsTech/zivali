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
| `POST /v1/conversations` | auth, verified email or anonymous manager; rate limit `contact` 10/day | `{ about_report_code, match_id? }` | `{ id }` (idempotent per report and caller; participants: caller + report managers) | `FORBIDDEN`, `UNVERIFIED_EMAIL`, `RATE_LIMITED` |
| `GET /v1/conversations` | auth | `?cursor` | `{ items: ConversationSummary[], next_cursor }` | - |
| `GET /v1/conversations/:id/messages` | participant | `?after=&before=&limit` | `{ items: Message[], next_cursor }`; items are ordered **oldest-first** (`created_at`, then `id`) in every mode. `after=<message id>` is an exclusive cursor moving forward (returns messages newer than that id, so catch-up after reconnect); `before=<message id>` is exclusive and pages backwards but still returns each page oldest-first; no cursor returns the latest `limit` messages. `next_cursor` is the id to pass as `after` (forward) or `before` (backward) for the next page, `null` at the end | `FORBIDDEN` |
| `POST /v1/conversations/:id/messages` | participant, rate limit 30/min and 500/day | `{ body, kind?: 'text' | 'location', location?: { lat, lng } }` | `201 Message` (+ broadcast, + `notify.send` `chat_message` for offline participants, deduped per conversation per 5 min) | `FORBIDDEN` (not participant or blocked), `GONE` (read-only), `VALIDATION`, `RATE_LIMITED` |
| `POST /v1/conversations/:id/read` | participant | - | `204` (+ broadcast `conversation.read`); also marks the caller's unread `chat_message` notifications for this conversation (payload `conversation_id`) read, in the same transaction; clients re-fetch notifications afterwards (C10) | - |
| `POST /v1/conversations/:id/block` | participant | `{ participant_id }` | `204` (blocks row; further messages from them refused) | - |

```ts
type Message = { id; conversation_id; sender_alias_key: 'owner'|'finder'|'sighter'|'contact'|'shelter'; sender_display_name?: string;
                 kind: 'text'|'location'|'system'; body; has_link: boolean; location?: { lat; lng }; created_at }
type ConversationSummary = { id; about_report: { short_code, type, species, thumb_url }; my_alias_key; other_alias_key; other_display_name?;
                             other_participant_id: Uuid | null; last_message_preview; unread: number; status: 'active'|'read_only' }
```
`other_participant_id` is the other participant's user id (the one `other_alias_key` names; `null` when none is left): the `participant_id` for block and the `target_id` of a `profile` abuse report (C11). It is the only participant id in any DTO; never their email or phone.
`has_link` is set by the service (URL regex): a scheme (`https://`, …), `www.`, or a bare host on any TLD (dot-separated labels ending in 2+ letters, e.g. `is.gd/x`, `foo.dev`); numbers (`3.14`, `17.30`), ordinals (`2.nadstropje`) and abbreviations (`e.g.`) are not links. Location messages only from a manager of the related report (explicit exact-point share, R-004.3).
Aliases: conversation lists and messages return alias keys (`owner` | `finder` | `sighter` | `contact` | `shelter`) or the participant's chosen `display_name`; clients render the neutral i18n keys `chat.alias_owner` ("Oseba, ki išče žival" / "Person searching"), `chat.alias_finder`, `chat.alias_sighter`, `chat.alias_contact`, `chat.alias_shelter` (P12 content slice). Never email or phone.

## Client rendering rules

- Body rendered as plain text; URLs **not** linkified, shown with a caution icon and text (`chat.link_caution`); no previews.
- Persistent safety banner at the top (`chat.safety_banner`: never send money or codes first).
- `chat_started` analytics event when the user sends the first message in a conversation (consent only, C12).
- Read-only conversations show the input disabled with an explanation; retention purge deletes messages 6 months after the related report closes (`retention.purge` job).

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
