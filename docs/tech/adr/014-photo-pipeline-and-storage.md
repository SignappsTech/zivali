# ADR-014: Photos on Cloudflare R2: client resize, presigned uploads, server re-encode with sharp, public copies on publish

- Status: Accepted (revised 2026-10-15 for brief v1.0; replaces the Supabase Storage version; amended 2026-10-15: EU jurisdiction buckets) · Owner: Tech Lead
- Source: FR-003, FR-018 R-018.4, NFR-PRIV, NFR-LAT (upload < 10 s on 4G), brief v1.0 (R2)

## Decision

- **Client** (web canvas / `expo-image-manipulator`): read EXIF GPS and time first (web `exifr`, mobile `expo-image-picker` `exif`), then re-encode to JPEG, long edge ≤ 1600 px, < 1 MB, and compute SHA-256. This keeps uploads small on 4G. Camera originals never leave the device.
- **Upload**: `POST /v1/photos` (JSON: sha256, width, height, bytes) → the API validates, creates the `photos` row (`uploaded`) or returns the existing one for the same owner and hash, and returns a **presigned PUT URL** (5 minutes, `Content-Type: image/jpeg`, `Content-Length` ≤ 1 MB) for the private bucket key `uploads/<owner>/<photo_id>.jpg`. The client PUTs directly to R2, then calls `POST /v1/photos/:id/complete`.
- **Processing** (worker, `photo.process`): download from R2, check magic bytes and size, then **sharp** decodes and re-encodes (which drops all metadata whatever the client did) into `display` (≤ 1600 px, WebP q80 + JPEG fallback) and `thumb` (480 px WebP) in the private bucket; hash verified; row `accepted` or `rejected` with a reason. A future hook list adds `ai.extract`, `photo.embed` and image screening (M3, M4).
- **Publishing** (`photo.publish`): when a report becomes visible, its accepted variants are copied to the **public bucket** (`media`, served at `MEDIA_BASE_URL`, an R2 custom domain or r2.dev URL behind Cloudflare's CDN); hidden, removed or expired reports have their public copies deleted. Private photos (pets, drafts, held reports) are shown to their owners through short-lived presigned GET URLs.
- **Buckets**: `zivali-private` (uploads and variants, no public access), `zivali-media` (published variants, public read), `zivali-backups` (nightly `pg_dump`, 30-day lifecycle rule, ADR-016). R2 has no egress fees; the free tier (10 GB, 1M writes, 10M reads per month) covers the pilot.
- **EU jurisdiction** (the privacy policy and imprint promise storage in the EU): all three buckets are created with the R2 `eu` jurisdiction, which keeps the data in the EU and cannot be changed after creation (a wrong bucket must be recreated and its objects copied). Dashboard: Create bucket → Location → Specify jurisdiction → European Union; CLI: `npx wrangler r2 bucket create <name> --jurisdiction eu`, and `npx wrangler r2 bucket lifecycle add zivali-backups … --jurisdiction eu` for the 30-day rule. Every S3 call and every presigned URL uses the jurisdiction endpoint `https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com` (the global endpoint cannot see EU buckets). Public read for `zivali-media` through a custom domain on the Cloudflare zone; confirm at setup that public access works for the EU bucket (the R2 docs do not state it), otherwise Caddy on the VPS proxies `media.<domain>` to the bucket with long cache headers. `zivali-private` gets a CORS rule allowing `PUT` and `GET` from `WEB_ORIGINS` with the `Content-Type` header, so the web client can upload with the presigned URL (mobile is not subject to CORS).
- **Local**: MinIO in `docker-compose.dev.yml` with the same three buckets (S3 API, presigned URLs work identically); tests use an in-memory storage adapter. `STORAGE_PROVIDER=r2|minio|memory`.
- **Cleanup**: `retention.purge` deletes uploads not attached within 24 h and report photos 12 months after close.

## Alternatives

- Supabase Storage (old ADR-014): ties photos to Supabase Free's 1 GB storage limit and to Storage RLS; R2 is cheaper and S3-standard.
- Uploading through the API (multipart): doubles bandwidth on the small VPS.
- Image CDN transformations (Cloudflare Images): paid; sharp in the worker is free and fast enough for 1 MB inputs.

## Consequences

- New dependencies in the API: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp` (ADR-017).
- Credentials needed: R2 account id, access key id and secret, bucket names, public media URL (client item). The client creates the buckets in the EU jurisdiction (or gives an API token that can), checked by `scripts/deploy.mjs` with `HeadBucket` on the EU endpoint.
