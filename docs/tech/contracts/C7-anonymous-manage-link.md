source: docs/04-technical-design.md§Authentication and authorization, ADR-005, ADR-020; FR-006, FR-009 R-009.2, NFR-SEC

# C7 Anonymous reporting and manage link

## Flow

1. Finder fills the quick found/sighted form (drafted locally, C4 §Drafts).
2. On submit without a session: client gets a Turnstile token (web widget; mobile WebView page `/captcha`), calls `signInAnonymously(captchaToken)` (C3). Locally captcha is off and the token is ignored.
3. Client uploads photos (C5) and calls `POST /v1/reports` with an `Idempotency-Key` (C4). Response includes `manage_token` (shown once, stored on device: web `localStorage` key `manage:<report_id>`, mobile `expo-secure-store`).
4. Manage link = `<APP_URL>/m#<manage_token>` (SL) or `<APP_URL>/en/m#<manage_token>`. If `finder_email` was given, the link is emailed directly after the create commit with `NotificationsDomain.sendManageLink` (C10), not queued through `notify.send`, so the token never lands in `pgboss.job`; a failed email is recorded in `email_outbox` and never fails the POST (a 5xx would free the Idempotency-Key and duplicate the report) (CH-207).
5. On another device the link page signs in anonymously (captcha) and calls `POST /v1/manage/claim` → the new anonymous uid becomes a manager; redirect to the report manage view.
6. Claiming with an account: from the manage view, "Create an account" converts the current anonymous user (or `linkIdentity`); same uid, nothing moves. Email and password: one `updateUser({ email, password, data: { locale, display_name } }, { emailRedirectTo })`; GoTrue applies the password first, then mails the `email_change` link (PKCE on web) in the same transaction, so the link stays valid (checked on local Supabase). A session older than 24 h gets `reauthentication_needed` (`secure_password_change`; an anonymous user has no address to reauthenticate with): the client then sends `updateUser({ email, data }, { emailRedirectTo })` without the password, the link's `next` names the new-password form (web `/pozabljeno-geslo?set=1&next=…`, mobile `next=/auth/new-password`), and the link's fresh session sets it with `updateUser({ password })`. No other failure is retried. "Send again" repeats `updateUser({ email }, { emailRedirectTo })` with the same redirect, anonymous sessions only (`resend({ type: 'email_change' })` finds no one, the anonymous user's email is empty, and carries no PKCE; 60 s apart, else `RATE_LIMITED`). The user stops being anonymous when the link is opened; the email copy for an empty current address confirms the new account (`supabase/templates/email_change.html`). Never the Admin API: its password update clears the pending email change and signs out every session.

## REST (owned by TASK-17.1)

| Method and path | Guards | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/manage/claim` | auth (anonymous or user), rate limit 10/hour per IP | `{ token }` | `{ report_id, short_code }` | `NOT_FOUND` (unknown token), `GONE` (closed beyond the reopen window), `RATE_LIMITED` |
| `POST /v1/reports/:code/manage-link/resend` | manager | - | `204` | `CONFLICT` (no finder email), `RATE_LIMITED` (3/day) |

## Submission guard (`domains/reports/submission-guard.ts`, called by `createReport` before writing; stub from TASK-29.2, real rules from TASK-17.1)

For anonymous callers (`req.user.is_anonymous`):
- rate limits `anon_report` per IP and per device id (`x-device-id`): `rate.anon_report_per_hour` (5) and `rate.anon_report_per_day` (20) from app_config. Missing device id → IP limits only.
- Hold (`moderation_state = 'held'`, report not public, finder still gets the manage link and a "being checked" message) when: device has > 10 reports in 7 days (counted on `reports.device_hash`, C4), or any photo `sha256` matches a held/removed report's photo.
- `finder_email` validated, stored in `report_contacts(report_id, email)` (readable only by the report service; deleted 30 days after close).

Token: 32 random bytes (`crypto.randomBytes(32)`), base64url, only its SHA-256 stored in `reports.manage_token_hash`; cleared on close (transition `close`). The idempotency store keeps the response with the token encrypted for 24 h (C1), so a replay returns the same token.

## Queued submissions (mobile outbox, C17)

A found or sighted report created offline is sent later by the outbox: anonymous sign-in at send time (Turnstile in the WebView; if interaction is needed the item waits in `needs_action`), then photos, then `POST /v1/reports` with `Idempotency-Key` = outbox id. A retry with the same id returns the same report and the same manage token (encrypted replay, C1), so a lost response never loses the token or creates a duplicate. Rate limits apply at send time.

## Client headers

All clients send `x-device-id: <uuid>` (generated once per install/browser, stored locally) on every API request (the `@zivali/api` client adds it).

## Errors shown to users

`RATE_LIMITED` → "Za zdaj ste oddali največ prijav. Poskusite znova čez {minutes} min." (copy from the content slice); `CAPTCHA_FAILED` / Turnstile outage → draft kept, automatic retry every 60 s and on reconnect.

## Example

```json
// POST /v1/reports (anonymous) → 201
{ "id": "a1…", "short_code": "Xy7pQ2mK", "moderation_state": "visible", "manage_token": "q7Vt…43chars" }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-16 | TASK-17.12: §Flow 6, email and password conversion = one `updateUser({ email, password, data })`; on `reauthentication_needed` the address alone, then the password in the link's fresh session; "send again" = `updateUser({ email })`; email_change copy without a current address. Replaces the short-lived `POST /v1/me/convert-password` (C3 1.7) |
| 1.2 | 2026-10-18 | CH-207: manage-link email sent directly after the create commit; CH-206: hold rule counts reports.device_hash |
