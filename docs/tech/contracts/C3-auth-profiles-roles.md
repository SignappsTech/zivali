source: docs/04-technical-design.md§Authentication and authorization (C3), ADR-005, ADR-018, ADR-020, FR-001

# C3 Auth, profiles, roles and sessions

Supabase Auth issues sessions (email + password, Google, Apple, anonymous finders, TOTP MFA, Turnstile). The Express API verifies the access token and owns the profile and roles.

## Model (Prisma, `prisma/schemas/users.prisma`, schema `app`)

```prisma
enum USER_ROLE { USER SHELTER_MEMBER MODERATOR ADMIN }
model profiles {
  id                      String    @id @db.Uuid            // = auth.users.id (no FK into auth)
  display_name            String?   @db.VarChar(60)
  locale                  String    @default("sl")           // 'sl' | 'en'
  role                    USER_ROLE @default(USER)
  home_point              Unsupported("extensions.geography(Point,4326)")?   // private; schema-qualified (C1 §Database)
  home_radius_km          Int       @default(5)              // 1–25
  phone                   String?                            // private, never public, never in analytics
  is_anonymous            Boolean   @default(false)
  supporter_badge_visible Boolean   @default(true)
  quiet_from              String?                            // "22:00", Europe/Ljubljana
  quiet_to                String?
  created_at              DateTime  @default(now()) @db.Timestamptz(6)
  updated_at              DateTime  @updatedAt @db.Timestamptz(6)
  @@schema("app")
}
```
- `ensureProfile(user)` creates the row on the first authenticated request (locale from `user_metadata.locale`, `is_anonymous` from the token). Converting an anonymous user (C7) keeps the same id; the next request flips `is_anonymous`.
- The last admin cannot be demoted (service check + test).

## Token verification (`middleware/auth.ts`)

`jose.jwtVerify(token, createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)), { audience: 'authenticated', issuer: `${SUPABASE_URL}/auth/v1` })`; locally, when the stack signs with the shared secret, `SUPABASE_JWT_SECRET` (HS256). Claims used: `sub`, `is_anonymous`, `aal`, `email`, `email_confirmed_at` is not in the token, so `email_verified` comes from `auth.users.email_confirmed_at` (read via the Admin API or a direct read, cached per user for 5 min), never from `user_metadata` (user-writable) or `app_metadata`. Role comes from `app.profiles` (60 s cache). No custom access token hook.

## Auth configuration (local `supabase/config.toml`; cloud mirrors it)

- Email + password with `enable_confirmations = true`; anonymous sign-ins enabled; MFA TOTP enroll and verify enabled.
- Google and Apple providers enabled only when their client ids are set (`env(...)` in config).
- Turnstile captcha: off locally, on in cloud for sign-up and anonymous sign-in.
- Redirect URLs: production allow-list is `https://<APP_URL>/**` and `zivali://**` only (`exp://` URLs are local/staging only). `secure_password_change = true` (GoTrue asks a session older than 24 h to reauthenticate before a password update; an anonymous user cannot, so the conversion of C7 §6 sets its password with `POST /v1/me/convert-password`). The locale reaches the auth emails through the Admin API (`user_metadata.locale`). JWT expiry 3600 s, refresh token rotation on.
- Email templates (confirm, recovery, magic link, email change, reauthentication, identity-linked notice) in `supabase/templates/*.html`, copy from `docs/content/notifications-and-emails.md` §3, localised with `{{ if eq .Data.locale "en" }}…{{ else }}…{{ end }}`; check `{{ .Provider }}` and `{{ .NewEmail }}` against the deployed Supabase version.

## REST

| Method and path | Guards | Request | Response |
|---|---|---|---|
| `GET /v1/me` | auth | - | `Profile` (own, incl. private fields) + `{ email, email_verified, is_anonymous, role, aal }` |
| `PATCH /v1/me` | auth | `{ display_name?, locale?, home?: { lat, lng } \| null, home_radius_km?, phone?, quiet_from?, quiet_to?, supporter_badge_visible? }` | `Profile` |
| `POST /v1/me/convert-password` | auth, anonymous only (the token's `is_anonymous` and, re-checked, the Auth Admin API user), rate limit 10/hour per IP (`me.convert_password`) | `{ password }` (strict; the sign-up policy: 8–72 characters, `Password` in `@zivali/validation`) | `204`. C7 §6: needs the address the client set first with `updateUser({ email })` (`new_email` pending), sets the password with the Admin API (`PUT /auth/v1/admin/users/:id`), audited (`user.password.convert`, no secret). `FORBIDDEN` for an account or without a pending address; GoTrue's own refusal (`weak_password`) is `VALIDATION` with `details.auth_code` and an issue on `password`; `SERVICE_UNAVAILABLE` without `SUPABASE_SECRET_KEY` |
| `GET /v1/admin/users?query=&cursor=&limit=` | moderator, aal2 | `query` = display_name substring or exact email | `{ items: AdminUser[], next_cursor }` (`AdminUser` = profile columns for moderation: id, display_name, role, created_at, `email_masked`, `is_anonymous`; no phone, no `banned_at` until a ban column lands; defined in `packages/types/src/domain/`, TASK-6.5) |
| `PUT /v1/admin/users/:id/role` | admin, aal2 | `{ role, note }` (strict; `note` trimmed, 1–500 chars) | `{ id, role }` (audited; last admin protected) |
| `GET /v1/admin/audit-log?actor_id&action&target_type&target_id&cursor&limit` | admin, aal2 | - | `AuditLogList` = `{ items, next_cursor }` |
| `GET /v1/admin/queues` | admin, aal2 | - | `AdminQueues` (job queue state) |

Admin lists take `limit`; `cursor` is the last returned item's `id`.

Errors: `UNAUTHENTICATED`, `VALIDATION` (radius 1–25, locale sl/en, password), `FORBIDDEN`, `AAL2_REQUIRED`, `CONFLICT` (last admin), `NOT_FOUND`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE` (convert-password without the Admin API key).

## Client (`@zivali/api/auth` + `@zivali/api/me`)

```ts
// Start-up: configureAuth(supabase, store) resets the API cache on user change and refetches `me` after MFA / USER_UPDATED.
// Supabase Auth directly (session handling stays in supabase-js):
signUpWithEmail(email, password, { locale, captchaToken?, redirectTo? }), signInWithEmail(email, password),
signInWithGoogle({ redirectTo? } | { idToken, nonce? }), signInWithApple({ redirectTo? } | { idToken, nonce? }),   // idToken = native sign-in
signInAnonymously(captchaToken?),
requestPasswordReset(email, { redirectTo?, captchaToken? }),   // no locale: the recovery email is localised from user_metadata.locale
signOut(cleanup?)               // runs DELETE /v1/push-tokens with body { token } (C10) and the mobile wipe (C17)
mfa.enroll(), mfa.challengeAndVerify(factorId, code)
// API:
getMe(api): Promise<Me>, updateMe(api, patch): Promise<Me>
convertAnonymousPassword(client, { password }): Promise<void>   // @zivali/api/me, a plain call (C7 §6, lib/auth convertAnonymous)
```
Hooks (same names on web and mobile): `useSession(): { session, me, isAnonymous, isVerified, role, aal, loading }`, `useRequireAuth({ verified?, role?, aal2? })` returns `gate`: `ok | loading | signin | verify | forbidden | aal2 | error` (anonymous counts as signed out; `forbidden` = role is not MODERATOR or ADMIN, as in `requireRole`).

Supabase errors become `ApiError` with C1 codes (`details.auth_code` keeps the original; `reauthentication_needed` is `UNAUTHENTICATED`).

## Draft hand-off (FR-005 R-005.2)

Clients keep report drafts locally (C4 §Drafts, C17). When a signed-out visitor submits, the app routes to sign-in or sign-up with `?next=<route>`; after sign-in the draft is restored and submitted. Nothing is sent before sign-in.

## Example

```json
// GET /v1/me
{ "id": "1b9c…", "display_name": "Ana", "locale": "sl", "role": "USER", "email": "ana@example.si", "email_verified": true,
  "is_anonymous": false, "aal": "aal1", "home": { "lat": 46.06, "lng": 14.51 }, "home_radius_km": 5, "phone": null }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-54: client block updated to the implemented @zivali/api/auth (configureAuth, redirectTo, native idToken, signOut cleanup, gate states, ApiError mapping) |
| 1.2 | 2026-10-15 | CH-92: signOut cleanup runs DELETE /v1/push-tokens with body { token } |
| 1.3 | 2026-10-15 | CH-102: `home_point` typed `extensions.geography(Point,4326)` |
| 1.4 | 2026-10-15 | CH-121: `email_verified` from `auth.users.email_confirmed_at`, never `user_metadata` |
| 1.5 | 2026-10-15 | CH-129: email copy reference §5 → §3; production redirect allow-list (`https://<APP_URL>/**`, `zivali://**`; `exp://` local/staging only); `secure_password_change = true`; locale reaches auth emails via the Admin API |
| 1.6 | 2026-10-15 | CH-145: GET /v1/admin/audit-log and /v1/admin/queues, role body {role, note}, AdminUser email_masked + is_anonymous (no banned_at yet), limit/cursor, users query, errors NOT_FOUND and RATE_LIMITED |
| 1.7 | 2026-10-16 | TASK-17.12: `POST /v1/me/convert-password` (anonymous only, pending address, Admin API, 10/hour per IP, audited) for the C7 §6 conversion under `secure_password_change`; client `convertAnonymousPassword`; `reauthentication_needed` → `UNAUTHENTICATED`; error `SERVICE_UNAVAILABLE` |
