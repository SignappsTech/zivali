import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as fx from '../src/__fixtures__/directory.ts';
import { directoryApi, toResult } from '../src/directory.ts';
import { createMockApi } from '../src/mock.ts';
import { createApiStore } from '../src/rtk.ts';

const setup = () => {
	const client = createMockApi({
		'GET /v1/shelters/responsible': ({ query }) =>
			query.municipality === 'osilnica' ? fx.responsibleUnconfirmed : fx.responsibleConfirmed,
		'GET /v1/shelters/municipalities': fx.municipalityList,
		'GET /v1/shelters/:slug': fx.shelterPage,
		'GET /v1/shelters': fx.shelterList,
	});
	return { client, store: createApiStore(client) };
};

test('responsible shelter rounds the point to 2 decimals', async () => {
	const { client, store } = setup();
	const { data } = await store.dispatch(
		directoryApi.endpoints.getResponsibleShelter.initiate({ lat: 46.05612, lng: 14.50587 })
	);
	assert.equal(data?.status, 'confirmed');
	assert.deepEqual(client.calls[0]!.query, { lat: '46.06', lng: '14.51' });
});

test('list, page and municipality endpoints', async () => {
	const { store } = setup();
	assert.equal((await store.dispatch(directoryApi.endpoints.listShelters.initiate())).data?.items.length, 1);
	const page = await store.dispatch(directoryApi.endpoints.getShelter.initiate('zavetisce-ljubljana'));
	assert.equal(page.data?.municipalities[0]!.slug, 'ljubljana');
	const municipalities = await store.dispatch(directoryApi.endpoints.listMunicipalities.initiate());
	assert.equal(municipalities.data?.items[1]!.shelter_slug, null);
});

test('result states; an unconfirmed municipality never exposes a phone', async () => {
	const { store } = setup();
	const { data } = await store.dispatch(
		directoryApi.endpoints.getResponsibleShelter.initiate({ municipality: 'osilnica' })
	);
	const result = toResult(data, false);
	assert.deepEqual(result, { status: 'unconfirmed', shelter: null });
	assert.ok(!JSON.stringify(result).includes('phone'));
	// a misbehaving response with a shelter attached is still stripped
	assert.equal(toResult({ status: 'unconfirmed', shelter: fx.ljubljanaShelter } as never, false).shelter, null);
	assert.equal(toResult(fx.responsibleConfirmed as never, false).shelter?.phone, '+38612345678');
	assert.equal(toResult(undefined, false).status, 'loading');
	assert.equal(toResult(undefined, true).status, 'error');
	assert.equal(toResult(fx.responsibleOutside as never, false).status, 'outside_slovenia');
});
