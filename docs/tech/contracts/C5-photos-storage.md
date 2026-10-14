source: docs/04-technical-design.md§Data model (photos), ADR-014; FR-003

# C5 Photos and storage

## Buckets

| Bucket | Public | Limits | Paths | Write |
|---|---|---|---|---|
| `photos` | no | `image/jpeg`, 1 MB | `<uid>/<photo_id>.jpg`, `<uid>/<photo_id>_thumb.jpg` | owner (RLS on `storage.objects`: first path segment = `auth.uid()`) |
| `public-photos` | yes | - | `<report_or_pet_id>/<photo_id>.jpg`, `…_thumb.jpg` | service role only (`publish_photos` job) |
| `ad-images` | yes | `image/jpeg,image/png,image/webp`, 300 KB | `<ad_id>/<file>` | admins (aal2) |

## Table

```sql
photos(id, owner_id, pet_id null, report_id null, position smallint (0–4),
       storage_path text, thumb_path text, public_url text null, public_thumb_url text null,
       sha256 text not null, width int, height int,
       status text check (status in ('uploaded','accepted','rejected','published','unpublished')),
       reject_reason text null, alt_hint jsonb null, created_at)
-- unique (owner_id, sha256); check (pet_id is null or report_id is null)
```

## Client API (`@zivali/api/photos`)

```ts
preparePhoto(file: File | ImagePickerAsset): Promise<PreparedPhoto>
// reads EXIF (GPS, DateTimeOriginal) → re-encodes JPEG long edge ≤ 1600, < 1 MB, plus 480 px thumb → sha256
type PreparedPhoto = { display: Blob|FileUri; thumb: Blob|FileUri; sha256: string; width: number; height: number;
                       exif?: { lat?: number; lng?: number; takenAt?: string } }   // exif only as form suggestion
uploadPhoto(p: PreparedPhoto, opts?: { onProgress?(ratio: number): void; signal?: AbortSignal }): Promise<{ photoId: string }>
// 1. rpc/register_photo { sha256, width, height } → { photo_id, storage_path, thumb_path, existing?: true }
// 2. upload both files to storage (skipped when existing)
// retries 3× with backoff; on failure the draft keeps the PreparedPhoto for a later retry
attachPhotos(target: { petId?: string; reportId?: string }, photoIds: string[]): Promise<void>  // order = position
deletePhoto(photoId: string): Promise<void>
photoAlt(r: { species; colours; areaName?: string }, locale): string    // e.g. "Rjav pes, območje Ljubljana Šiška"
```

Offline (C17): the mobile outbox keeps `PreparedPhoto` files in `documentDirectory/outbox/<id>/` and calls `register_photo` + upload when it sends; the `(owner, sha256)` dedupe makes repeated sends safe.

## Server processing

- `register_photo` (RPC): validates dimensions (≤ 1600 long edge, ≥ 320 short edge), returns an existing row for the same `(owner, sha256)`.
- Trigger on `storage.objects` insert in `photos` → `enqueue_job('photo_uploaded', {photo_id})`. Handler: download, check JPEG magic bytes, no APP1/EXIF segment, dimensions and hash match → `accepted`, else delete objects and set `rejected` + reason. Fan-out hook: enqueues later jobs (M3: `ai_extract`, `embed_photo`; M4: screening) through `photo_hooks` config, empty in M2.
- `publish_photos {report_id|pet_id}`: copies accepted photos of visible reports to `public-photos`, sets `public_url`, `status = 'published'`. Hidden/removed reports → `unpublished` and public copies deleted.
- `purge_retention`: deletes `uploaded`/`accepted` photos with no pet or report after 24 h; deletes report photos 12 months after close.
- Pet photo deletion cascades to storage objects (trigger enqueues deletion).

## Errors

`VALIDATION` (dimensions, count > 5), `CONFLICT` (photo attached elsewhere), `FORBIDDEN`; server rejection reasons: `not_jpeg`, `exif_present`, `too_large`, `hash_mismatch`.

## Example

```ts
const p = await preparePhoto(file);            // p.exif → { lat: 46.05, lng: 14.5, takenAt: '2026-10-14T07:10:00Z' }
const { photoId } = await uploadPhoto(p, { onProgress: setProgress });
await createReport({ type: 'found', photo_ids: [photoId], location: p.exif ?? pickedPoint, … });
```
