# ADR-018: Roles in a JWT claim; admins and moderators require TOTP (AAL2)

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: FR-001 R-001.3, FR-019 R-019.1, TASK-34 AC#3, NFR-SEC

## Decision

- `profiles.role` enum `user | shelter_member | moderator | admin` (organisation-level roles live in `organisation_members.role` from M3). A **Supabase custom access token hook** (`public.custom_access_token_hook`) copies it into the JWT claim `user_role`; RLS reads `auth.jwt() ->> 'user_role'`. Role changes take effect on the next token refresh (≤ 1 h; the admin UI forces sign-out of the target user).
- **Strong authentication**: Supabase Auth MFA with TOTP. Admin and moderator RLS policies and RPCs require `auth.jwt() ->> 'aal' = 'aal2'`; the admin area sends users without a verified factor to enrolment, and users with a factor to the challenge screen.
- **Bootstrap**: `pnpm admin:create <email>` (service role, local or with the target environment's credentials) sets the role on an existing account; there is no public path to admin. The last admin cannot be demoted (trigger).
- Every admin or moderator write goes through RPCs that call `audit(action, target_type, target_id, diff)`.

## Alternatives

- Roles only in a table with a join per RLS check: slower, more complex policies.
- WebAuthn/passkeys: better UX later; Supabase TOTP is available now and offline locally.

## Consequences

- TOTP needs no external service; works on the local stack.
- Admins need an authenticator app (documented in the runbook).
