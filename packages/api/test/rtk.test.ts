import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { BaseQueryApi } from '@reduxjs/toolkit/query';

import { ping } from '../src/__fixtures__/platform.ts';
import { createMockApi, mockError } from '../src/mock.ts';
import { api, createApiStore, retryCondition } from '../src/rtk.ts';

// What generated endpoints look like (codegen `query: (arg) => ({ url, method, params, body, headers })`).
const testApi = api.injectEndpoints({
	endpoints: (build) => ({
		ping: build.query<{ message: string }, void>({ query: () => '/ping', keepUnusedDataFor: 0 }),
		pet: build.query<unknown, { id: string; fields?: string }>({
			query: ({ id, fields }) => ({ url: `/v1/pets/${id}`, params: { fields } }),
			keepUnusedDataFor: 0,
		}),
		createReport: build.mutation<{ id: string }, { body: object; key?: string }>({
			query: ({ body, key }) => ({
				url: '/v1/reports',
				method: 'POST',
				body,
				headers: key ? { 'Idempotency-Key': key } : undefined,
			}),
		}),
		checkout: build.mutation<unknown, void>({
			query: () => ({ url: '/v1/payments/checkout', method: 'POST', body: {} }),
			extraOptions: { idempotent: true },
		}),
	}),
});

test('queries go through the store client with its headers', async () => {
	const client = createMockApi({
		'GET /ping': ping,
		'GET /v1/pets/:id': ({ params, query }) => ({ ...params, query }),
	});
	const store = createApiStore(client);

	assert.deepEqual(
		(await store.dispatch(testApi.endpoints.ping.initiate(undefined, { subscribe: false }))).data,
		ping
	);
	const pet = await store.dispatch(
		testApi.endpoints.pet.initiate({ id: 'p1', fields: 'name' }, { subscribe: false })
	);
	assert.deepEqual(pet.data, { id: 'p1', query: { fields: 'name' } });
	assert.equal(client.calls[0]!.headers['x-device-id'], '00000000-0000-4000-8000-000000000000');
});

test('an ApiError becomes { status, data } with plain, serialisable data and no retry on 4xx', async () => {
	const client = createMockApi({ 'GET /v1/pets/:id': () => mockError('NOT_FOUND', 'No pet') });
	const store = createApiStore(client);
	const { error } = await store.dispatch(testApi.endpoints.pet.initiate({ id: 'p9' }, { subscribe: false }));

	assert.deepEqual(error, {
		status: 404,
		data: { code: 'NOT_FOUND', message: 'No pet', details: undefined, issues: undefined, requestId: undefined },
	});
	assert.deepEqual(structuredClone(error), error);
	assert.equal(client.calls.length, 1);
});

test('Idempotency-Key: stable key from the header parameter, fresh one from extraOptions', async () => {
	const client = createMockApi({ 'POST /v1/reports': { id: 'r1' }, 'POST /v1/payments/checkout': {} });
	const store = createApiStore(client);

	const created = await store.dispatch(
		testApi.endpoints.createReport.initiate({ body: { type: 'found' }, key: 'o-1' })
	);
	assert.deepEqual(created.data, { id: 'r1' });
	await store.dispatch(testApi.endpoints.checkout.initiate());

	assert.equal(client.calls[0]!.headers['Idempotency-Key'], 'o-1');
	assert.deepEqual(client.calls[0]!.body, { type: 'found' });
	assert.match(client.calls[1]!.headers['Idempotency-Key']!, /^[0-9a-f-]{36}$/);
});

test('retryCondition: queries retry network and 5xx twice; never 4xx, mutations or aborted calls', () => {
	const signal = new AbortController().signal;
	const query = { type: 'query', signal } as BaseQueryApi;
	const network = { status: 0 };
	const at = (attempt: number, baseQueryApi = query) => ({ attempt, baseQueryApi });

	assert.equal(retryCondition(network, '/x', at(1)), true);
	assert.equal(retryCondition({ status: 503 }, '/x', at(2)), true);
	assert.equal(retryCondition(network, '/x', at(3)), false);
	for (const status of [400, 401, 404, 410, 429]) assert.equal(retryCondition({ status }, '/x', at(1)), false);
	assert.equal(retryCondition(network, '/x', at(1, { ...query, type: 'mutation' })), false);
	assert.equal(retryCondition(network, '/x', at(1, { ...query, signal: AbortSignal.abort() })), false);
});
