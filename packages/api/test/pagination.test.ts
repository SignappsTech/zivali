import assert from 'node:assert/strict';
import { test } from 'node:test';

import { flattenPages, pageParams } from '../src/pagination.ts';

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
