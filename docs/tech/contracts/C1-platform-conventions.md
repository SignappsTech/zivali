source: docs/04-technical-design.md§Interfaces and contracts (C1), ADR-003, ADR-004, docs/05-quality-security-plan.md§Security

# C1 Platform conventions

Applies to every migration, RPC, Edge Function and job. Owner: TASK-6 (platform task); later tasks extend, never fork.

## Migrations

- File: `supabase/migrations/<YYYYMMDDHHMMSS>_<task-id>_<slug>.sql`, forward-only. First line: `-- task: TASK-x.y` ; second: `-- rollback: <how to undo, or "forward fix only">`.
- Never edit a merged migration; add a new one. `CREATE OR REPLACE FUNCTION` in a new migration is how a later task changes a function body.
- Extensions (first migration): `postgis`, `vector`, `pgmq`, `pg_cron`, `pg_net`, `pgcrypto`, `pgtap` (tests only, schema `extensions`).
- Every table: `id uuid primary key default gen_random_uuid()` (except natural keys), `created_at timestamptz not null default now()`, `updated_at` + trigger `set_updated_at()` when mutable. Enums as Postgres enums with the names in this contract set.
- After a migration change: `pnpm gen:types` regenerates `packages/types/src/database.ts`. On merge conflicts in that file, regenerate, never hand-merge.

## RLS templates

`alter table … enable row level security;` in the same migration as `create table`. Helpers (all `stable security definer set search_path = ''`):

| Helper | Meaning |
|---|---|
| `auth_role()` | `auth.jwt() ->> 'user_role'` (default `'user'`) |
| `is_staff(min_role text)` | role ≥ `moderator` / `admin` **and** `auth.jwt() ->> 'aal' = 'aal2'` |
| `is_anonymous_user()` | `(auth.jwt() ->> 'is_anonymous')::boolean` |
| `can_manage_report(report_id uuid)` | caller in `report_managers` |
| `email_verified()` | caller is anonymous or `auth.users.email_confirmed_at is not null` |

Policy patterns:

```sql
-- owner-owned row
create policy "own rows" on pets for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- staff read
create policy "staff read" on abuse_reports for select to authenticated using (is_staff('moderator'));
-- public data only through security definer RPCs; never "to anon using (true)" on tables with personal data
```

A pgTAP test (`supabase/tests/000_rls_enabled.sql`) fails if any table in `public` has `relrowsecurity = false`.

## RPC conventions

- `security definer`, `set search_path = ''`, fully qualified names, explicit `auth.uid()` checks, input validated (types + `check` constraints + explicit checks).
- Errors: `raise exception using errcode = 'P0001', message = json_build_object('code','RATE_LIMITED','message','Too many reports','details', json_build_object('retry_after_s', 1800))::text;`
- Stable error codes: `VALIDATION`, `NOT_FOUND`, `GONE`, `FORBIDDEN`, `UNVERIFIED_EMAIL`, `RATE_LIMITED`, `CAPTCHA_FAILED`, `CONFLICT`, `DUPLICATE_OPEN_REPORT`, `MIN_AMOUNT`, `LIVE_MODE_FORBIDDEN`, `INTERNAL`. `@zivali/api` parses them into `ApiError { code, message, details }`; UIs map `code` to `errors.<code>` i18n keys.
- Writes accept optional `p_client_request_id uuid`; a repeat returns the first result.

## app_config

`app_config(key text primary key, value jsonb not null, description text)`; read by `get_config(key)` (public keys whitelisted via `is_public boolean`), written only by admins (audited). Each feature migration inserts its defaults with `on conflict do nothing`. Keys use dotted names: `fuzz.lost_min_radius_m`, `rate.anon_report_per_hour`, `matching.threshold`, …

## Rate limits

```sql
check_rate_limit(p_key text, p_limit int, p_window interval) returns void  -- raises RATE_LIMITED
```
Fixed-window counter in `rate_limits(key, window_start, count)`. Keys: `<action>:<scope>:<value>`, with IP and device values hashed: `encode(hmac(value, <vault secret 'rate_salt'>, 'sha256'), 'hex')`. Helpers `request_ip()` (first `x-forwarded-for` entry, else `cf-connecting-ip`) and `request_device_id()` (`x-device-id` header, uuid) read `current_setting('request.headers', true)`. Rows purged after 48 h.

## Audit

`audit_log(id, actor_id, action text, target_type text, target_id uuid, diff jsonb, at timestamptz)`; insert only through `audit(action, target_type, target_id, diff)`; select for admins (aal2). Every staff write and every `app_config` change is audited.

## Job queue (ADR-004)

```sql
enqueue_job(p_type text, p_payload jsonb, p_dedupe_key text default null) returns bigint
```
- Types (registry fixed in TASK-6, stub handlers): `match_report`, `notify`, `fanout_alerts`, `photo_uploaded`, `publish_photos`, `lifecycle_tick`, `purge_retention`, `refresh_partner_stats`, `payment_effects`.
- Dedupe: same `(type, dedupe_key)` within 10 minutes is ignored (`job_dedupe` table).
- Handler contract (`supabase/functions/worker/handlers/<type>.ts`):

```ts
export default async function handle(payload: unknown, ctx: JobContext): Promise<void>
// JobContext = { db: SupabaseClient /* service role */, log, adapters, now: () => Date, enqueue }
// must be idempotent; throw to retry; after 5 attempts → jobs_dead
```
- Local: `pnpm db:drain` runs the worker until the queue is empty (tests and e2e use it).

## Data inventory

`supabase/data-inventory.json`, one entry per table and bucket:

```json
{ "reports": { "category": "report", "personal": true, "basis": "contract",
  "retention": "exact_point and photos 12 months after close", "export": "owner", "delete": "close + anonymise" } }
```
pgTAP test fails if a `public` table or a storage bucket is missing.

## Seed

`supabase/seed/NN-<task-id>-<slug>.sql` (globbed by `config.toml`), each task owns its file; photos uploaded by `scripts/seed-photos.mjs` (local service role). Fixture users (password `zivali-local-only`): `owner@zivali.test`, `owner2@zivali.test`, `finder@zivali.test`, `shelter@zivali.test`, `mod@zivali.test`, `admin@zivali.test` (admin/mod TOTP secret documented in the seed README for local only).

## Example

```sql
-- 20261020120000_@@platform-lc@@_platform.sql
-- task: @@platform@@
-- rollback: drop function check_rate_limit; drop table rate_limits;
create table public.rate_limits (key text not null, window_start timestamptz not null, count int not null default 0,
  primary key (key, window_start));
alter table public.rate_limits enable row level security;  -- no policies: only security definer functions touch it
```
