import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as fx from '../src/__fixtures__/directory-admin.ts';
import { directoryAdminApi } from '../src/directory-admin.ts';
import { mockStore } from './helpers.ts';

const { endpoints } = directoryAdminApi;

test('admin directory endpoints follow C18 §Admin', async (t) => {
	const { store, calls } = mockStore(t, {
		'GET /v1/admin/shelters': fx.adminShelters,
		'GET /v1/admin/municipality-shelters': fx.adminMunicipalities,
		'GET /v1/admin/shelters/:slug/changes': fx.shelterHistory,
		'GET /v1/admin/municipality-shelters/:slug/changes': { items: [] },
		'PUT /v1/admin/shelters/:slug': ({ body }) => body,
		'DELETE /v1/admin/shelters/:slug': () => undefined,
		'PUT /v1/admin/municipality-shelters/:slug': ({ body }) => body,
		'POST /v1/admin/directory/import': fx.importClean,
	});

	assert.equal((await store.dispatch(endpoints.listAdminShelters.initiate())).data?.items.length, 3);
	assert.equal((await store.dispatch(endpoints.listAdminMunicipalities.initiate())).data?.items.length, 5);
	await store.dispatch(endpoints.getDirectoryHistory.initiate({ entity: 'shelter', key: 'zavetisce-lipa' }));
	await store.dispatch(endpoints.getDirectoryHistory.initiate({ entity: 'municipality_shelter', key: 'bloke' }));
	await store.dispatch(endpoints.deleteShelter.initiate({ slug: 'zavetisce-lipa', audit_note: 'Zaprto.' }));
	await store.dispatch(
		endpoints.updateMunicipalityShelter.initiate({
			slug: 'bloke',
			body: { shelter_slug: null, status: 'UNCONFIRMED', source: 'Klic', verified_at: '2026-10-15', version: 1 },
		})
	);
	await store.dispatch(endpoints.importDirectory.initiate({ csv: 'a,b\n', dryRun: true }));
	await store.dispatch(endpoints.importDirectory.initiate({ csv: 'a,b\n', dryRun: false }));

	const history = calls().filter((call) => call.path.endsWith('/changes'));
	assert.deepEqual(
		history.slice(0, 2).map((call) => call.path),
		['/v1/admin/shelters/zavetisce-lipa/changes', '/v1/admin/municipality-shelters/bloke/changes']
	);
	// Writes refetch the subscribed history (tag Directory), so only the first two GETs above are explicit.
	assert.deepEqual(
		calls()
			.filter((call) => call.method !== 'GET')
			.map(({ method, path, query, body }) => [method, path, query, body]),
		[
			['DELETE', '/v1/admin/shelters/zavetisce-lipa', {}, { audit_note: 'Zaprto.' }],
			[
				'PUT',
				'/v1/admin/municipality-shelters/bloke',
				{},
				{ shelter_slug: null, status: 'UNCONFIRMED', source: 'Klic', verified_at: '2026-10-15', version: 1 },
			],
			['POST', '/v1/admin/directory/import', { dry_run: 'true' }, { csv: 'a,b\n' }],
			['POST', '/v1/admin/directory/import', {}, { csv: 'a,b\n' }],
		]
	);
});
