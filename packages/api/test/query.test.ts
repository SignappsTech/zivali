import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ApiError } from '../src/client.ts';
import { flattenPages, pageParams, queryDefaults, queryKeys } from '../src/query.ts';

const { retry } = queryDefaults.queries;

test('retries network and 5xx errors twice', () => {
	for (const error of [new ApiError('NETWORK', 'x'), new ApiError('INTERNAL', 'x'), new Error('x')]) {
		assert.equal(retry(0, error), true);
		assert.equal(retry(1, error), true);
		assert.equal(retry(2, error), false);
	}
});

test('never retries 4xx', () => {
	for (const code of ['VALIDATION', 'UNAUTHENTICATED', 'NOT_FOUND', 'GONE', 'RATE_LIMITED'] as const) {
		assert.equal(retry(0, new ApiError(code, 'x')), false);
	}
});

test('queryKeys builds nested keys per domain', () => {
	const keys = queryKeys('reports');
	assert.deepEqual(keys.all, ['reports']);
	assert.deepEqual(keys.list({ type: 'lost' }), ['reports', 'list', { type: 'lost' }]);
	assert.deepEqual(keys.list(), ['reports', 'list', {}]);
	assert.deepEqual(keys.detail('Xy7pQ2mK'), ['reports', 'detail', 'Xy7pQ2mK']);
});

test('keyset pagination: next cursor and flattened items', () => {
	const pages = [
		{ items: [1, 2], next_cursor: 'c2' },
		{ items: [3], next_cursor: null },
	];
	assert.equal(pageParams.initialPageParam, null);
	assert.equal(pageParams.getNextPageParam(pages[0]!), 'c2');
	assert.equal(pageParams.getNextPageParam(pages[1]!), null);
	assert.deepEqual(flattenPages({ pages }), [1, 2, 3]);
	assert.deepEqual(flattenPages(undefined), []);
});
