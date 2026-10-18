-- task: TASK-114.5
-- rollback: update app.photos set report_id = null where pet_id is not null and report_id is not null; alter table app.photos add constraint photos_one_parent check (pet_id is null or report_id is null);
-- A pet's photo may also be on one report (a lost report of the pet shows the pet's photos, C5), so the row keeps
-- both links. No new table: RLS is already on.
alter table app.photos drop constraint photos_one_parent;
