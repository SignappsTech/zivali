source: docs/04-technical-design.md§Data model (conversations, messages), ADR-003; FR-009, NFR-LAT, NFR-PRIV

# C9 Chat

## Tables

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
RLS: participants select conversations, participants and messages; insert only through `send_message`. Moderators (aal2) select messages of a conversation only when an abuse report targets one of its messages (FR-018 edge).

Realtime: `messages` and `conversation_participants` in the `supabase_realtime` publication; clients subscribe to `postgres_changes` on `messages` with filter `conversation_id=eq.<id>` (RLS applies).

## RPCs (owned by TASK-21)

```ts
start_conversation(p_about_report_id uuid, p_match_id?: uuid) → { conversation_id }
// from confirm_match (C8) or "Contact" on a listing; caller must be email-verified or anonymous manager;
// idempotent per (about_report, caller); "contact" rate limit 10/day; participants: caller + report managers
send_message(p_conversation_id, p_body, p_kind default 'text', p_location?: {lat,lng}) → { id, created_at }
// checks: participant, conversation active, not blocked by any other participant, rate 30/min 500/day,
// has_link = body ~ URL regex; location only from a manager of the related report (explicit exact-point share)
// side effect: notify job type 'chat_message' for offline participants (dedupe per conversation per 5 min)
mark_read(p_conversation_id) → void
block_participant(p_conversation_id, p_user_id) → void       // also creates blocks row
list_conversations() → { id, about_report: { short_code, type, species, thumb_url }, other_alias, last_message_preview, unread }[]
```
Aliases: `list_conversations` and message payloads return `alias_key` (`owner` | `finder` | `sighter` | `contact` | `shelter`) or the participant's chosen `display_name`; clients render the neutral i18n keys `chat.alias_owner` ("Oseba, ki išče žival" / "Person searching"), `chat.alias_finder`, `chat.alias_sighter`, `chat.alias_contact`, `chat.alias_shelter` (P12 content slice). Never email or phone.

## Client rendering rules

- Body rendered as plain text; URLs **not** linkified, shown with a caution icon and text (`chat.link_caution`); no previews.
- Persistent safety banner at the top (`chat.safety_banner`: never send money or codes first).
- `chat_started` analytics event when the user sends the first message in a conversation (consent only, C12).
- Read-only conversations show the input disabled with an explanation; retention purge deletes messages 6 months after the related report closes (`purge_retention`).

## Errors

`FORBIDDEN` (not participant / blocked), `GONE` (read-only), `RATE_LIMITED`, `UNVERIFIED_EMAIL`, `VALIDATION` (empty/too long).

## Example

```json
// realtime payload (INSERT on messages)
{ "id": "…", "conversation_id": "c9…", "sender_id": "u2…", "kind": "text", "body": "Je pri meni, lahko pridete po 17h.", "has_link": false, "created_at": "2026-10-14T16:02:11Z" }
```
