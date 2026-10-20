-- task: TASK-30.10
-- rollback: delete the newer duplicates first (keep the oldest row per owner_id, sha256; queue retention.purge for
-- their objects), then: create unique index "photos_owner_id_sha256_key" on app.photos (owner_id, sha256);
-- An image already on an open report gets its own row for the owner's next report (POST /v1/photos dedupes only to a
-- row another report may take), so (owner_id, sha256) is no longer unique. The index on sha256 stays.
DROP INDEX "photos_owner_id_sha256_key";
