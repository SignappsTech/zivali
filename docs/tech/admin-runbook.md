# Admin runbook: lost authenticator (ADR-018, TASK-34.6)

Staff (admins, moderators) sign in with Supabase TOTP (aal2). Supabase TOTP has no backup codes, so recovery works in two layers.

## Prevention: a backup authenticator

Every staff member enrols a **second TOTP factor** (another phone or a password manager) on the console dashboard, card "Rezervni avtentikator" (admin.backup_*). Supabase allows several verified factors; a code from either one signs in. Do this right after the first enrolment.

## Lost device, no backup factor

1. The person tells another admin (or the owner) out of band (phone call, in person). Confirm identity before acting.
2. The admin or owner runs, from a checkout with the target environment's `apps/api/.env.local` (never on a shared machine):

   ```
   pnpm admin:create --reset-mfa <email>                                  # local stack
   pnpm admin:create --reset-mfa <email> --i-know-this-is-production      # any other target
   ```

   Against a non-local target the script refuses without the flag and asks you to retype the email at an interactive prompt (same guards as the bootstrap). It deletes all of the person's MFA factors through the Supabase Auth Admin API and writes an audit entry (`admin.mfa.reset`, actor = system, target = the profile, no secrets).
3. The person signs in again: the console shows the enrolment screen. They scan the new QR code, confirm the first code, then add a backup authenticator on the dashboard.
4. Check the audit log (admin.mfa.reset) and, if the device may be in someone else's hands, also change the person's password and sign out other sessions in Supabase Auth.

Sessions already at aal2 stay valid until the access token expires (at most 1 h).

## Only admin lost the device

If the only admin is locked out, the owner runs the same command with the service credentials (`SUPABASE_SECRET_KEY`) for the target environment. Never edit `auth.mfa_factors` by hand.
