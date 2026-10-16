// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import { placeReverse } from '@zivali/api/__fixtures__/geocode';

import { getPlace, getReport } from './report';

const session = vi.hoisted(() => ({ token: 'user-token' as string | undefined }));
vi.mock('@/lib/supabase/server', () => ({
	createClient: async () => ({
		auth: {
			getSession: async () => ({ data: { session: session.token ? { access_token: session.token } : null } }),
		},
	}),
}));

const fetchMock = vi.fn<typeof fetch>();
const reply = (status: number, body: unknown) =>
	fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
const error = (code: string) => ({ error: { code, message: code } });

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
	session.token = 'user-token';
});

describe('getReport', () => {
	it('asks GET /v1/reports/:code as the viewer, in the page language', async () => {
		reply(200, publicReport);

		expect(await getReport('en', 'Hk3vT9qP')).toEqual({ report: publicReport });
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe('http://localhost:4000/v1/reports/Hk3vT9qP');
		expect(init?.headers).toMatchObject({ Authorization: 'Bearer user-token', 'Accept-Language': 'en' });
	});

	it('signed out it sends no token', async () => {
		session.token = undefined;
		reply(200, publicReport);

		await getReport('sl', 'Hk3vT9qP');
		expect(fetchMock.mock.calls[0]![1]?.headers).not.toHaveProperty('Authorization');
	});

	it.each([
		[410, 'GONE', { gone: true }],
		[404, 'NOT_FOUND', null],
		[400, 'VALIDATION', null],
	])('%i %s → %j', async (status, code, result) => {
		reply(status, error(code));
		expect(await getReport('sl', 'x')).toEqual(result);
	});

	it('throws other failures to the error page', async () => {
		reply(500, error('INTERNAL'));
		await expect(getReport('sl', 'x')).rejects.toMatchObject({ code: 'INTERNAL' });
	});
});

describe('getPlace', () => {
	it('splits the reverse label into area and municipality', async () => {
		reply(200, placeReverse);

		expect(await getPlace('sl', 46.06, 14.49)).toEqual({
			label: 'Šiška, Ljubljana',
			area: 'Šiška',
			municipality: 'Ljubljana',
		});
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe('http://localhost:4000/v1/geo/reverse');
		// The point travels in the body only (C6).
		expect([init?.method, init?.body]).toEqual(['POST', JSON.stringify({ lat: 46.06, lng: 14.49 })]);
	});

	it('a settlement that is its own municipality', async () => {
		reply(200, { place: { ...placeReverse.place, label: 'Kamnik' } });
		expect(await getPlace('sl', 46.2, 14.6)).toEqual({ label: 'Kamnik', area: 'Kamnik', municipality: 'Kamnik' });
	});

	it('outside Slovenia or on a failed lookup there is none', async () => {
		reply(200, { place: null });
		expect(await getPlace('sl', 45.8, 13.6)).toBeUndefined();
		reply(429, error('RATE_LIMITED'));
		expect(await getPlace('sl', 46.06, 14.49)).toBeUndefined();
	});
});
