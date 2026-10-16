// C18 directory and C14 partner endpoints for the Playwright run (playwright.config.ts starts it), until apps/api serves them.
// Server components and the browser both call it, so it answers CORS. Run on its own: PORT=4010 node e2e/mock-api.ts
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

import { partnerStats } from '@zivali/api/__fixtures__/ads';
import {
	ljubljanaShelter,
	responsibleConfirmed,
	responsibleLikely,
	responsibleUnconfirmed,
	shelterPage,
} from '@zivali/api/__fixtures__/directory';
import { placeReverse } from '@zivali/api/__fixtures__/geocode';
import { publicReport } from '@zivali/api/__fixtures__/reports';

// TASK-18.2 report detail: a lost report with a reward and a photo served from here (playwright.config.ts sets
// MEDIA_BASE_URL to this server), the found fixture (the /m page's "Uredi prijavo" target) and a gone one.
const media = `http://localhost:${process.env.PORT || 4010}/media`;
// 1 x 1 PNG.
const PIXEL = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);
const lostReport = {
	...publicReport,
	id: '51aa3c2e-4b1d-4f6a-9e2c-8d7b5a1f3e10',
	short_code: 'Rex12345',
	type: 'lost',
	name: 'Rex',
	breed_codes: ['dog.mixed'],
	colours: ['brown', 'white'],
	pattern: 'bicolour',
	size: 'm',
	sex: 'male',
	has_chip: true,
	event_at: '2026-10-12T16:00:00Z',
	circumstances: 'Rex se je ustrašil ognjemeta in zbežal z vrta.',
	reward: { eur: 50, note: null },
	area: { lat: 46.064, lng: 14.493, radius_m: 500 },
	photos: [
		{ url: `${media}/rex.png`, thumb_url: `${media}/rex.png`, alt: 'Pogrešani pes Rex', width: 800, height: 600 },
	],
};
// Answered with an error status: [status, code].
const failures: Record<string, [number, string]> = { '/v1/reports/Gone1234': [410, 'GONE'] };

const noPhone = {
	...ljubljanaShelter,
	slug: 'zavetisce-kocevje',
	name: 'Zavetišče Kočevje',
	address: 'Cesta 2',
	postal_code: '1330',
	city: 'Kočevje',
	phone: '',
	phone_display: '',
	website: 'https://example.org/',
	verified_at: '2025-08-03',
};

const routes: Record<string, unknown> = {
	'/health': { ok: true },
	'/v1/shelters': {
		items: [ljubljanaShelter, noPhone].map(({ slug, name, city, phone_display }) => ({
			slug,
			name,
			city,
			phone_display,
		})),
	},
	'/v1/shelters/municipalities': {
		items: [
			{ slug: 'kocevje', name: 'Kočevje', shelter_slug: null },
			{ slug: 'ljubljana', name: 'Ljubljana', shelter_slug: 'zavetisce-ljubljana' },
			{ slug: 'osilnica', name: 'Osilnica', shelter_slug: null },
			{ slug: 'skofja-loka', name: 'Škofja Loka', shelter_slug: null },
			{ slug: 'skofljica', name: 'Škofljica', shelter_slug: 'zavetisce-ljubljana' },
		],
	},
	'/v1/shelters/zavetisce-ljubljana': {
		...shelterPage,
		municipalities: [...shelterPage.municipalities, { slug: 'skofljica', name: 'Škofljica' }],
	},
	'/v1/shelters/zavetisce-kocevje': { ...noPhone, municipalities: [] },
	'/v1/shelters/responsible?municipality=ljubljana': responsibleConfirmed,
	'/v1/shelters/responsible?municipality=skofljica': responsibleConfirmed,
	'/v1/shelters/responsible?municipality=kocevje': responsibleLikely,
	'/v1/shelters/responsible?municipality=osilnica': responsibleUnconfirmed,
	'/v1/shelters/responsible?municipality=skofja-loka': responsibleUnconfirmed,
	[`/v1/reports/${lostReport.short_code}`]: lostReport,
	[`/v1/reports/${publicReport.short_code}`]: publicReport,
	'/v1/geo/reverse': placeReverse,
	// TASK-24.2 Facebook kit: the C1 public share keys.
	'/v1/config/public': {
		'share.facebook_groups': [
			{
				name: 'Izgubljene živali – Osrednja Slovenija',
				url: 'https://www.facebook.com/groups/e2e',
				regions: ['osrednjeslovenska'],
			},
		],
		'share.radio_form_url': 'https://radio.example/obvestila',
	},
	// C14 partner stats (server-rendered on P22) and the enquiry (any method answers the body, so POST is a success).
	'/v1/partners/stats': partnerStats,
	'/v1/leads': { id: 'a1e5f00d-0000-4000-8000-000000000001' },
};

// Supabase Auth stand-in (TASK-105): the web build points NEXT_PUBLIC_SUPABASE_URL here, so getClaims() verifies a
// token signed with this run's ES256 key against the JWKS below. /e2e/token issues tokens (see e2e/session.ts);
// the app has no test bypass, an unsigned or forged token fails the same check as in production.
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const kid = 'e2e-key';
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
routes['/auth/v1/.well-known/jwks.json'] = {
	keys: [{ ...publicKey.export({ format: 'jwk' }), kid, alg: 'ES256', use: 'sig' }],
};

function token(query: URLSearchParams) {
	const exp = Math.floor(Date.now() / 1000) + 86_400 * 2;
	const input = `${b64({ alg: 'ES256', typ: 'JWT', kid })}.${b64({
		sub: query.get('sub'),
		aud: 'authenticated',
		role: 'authenticated',
		app_role: query.get('role'),
		aal: query.get('aal') || 'aal1',
		iat: exp - 86_400 * 2,
		exp,
	})}`;
	const signature = sign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' });
	return `${input}.${signature.toString('base64url')}`;
}

// C13 webhook as the mock provider's /dev/checkout posts it (server side, so no page.route sees it): 200 only for an
// event signed like Stripe with the default MOCK_WEBHOOK_SECRET, as apps/api verifies it.
function webhook(request: IncomingMessage, response: ServerResponse) {
	let body = '';
	request.on('data', (chunk) => (body += chunk));
	request.on('end', () => {
		const parts = Object.fromEntries(
			String(request.headers['stripe-signature'] ?? '')
				.split(',')
				.map((part) => part.split('='))
		);
		const signed = createHmac('sha256', 'mock-webhook-secret').update(`${parts.t}.${body}`).digest('hex');
		const ok = parts.v1 === signed && Boolean(JSON.parse(body).data?.object?.metadata?.payment_id);
		response.writeHead(ok ? 200 : 400, { 'Content-Type': 'application/json' });
		response.end(JSON.stringify(ok ? { received: true } : { error: { code: 'VALIDATION', message: 'Bad event' } }));
	});
}

createServer((request, response) => {
	const url = new URL(request.url ?? '', 'http://mock');
	if (request.method === 'POST' && url.pathname === '/v1/webhooks/stripe') return webhook(request, response);
	if (url.pathname === '/e2e/token') {
		response.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
		return void response.end(token(url.searchParams));
	}
	if (url.pathname.startsWith('/media/')) {
		response.writeHead(200, { 'Content-Type': 'image/png' });
		return void response.end(PIXEL);
	}
	const failure = failures[url.pathname];
	if (failure) {
		response.writeHead(failure[0], { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
		return void response.end(JSON.stringify({ error: { code: failure[1], message: failure[1] } }));
	}
	const body = routes[request.url ?? ''];
	response.writeHead(request.method === 'OPTIONS' ? 204 : body ? 200 : 404, {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': '*',
	});
	response.end(JSON.stringify(body ?? { error: { code: 'NOT_FOUND', message: `No mock for ${request.url}` } }));
}).listen(Number(process.env.PORT || 4010));
