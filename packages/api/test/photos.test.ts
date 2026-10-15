import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createdPhoto, existingPhoto, photo, photoInput } from '../src/__fixtures__/photos.ts';
import { ApiError } from '../src/client.ts';
import { createMockApi, mockError } from '../src/mock.ts';
import { photosApi, type PutFile, uploadPhoto, xhrPut } from '../src/photos.ts';
import { createApiStore } from '../src/rtk.ts';

const file = new Blob(['jpeg'], { type: 'image/jpeg' });

test('uploadPhoto: POST /v1/photos, PUT to the presigned URL, then /complete; progress ends at 1', async () => {
	const client = createMockApi({
		'POST /v1/photos': createdPhoto,
		'POST /v1/photos/:id/complete': { status: 'uploaded' },
	});
	const puts: unknown[] = [];
	const put: PutFile = async (upload, body, { onProgress }) => {
		puts.push([upload.url, upload.headers, body]);
		onProgress?.(0.5);
	};
	const progress: number[] = [];

	const result = await uploadPhoto(client, { ...photoInput, file }, { put, onProgress: (p) => progress.push(p) });

	assert.deepEqual(result, { photoId: createdPhoto.photo_id });
	assert.deepEqual(client.calls[0]!.body, photoInput);
	assert.deepEqual(puts, [
		['upload' in createdPhoto && createdPhoto.upload.url, { 'Content-Type': 'image/jpeg' }, file],
	]);
	assert.equal(client.calls[1]!.path, `/v1/photos/${createdPhoto.photo_id}/complete`);
	assert.deepEqual(progress, [0.5, 1]);
});

test('uploadPhoto: an existing photo (same sha256) is not sent again; API errors are ApiError', async () => {
	const put: PutFile = async () => assert.fail('no PUT for an existing photo');
	const existing = createMockApi({ 'POST /v1/photos': existingPhoto });
	assert.deepEqual(await uploadPhoto(existing, { ...photoInput, file }, { put }), {
		photoId: existingPhoto.photo_id,
	});
	assert.equal(existing.calls.length, 1);

	const limited = createMockApi({ 'POST /v1/photos': () => mockError('RATE_LIMITED') });
	await assert.rejects(uploadPhoto(limited, { ...photoInput, file }, { put }), { code: 'RATE_LIMITED', status: 429 });
});

test('xhrPut: method, headers and progress from the presigned upload; HTTP and network failures', async () => {
	let status = 200;
	let fail = false;
	const sent: Record<string, unknown>[] = [];
	class FakeXhr {
		status = 0;
		headers: Record<string, string> = {};
		upload: { onprogress?: (e: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
		onload?: () => void;
		onerror?: () => void;
		onabort?: () => void;
		open(method: string, url: string) {
			sent.push({ method, url, headers: this.headers });
		}
		setRequestHeader(name: string, value: string) {
			this.headers[name] = value;
		}
		send() {
			this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 4 });
			this.status = status;
			if (fail) this.onerror?.();
			else this.onload?.();
		}
		abort() {}
	}
	Object.assign(globalThis, { XMLHttpRequest: FakeXhr });
	const upload = 'upload' in createdPhoto ? createdPhoto.upload : assert.fail();
	const progress: number[] = [];

	await xhrPut(upload, file, { onProgress: (p) => progress.push(p) });
	assert.deepEqual(sent[0], { method: 'PUT', url: upload.url, headers: { 'Content-Type': 'image/jpeg' } });
	assert.deepEqual(progress, [0.25]);

	status = 403;
	await assert.rejects(xhrPut(upload, file, {}), (e) => e instanceof ApiError && e.code === 'INTERNAL');
	fail = true;
	await assert.rejects(xhrPut(upload, file, {}), { code: 'NETWORK' });
	await assert.rejects(xhrPut(upload, { uri: 'file:///x.jpg' }, {}), TypeError);
});

test('getPhoto and deletePhoto; CONFLICT when the photo is on a published report', async () => {
	const client = createMockApi({
		'GET /v1/photos/:id': photo,
		'DELETE /v1/photos/:id': () => mockError('CONFLICT', 'Published'),
	});
	const store = createApiStore(client);
	const got = await store.dispatch(photosApi.endpoints.getPhoto.initiate({ id: photo.id }, { subscribe: false }));
	assert.deepEqual(got.data, photo);
	const { error } = await store.dispatch(photosApi.endpoints.deletePhoto.initiate({ id: photo.id }));
	assert.equal(error && 'data' in error && error.data.code, 'CONFLICT');
});
