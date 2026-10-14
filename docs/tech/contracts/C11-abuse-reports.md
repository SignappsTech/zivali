source: docs/04-technical-design.md§Data model (abuse_reports), docs/05-quality-security-plan.md§Security; FR-018 (M2 part)

# C11 Abuse reports

## Table

```sql
create type abuse_reason as enum ('scam','fake','spam','inappropriate_image','other');
abuse_reports(id, reporter_id, target_type text check (target_type in ('report','message','profile')),
              target_id uuid, reason abuse_reason, note text check (char_length(note) <= 500),
              weight numeric(2,1),                 -- 1.0, or 0.5 when the reporter account is < 24 h old
              status text default 'open' check (status in ('open','dismissed','actioned')),
              created_at, unique (reporter_id, target_type, target_id))
moderation_flags(id, kind text ('duplicate_chip'|'anon_hold'|'auto_hidden'), target_type, target_id, details jsonb, created_at, resolved_at)
```
RLS: reporters insert via RPC only and see their own rows; staff (aal2) select all; nobody else.

## RPC (owned by TASK-25)

```ts
report_abuse(p_target_type, p_target_id, p_reason, p_note?) → { id, duplicate: boolean }
// any signed-in or anonymous user (anonymous visitors sign in anonymously with captcha first);
// rate 10/hour per user and IP hash; duplicate from same reporter → returns existing, duplicate: true
// message targets: reporter must be a participant of the conversation
// when the weighted sum of open reports on a 'report' target ≥ cfg 'abuse.auto_hide_threshold' (3):
//   reports.moderation_state = 'hidden', moderation_flags 'auto_hidden', publish_photos unpublishes,
//   enqueue_notification(owner managers, 'report_hidden', …)
```
Staff read (until the M4 queue): `list_abuse_reports({ status?, target_type?, cursor? })` and `list_moderation_flags()` (aal2).

## Example

```json
// rpc/report_abuse
{ "p_target_type": "report", "p_target_id": "7c1e…", "p_reason": "scam", "p_note": "Asks for money upfront" }
// → { "id": "ab1…", "duplicate": false }
```
