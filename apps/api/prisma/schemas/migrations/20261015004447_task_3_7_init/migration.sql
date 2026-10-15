-- task: TASK-3.7
-- rollback: drop schema pgboss cascade; drop schema app cascade; drop extension if exists vector; drop extension if exists postgis;
-- Database lockdown (ADR-021): app tables live in `app`, pg-boss in `pgboss`; neither is exposed by PostgREST nor
-- granted to anon/authenticated. Supabase's `public` schema is not touched.

-- Supabase already has `extensions` (and pgcrypto in it); the shadow database of `migrate dev` does not.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists app;
create schema if not exists pgboss;

revoke all on schema app, pgboss from public, anon, authenticated;
alter default privileges in schema app revoke all on tables from anon, authenticated;
