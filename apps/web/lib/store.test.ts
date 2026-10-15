import { afterEach, describe, expect, it, vi } from 'vitest';

import { deviceId, getStore, makeApiClient } from './store';

vi.mock('@/lib/supabase/client', () => ({
	createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }) } }),
}));

afterEach(() => {
	localStorage.clear();
	vi.unstubAllGlobals();
});

describe('x-device-id (C7)', () => {
	it('makes the browser id once and sends it on every API request', async () => {
		const id = deviceId();
		expect(id).toMatch(/^[0-9a-f-]{36}$/);
		expect(deviceId()).toBe(id);
		expect(localStorage.getItem('device_id')).toBe(id);

		const fetch = vi.fn(async () => new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetch);
		const client = makeApiClient('sl');
		await client.request('GET', '/v1/reports/Hk3vT9qP');
		await client.request('POST', '/v1/manage/claim', { body: { token: 't' } });
		for (const [, init] of fetch.mock.calls as unknown as [string, RequestInit][])
			expect(init.headers).toMatchObject({ 'x-device-id': id });
	});

	it('still has an id when storage is blocked', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
			throw new DOMException('denied', 'SecurityError');
		});
		expect(deviceId()).toMatch(/^[0-9a-f-]{36}$/);
	});
});

describe('getStore', () => {
	it('shares one store per locale in the browser, so every StoreProvider sees the same cache', () => {
		expect(getStore('sl')).toBe(getStore('sl'));
		expect(getStore('en')).not.toBe(getStore('sl'));
	});

	it('makes a new store per server render, never shared between users', () => {
		vi.stubGlobal('window', undefined);
		expect(getStore('sl')).not.toBe(getStore('sl'));
	});
});
