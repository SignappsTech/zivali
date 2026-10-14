# ADR-005: Anonymous finders use Supabase anonymous sign-in, a manage token and Turnstile

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Amended 2026-10-15 (ADR-020): the submission guard, rate limits, holds and the manage-token claim are Express middleware and services (`POST /v1/reports`, `POST /v1/manage/claim`), not SQL functions; Supabase anonymous sign-in and Auth-native Turnstile stay; report managers are checked by the API.
- Source: FR-006, FR-009 R-009.2, Q-003 (default A-002), NFR-SEC, R-007

## Context

Finders report without an account, must later edit, close and chat from any device through a private link, and may later claim the report with an account. Anonymous endpoints attract spam and scams. FR-006 asks the TDD to decide captcha-outage behaviour.

## Decision

- **Supabase anonymous sign-in** (`signInAnonymously({ options: { captchaToken } })`) creates a real `auth.uid()` with `is_anonymous = true` in the JWT. All RLS works unchanged; no custom token minting.
- **Report managers**: `report_managers(report_id, user_id)` lists every identity that may manage a report (the creator, plus anonymous identities that claimed the manage link on other devices). RLS "can manage" = membership.
- **Manage token**: 256-bit random, base64url, returned once by `create_report` for anonymous submissions and optionally emailed. Only `sha256(token)` is stored. The link is `<APP_URL>/m#<token>` (fragment, never sent to servers or logs). `claim_manage_token(token)` adds the caller's anonymous or signed-in uid to `report_managers`. The token is cleared when the report closes; managers already bound keep access for the 7-day reopen window.
- **Claiming with an account** converts the same anonymous user in place (`updateUser` with email/password or `linkIdentity`), so nothing moves.
- **Captcha: Cloudflare Turnstile** (free, no cookies, no image puzzles, built into Supabase Auth). Supabase Auth verifies it on anonymous sign-in and sign-up; the `submit-lead` Edge Function verifies it through the `captcha` adapter. Locally `[auth.captcha]` is disabled and the adapter is `mock` (offline).
- **Rate limits** inside `create_report` / `report_abuse` / `send_message` via `check_rate_limit(key, limit, window)`: anonymous reports 5/hour and 20/day per IP hash and per device id (`x-device-id` header), configurable in `app_config`. IPs are stored only as keyed hashes and purged after 48 h.
- **Holds**: an anonymous report is created with `moderation_state = 'held'` when the device exceeded 10 reports in 7 days or a photo hash matches a removed or held report.
- **Captcha outage: fail closed.** Anonymous sign-in returns an error; the client keeps the draft (photos and fields) locally and retries automatically every minute and on reconnect (same offline queue as R-037.5), with a calm message. Rationale: scams target panicked owners (R-007), Turnstile outages are rare and short, and the draft is never lost.

## Alternatives

- Custom manage-token JWTs signed by an Edge Function: works for Realtime but re-implements Auth and key rotation.
- hCaptcha / Friendly Captcha: puzzles hurt the < 60 s goal or cost money; Friendly Captcha (EU) is the fallback if the client rejects Cloudflare as a processor.
- Fail open under tighter limits: weaker against scripted abuse exactly when the guard is down.

## Consequences

- Cloudflare becomes a processor (privacy policy, TASK-28).
- Mobile needs Turnstile in a WebView (a small page `/captcha` on the web app posts the token back).
- Anonymous users accumulate in `auth.users`; `purge_retention` deletes anonymous users with no live report after 30 days.
