source: docs/04-technical-design.md§Authentication and authorization, ADR-005; FR-006, FR-009 R-009.2, NFR-SEC

# C7 Anonymous reporting and manage link

## Flow

1. Finder fills the quick found/sighted form (drafted locally, C4 §Drafts).
2. On submit without a session: client gets a Turnstile token (web widget; mobile WebView page `/captcha`), calls `signInAnonymously(captchaToken)` (C3). Locally captcha is off and the token is ignored.
3. Client uploads photos (C5) and calls `create_report` (C4). Response includes `manage_token` (shown once, stored on device: web `localStorage` key `manage:<report_id>`, mobile `expo-secure-store`).
4. Manage link = `<APP_URL>/m#<manage_token>` (SL) or `<APP_URL>/en/m#<manage_token>`. If `finder_email` was given, the `notify` job emails the link (template `manage_link`).
5. On another device the link page signs in anonymously (captcha) and calls `claim_manage_token(token)` → the new anonymous uid becomes a manager; redirect to the report manage view.
6. Claiming with an account: from the manage view, "Create an account" converts the current anonymous user (`updateUser({ email, password })` or `linkIdentity`); same uid, nothing moves.

## RPCs

```ts
claim_manage_token(p_token text) → { report_id, short_code }
// errors: NOT_FOUND (unknown token), GONE (report closed beyond reopen window), RATE_LIMITED (10/hour per IP hash)
resend_manage_link(p_report_id uuid) → void        // managers only; requires finder email on file; 3/day
```

## Guard (replaces the stub `submission_guard(p jsonb)` called by `create_report`)

For anonymous callers (`is_anonymous_user()`):
- `check_rate_limit('anon_report:ip:'||ip_hash, cfg 'rate.anon_report_per_hour' (5), '1 hour')` and per day (20); the same for `device:` keys from `x-device-id`. Missing device id → IP limits only.
- Hold (`moderation_state = 'held'`, report not public, finder still gets the manage link and a "being checked" message) when: device has > 10 reports in 7 days, or any photo `sha256` matches a held/removed report's photo.
- `finder_email` validated, stored in `report_contacts(report_id, email)` (private, RLS managers + staff; deleted on close + 30 days).

Token: 32 random bytes (`gen_random_bytes(32)`), base64url, only `sha256` stored in `reports.manage_token_hash`; cleared on close (`transition_report`).

## Client headers

All clients send `x-device-id: <uuid>` (generated once per install/browser, stored locally) on Supabase requests (`global.headers` in the supabase client).

## Errors shown to users

`RATE_LIMITED` → "Za zdaj ste oddali največ prijav. Poskusite znova čez {minutes} min." (copy from the content slice); `CAPTCHA_FAILED` / Turnstile outage → draft kept, automatic retry every 60 s and on reconnect.

## Example

```json
// rpc/create_report (anonymous) → 200
{ "id": "a1…", "short_code": "Xy7pQ2mK", "moderation_state": "visible", "manage_token": "q7Vt…43chars" }
```
