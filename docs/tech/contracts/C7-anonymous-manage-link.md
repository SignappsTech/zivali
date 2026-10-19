source: docs/04-technical-design.md§Authentication and authorization, ADR-005, ADR-020; FR-006, FR-009 R-009.2, NFR-SEC

# C7 Anonymous reporting and manage link

## Flow

1. Finder fills the quick found/sighted form (drafted locally, C4 §Drafts).
2. On submit without a session: client gets a Turnstile token (web widget; mobile WebView page `/captcha`, see below), calls `signInAnonymously(captchaToken)` (C3). Locally captcha is off and the token is ignored.
   Mobile captcha WebView: opens `<APP_URL>/captcha?lang=sl|en`; the page runs one Turnstile challenge on load and posts JSON through `window.ReactNativeWebView.postMessage`: `{ type: 'captcha', token }` (`token: null` when the web build has no NEXT_PUBLIC_TURNSTILE_SITE_KEY, i.e. captcha off) or `{ type: 'captcha_error' }` (the app reloads the page to retry). The page shows `report_found.captcha_title`/`captcha_body` itself; it skips proxy.ts (C15) and gets a fixed CSP from next.config.ts (CH-211).
3. Client uploads photos (C5) and calls `POST /v1/reports` with an `Idempotency-Key` (C4). Response includes `manage_token` (shown once, stored on device: web `localStorage` key `manage:<report_id>`, mobile `expo-secure-store`).
   Device keys holding a manage token (decision CH-218, for wipe and privacy reviews): web `localStorage` `manage:<report_id>` (after submit) and `sessionStorage` `manage_token` (the token the `/m` page opened, this tab only); mobile secure-store `manage_token.<report_id>` for created and claimed links alike. Web sign-out removes `manage:*` and `manage_token` (planned, TASK-9.10; shared browsers; the emailed link still works); mobile follows C17 §Wipe (kept on sign-out unless the user picks removal, all gone on account deletion).
4. Manage link = `<APP_URL>/m#<manage_token>` (SL) or `<APP_URL>/en/m#<manage_token>`. If `finder_email` was given, the link is emailed directly after the create commit with `NotificationsDomain.sendManageLink` (C10), not queued through `notify.send`, so the token never lands in `pgboss.job`; a failed email is recorded in `email_outbox` and never fails the POST (a 5xx would free the Idempotency-Key and duplicate the report) (CH-207).
5. On another device the link page signs in anonymously (captcha) and calls `POST /v1/manage/claim` → the new anonymous uid becomes a manager; redirect to the report manage view.
6. Claiming with an account: from the P7 done screen and the P14 finder thanks (TASK-17.12, `/registracija?convert=1`), "Create an account" converts the current anonymous user (or `linkIdentity`); same uid, nothing moves. The manage view (web `/m`, mobile `app/m.tsx`) has no account offer (decision CH-452: its job is managing the report; the finder met the offer on the done screen and in the thanks; lost-flow done screens need none, a lost report already needs an account). Email and password: one `updateUser({ email, password, data: { locale, display_name } }, { emailRedirectTo })`; GoTrue applies the password first, then mails the `email_change` link (PKCE on web) in the same transaction, so the link stays valid (checked on local Supabase). A session older than 24 h gets `reauthentication_needed` (`secure_password_change`; an anonymous user has no address to reauthenticate with): the client then sends `updateUser({ email, data }, { emailRedirectTo })` without the password, the link's `next` names the new-password form (web `/pozabljeno-geslo?set=1&next=…`, mobile `next=/auth/new-password`), and the link's fresh session sets it with `updateUser({ password })`. No other failure is retried. "Send again" repeats `updateUser({ email }, { emailRedirectTo })` with the same redirect, anonymous sessions only (`resend({ type: 'email_change' })` finds no one, the anonymous user's email is empty, and carries no PKCE; 60 s apart, else `RATE_LIMITED`). The user stops being anonymous when the link is opened; the email copy for an empty current address confirms the new account (`supabase/templates/email_change.html`). Never the Admin API: its password update clears the pending email change and signs out every session.

## REST (owned by TASK-17.1)

| Method and path | Guards | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/manage/claim` | auth (anonymous or user), rate limit 10/hour per IP | `{ token }` | `{ report_id, short_code }` | `NOT_FOUND` (unknown token), `GONE` (closed beyond the reopen window), `RATE_LIMITED` |
| `POST /v1/reports/:code/manage-link/resend` | manager | - | `204` | `NOT_FOUND`, `FORBIDDEN` (not a manager), `GONE` (removed, or closed/reunited more than 7 days ago, same rule as claim), `CONFLICT` (no finder email), `VALIDATION` (`finder_email` sent by a non-anonymous caller, issue path `finder_email`), `RATE_LIMITED` (3 per report per day, keyed by report, not caller) |
| `POST /v1/manage/link-request` (planned, CH-216, TASK-17.19; web TASK-17.21) | auth (anonymous or user: the page signs in anonymously with Turnstile first, as for claim), rate limit 5/hour per IP and 3/day per email HMAC | `{ email }` | `202` for every well-formed body | `VALIDATION` (malformed body only), `RATE_LIMITED` |
| `DELETE /v1/reports/:code` (planned, CH-218, R-034.4, TASK-51.1; web TASK-51.2, mobile TASK-51.3) | manager of a report with `source = 'anonymous'` | - | `204` | `NOT_FOUND`, `FORBIDDEN` (not a manager, or not an anonymous report: signed-in users close it or delete their account, TASK-51), `GONE` (already removed) |

**Lost link (decision CH-216).** The P7 lost-link form asks only for the email given at submit (content `report_found.resend_*`). The API answers `202` before any lookup, so the answer and its timing never tell whether the address is on file; job `manage.link_request` (ids and the email HMAC only, never a token or the address in clear, as CH-207) finds at most the 5 newest manageable reports (not removed, within the reopen window) whose `report_contacts` email matches case-insensitively and runs the resend rule for each (new token, emailed, hash written after a successful send; the 3 per report per day limit is shared). A stranger who knows an address can only make new links go to that address, which invalidates the old ones; accepted.

**Delete my data (decision CH-218, R-034.4).** `DELETE /v1/reports/:code` in one transaction: moderation `removed`, status `closed` (`close_reason` `removed`), alerts and open match suggestions cancelled, conversations read-only (`ChatDomain.closeForReport`), `report_contacts` row and `report_managers` rows deleted, `manage_token_hash`, `device_hash` and `ip_hash` cleared, `exact_point` replaced by the public point, photos queued for deletion (C5). Reads answer `GONE` (`removed`); the row goes with `retention.purge` once no conversation refers to it; the anonymous Auth user follows the anonymous-account retention.

Resend (CH-208): only the token hash is stored, so resend issues a NEW token; the old link and the device's stored `manage:<report_id>` token stop working for claims. The new token is emailed first, outside any transaction, and its hash is written only after a successful send, so a failed send changes nothing (500) and the old link keeps working. Claim makes the caller a `finder` manager; a repeat claim is a no-op 200.

## Submission guard (`domains/reports/submission-guard.ts`, called by `createReport` before writing; stub from TASK-29.2, real rules from TASK-17.1)

For anonymous callers (`req.user.is_anonymous`):
- rate limits `anon_report` per IP and per device id (`x-device-id`): `rate.anon_report_per_hour` (5) and `rate.anon_report_per_day` (20) from app_config. Missing device id → IP limits only.
- Hold (`moderation_state = 'held'`, report not public, finder still gets the manage link and a "being checked" message) when: device has > 10 reports in 7 days (counted on `reports.device_hash`, C4), or any photo `sha256` matches a held/removed report's photo.
- Hold by IP too (decision CH-321; planned, TASK-17.20): `x-device-id` is client-chosen and can rotate per report, so the hold also fires (reason `ip_volume`) when the request's IP hash has > 10 anonymous reports in 48 h, counted on `reports.ip_hash` (new; anonymous reports only; cleared 48 h after creation by `retention.purge`, the IP-hash retention of C1). Shared IPs (carrier NAT, a school) can hit it; a held report still gets its manage link and waits for moderation, which is the accepted cost.
- `finder_email` validated, stored in `report_contacts(report_id, email)` (readable only by the report service; deleted 30 days after close).

Token: 32 random bytes (`crypto.randomBytes(32)`), base64url, only its SHA-256 stored in `reports.manage_token_hash`; cleared when the reopen window after close, reunite or expiry ends (decision CH-209, C4 §Status machine; as built today it is cleared at the transition). The idempotency store keeps the response with the token encrypted for 24 h (C1), so a replay within 24 h returns the same token. Later (or after a post-commit 5xx) a repeat of the same key and body is answered from `reports.submission_id` (C4, C1 §Idempotency, TASK-86.5, CH-389): only the SHA-256 is stored, so the first token cannot be returned; the anonymous submitter gets a NEW token (its hash replaces the old one, so the old link stops working) and, with a finder email on file, the new link is emailed (`mailManageLink`; a failed email does not fail the answer; resend stays). A closed report (hash cleared) gets no token.

## Queued submissions (mobile outbox, C17)

A found or sighted report created offline is sent later by the outbox: anonymous sign-in at send time (Turnstile in the WebView; if interaction is needed the item waits in `needs_action`), then photos, then `POST /v1/reports` with `Idempotency-Key` = outbox id. A retry with the same id within 24 h returns the same report and the same manage token (encrypted replay, C1); later, or after a post-commit 5xx, the same key and body return the same report (never a duplicate) with a fresh manage token (see Token), which the outbox saves over the old one. A lost response therefore never creates a duplicate; the token is replaced, not lost. Rate limits apply at send time.

## Client headers

All clients send `x-device-id: <uuid>` (generated once per install/browser, stored locally) on every API request (the `@zivali/api` client adds it).

## Errors shown to users

`RATE_LIMITED` → "Za zdaj ste oddali največ prijav. Poskusite znova čez {minutes} min." (copy from the content slice) on the submit path only, `{minutes}` = `details.retry_after_s` rounded up (C1; TASK-30.2); claim and link request show the shared generic `errors.RATE_LIMITED` text without minutes (decision CH-321: one shared string; only the submit note has a minutes variant); `CAPTCHA_FAILED` / Turnstile outage → draft kept, automatic retry every 60 s and on reconnect.

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
| 1.3 | 2026-10-18 | CH-208: resend issues a new token, errors and rules; CH-211: mobile captcha WebView message protocol |
| 1.4 | 2026-10-19 | CH-389: after the 24 h replay a repeated submission returns the report with a fresh manage token (old hash replaced, link emailed); §Queued submissions "same token" holds within 24 h |
| 1.5 | 2026-10-19 | Tech lead decisions: CH-216 `POST /v1/manage/link-request`; CH-218 `DELETE /v1/reports/:code` and the device token keys with their wipe; CH-209 token kept through the reopen window; CH-321 IP-hash hold, minutes only on the submit path; CH-452 no account offer on the manage view (§Flow 6 reworded) |
