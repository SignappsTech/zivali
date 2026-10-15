// C18 directory endpoints for the Playwright run (playwright.config.ts starts it), until apps/api serves them.
// Server components and the browser both call it, so it answers CORS. Run on its own: PORT=4010 node e2e/mock-api.ts
import { generateKeyPairSync, sign } from 'node:crypto';
import { createServer } from 'node:http';

import {
	ljubljanaShelter,
	responsibleConfirmed,
	responsibleLikely,
	responsibleUnconfirmed,
	shelterPage,
} from '@zivali/api/__fixtures__/directory';

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

createServer((request, response) => {
	const url = new URL(request.url ?? '', 'http://mock');
	if (url.pathname === '/e2e/token') {
		response.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
		return void response.end(token(url.searchParams));
	}
	const body = routes[request.url ?? ''];
	response.writeHead(request.method === 'OPTIONS' ? 204 : body ? 200 : 404, {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': '*',
	});
	response.end(JSON.stringify(body ?? { error: { code: 'NOT_FOUND', message: `No mock for ${request.url}` } }));
}).listen(Number(process.env.PORT || 4010));
