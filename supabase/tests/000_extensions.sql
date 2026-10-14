-- task: TASK-3.2
begin;
select plan(1);

select set_has(
  $$ select extname::text from pg_catalog.pg_extension $$,
  $$ values ('postgis'), ('vector'), ('pgmq'), ('pg_cron'), ('pg_net'), ('pgcrypto') $$,
  'platform extensions are installed'
);

select * from finish();
rollback;
