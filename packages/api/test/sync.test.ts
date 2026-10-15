import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as fx from '../src/__fixtures__/reports.ts';
import { createMockApi } from '../src/mock.ts';
import { syncReports } from '../src/sync.ts';

test('sync sends the areas rounded to 2 decimals with since and limit, and returns the feed', async () => {
	const client = createMockApi({ 'GET /v1/sync/reports': fx.syncSnapshot });

	const feed = await syncReports(client, {
		areas: [{ lat: 46.056912, lng: 14.505873, radius_km: 10 }],
		since: '2026-10-15T07:00:00Z',
		limit: 500,
	});

	assert.deepEqual(feed, fx.syncSnapshot);
	assert.deepEqual(client.calls[0]!.query, {
		areas: '[{"lat":46.06,"lng":14.51,"radius_km":10}]',
		since: '2026-10-15T07:00:00Z',
		limit: '500',
	});
});

test('first sync leaves since out', async () => {
	const client = createMockApi({ 'GET /v1/sync/reports': fx.syncReports });

	await syncReports(client, { areas: [{ lat: 46, lng: 14.5, radius_km: 10 }] });

	assert.equal('since' in client.calls[0]!.query, false);
});
