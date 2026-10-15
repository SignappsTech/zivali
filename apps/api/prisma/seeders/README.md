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

## 01-geo: GURS regions and municipalities (all environments)

Runs the SQL that `scripts/geo-to-sql.mjs` generates from `supabase/seed/geo/regions.geojson` and `municipalities.geojson` (12 regions, 212 municipalities; `on conflict (id) do update`, so reruns are safe). Licence and required attribution: [supabase/seed/geo/LICENSE.md](../../../../supabase/seed/geo/LICENSE.md).

## 20-collab: matching, chat and notification fixtures (local only)

Does nothing without the fixture users (00-users). Always creates nearby-alert subscriptions for `owner@` (Ljubljana, 5 km, dog and cat), `finder@` (10 km, dog) and `owner2@` (Maribor, 3 km, cat, paused); each centre is coarsened once on insert (C6). With the reports from 10-reports (TASK-6.6) it pairs `owner@`'s lost reports with `finder@`'s found or sighted reports of the same species and adds a suggested match, a confirmed match with the owner's `confirm` feedback, that match's conversation (owner and finder, three messages, the last one unread by the owner) and the notifications `match_suggested` and `chat_message` (owner) and `match_confirmed` (finder). Without reports it seeds the alerts only. Reruns change nothing (natural keys, fixed message ids `…-8000-c…`).

## 05-directory: responsible-shelter directory (all environments)

Loads `data/shelters.csv` and `data/municipality_shelters.csv` (17 shelters, 212 municipalities, 74 confirmed; sources and the species rule in [data/README.md](data/README.md)) through `DirectoryDomain.loadInitialDirectory`. Only missing rows are created, each with version 1 and a `directory_changes` entry (`actor_id` null); existing rows are kept, so reruns are safe and admin edits (TASK-89) survive. Needs 01-geo.
