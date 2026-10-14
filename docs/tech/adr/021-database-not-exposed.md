# ADR-021: Supabase as database and auth only; app tables in a non-exposed schema with deny-all RLS

- Status: Accepted · Date: 2026-10-15 · Owner: Tech Lead
- Source: brief v1.0 §Technical (client decision 2026-10-15), NFR-SEC, NFR-PRIV; security must-have from the Project Lead

## Context

With the Express API (ADR-020) all reads and writes go through our code, which checks permissions. Supabase still runs PostgREST and pg_graphql, which expose every table in the exposed schemas to anyone holding the public anon/publishable key (it ships in every web and mobile build). A table in `public` without RLS would be readable and writable by the world.

## Decision

Defence in depth, three layers, all tested:

1. **Non-exposed schema.** All application tables, enums, functions and views live in schema `app` (Prisma `schemas = ["app"]`). pg-boss uses schema `pgboss`. Neither is in PostgREST's exposed schemas (`[api] schemas` in `supabase/config.toml`, Dashboard → API → Exposed schemas in cloud: `public` only, and `public` holds no tables). `graphql_public` stays disabled for app data.
2. **No grants.** A migration runs `revoke all on schema app, pgboss from anon, authenticated, public` and `alter default privileges in schema app revoke all on tables from anon, authenticated`. The API connects as the `postgres` owner role (direct or session-pooler connection) and is the only client of these schemas.
3. **Deny-all RLS.** Every table in `app` has `enable row level security` and **no policies**, so even an accidental grant or exposure returns nothing. The only policies in the database are on `realtime.messages` for private chat and inbox channels (ADR-023), which call a `security definer` membership function and expose no table data.

**Tests** (in `apps/api/test/security/`, run in CI against the local stack):
- every table in `app` and `pgboss` has RLS enabled and zero policies (catalog query);
- roles `anon` and `authenticated` have no `USAGE` on `app` or `pgboss` and no table privileges there;
- HTTP: `GET <SUPABASE_URL>/rest/v1/reports` and an OpenAPI root fetch with the anon key expose no `app` tables (404 or empty), and `POST` is refused;
- the same three checks run against staging in the deploy smoke test (read-only).

## Alternatives

- Tables in `public` with RLS policies for every role (the old ADR-003): two authorisation systems to keep in sync with the API.
- Disable PostgREST: not possible on Supabase cloud; removing `public` from exposed schemas is possible but `public` stays harmless when empty.

## Consequences

- Supabase Studio's table editor still works (it uses the postgres role).
- Prisma must not create anything in `public`; a lint step fails on `@@schema("public")`.
- Supabase Realtime Postgres Changes cannot read `app` tables (no grants); chat uses Broadcast instead (ADR-023).
