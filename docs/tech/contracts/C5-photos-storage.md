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

`Photo { id, ownerId, petId?, reportId?, position (0–4), sha256, width, height, bytes, status: uploaded | accepted | rejected | published | unpublished, rejectReason?, publicDisplayUrl?, publicThumbUrl?, createdAt }`, unique `(ownerId, sha256)`, check: not both `petId` and `reportId`.

## REST

| Method and path | Auth | Request | Response | Errors |
|---|---|---|---|---|
| `POST /v1/photos` | user or anonymous | `{ sha256, width, height, bytes }` (`bytes` ≤ 1 MB = 1 048 576 bytes, `MAX_PHOTO_BYTES` in `@zivali/validation`; long edge ≤ 1600, short edge ≥ 320) | `201 { photo_id, upload: { url, method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, expires_at } }`, or `200 { photo_id, existing: true }` for the same owner and hash | `VALIDATION`, `RATE_LIMITED` (60/hour) |
| `POST /v1/photos/:id/complete` | owner | - | `202 { status: 'uploaded' }` and job `photo.process` | `NOT_FOUND`, `CONFLICT` (object missing in R2) |
| `GET /v1/photos/:id` | owner | - | `{ id, status, reject_reason?, thumb_url }` (`thumb_url` is a 10-minute presigned GET while private, the public URL once published) | `NOT_FOUND` |
| `DELETE /v1/photos/:id` | owner | - | `204`; objects deleted by the worker | `CONFLICT` if attached to a published report |
| `PUT /v1/pets/:id/photos`, report create/update (C4) | owner/manager | `photo_ids: uuid[]` in order | attaches and sets positions | `VALIDATION` (> 5, foreign photo) |

## Worker jobs (ADR-022)

- `photo.process { photo_id }`: download the upload, check JPEG magic bytes and size, verify SHA-256, then **sharp** (`rotate()` from EXIF orientation, then re-encode without metadata) → `display` (≤ 1600 px, WebP q80 + JPEG q82) and `thumb` (480 px WebP) under `variants/`; status `accepted` or `rejected` (`not_jpeg`, `too_large`, `hash_mismatch`, `decode_failed`). Hook list `PHOTO_HOOKS` (empty in M2; M3: `ai.extract`, `photo.embed`; M4: screening).
- `photo.publish { report_id }`: copy accepted variants of a visible report to the media bucket, set public URLs, status `published`; hidden, removed or expired → delete public copies, status `unpublished`.
- `retention.purge`: uploads not attached after 24 h, pet photos of deleted pets, report photos 12 months after close.

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
