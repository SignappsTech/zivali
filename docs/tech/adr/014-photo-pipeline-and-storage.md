# ADR-014: Client-side resize and EXIF strip; private uploads, public copies on publish; no server image processing

- Status: Accepted · Date: 2026-10-14 · Owner: Tech Lead
- Source: FR-003, FR-018 R-018.4, NFR-PRIV, NFR-LAT (upload < 10 s on 4G)

## Decision

- **Client** (web canvas / `expo-image-manipulator`): read EXIF GPS and time first (web: `exifr`; mobile: `expo-image-picker` `exif`), then re-encode to JPEG, long edge ≤ 1600 px, quality stepped down until < 1 MB, plus a 480 px thumbnail. Re-encoding drops all metadata. SHA-256 of the display file is computed client-side and sent along.
- We **never store camera originals**: the "original" in FR-003 is the private display file; no full-resolution or EXIF-bearing file ever leaves the device.
- **Buckets**:
  - `photos` (private): uploads at `<uid>/<uuid>.jpg` and `<uid>/<uuid>_thumb.jpg`; bucket limits `image/jpeg`, 1 MB (native Storage validation); RLS: owner insert/select/delete.
  - `public-photos` (public read): copies made by the `publish_photos` job when a report becomes visible; deleted when it is hidden, removed or past retention.
  - `ad-images` (public read, admin write).
- **Server validation** (`photo_uploaded` job): magic bytes are JPEG, no APP1/EXIF segment, dimensions within bounds, hash matches; otherwise the object is deleted and the `photos` row marked `rejected`. Duplicate hashes are linked, not re-processed (cost cap for AI).
- **Orphans**: `purge_retention` deletes uploads not referenced by a pet or report after 24 h.
- **Drafts** keep files locally (web IndexedDB via `idb-keyval`; mobile app document directory) and re-upload the whole small file on retry. No resumable (TUS) protocol: files are < 1 MB.
- **HEIC**: iOS converts to JPEG when picking from Photos (web `accept="image/*"` and `expo-image-picker`); desktop browsers that cannot decode a file show a clear "use JPEG or PNG" message.

## Alternatives

- Supabase image transformations: paid tier only; server-side processing in Deno is CPU-limited.
- One public bucket: would publish held or moderated images (FR-018 AC#3).

## Consequences

- No image-processing dependency on the server; all heavy lifting is on the device.
- Public URLs are stable and CDN-cached, which Open Graph previews and SSR need.
