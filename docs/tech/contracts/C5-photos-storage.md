source: docs/04-technical-design.md§Data model (photos), ADR-014 (R2), ADR-022 (jobs); FR-003

# C5 Photos and storage (Cloudflare R2, presigned uploads)

## Buckets (R2; MinIO locally; in-memory adapter in tests)

All three R2 buckets are created in the **EU jurisdiction**; the adapter and presigned URLs use `https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com` (ADR-014). `zivali-private` has a CORS rule for `PUT` and `GET` from `WEB_ORIGINS` (header `Content-Type`); MinIO locally gets the same rule.

| Bucket (env) | Public | Keys | Written by |
|---|---|---|---|
| `R2_BUCKET_PRIVATE` (`zivali-private`) | no | `uploads/<owner_id>/<photo_id>.jpg` (client upload), `variants/<photo_id>/{display.webp,display.jpg,thumb.webp}` | client via presigned PUT; worker |
| `R2_BUCKET_MEDIA` (`zivali-media`), served at `MEDIA_BASE_URL` | yes | `r/<report_id>/<photo_id>/{display.webp,display.jpg,thumb.webp}` | worker (`photo.publish`) |
| `R2_BUCKET_BACKUPS` (`zivali-backups`) | no | `pg/<yyyy-mm-dd>.dump.gz` | worker (`db.backup`) |

## Model (Prisma, schema `app`)

`Photo { id, ownerId, petId?, reportId?, position (0–4), sha256, width, height, bytes, status: pending | uploaded | accepted | rejected | published | unpublished, rejectReason?, publicDisplayUrl?, publicThumbUrl?, createdAt, updatedAt }`, unique `(ownerId, sha256)`. A photo has at most one pet and at most one report; it may have both (a pet photo shown on that pet's report). `updatedAt` (`updated_at`, `@updatedAt`) is the 24 h purge clock of unattached photos; `POST /v1/photos` answering `existing: true` touches it (CH-134, CH-189; migration 20261015172036_task_14_1_photos). The former check "not both `petId` and `reportId`" is dropped (migration 20261018000000, TASK-114.5).

## REST

| Method and path | Auth | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/photos` | user or anonymous | `{ sha256, width, height, bytes }` (`bytes` ≤ 1 MB = 1 048 576 bytes, `MAX_PHOTO_BYTES` in `@zivali/validation`; long edge ≤ 1600, short edge ≥ 320) | `201 { photo_id, upload: { url, method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expires_at } }`, or `200 { photo_id, existing: true }` only for the same owner and hash when `/complete` already succeeded (status `uploaded` or later; on an unattached photo this response restarts its 24 h purge clock, so a 23 h client re-upload does not lose it at 24 h); otherwise (never completed, failed PUT or `/complete`) a fresh upload `201` for the same `photo_id` with a new presigned URL, so an outbox retry always uploads | `VALIDATION`, `RATE_LIMITED` (60/hour) |
| `POST /v1/photos/:id/complete` | owner | - | `202 { status: 'uploaded' }` (`POST /v1/photos` creates the row as `pending`; `/complete` sets `uploaded`) and job `photo.process` | `NOT_FOUND`, `CONFLICT` (object missing in R2) |
| `GET /v1/photos/:id` | owner | - | `{ id, status, reject_reason?, thumb_url }` (`thumb_url` is a 10-minute presigned GET while private, the public URL once published) | `NOT_FOUND` |
| `DELETE /v1/photos/:id` | owner | - | `204`; objects deleted by the worker | `CONFLICT` if attached to a published report |
| `PUT /v1/pets/:id/photos`, report create/update (C4) | owner/manager | `photo_ids: uuid[]` in order | attaches and sets positions | `VALIDATION` (> 5, foreign photo) |

Shared photos (TASK-114.5): report `photo_ids` = the owner's photos on no open report (unattached, their pets' photos, or on their closed/reunited report, which is then detached from it: status `unpublished`, public URLs null, its old public copies queued to `retention.purge`, so `photo.publish` copies it anew) or photos already on this report; a photo on another open report stays refused. `PUT /v1/pets/:id/photos` = the owner's photos on no other pet (unattached or on their report) or the pet's own. Other users' photos are refused on both. One `position` column: a shared photo keeps its order relative to the other shared photos on both; every photo ordering sorts by `(position, id)`, so the cover is deterministic. Deleting a pet keeps the photos a report shows (the FK unlinks the pet); `retention.purge` "report photos 12 months after close" skips photos that are still a pet's.

**Pet photos by default (TASK-29.13, CH-348)**: a lost report of a saved pet sent with `photo_ids: []` (C4) references the pet's existing photo rows (sets `report_id` and `position`, never copies), so each keeps its original `created_at` (upload time, which decides the AI cutoff `ai.photos_since`, C19, TASK-40.11) and its `sha256` dedupe. Rejected pet photos and pet photos on another open report are skipped; a photo on the pet's ended report is detached from it as above.

**As built (CH-190)**: `DELETE /v1/photos/:id` deletes the row and queues `retention.purge { objects }` (no new queue); `CONFLICT` while the photo is `published` or its report is publishable. `GET` `thumb_url` is the private thumb's presigned GET until published (404 until the photo is accepted). A repeated `/complete` answers `202` without a second job. `public_display_url` = `display.jpg` (`display.webp` sits beside it). "Expired" = close_reason `expired`. `photo.process` deletes the upload after accept or reject (unprocessed bytes are never served or kept).

## Worker jobs (ADR-022)

- `photo.process { photo_id }`: download the upload, check JPEG magic bytes and size, verify SHA-256, then **sharp** (`rotate()` from EXIF orientation, then re-encode without metadata) → `display` (≤ 1600 px, WebP q80 + JPEG q82) and `thumb` (480 px WebP) under `variants/`; status `accepted` or `rejected` (`not_jpeg`, `too_large`, `hash_mismatch`, `decode_failed`). Hook list `PHOTO_HOOKS` (empty in M2; M3: `['ai.extract']` only, for every accepted photo; `ai.extract` chains `photo.embed`, C19 §Pipeline 7, so a photo flagged `person_prominent` or `nsfw`, or with no dog or cat, is never embedded, FR-014; M4: screening). Deleting a photo cascades its `photo_embeddings` and sets `ai_calls.photo_id` null; `ai_results` rows go in `retention.purge` once no photo row has their `sha256` (C19 §Models).
- `photo.publish { report_id }`: copy accepted variants of a visible report to the media bucket, set public URLs, status `published`; hidden, removed or expired → delete public copies, status `unpublished`. **Senders (TASK-114.32, CH-191)**: every write that changes a report's visibility or photos, through `ReportsDomain.queuePhotoPublish({ report_id }, ctx)` in the write's transaction (list in backend.md §Ownership and shared files). A PATCH whose new photo holds a visible report (`photo_match`) queues it too, so the old public copies go. End of the 30-day public window: the hourly `report.lifecycle` tick queues it for closed or reunited reports ended more than 30 days ago that still have a published photo (keyset chunks of 100; repeats until the copies are gone).
- `retention.purge`: media-bucket copies of photos that no longer belong to a report (dropped by a report PATCH `photo_ids`: detached, `report_id` null, so `photo.publish { report_id }` never unpublishes them; CH-198), uploads not attached after 24 h, pet photos of deleted pets, report photos 12 months after close.

**Account erasure (CH-201)**: `photos.owner_id` is `onDelete Cascade`, so deleting a profile drops the rows and would orphan their objects in `zivali-private` and `zivali-media`. The erasure flow queues `retention.purge { objects: photoObjects(p) }` for all of the user's photos in the same transaction, before deleting the profile.

## Client (`@zivali/api/photos`)

```ts
preparePhoto(file | asset): Promise<PreparedPhoto>        // platform code in each app: EXIF read → resize ≤ 1600, < 1 MB → sha256
uploadPhoto(client, photo: PreparedPhoto, { onProgress(fraction), signal, put }): Promise<{ photoId }>   // plain ApiClient (works from the outbox)
// POST /v1/photos → PUT to the presigned URL via `put` (default xhrPut; mobile passes FileSystem.uploadAsync) → POST /complete
// PreparedPhoto = CreatePhotoInput & { file: Blob | { uri } }
// No photoAlt(): alt text comes from the API (PublicReport.photos[].alt); labels live in i18n.
```
Offline (C17): the mobile outbox keeps `PreparedPhoto` files and calls `uploadPhoto` when it sends; the `(owner, sha256)` dedupe makes repeats safe.

## Example

```json
// POST /v1/photos → 201
{ "photo_id": "9b0e…", "upload": { "url": "https://<account>.eu.r2.cloudflarestorage.com/zivali-private/uploads/u1/9b0e….jpg?X-Amz-…", "method": "PUT",
  "headers": { "Content-Type": "image/jpeg" }, "expires_at": "2026-10-15T10:05:00Z" } }
```

## Change log

| Version | Date | Change |
|---|---|---|
| 1.1 | 2026-10-15 | CH-55: uploadPhoto signature (client, onProgress fraction, put), PreparedPhoto type; photoAlt dropped (alt from the API) |
| 1.2 | 2026-10-15 | CH-60: existing: true only after /complete succeeded; else fresh upload for the same photo_id |
| 1.3 | 2026-10-15 | CH-131: photo status adds `pending` (POST creates pending, /complete sets uploaded) |
| 1.4 | 2026-10-15 | CH-134: `existing: true` on an unattached photo resets its 24 h purge clock |
| 1.5 | 2026-10-18 | CH-494 (TASK-114.5): a photo may belong to one pet and one report; check "not both" dropped; attach rules, position and purge for shared photos |
| 1.6 | 2026-10-18 | CH-189: Photo.updatedAt; CH-190: delete, thumb_url, /complete repeat, public_display_url and process-cleanup as built; CH-198: purge media copies of photos dropped by a report PATCH; CH-201: erasure queues retention.purge for the user's photo objects |
| 1.7 | 2026-10-19 | CH-609 (TASK-29.13): a lost report with `photo_ids: []` references the pet's photo rows (original created_at, AI cutoff); CH-556: M3 hook list is `ai.extract` only, which chains `photo.embed`; CH-587 (TASK-114.32): `photo.publish` senders and the 30-day window tick |
