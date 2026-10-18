// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';

import { GET } from './route';

const realFetch = globalThis.fetch;
const fetchMock = vi.fn<typeof fetch>();
const get = (code: string, query = '') =>
	GET(new Request(`https://najdimo.si/r/${code}/square.png${query}`), { params: Promise.resolve({ code }) });
const API = 'http://localhost:4000/';
// The API answers here (the report, then the reverse lookup); next/og loads its own wasm through fetch.
const answer = (status: number, body: unknown) =>
	fetchMock.mockImplementation(async (input, init) => {
		const url = String(input);
		if (url.endsWith('/v1/geo/reverse'))
			return new Response(JSON.stringify({ place: { label: 'Šiška, Ljubljana' } }));
		return url.startsWith(API) ? new Response(JSON.stringify(body), { status }) : realFetch(input, init);
	});

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
});

describe('/r/[code]/square.png', () => {
	it('draws a 1080 x 1080 PNG for the Facebook kit, named by the code and language, cached privately', async () => {
		answer(200, { ...publicReport, photos: [] });
		const response = await get('Hk3vT9qP', '?lang=en');
		const png = Buffer.from(await response.arrayBuffer());

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/png');
		expect(response.headers.get('content-disposition')).toBe(
			`inline; filename="najdimo-${publicReport.short_code}-en.png"`
		);
		expect(response.headers.get('cache-control')).toBe('private, max-age=300');
		expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1080]);
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe('http://localhost:4000/v1/reports/Hk3vT9qP');
		expect(init?.headers).toEqual({ 'Accept-Language': 'en' });
	});

	it('answers 404 for unknown, gone and closed reports, 503 when the API fails', async () => {
		answer(404, { error: { code: 'NOT_FOUND', message: 'x' } });
		expect((await get('Hk3vT9qP')).status).toBe(404);
		answer(200, { ...publicReport, status: 'closed' });
		expect((await get('Hk3vT9qP')).status).toBe(404);
		answer(500, { error: { code: 'INTERNAL', message: 'x' } });
		const failed = await get('Hk3vT9qP');
		expect(failed.status).toBe(503);
		expect(failed.headers.get('cache-control')).toBe('no-store');
	});

	it('answers 503, uncached, when the report has a photo that cannot be fetched', async () => {
		answer(200, publicReport);
		const response = await get('Hk3vT9qP');
		expect([response.status, response.headers.get('cache-control')]).toEqual([503, 'no-store']);
	});
});
