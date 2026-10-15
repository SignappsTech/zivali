# Seeders

`prisma db seed` (`pnpm db:seed`, also part of `pnpm db:reset`) runs `NN-<name>.seeder.ts` in file-name order. Each seeder default-exports an idempotent async function; each task owns its own file (C1).

## 00-users: fixture users (local only)

Created in the local Supabase Auth through the Admin API (a `service_role` token signed with the local `SUPABASE_JWT_SECRET`), with confirmed emails, fixed ids and a profile each. The seeder does nothing unless `APP_ENV=local` and `SUPABASE_URL` and `SUPABASE_JWT_SECRET` are set. Other seeders and tests can import `fixtureUsers` for the ids.

Password for all: `zivali-local-only`.

| Email                 | Id (`00000000-0000-4000-8000-…`) | Role             | TOTP |
| --------------------- | -------------------------------- | ---------------- | ---- |
| `owner@zivali.test`   | `…000000000001`                  | `USER`           | -    |
| `owner2@zivali.test`  | `…000000000002`                  | `USER`           | -    |
| `finder@zivali.test`  | `…000000000003`                  | `USER`           | -    |
| `shelter@zivali.test` | `…000000000004`                  | `SHELTER_MEMBER` | -    |
| `mod@zivali.test`     | `…000000000005`                  | `MODERATOR`      | yes  |
| `admin@zivali.test`   | `…000000000006`                  | `ADMIN`          | yes  |

### Local TOTP for mod and admin

Staff routes need `aal2` (C3). The seeder gives `mod@` and `admin@` a verified TOTP factor named `local` with the secret:

```
ZIVALILOCALONLYZIVALILOCALONLYAA
```

Add it to an authenticator app as a manual key (time-based, 6 digits, 30 s), or use the otpauth URI `otpauth://totp/Zivali:mod@zivali.test?secret=ZIVALILOCALONLYZIVALILOCALONLYAA&issuer=Zivali`. From a shell: `oathtool --totp -b ZIVALILOCALONLYZIVALILOCALONLYAA`. Sign in with the password (aal1), then enter the code at the MFA challenge to step up to aal2.

API tests do not need real TOTP: `signTestToken({ sub, aal: 'aal2' })` signs an aal2 token directly.

This secret and password exist only in the local stack; staging and production skip the seeder (`APP_ENV`).
