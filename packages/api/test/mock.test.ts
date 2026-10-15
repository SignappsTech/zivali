import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ping } from '../src/__fixtures__/platform.ts';
import { ApiError } from '../src/client.ts';
import { createMockApi, mockError } from '../src/mock.ts';

test('serves a static fixture', async () => {
	const api = createMockApi({ 'GET /ping': ping });
	assert.deepEqual(await api.request('GET', '/ping'), { message: 'pong' });
});

test('handlers get params, query, body and the client headers; calls are recorded', async () => {
	const api = createMockApi({
		'POST /v1/reports/:code/comments': ({ params, query, body }) => ({ code: params.code, query, body }),
	});
	const result = await api.request('POST', '/v1/reports/Xy7pQ2mK/comments', {
		query: { limit: 5 },
		body: { text: 'hi' },
		idempotent: 'k-1',
	});

	assert.deepEqual(result, { code: 'Xy7pQ2mK', query: { limit: '5' }, body: { text: 'hi' } });
	assert.equal(api.calls.length, 1);
	assert.equal(api.calls[0]!.headers['Idempotency-Key'], 'k-1');
	assert.equal(api.calls[0]!.headers.Authorization, 'Bearer mock-token');
});

test('mockError returns a C1 error that the client throws as ApiError', async () => {
	const api = createMockApi({ 'POST /v1/manage/claim': () => mockError('GONE', 'Closed') });
	await assert.rejects(api.request('POST', '/v1/manage/claim', { body: { token: 't' } }), (error) => {
		assert.ok(error instanceof ApiError);
		assert.equal(error.code, 'GONE');
		assert.equal(error.status, 410);
		return true;
	});
});

test('an unmocked route is a NOT_FOUND naming the route; undefined is a 204', async () => {
	const api = createMockApi({ 'DELETE /v1/pets/:id': () => undefined }, { getAccessToken: () => null });
	assert.equal(await api.request('DELETE', '/v1/pets/p1'), undefined);
	assert.equal(api.calls[0]!.headers.Authorization, undefined);

	await assert.rejects(api.request('GET', '/v1/pets/p1'), {
		code: 'NOT_FOUND',
		message: 'No mock for GET /v1/pets/p1',
	});
});
