import assert from 'node:assert/strict';
import { test } from 'node:test';

import { abuseCreated, abuseInput, adminAbuseReports, moderationFlags } from '../src/__fixtures__/abuse.ts';
import { abuseApi } from '../src/abuse.ts';
import { mockError } from '../src/mock.ts';
import { failure, mockStore } from './helpers.ts';

const e = abuseApi.endpoints;

test('abuse endpoints map their arguments to the C11 routes; a repeat report is data, not an error', async (t) => {
	const { store, calls } = mockStore(t, {
		'POST /v1/abuse-reports': abuseCreated,
		'GET /v1/admin/abuse-reports': { ...adminAbuseReports, next_cursor: 'c1' },
		'GET /v1/admin/moderation-flags': moderationFlags,
	});

	assert.deepEqual((await store.dispatch(e.reportAbuse.initiate(abuseInput))).data, abuseCreated);
	const filters = { status: 'open', target_type: 'report' } as const;
	const list = await store.dispatch(e.listAdminAbuseReports.initiate(filters, { subscribe: false }));
	assert.deepEqual(list.data?.pages[0]?.items, adminAbuseReports.items);
	await store.dispatch(e.listAdminAbuseReports.initiate(filters, { direction: 'forward', subscribe: false }));
	const flags = await store.dispatch(e.listModerationFlags.initiate({}, { subscribe: false }));
	assert.deepEqual(flags.data?.pages[0], moderationFlags);

	assert.deepEqual(calls(), [
		{ method: 'POST', path: '/v1/abuse-reports', query: {}, body: abuseInput },
		{ method: 'GET', path: '/v1/admin/abuse-reports', query: filters, body: undefined },
		{ method: 'GET', path: '/v1/admin/abuse-reports', query: { ...filters, cursor: 'c1' }, body: undefined },
		{ method: 'GET', path: '/v1/admin/moderation-flags', query: {}, body: undefined },
	]);
});

test('abuse errors arrive as { status, data.code }', async (t) => {
	const { store } = mockStore(t, {
		'POST /v1/abuse-reports': () => mockError('RATE_LIMITED', 'Too many', { retry_after_s: 600 }),
		'GET /v1/admin/abuse-reports': () => mockError('AAL2_REQUIRED'),
	});
	const report = await store.dispatch(e.reportAbuse.initiate(abuseInput));
	assert.deepEqual(report.error, {
		status: 429,
		data: {
			code: 'RATE_LIMITED',
			message: 'Too many',
			details: { retry_after_s: 600 },
			issues: undefined,
			requestId: undefined,
		},
	});
	const list = await store.dispatch(e.listAdminAbuseReports.initiate({}, { subscribe: false }));
	assert.deepEqual(failure(list), [403, 'AAL2_REQUIRED']);
});
