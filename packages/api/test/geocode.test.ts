import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

import { placeReverse, placeSearch, queryTooShort } from '../src/__fixtures__/geocode.ts';
import { geocodeApi, schedulePlaceSearch } from '../src/geocode.ts';
import { createMockApi } from '../src/mock.ts';
import { createApiStore } from '../src/rtk.ts';

test('searchPlaces and reversePlace POST the query and point in the body, never in the URL', async () => {
	const client = createMockApi({ 'POST /v1/geo/search': placeSearch, 'POST /v1/geo/reverse': placeReverse });
	const store = createApiStore(client);
	const near = { lat: 46.05, lng: 14.51 };

	const search = await store.dispatch(
		geocodeApi.endpoints.searchPlaces.initiate({ q: 'trubarjeva 5, ljubljana', near }, { subscribe: false })
	);
	assert.deepEqual(search.data, placeSearch.items);
	const reverse = await store.dispatch(
		geocodeApi.endpoints.reversePlace.initiate({ lat: 46.0702, lng: 14.4875 }, { subscribe: false })
	);
	assert.deepEqual(reverse.data, placeReverse.place);

	assert.deepEqual(
		client.calls.map((c) => [c.method, c.path, c.query, c.body]),
		[
			['POST', '/v1/geo/search', {}, { q: 'trubarjeva 5, ljubljana', near }],
			['POST', '/v1/geo/reverse', {}, { lat: 46.0702, lng: 14.4875 }],
		]
	);
});

test('a VALIDATION error keeps its issues', async () => {
	const store = createApiStore(
		createMockApi({ 'POST /v1/geo/search': () => new Response(JSON.stringify(queryTooShort), { status: 400 }) })
	);
	const { error } = await store.dispatch(
		geocodeApi.endpoints.searchPlaces.initiate({ q: 'x' }, { subscribe: false })
	);
	assert.deepEqual(error, {
		status: 400,
		data: { ...queryTooShort.error, details: undefined, requestId: undefined },
	});
});

test('schedulePlaceSearch: 300 ms debounce, minimum 3 characters, cleanup aborts the previous request', () => {
	mock.timers.enable({ apis: ['setTimeout'] });
	const triggered: string[] = [];
	const aborted: string[] = [];
	const trigger = (arg: { q: string }) => {
		triggered.push(arg.q);
		return { abort: () => aborted.push(arg.q) };
	};

	schedulePlaceSearch(trigger, { q: 'tr' })();
	mock.timers.tick(1000);
	assert.deepEqual(triggered, []);

	const cancelFirst = schedulePlaceSearch(trigger, { q: 'tru' });
	mock.timers.tick(299);
	cancelFirst(); // typed on before the delay: never sent
	const cancelSecond = schedulePlaceSearch(trigger, { q: 'trub' });
	mock.timers.tick(300);
	assert.deepEqual(triggered, ['trub']);
	cancelSecond(); // next keystroke: the running request is aborted
	assert.deepEqual(aborted, ['trub']);
	mock.timers.reset();
});
