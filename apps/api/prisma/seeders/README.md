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

## 05-directory: responsible-shelter directory (all environments)

Loads `data/shelters.csv` and `data/municipality_shelters.csv` (17 shelters, 212 municipalities, 74 confirmed; sources and the species rule in [data/README.md](data/README.md)) through `DirectoryDomain.loadInitialDirectory`. Only missing rows are created, each with version 1 and a `directory_changes` entry (`actor_id` null); existing rows are kept, so reruns are safe and admin edits (TASK-89) survive. Needs 01-geo.

## 10-reports: fixture reports, pets and photos (local only)

Needs the fixture users (00-users) and the geo data (01-geo). Fixed ids, so reruns skip existing rows:

- 5 pets (`00000000-0000-4000-8000-2…01`–`05`): Piki, Luna, Rex for `owner@`; Megi, Muri for `owner2@`.
- 30 open reports (`00000000-0000-4000-8000-1…01`–`30`) across Slovenia, written through `ReportsDomain.insertReport` (coarsened and fuzzed like real ones; short codes are random on the first run): 1–12 lost (`owner@`, `owner2@`; 1, 5 and 7 with a reward), 13–17 found and 18–21 sighted (`finder@`; 18 and 19 link to lost 1 and 8), 22–26 found by `shelter@` (source `organisation`, manager role `staff`), 27–30 by `mod@` and `admin@`.
- Chip pairs for matching: lost 1 (Piki) and found 13 share `705098100012345`; lost 7 (Megi) and found 22 share `705098100067890`.
- 27 published photos from `data/photos/` (licences in [data/photos/LICENSE.md](data/photos/LICENSE.md)), put in the media bucket at `r/<report_id>/<photo_id>/display.jpg` on every run; `public_thumb_url` is the same JPEG until the photo worker (TASK-14.1). With `STORAGE_PROVIDER=minio` they are served from `http://127.0.0.1:9000/zivali-media/…` (or `MEDIA_BASE_URL`); with the default memory adapter the rows exist but the URLs do not resolve.
