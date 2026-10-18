-- task: TASK-114.5
-- rollback: update app.photos set report_id = null, public_display_url = null, public_thumb_url = null, status = case when status = 'published' then 'unpublished'::app."PHOTO_STATUS" else status end where pet_id is not null and report_id is not null; alter table app.photos add constraint photos_one_parent check (pet_id is null or report_id is null);
-- (then queue retention.purge for their media copies r/<report_id>/<photo_id>/*, listed before the update)
-- A pet's photo may also be on one report (a lost report of the pet shows the pet's photos, C5), so the row keeps
-- both links. No new table: RLS is already on.
alter table app.photos drop constraint photos_one_parent;
