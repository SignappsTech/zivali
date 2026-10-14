source: docs/04-technical-design.md§Authentication and authorization (C3), ADR-005, ADR-018, FR-001

# C3 Auth, profiles, roles and sessions

## Tables

```sql
create type user_role as enum ('user','shelter_member','moderator','admin');
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  locale text not null default 'sl' check (locale in ('sl','en')),
  role user_role not null default 'user',
  home_point geography(Point,4326),           -- private
  home_radius_km int not null default 5 check (home_radius_km between 1 and 25),
  phone text,                                 -- private, never public, never in analytics
  is_anonymous boolean not null default false,
  supporter_badge_visible boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
```
- Trigger on `auth.users` insert creates the profile (`locale` from `raw_user_meta_data.locale`, `is_anonymous` from the auth row).
- RLS: a user selects and updates only their own row; `role` is not updatable by the user (column check in trigger); staff (aal2) select all; admin updates role via `set_user_role(user_id, role)` (audited, last-admin protected).
- Public display name for listings and chat comes from RPCs (`display_name` or "Najditelj"/"Finder"), never the table.

## JWT claims

| Claim | Source |
|---|---|
| `sub` | user id |
| `is_anonymous` | Supabase Auth |
| `aal` | `aal1` / `aal2` (TOTP verified) |
| `user_role` | custom access token hook from `profiles.role` |

## Auth configuration (local `supabase/config.toml`; cloud mirrors it)

- Email + password, `enable_confirmations = true`; anonymous sign-ins enabled; MFA TOTP enroll/verify enabled; custom access token hook `public.custom_access_token_hook`.
- Providers Google, Apple: enabled only when `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `…APPLE…` are set (credential-gated).
- Captcha (Turnstile): off locally, on in cloud for sign-up and anonymous sign-in.
- Redirect URLs: `APP_URL/**`, `zivali://**`, Expo dev URLs.
- Email templates (confirm, recovery, magic link, email change, reauthentication, and the identity-linked security notice) in `supabase/templates/*.html`, copy from `docs/content/notifications-and-emails.md` §5; verify the available variables (`{{ .Provider }}`, `{{ .NewEmail }}`) against the deployed Supabase version; localised with `{{ if eq .Data.locale "en" }}…{{ else }}…{{ end }}`.

## Client API (`@zivali/api/auth`)

```ts
signUpWithEmail(email: string, password: string, opts: { locale: 'sl'|'en'; captchaToken?: string }): Promise<void>
signInWithEmail(email: string, password: string): Promise<Session>
signInWithGoogle(): Promise<void>                 // web OAuth redirect; mobile native id token → signInWithIdToken
signInWithApple(): Promise<void>                  // same pattern; iOS only on mobile
signInAnonymously(captchaToken?: string): Promise<Session>   // finders (C7)
requestPasswordReset(email: string, locale): Promise<void>
signOut(): Promise<void>                          // also unregisters this device's push token (C10)
getMyProfile(): Promise<Profile>
updateMyProfile(patch: Partial<Pick<Profile,'displayName'|'locale'|'homePoint'|'homeRadiusKm'|'phone'>>): Promise<Profile>
mfa: { enroll(): Promise<{ qrSvg: string; factorId: string }>, challengeAndVerify(factorId: string, code: string): Promise<void> }
```

Hooks (per app, same names): `useSession(): { session, user, profile, isAnonymous, isVerified, role, aal, loading }`, `useRequireAuth({ verified?: boolean, role?: UserRole, aal2?: boolean })`.

Errors: `UNVERIFIED_EMAIL` (chat, alerts), `FORBIDDEN`, `RATE_LIMITED` (reset).

## Draft hand-off (FR-005 R-005.2)

Clients keep report drafts locally (C4 §Drafts). When a signed-out visitor submits, the app routes to sign-in/up with `?next=<route>`; after sign-in the draft is restored and submitted. Nothing is sent to the server before sign-in.

## Example

```ts
const { profile, isVerified } = useSession();
if (!isVerified) showVerifyEmailPrompt();   // chat and alerts blocked, drafts allowed
```
