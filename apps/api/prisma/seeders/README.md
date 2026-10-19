# Seeders

`prisma db seed` (`pnpm db:seed`, also part of `pnpm db:reset`) runs `NN-<name>.seeder.ts` in file-name order. Each seeder default-exports an idempotent async function; each task owns its own file (C1).

Every staging and production deploy runs the same seed right after `prisma migrate deploy` (`deploy/remote.sh`, from the bundle in `dist/seed/`), so reference data never needs a manual write to a hosted database. There only the seeders marked "all environments" write; the others check `APP_ENV=local` first. Reruns must change nothing and keep admin edits (`test/seeders/seed.test.ts`). A seeder that reads files does so relative to its own file; the Dockerfile copies that data into `dist/seed/` (add a new data folder there), and other seeders must not import it (`tsup.config.ts`).

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

## 02-geo-places: GURS settlements, districts, streets and house numbers (all environments)

Streams the snapshot `supabase/seed/geo/places.ndjson.gz` and `addresses.tsv.gz` (`scripts/geo-places.mjs`; 16,598 places, 580,251 house numbers) into `geo_places` and `geo_addresses` (C6, geocoder). Writes only new or changed rows and rebuilds the `geo_places` indexes only after a write, so a rerun writes nothing; about half a minute either way. Needs 01-geo.

## 20-collab: matching, chat and notification fixtures (local only)

Does nothing outside `APP_ENV=local` or without the fixture users (00-users). Always creates nearby-alert subscriptions for `owner@` (Ljubljana, 5 km, dog and cat), `finder@` (10 km, dog) and `owner2@` (Maribor, 3 km, cat, paused); each centre is coarsened once on insert (C6). With the reports from 10-reports (TASK-6.6) it pairs `owner@`'s lost reports with `finder@`'s found or sighted reports of the same species and adds a suggested match, a confirmed match with the owner's `confirm` feedback, that match's conversation (owner and finder, three messages, the last one unread by the owner) and the notifications `match_suggested` and `chat_message` (owner) and `match_confirmed` (finder). Without reports it seeds the alerts only. Reruns change nothing (natural keys, fixed message ids `…-8000-c…`).

## 05-directory: responsible-shelter directory (all environments)

Loads `data/shelters.csv` and `data/municipality_shelters.csv` (17 shelters, 212 municipalities, 74 confirmed; sources and the species rule in [data/README.md](data/README.md)) through `DirectoryDomain.loadInitialDirectory`. Only missing rows are created, each with version 1 and a `directory_changes` entry (`actor_id` null); existing rows are kept, so reruns are safe and admin edits (TASK-89) survive. Needs 01-geo.

## 10-reports: fixture reports, pets and photos (local only)

Needs the fixture users (00-users) and the geo data (01-geo). Fixed ids, so reruns skip existing rows:

- 5 pets (`00000000-0000-4000-8000-2…01`–`05`): Piki, Luna, Rex for `owner@`; Megi, Muri for `owner2@`.
- 30 open reports (`00000000-0000-4000-8000-1…01`–`30`) across Slovenia, written through `ReportsDomain.insertReport` (coarsened and fuzzed like real ones; short codes are random on the first run): 1–12 lost (`owner@`, `owner2@`; 1, 5 and 7 with a reward), 13–17 found and 18–21 sighted (`finder@`; 18 and 19 link to lost 1 and 8), 22–26 found by `shelter@` (source `organisation`, manager role `staff`), 27–30 by `mod@` and `admin@`.
- Chip pairs for matching: lost 1 (Piki) and found 13 share `705098100012345`; lost 7 (Megi) and found 22 share `705098100067890`.
- 27 published photos from `data/photos/` (licences in [data/photos/LICENSE.md](data/photos/LICENSE.md)), put in the media bucket at `r/<report_id>/<photo_id>/display.jpg` on every run; `public_thumb_url` is the same JPEG until the photo worker (TASK-14.1). With `STORAGE_PROVIDER=minio` they are served from `http://127.0.0.1:9000/zivali-media/…` (or `MEDIA_BASE_URL`); with the default memory adapter the rows exist but the URLs do not resolve.

## 30-commerce: house ads (all environments) and commerce fixtures (local only)

- House ads (C14), ids `00000000-0000-4000-a000-000000000101`…`106`: `supporter`, `partner` and `adopt`, each in SL and EN, active in every slot. Created once and never overwritten, so admin edits survive a rerun. The copy is a **placeholder for the content strategist**.
- Local only (`APP_ENV=local`): two made-up sponsor ads, `…201` (dogs, region 8 osrednjeslovenska, `detail` and `feed`) and `…202` (cats, region 2 podravska, `feed` and `sidebar`); a verified shelter organisation `…301` in Ljubljana with `shelter@zivali.test` as its admin. These need the fixture profiles (00-users; skipped with a warning without them) and municipality 61 (01-geo).

## 40-matching-rescore: re-score stored match suggestions (all environments)

Not reference data: a one-off per matching algorithm version (TASK-114.22, evidence rule). `MatchingDomain.rescoreSuggestions` re-scores the `suggested` matches without a chip whose `algo_version` is older than `MATCH_ALGO_VERSION` (`v3` since TASK-43.1, visual similarity), including rows an old worker writes during the deploy window. A pair that no longer passes (a contradiction, no attribute known on both sides, or a score below `matching.threshold`) is deleted, so it leaves the managers' list until `match.report` finds it again; the others get the new score, strength and `v3`. Rows of the current version are never touched, so a threshold an admin raises later never deletes them on a deploy. It never inserts a pair or sends a notification; confirmed, rejected and closed matches and chip pairs are left alone. A failure is logged (`matching rescore failed`) and does not stop the deploy; the rows stay old, so the next deploy retries. A rerun changes nothing. Locally it also turns 20-collab's suggested fixture (a chip pair stored as a plain v1 one) into the chip match it is.

## 41-embedding-backfill: queue the photo-vector backfill (all environments)

Not reference data (C20 §Jobs, TASK-42.3). When the embedder is on and an eligible photo (accepted or published, on a report or a pet, with a clean `ai_results` safety check) lacks a vector for `embedding.model`, it sends one `embedding.backfill { model }` job (one `limit 1` query); otherwise it does nothing. It never calls the embedder itself: the worker runs the pass in pages of 500 by photo id, at most `embedding.backfill_per_minute` `photo.embed` jobs a minute, and logs `embedding.backfill.done { model, remaining }` at the end. **Off while the embedder is off**: in staging and production set `EMBEDDER_PROVIDER=off` or leave it unset (unset outside `APP_ENV=local` is off), so they queue nothing until Voyage is wired (TASK-40.7). `mock` is never an option there: the deployed images run with `NODE_ENV=production`, which refuses `mock` at boot; only without `NODE_ENV=production` does `mock` outside `APP_ENV=local` resolve to off. The job itself also stops at once with the embedder off. A failure is logged (`embedding backfill not queued`) and does not stop the deploy, and the seeder always stops pg-boss again (`stopJobs()`; its timers would keep the seed process, and the deploy, from exiting). A rerun with nothing missing sends nothing; one during a running pass starts a second pass, which makes no second embedder call (`photo.embed` skips the models a photo has).

By hand (a model change, or after `remaining` > 0): `pnpm --filter api jobs:send embedding.backfill '{"model":"…"}'` (`"prune": true` to drop the vectors of retired models, `"after": "<photo id>"` to resume a pass).

Model change without downtime: set `embedding.next_model` (new photos get both vectors) → backfill it → after `remaining: 0`, set `embedding.model` to it and clear `next_model` → backfill with `prune: true`. Watch `hnsw.max_scan_tuples` (TASK-42.2 review): an iterative HNSW scan stops after that many visited tuples (pgvector default 20,000), which caps the recall of `nearest` (search by photo; matching's `similarity` is exact and unaffected) above about 50k photos. Between `next_model` and the prune the index holds two vectors per photo and each scan also walks the other model's, so the cap bites at about half that: prune soon after the switch, and raise the setting (`set local hnsw.max_scan_tuples` in `hnswSettings`) before a model change at that size.
