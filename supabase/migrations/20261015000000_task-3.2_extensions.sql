-- task: TASK-3.2
-- rollback: drop extension if exists pg_net, pg_cron, pgmq, vector, postgis; (pgcrypto ships with Supabase, keep it)
-- Platform extensions every later migration relies on (C1 §Migrations). pgtap is enabled by the tests only.
create extension if not exists postgis with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pgmq;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create extension if not exists pgcrypto with schema extensions;
