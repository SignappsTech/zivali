// POST /v1/geo/search and /v1/geo/reverse (C6 §Geocoder, TASK-15.8): parsing and ranking, house numbers, reverse
// labels, guards (optionalAuth, 60/min per IP and per device), Cache-Control: no-store, no query or point in logs.
import { randomInt, randomUUID } from 'node:crypto';

import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Place } from '@zivali/types';

import { app } from '../../app.ts';
import { parseQuery } from '../../domains/geo/geo.domain.ts';
import { Prisma } from '../../generated/client.ts';
import { geoSearchQuery, type GeoSearchTerms } from '../../lib/geo.ts';
import { loggerOptions, requestLogger } from '../../lib/logger.ts';
import { errorHandler } from '../../middleware/error.middleware.ts';
import { prisma } from '../../prisma/prisma.ts';
import v1Routes from '../../routes/index.ts';
import { ensureGeoPlaces, SEED_TIMEOUT_MS } from '../helpers/geo.ts';
import { signTestToken } from '../helpers/token.ts';

type Point = { lat: number; lng: number };
const users: string[] = [];
const LJUBLJANA = { lat: 46.05, lng: 14.51 };
const MARIBOR = { lat: 46.5576, lng: 15.6456 };
const GRAZ = { lat: 47.0707, lng: 15.4395 };

beforeAll(ensureGeoPlaces, SEED_TIMEOUT_MS);

afterAll(async () => {
	await prisma.rate_limits.deleteMany({ where: { name: { in: ['geo', 'geo.device'] } } });
	await prisma.profiles.deleteMany({ where: { id: { in: users } } });
});

// A fresh client IP (trust proxy: X-Forwarded-For) and device per request, so only the rate limit tests hit 60/min.
const ip = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
const post = (path: 'search' | 'reverse', body: object, headers: Record<string, string> = {}) =>
	request(app)
		.post(`/v1/geo/${path}`)
		.set({ 'x-forwarded-for': ip(), 'x-device-id': randomUUID(), ...headers })
		.send(body);

async function search(q: string, near?: Point): Promise<Place[]> {
	const res = await post('search', { q, near });
	expect(res.status).toBe(200);
	expect(res.headers['cache-control']).toBe('no-store');
	const items: Place[] = res.body.items;
	expect(items.length).toBeLessThanOrEqual(5);
	expect(new Set(items.map((item) => item.label)).size).toBe(items.length);
	return items;
}

async function reverse(point: Point): Promise<Place | null> {
	const res = await post('reverse', point);
	expect(res.status).toBe(200);
	expect(res.headers['cache-control']).toBe('no-store');
	return res.body.place;
}

describe('parseQuery (C6 step 1)', () => {
	it.each([
		['trubarjeva 5, ljubljana', { text: 'trubarjeva', tail: 'ljubljana', number: 5, suffix: '' }],
		['Vrhpolje 12A', { text: 'vrhpolje', tail: null, number: 12, suffix: 'a' }],
		['Cesta 24. junija 5 b, Ljubljana', { text: 'cesta 24 junija', tail: 'ljubljana', number: 5, suffix: 'b' }],
		['Cesta 24. junija', { text: 'cesta 24 junija', tail: null, number: null, suffix: '' }],
		['ŠENTVID', { text: 'sentvid', tail: null, number: null, suffix: '' }],
		['12', { text: '12', tail: null, number: null, suffix: '' }],
	])('%s', (q, terms) => {
		expect(parseQuery(q)).toEqual(terms);
	});
});

describe('POST /v1/geo/search', () => {
	it('puts the house number first, then the street, qualified by the tail', async () => {
		const items = await search('trubarjeva 5, ljubljana', LJUBLJANA);
		expect(items[0]).toEqual({
			label: 'Trubarjeva cesta 5, Ljubljana',
			lat: 46.05198,
			lng: 14.50705,
			kind: 'address',
			municipality_slug: 'ljubljana',
		});
		expect(items[1]).toMatchObject({ label: 'Trubarjeva cesta, Ljubljana', kind: 'street' });
		// Without the tail the street with the most house numbers wins.
		expect((await search('trubarjeva 5'))[0]).toMatchObject({
			label: 'Trubarjeva ulica 5, Celje',
			kind: 'address',
		});
		// No such house number: the street stays first.
		expect((await search('trubarjeva 999, ljubljana'))[0]).toMatchObject({
			label: 'Trubarjeva cesta, Ljubljana',
			kind: 'street',
		});
	});

	it('finds a village house number (settlement without streets)', async () => {
		const items = await search('Vrhpolje pri Kamniku 5');
		expect(items[0]).toEqual({
			label: 'Vrhpolje pri Kamniku 5, Kamnik',
			lat: 46.22878,
			lng: 14.6227,
			kind: 'address',
			municipality_slug: 'kamnik',
		});
		expect(items[1]).toMatchObject({ label: 'Vrhpolje pri Kamniku, Kamnik', kind: 'settlement' });
	});

	it('matches with or without diacritics (č/š/ž)', async () => {
		for (const q of ['sentvid', 'Šentvid', 'SENTVID']) {
			expect((await search(q))[0]).toMatchObject({
				label: 'Šentvid, Ljubljana',
				kind: 'district',
				municipality_slug: 'ljubljana',
			});
		}
		expect((await search('zuzemberk'))[0]).toMatchObject({ label: 'Žužemberk', kind: 'settlement' });
	});

	it('finds the official Italian and Hungarian names', async () => {
		expect((await search('capodistria'))[0]).toMatchObject({
			label: 'Koper',
			kind: 'settlement',
			municipality_slug: 'koper',
		});
		expect((await search('Lendva'))[0]).toMatchObject({ label: 'Lendava', kind: 'settlement' });
	});

	it('tells same-name streets apart by near and by the tail', async () => {
		const near = await search('Cankarjeva ulica', MARIBOR);
		expect(near[0]).toMatchObject({
			label: 'Cankarjeva ulica, Maribor',
			kind: 'street',
			municipality_slug: 'maribor',
		});
		expect(near).toHaveLength(5);
		expect((await search('Cankarjeva ulica'))[0]!.label).toBe('Cankarjeva ulica, Murska Sobota');
		expect((await search('cankarjeva ulica, nova gorica'))[0]!.label).toBe('Cankarjeva ulica, Nova Gorica');
	});

	it('ranks bigger places first among prefix matches and survives typos', async () => {
		expect((await search('ljub'))[0]).toMatchObject({ label: 'Ljubljana', kind: 'settlement' });
		expect((await search('ljub', MARIBOR))[0]).toMatchObject({ label: 'Ljubljana', kind: 'settlement' });
		expect((await search('trubarieva cesta'))[0]).toMatchObject({ label: 'Trubarjeva cesta, Ljubljana' });
		expect(await search('qxqxqxqx')).toEqual([]);
	});

	it('rejects a too short or too long q and a bad near with VALIDATION', async () => {
		const short = await post('search', { q: ' x ' });
		expect(short.status).toBe(400);
		expect(short.body.error).toMatchObject({ code: 'VALIDATION', issues: [{ path: 'q', message: 'Too short' }] });
		expect((await post('search', { q: 'a'.repeat(101) })).status).toBe(400);
		expect((await post('search', { q: 'ljubljana', near: { lat: 91, lng: 14.5 } })).body.error.code).toBe(
			'VALIDATION'
		);
	});

	it('runs in under 50 ms of database time (trigram and prefix indexes)', async () => {
		const terms: GeoSearchTerms[] = [
			{ ...parseQuery('trubarjeva 5, ljubljana'), near: LJUBLJANA },
			parseQuery('sentvid'),
			parseQuery('cankarjeva ulica'),
			parseQuery('vrhpolje pri kamniku 5'),
			parseQuery('lj'),
		];
		const explain = async (t: GeoSearchTerms) => {
			const [row] = await prisma.$queryRaw<{ 'QUERY PLAN': [{ 'Execution Time': number; Plan: unknown }] }[]>(
				Prisma.sql`explain (analyze, format json) ${geoSearchQuery(t)}`
			);
			return row!['QUERY PLAN'][0];
		};
		await explain(terms[0]!); // loads the pg_trgm and PostGIS libraries into the backend
		const runs = [];
		for (const t of terms) runs.push(await explain(t));
		expect(JSON.stringify(runs[1]!.Plan)).toContain('"Index Name":"geo_places_search_idx"');
		const ms = runs.map((run) => run['Execution Time']).sort((a, b) => a - b);
		expect(ms[2]).toBeLessThan(50);
	});
});

describe('POST /v1/geo/reverse', () => {
	it('returns the district with its municipality, never the requested point', async () => {
		const point = { lat: 46.0702, lng: 14.4875 };
		expect(await reverse(point)).toEqual({
			label: 'Šiška, Ljubljana',
			lat: 46.06911,
			lng: 14.48378,
			kind: 'district',
			municipality_slug: 'ljubljana',
		});
	});

	it('returns the settlement of a village, and the bare name when it equals the municipality', async () => {
		expect(await reverse({ lat: 46.22878, lng: 14.6227 })).toMatchObject({
			label: 'Vrhpolje pri Kamniku, Kamnik',
			kind: 'settlement',
			municipality_slug: 'kamnik',
		});
		expect(await reverse({ lat: 46.2389, lng: 14.3556 })).toMatchObject({ label: 'Kranj', kind: 'settlement' });
	});

	it('falls back to the municipality where no settlement polygon covers the point', async () => {
		expect(await reverse({ lat: 46.07, lng: 13.53 })).toEqual({
			label: 'Kanal',
			lat: 46.08403,
			lng: 13.66333,
			kind: 'municipality',
			municipality_slug: 'kanal',
		});
	});

	it('returns null outside Slovenia', async () => {
		expect(await reverse(GRAZ)).toBeNull();
		expect(await reverse({ lat: 46.6247, lng: 14.3053 })).toBeNull(); // Klagenfurt
	});

	it('rejects out-of-range or missing coordinates with VALIDATION', async () => {
		expect((await post('reverse', { lat: 91, lng: 14.5 })).body.error.code).toBe('VALIDATION');
		expect((await post('reverse', { lat: 46.05 })).status).toBe(400);
	});
});

describe('guards and privacy (C6 privacy rules)', () => {
	it.each([
		['anonymous visitor', async () => ({})],
		['anonymous user', async () => ({ Authorization: `Bearer ${await token(true)}` })],
		['user', async () => ({ Authorization: `Bearer ${await token(false)}` })],
	])('%s may search and reverse', async (_who, headers) => {
		const auth = await headers();
		expect((await post('search', { q: 'ljubljana' }, auth)).status).toBe(200);
		expect((await post('reverse', LJUBLJANA, auth)).status).toBe(200);
	});

	it('takes queries and points only in POST bodies', async () => {
		expect((await request(app).get('/v1/geo/search?q=ljubljana')).status).toBe(404);
		expect((await request(app).get('/v1/geo/reverse?lat=46.05&lng=14.51')).status).toBe(404);
	});

	// Fixed one-minute windows: a burst starts early in a window, so it cannot straddle two.
	async function burst(headers: Record<string, string>): Promise<number[]> {
		const left = 60_000 - (Date.now() % 60_000);
		if (left < 15_000) await new Promise((resolve) => setTimeout(resolve, left + 100));
		const statuses = await Promise.all(Array.from({ length: 60 }, () => post('reverse', GRAZ, headers)));
		return statuses.map((res) => res.status);
	}

	it('allows 60 lookups per minute per IP, then 429 RATE_LIMITED', async () => {
		const client = ip();
		expect(new Set(await burst({ 'x-forwarded-for': client }))).toEqual(new Set([200]));
		const res = await post('search', { q: 'ljubljana' }, { 'x-forwarded-for': client });
		expect(res.status).toBe(429);
		expect(res.body.error.code).toBe('RATE_LIMITED');
		expect(Number(res.headers['retry-after'])).toBeGreaterThanOrEqual(1);
	}, 60_000);

	it('allows 60 lookups per minute per device, then 429 RATE_LIMITED', async () => {
		const device = randomUUID();
		expect(new Set(await burst({ 'x-device-id': device }))).toEqual(new Set([200]));
		expect((await post('reverse', GRAZ, { 'x-device-id': device })).body.error.code).toBe('RATE_LIMITED');
	}, 60_000);

	it('logs neither q nor coordinates, only the route pattern', async () => {
		const lines: string[] = [];
		const capture = pino({ ...loggerOptions, level: 'info' }, { write: (line: string) => void lines.push(line) });
		const logged = express();
		logged.set('trust proxy', 1);
		logged.use(requestLogger(capture), express.json());
		logged.use('/v1', v1Routes);
		logged.use(errorHandler);
		const send = (path: string, body: object) =>
			request(logged).post(path).set({ 'x-forwarded-for': ip(), 'x-device-id': randomUUID() }).send(body);
		expect((await send('/v1/geo/search', { q: 'Trubarjeva 5, Ljubljana', near: LJUBLJANA })).status).toBe(200);
		expect((await send('/v1/geo/reverse', { lat: 46.0702, lng: 14.4875 })).status).toBe(200);
		expect((await send('/v1/geo/search', { q: 'x', near: { lat: 46.0702, lng: 14.4875 } })).status).toBe(400);
		await new Promise((resolve) => setImmediate(resolve));

		// error_paths names the refused fields (TASK-114.5), never their values: checked on its own below.
		const output = lines.map((line) => JSON.stringify({ ...JSON.parse(line), error_paths: undefined })).join('');
		for (const leak of [
			'rubarjeva',
			'jubljana',
			'46.0',
			'14.4',
			'14.5',
			'"q"',
			'near',
			'"lat"',
			'"lng"',
			'Šiška',
		]) {
			expect(output).not.toContain(leak);
		}
		const routes = lines.map((line) => JSON.parse(line)).filter((entry) => entry.route);
		expect(routes.map((entry) => [entry.route, entry.status])).toEqual([
			['POST /v1/geo/search', 200],
			['POST /v1/geo/reverse', 200],
			['POST /v1/geo/search', 400],
		]);
		expect(routes[2]).toMatchObject({ error_code: 'VALIDATION', error_paths: ['q'] });
	});
});

async function token(is_anonymous: boolean): Promise<string> {
	const sub = randomUUID();
	users.push(sub);
	return signTestToken({ sub, is_anonymous });
}
