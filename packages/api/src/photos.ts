// C5 photos. `uploadPhoto` is hand-written (codegen cannot express the presigned PUT with progress) and runs on the
// plain client, so the mobile outbox can use it without a store. The RTK endpoints are stubs owned by TASK-14.1 until
// apps/api/openapi.json has them; then `gen:api` generates them and they are deleted here.
import type {
	CreatePhotoInput,
	CreatePhotoResponse,
	PhotoAttributes,
	PhotoView,
	PresignedUpload,
	Uuid,
} from '@zivali/types';

import { type ApiClient, ApiError } from './client.ts';
import { api } from './rtk.ts';

/** Output of the platform `preparePhoto()` (EXIF read, resize ≤ 1600 px, < 1 MB JPEG, sha256). */
export type PreparedPhoto = CreatePhotoInput & {
	/** Web: the JPEG blob. Mobile: a file URI, sent by its own `put` (FileSystem.uploadAsync). */
	file: Blob | { uri: string };
};
export type UploadProgress = { onProgress?: (fraction: number) => void; signal?: AbortSignal };
/** Sends the file to the presigned URL; never through the API client (no Bearer token to R2). */
export type PutFile = (upload: PresignedUpload, file: PreparedPhoto['file'], options: UploadProgress) => Promise<void>;

/** Default `put` (web, and React Native for blobs): XHR, because fetch has no upload progress. */
export const xhrPut: PutFile = (upload, file, { onProgress, signal }) =>
	new Promise((resolve, reject) => {
		if (!(file instanceof Blob)) throw new TypeError('xhrPut sends a Blob; pass `put` for file URIs');
		if (signal?.aborted) return reject(new DOMException('Upload aborted', 'AbortError'));
		const xhr = new XMLHttpRequest();
		const abort = () => xhr.abort();
		xhr.open(upload.method, upload.url);
		for (const [name, value] of Object.entries(upload.headers)) xhr.setRequestHeader(name, value);
		xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total);
		xhr.onload = () => {
			signal?.removeEventListener('abort', abort);
			if (xhr.status < 300) resolve();
			else reject(new ApiError('INTERNAL', `Upload failed: HTTP ${xhr.status}`, { status: xhr.status }));
		};
		xhr.onerror = () => {
			signal?.removeEventListener('abort', abort);
			reject(new ApiError('NETWORK', 'Upload failed'));
		};
		xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
		signal?.addEventListener('abort', abort, { once: true });
		xhr.send(file);
	});

/**
 * POST /v1/photos → PUT to the presigned URL → POST /v1/photos/:id/complete. A photo the owner already uploaded
 * (same sha256) comes back `existing` and is not sent again, so repeats from the outbox are safe.
 */
export async function uploadPhoto(
	client: ApiClient,
	{ file, ...input }: PreparedPhoto,
	{ onProgress, signal, put = xhrPut }: UploadProgress & { put?: PutFile } = {}
): Promise<{ photoId: Uuid }> {
	const created = await client.request<CreatePhotoResponse>('POST', '/v1/photos', { body: input, signal });
	if ('upload' in created) {
		await put(created.upload, file, { onProgress, signal });
		await client.request('POST', `/v1/photos/${created.photo_id}/complete`, { signal });
	}
	onProgress?.(1);
	return { photoId: created.photo_id };
}

export const photosApi = api.enhanceEndpoints({ addTagTypes: ['Photos'] }).injectEndpoints({
	endpoints: (build) => ({
		// Poll after upload: `thumb_url` and `status` (accepted | rejected with `reject_reason`).
		getPhoto: build.query<PhotoView, { id: Uuid }>({
			query: ({ id }) => `/v1/photos/${id}`,
			providesTags: ['Photos'],
		}),
		// CONFLICT when attached to a published report.
		deletePhoto: build.mutation<void, { id: Uuid }>({
			query: ({ id }) => ({ url: `/v1/photos/${id}`, method: 'DELETE' }),
			invalidatesTags: ['Photos'],
		}),
		// C19 (TASK-40.4): poll every 750 ms while `pending`, at most 10 s; skip when `ai.enabled` is false.
		getPhotoAttributes: build.query<PhotoAttributes, { id: Uuid }>({
			query: ({ id }) => `/v1/photos/${id}/attributes`,
		}),
	}),
});

export const { useGetPhotoQuery, useDeletePhotoMutation, useGetPhotoAttributesQuery } = photosApi;
