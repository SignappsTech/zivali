// TASK-86.1: what POST /v1/photos needs besides the sha256 (C5), so a queued photo can be registered at send time.
export default `alter table outbox_photos add column width integer not null default 0;
alter table outbox_photos add column height integer not null default 0;
alter table outbox_photos add column bytes integer not null default 0;`;
