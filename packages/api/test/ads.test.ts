import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AdInput } from '@zivali/types';

import { ad, lead, partnerStats } from '../src/__fixtures__/ads.ts';
import { adsApi, adState } from '../src/ads.ts';
import { mockError } from '../src/mock.ts';
import { partnersApi } from '../src/partners.ts';
import { failure, mockStore } from './helpers.ts';

const e = adsApi.endpoints;
const p = partnersApi.endpoints;
const none = () => undefined;
const id = ad.id;
const adInput: AdInput = {
	title: ad.title,
	body: ad.body,
	cta: ad.cta,
	link_url: 'https://vet.example.test',
	image_alt: ad.image_alt,
	slots: ['detail'],
};

test('ad endpoints map their arguments to the C14 routes', async (t) => {
	const { store, calls } = mockStore(t, {
		'GET /v1/ads/slot/:slot': ad,
		'POST /v1/ads/:id/impressions': none,
		'GET /v1/admin/ads': { items: [], next_cursor: null },
		'POST /v1/admin/ads': {},
		'PUT /v1/admin/ads/:id': {},
		'POST /v1/admin/ads/:id/image': { upload: { url: 'https://s3.test/put', method: 'PUT', headers: {} } },
		'POST /v1/admin/ads/:id/status': {},
		'DELETE /v1/admin/ads/:id': none,
		'GET /v1/admin/ads/:id/stats': { items: [] },
	});
	const image = {
		sha256: 'ab'.repeat(32),
		width: 1200,
		height: 900,
		bytes: 200_000,
		content_type: 'image/jpeg',
	} as const;

	const served = await store.dispatch(
		e.getAdForSlot.initiate({ slot: 'detail', region_id: 8, species: 'dog', locale: 'sl' }, { subscribe: false })
	);
	assert.deepEqual(served.data, ad);
	await store.dispatch(e.recordAdImpression.initiate({ id, body: { slot: 'detail', region_id: 8 } }));
	await store.dispatch(e.listAdminAds.initiate({ status: 'active' }, { subscribe: false }));
	await store.dispatch(e.createAd.initiate(adInput));
	await store.dispatch(e.updateAd.initiate({ id, body: adInput }));
	await store.dispatch(e.requestAdImageUpload.initiate({ id, body: image }));
	await store.dispatch(e.setAdStatus.initiate({ id, body: { status: 'paused' } }));
	await store.dispatch(e.deleteAd.initiate({ id }));
	await store.dispatch(e.getAdStats.initiate({ id, from: '2026-10-01', to: '2026-10-14' }, { subscribe: false }));

	assert.deepEqual(calls(), [
		{
			method: 'GET',
			path: '/v1/ads/slot/detail',
			query: { region_id: '8', species: 'dog', locale: 'sl' },
			body: undefined,
		},
		{ method: 'POST', path: `/v1/ads/${id}/impressions`, query: {}, body: { slot: 'detail', region_id: 8 } },
		{ method: 'GET', path: '/v1/admin/ads', query: { status: 'active' }, body: undefined },
		{ method: 'POST', path: '/v1/admin/ads', query: {}, body: adInput },
		{ method: 'PUT', path: `/v1/admin/ads/${id}`, query: {}, body: adInput },
		{ method: 'POST', path: `/v1/admin/ads/${id}/image`, query: {}, body: image },
		{ method: 'POST', path: `/v1/admin/ads/${id}/status`, query: {}, body: { status: 'paused' } },
		{ method: 'DELETE', path: `/v1/admin/ads/${id}`, query: {}, body: undefined },
		{
			method: 'GET',
			path: `/v1/admin/ads/${id}/stats`,
			query: { from: '2026-10-01', to: '2026-10-14' },
			body: undefined,
		},
	]);
});

test('useAd state: the ad, null when none fits, and an error collapses the slot instead of throwing', async (t) => {
	const { store } = mockStore(t, {
		'GET /v1/ads/slot/detail': ad,
		'GET /v1/ads/slot/feed': () => null,
		'GET /v1/ads/slot/sidebar': () => mockError('VALIDATION', 'Unknown slot'),
	});
	const stateFor = async (slot: 'detail' | 'feed' | 'sidebar') => {
		await store.dispatch(e.getAdForSlot.initiate({ slot }, { subscribe: false }));
		return adState(e.getAdForSlot.select({ slot })(store.getState() as never));
	};

	assert.deepEqual(await stateFor('detail'), { ad, loading: false, error: null });
	assert.deepEqual(await stateFor('feed'), { ad: null, loading: false, error: null });
	const failed = await stateFor('sidebar');
	assert.equal(failed.ad, null);
	assert.equal(failed.error?.data.code, 'VALIDATION');
	assert.deepEqual(adState({ isLoading: true }), { ad: null, loading: true, error: null });
});

test('partner endpoints map to C14 §Partner stats and leads; captcha failures arrive as data.code', async (t) => {
	const { store, calls } = mockStore(t, {
		'GET /v1/partners/stats': partnerStats,
		'POST /v1/leads': ({ body }) =>
			(body as { captcha_token: string }).captcha_token === 'mock-ok'
				? { id: 'l1' }
				: mockError('CAPTCHA_FAILED'),
		'GET /v1/admin/leads': { items: [], next_cursor: null },
	});

	assert.deepEqual(
		(await store.dispatch(p.getPartnerStats.initiate(undefined, { subscribe: false }))).data,
		partnerStats
	);
	assert.deepEqual((await store.dispatch(p.createLead.initiate(lead))).data, { id: 'l1' });
	const refused = await store.dispatch(p.createLead.initiate({ ...lead, captcha_token: 'bad' }));
	assert.deepEqual(failure(refused), [422, 'CAPTCHA_FAILED']);
	await store.dispatch(p.listAdminLeads.initiate({ cursor: 'l2' }, { subscribe: false }));

	assert.deepEqual(
		calls().map(({ method, path, query }) => [method, path, query]),
		[
			['GET', '/v1/partners/stats', {}],
			['POST', '/v1/leads', {}],
			['POST', '/v1/leads', {}],
			['GET', '/v1/admin/leads', { cursor: 'l2' }],
		]
	);
});
