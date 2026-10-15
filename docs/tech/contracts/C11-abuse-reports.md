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
Access only through the API (RLS deny-all): reporters create and see their own reports; staff (aal2) read all.

## REST (owned by TASK-25.2)

| Method and path | Guards | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/abuse-reports` | auth (user or anonymous; anonymous visitors sign in anonymously with captcha first); rate limit 10/hour per user and IP | `{ target_type: 'report' | 'message' | 'profile', target_id, reason, note? }` | `201 { id, duplicate: false }` or `200 { id, duplicate: true }` | `VALIDATION`, `FORBIDDEN` (message target and not a participant), `RATE_LIMITED` |
| `GET /v1/admin/abuse-reports` | moderator, aal2 | `?status&target_type&cursor` | `{ items, next_cursor }` | `AAL2_REQUIRED` |
| `GET /v1/admin/moderation-flags` | moderator, aal2 | `?cursor` | `{ items, next_cursor }` | `AAL2_REQUIRED` |

`AdminAbuseReport` and `ModerationFlag` (admin list items) = the table columns above (ids, reason/kind, target, `note`/`details`, status, timestamps; reporter shown as id only), defined in `packages/types/src/domain/` (TASK-6.5).

Service rules: reports from accounts younger than 24 h weigh 0.5; when the weighted sum of open reports on a `report` target reaches `abuse.auto_hide_threshold` (3) the report becomes `hidden`, a `moderation_flags` row `auto_hidden` is written, `photo.publish` unpublishes its photos and the managers get `report_hidden` (C10).

## Example

```json
// POST /v1/abuse-reports
{ "target_type": "report", "target_id": "7c1e…", "reason": "scam", "note": "Asks for money upfront" }
// → { "id": "ab1…", "duplicate": false }
```
