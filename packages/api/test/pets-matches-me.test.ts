import assert from 'node:assert/strict';
import { test } from 'node:test';

import { confirmedMatch, matches } from '../src/__fixtures__/matches.ts';
import { adminUsers, me } from '../src/__fixtures__/me.ts';
import { pet, petLimit, pets } from '../src/__fixtures__/pets.ts';
import { matchesApi } from '../src/matches.ts';
import { meApi } from '../src/me.ts';
import { createMockApi, mockError } from '../src/mock.ts';
import { petsApi } from '../src/pets.ts';
import { createApiStore } from '../src/rtk.ts';

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status });

test('me: GET and PATCH /v1/me; UNAUTHENTICATED without a session; a PATCH refetches me', async () => {
	const client = createMockApi({ 'GET /v1/me': me, 'PATCH /v1/me': ({ body }) => ({ ...me, ...(body as object) }) });
	const store = createApiStore(client);
	const sub = store.dispatch(meApi.endpoints.getMe.initiate());
	assert.deepEqual((await sub).data, me);

	const { data } = await store.dispatch(meApi.endpoints.updateMe.initiate({ home_radius_km: 10, locale: 'en' }));
	assert.equal(data?.home_radius_km, 10);
	await new Promise((resolve) => setTimeout(resolve, 10));
	assert.deepEqual(
		client.calls.map((c) => `${c.method} ${c.path}`),
		['GET /v1/me', 'PATCH /v1/me', 'GET /v1/me']
	);
	sub.unsubscribe();

	const signedOut = createApiStore(createMockApi({ 'GET /v1/me': () => mockError('UNAUTHENTICATED') }));
	const { error } = await signedOut.dispatch(meApi.endpoints.getMe.initiate(undefined, { subscribe: false }));
	assert.equal(error && 'status' in error && error.status, 401);
});

test('admin users: query and cursor, role change with PUT', async () => {
	const client = createMockApi({
		'GET /v1/admin/users': adminUsers,
		'PUT /v1/admin/users/:id/role': { id: me.id, role: 'MODERATOR' },
	});
	const store = createApiStore(client);
	const list = await store.dispatch(meApi.endpoints.listAdminUsers.initiate({ query: 'ana' }));
	assert.deepEqual(list.data?.pages[0], adminUsers);
	await store.dispatch(
		meApi.endpoints.setUserRole.initiate({ id: me.id, body: { role: 'MODERATOR', note: 'Shelter coordinator' } })
	);
	assert.deepEqual(client.calls[0]!.query, { query: 'ana' });
	assert.deepEqual(
		[client.calls[1]!.path, client.calls[1]!.body],
		[`/v1/admin/users/${me.id}/role`, { role: 'MODERATOR', note: 'Shelter coordinator' }]
	);
});

test('pets: CRUD paths and the PET_LIMIT conflict', async () => {
	const client = createMockApi({
		'GET /v1/pets': pets,
		'GET /v1/pets/:id': pet,
		'POST /v1/pets': () => json(petLimit, 409),
		'PATCH /v1/pets/:id': pet,
		'DELETE /v1/pets/:id': () => undefined,
		'POST /v1/pets/:id/archive': pet,
		'PUT /v1/pets/:id/photos': () => undefined,
	});
	const store = createApiStore(client);
	const { endpoints } = petsApi;

	assert.deepEqual((await store.dispatch(endpoints.listPets.initiate(undefined, { subscribe: false }))).data, pets);
	assert.deepEqual((await store.dispatch(endpoints.getPet.initiate({ id: pet.id }, { subscribe: false }))).data, pet);
	const { error } = await store.dispatch(endpoints.createPet.initiate({ species: 'cat', name: 'Muca' }));
	assert.deepEqual(error, { status: 409, data: { ...petLimit.error, issues: undefined, requestId: undefined } });
	await store.dispatch(endpoints.updatePet.initiate({ id: pet.id, body: { notes: null } }));
	await store.dispatch(endpoints.archivePet.initiate({ id: pet.id }));
	await store.dispatch(endpoints.setPetPhotos.initiate({ id: pet.id, body: { photo_ids: ['p2', 'p1'] } }));
	assert.equal((await store.dispatch(endpoints.deletePet.initiate({ id: pet.id }))).error, undefined);

	assert.deepEqual(
		client.calls.slice(2).map((c) => [c.method, c.path, c.body]),
		[
			['POST', '/v1/pets', { species: 'cat', name: 'Muca' }],
			['PATCH', `/v1/pets/${pet.id}`, { notes: null }],
			['POST', `/v1/pets/${pet.id}/archive`, undefined],
			['PUT', `/v1/pets/${pet.id}/photos`, { photo_ids: ['p2', 'p1'] }],
			['DELETE', `/v1/pets/${pet.id}`, undefined],
		]
	);
});

test('matches: state filter, confirm returns the conversation, reject with a reason, UNVERIFIED_EMAIL', async () => {
	const client = createMockApi({
		'GET /v1/reports/:code/matches': matches,
		'POST /v1/matches/:id/confirm': ({ params }) =>
			params.id === 'unverified' ? mockError('UNVERIFIED_EMAIL') : confirmedMatch,
		'POST /v1/matches/:id/reject': () => undefined,
	});
	const store = createApiStore(client);
	const { endpoints } = matchesApi;

	const list = await store.dispatch(
		endpoints.listMatches.initiate({ code: 'Pq7xR2mK', state: ['suggested', 'confirmed'] }, { subscribe: false })
	);
	assert.deepEqual(list.data, matches);
	assert.deepEqual(client.calls[0]!.query, { state: 'suggested,confirmed' });

	assert.deepEqual((await store.dispatch(endpoints.confirmMatch.initiate({ id: 'm1' }))).data, confirmedMatch);
	const blocked = await store.dispatch(endpoints.confirmMatch.initiate({ id: 'unverified' }));
	assert.equal(blocked.error && 'data' in blocked.error && blocked.error.data.code, 'UNVERIFIED_EMAIL');
	await store.dispatch(endpoints.rejectMatch.initiate({ id: 'm1', body: { reason: 'different_dog' } }));
	assert.deepEqual(client.calls.at(-1)!.body, { reason: 'different_dog' });
});
