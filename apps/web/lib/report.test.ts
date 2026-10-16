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

	it('gives up on a slow API after 3 s, to the error page', async () => {
		const timeout = vi.spyOn(AbortSignal, 'timeout');
		fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

		await expect(getReport('sl', 'Hk3vT9qP')).rejects.toThrow();
		expect(timeout).toHaveBeenCalledWith(3000);
		expect(fetchMock.mock.calls[0]![1]?.signal).toBe(timeout.mock.results[0]!.value);
		timeout.mockRestore();
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
		expect(await getPlace('sl', 46.1, 14.5)).toBeUndefined();
	});

	it('gives up after 1.5 s: no name', async () => {
		const timeout = vi.spyOn(AbortSignal, 'timeout');
		fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

		expect(await getPlace('sl', 46.2, 14.5)).toBeUndefined();
		expect(timeout).toHaveBeenCalledWith(1500);
		expect(fetchMock.mock.calls[0]![1]?.signal).toBe(timeout.mock.results[0]!.value);
		timeout.mockRestore();
	});

	it('asks once per point and language; a failure is asked again', async () => {
		reply(429, error('RATE_LIMITED'));
		expect(await getPlace('sl', 46.3, 14.3)).toBeUndefined();
		reply(200, placeReverse);
		expect(await getPlace('sl', 46.3, 14.3)).toMatchObject({ label: 'Šiška, Ljubljana' });
		expect(await getPlace('sl', 46.3, 14.3)).toMatchObject({ label: 'Šiška, Ljubljana' });
		expect(fetchMock).toHaveBeenCalledTimes(2);

		reply(200, placeReverse);
		await getPlace('en', 46.3, 14.3);
		expect(fetchMock).toHaveBeenCalledTimes(3);
	});

	it('keeps the 2000 most recently used places', async () => {
		fetchMock.mockImplementation(async () => new Response(JSON.stringify(placeReverse)));
		for (let i = 0; i < 2000; i++) await getPlace('en', i, 0);
		await getPlace('en', 0, 0); // used again: now the most recent
		await getPlace('en', 2000, 0); // one more: the least recently used (1) goes
		fetchMock.mockClear();

		await getPlace('en', 0, 0);
		await getPlace('en', 2000, 0);
		expect(fetchMock).not.toHaveBeenCalled();
		await getPlace('en', 1, 0);
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});
