import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	createdReport,
	createReportInput,
	duplicateOpenReport,
	ownerReport,
	publicReport,
	reportList,
	syncReports,
} from '../src/__fixtures__/reports.ts';
import { createMockApi, mockError } from '../src/mock.ts';
import { reportQuery, reportsApi } from '../src/reports.ts';
import { createApiStore } from '../src/rtk.ts';

const { endpoints } = reportsApi;

test('reportQuery: comma lists, bbox rounded outwards and near rounded to 2 decimals (no exact point in URLs)', () => {
	assert.deepEqual(
		reportQuery({
			types: ['lost', 'found'],
			species: ['dog'],
			colours: [],
			bbox: [14.50123, 46.04987, 14.52345, 46.06012],
			near: { lat: 46.050412, lng: 14.505873, km: 5 },
			sort: 'distance',
			limit: 20,
		}),
		{
			types: 'lost,found',
			species: 'dog',
			colours: undefined,
			sizes: undefined,
			bbox: '14.5,46.04,14.53,46.07',
			near: '46.05,14.51,5',
			sort: 'distance',
			limit: 20,
		}
	);
});

test('createReport posts the body with the stable Idempotency-Key; a duplicate keeps its details', async () => {
	const client = createMockApi({ 'POST /v1/reports': createdReport });
	const store = createApiStore(client);
	const { data } = await store.dispatch(
		endpoints.createReport.initiate({ body: createReportInput, idempotencyKey: 'outbox-1' })
	);
	assert.deepEqual(data, createdReport);
	assert.equal(client.calls[0]!.headers['Idempotency-Key'], 'outbox-1');
	assert.deepEqual(client.calls[0]!.body, createReportInput);

	const duplicate = createApiStore(
		createMockApi({ 'POST /v1/reports': () => new Response(JSON.stringify(duplicateOpenReport), { status: 409 }) })
	);
	const { error } = await duplicate.dispatch(
		endpoints.createReport.initiate({ body: createReportInput, idempotencyKey: 'k' })
	);
	assert.deepEqual(error, {
		status: 409,
		data: { ...duplicateOpenReport.error, issues: undefined, requestId: undefined },
	});
});

test('getReport maps GONE; update and transitions hit the contract paths', async () => {
	const client = createMockApi({
		'GET /v1/reports/:code': ({ params }) =>
			params.code === 'Gone0001' ? mockError('GONE', 'Closed', { reason: 'closed' }) : publicReport,
		'PATCH /v1/reports/:code': ownerReport,
		'POST /v1/reports/:code/transitions': ({ body }) => ({ ...ownerReport, body }),
	});
	const store = createApiStore(client);

	const ok = await store.dispatch(endpoints.getReport.initiate({ code: 'Hk3vT9qP' }, { subscribe: false }));
	assert.deepEqual(ok.data, publicReport);
	const gone = await store.dispatch(endpoints.getReport.initiate({ code: 'Gone0001' }, { subscribe: false }));
	assert.deepEqual(gone.error, {
		status: 410,
		data: {
			code: 'GONE',
			message: 'Closed',
			details: { reason: 'closed' },
			issues: undefined,
			requestId: undefined,
		},
	});

	await store.dispatch(endpoints.updateReport.initiate({ code: 'Hk3vT9qP', body: { circumstances: 'Pri parku' } }));
	await store.dispatch(
		endpoints.transitionReport.initiate({ code: 'Hk3vT9qP', body: { action: 'close', reason: 'other' } })
	);
	assert.deepEqual(
		client.calls.slice(2).map((c) => [c.method, c.path, c.body]),
		[
			['PATCH', '/v1/reports/Hk3vT9qP', { circumstances: 'Pri parku' }],
			['POST', '/v1/reports/Hk3vT9qP/transitions', { action: 'close', reason: 'other' }],
		]
	);
});

test('searchReports pages with the keyset cursor', async () => {
	const client = createMockApi({
		'GET /v1/reports': ({ query }) =>
			query.cursor ? { ...reportList, next_cursor: null } : { ...reportList, next_cursor: 'c2' },
	});
	const store = createApiStore(client);
	const arg = { types: ['found' as const], near: { lat: 46.0504, lng: 14.5058, km: 3 } };

	await store.dispatch(endpoints.searchReports.initiate(arg));
	const { data } = await store.dispatch(endpoints.searchReports.initiate(arg, { direction: 'forward' }));
	assert.equal(data?.pages.length, 2);
	assert.deepEqual(
		client.calls.map((c) => c.query),
		[
			{ types: 'found', near: '46.05,14.51,3' },
			{ types: 'found', near: '46.05,14.51,3', cursor: 'c2' },
		]
	);
});

test('map, my reports and sync: query strings, with sync areas rounded to 2 decimals', async () => {
	const client = createMockApi({
		'GET /v1/reports/map': { items: [] },
		'GET /v1/me/reports': { items: [ownerReport], next_cursor: null },
		'GET /v1/sync/reports': syncReports,
	});
	const store = createApiStore(client);

	await store.dispatch(endpoints.getMapReports.initiate({ bbox: [14.4, 46, 14.6, 46.1], species: ['cat'] }));
	const mine = await store.dispatch(endpoints.listMyReports.initiate());
	assert.deepEqual(mine.data?.pages[0]?.items, [ownerReport]);
	const sync = await store.dispatch(
		endpoints.syncReports.initiate({
			areas: [{ lat: 46.050412, lng: 14.505873, radius_km: 10 }],
			since: '2026-10-14T00:00:00Z',
		})
	);
	assert.deepEqual(sync.data, syncReports);

	assert.deepEqual(
		client.calls.map((c) => [c.path, c.query]),
		[
			['/v1/reports/map', { species: 'cat', bbox: '14.4,46,14.6,46.1' }],
			['/v1/me/reports', {}],
			[
				'/v1/sync/reports',
				{ areas: '[{"lat":46.05,"lng":14.51,"radius_km":10}]', since: '2026-10-14T00:00:00Z' },
			],
		]
	);
});
