import assert from 'node:assert/strict';
import { test } from 'node:test';

import { rateLimited, validation } from '../src/__fixtures__/platform.ts';
import { ApiError, createApiClient } from '../src/client.ts';

type Call = { url: string; init: RequestInit };

function setup(response: () => Response | Promise<Response>, options: { token?: string | null } = {}) {
	const calls: Call[] = [];
	const api = createApiClient({
		baseUrl: 'http://localhost:4000/',
		getAccessToken: async () => ('token' in options ? options.token : 'jwt-1'),
		deviceId: 'device-1',
		locale: 'en',
		fetch: async (url, init = {}) => {
			calls.push({ url: String(url), init });
			return response();
		},
	});
	return { api, calls, headers: (i = 0) => calls[i]!.init.headers as Record<string, string> };
}

const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
	new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });

const rejection = (promise: Promise<unknown>) =>
	promise.then(
		() => assert.fail('expected a rejection'),
		(error: unknown) => error
	);

test('sends auth, device, language and JSON body; builds the query string', async () => {
	const { api, calls, headers } = setup(() => jsonResponse({ id: 'r1' }, 201));
	const result = await api.request<{ id: string }>('POST', '/v1/reports', {
		query: { cursor: null, limit: 20, near: 'a b', mine: undefined },
		body: { type: 'found' },
	});

	assert.deepEqual(result, { id: 'r1' });
	assert.equal(calls[0]!.url, 'http://localhost:4000/v1/reports?limit=20&near=a%20b');
	assert.equal(calls[0]!.init.method, 'POST');
	assert.equal(calls[0]!.init.body, '{"type":"found"}');
	assert.deepEqual(headers(), {
		'Accept-Language': 'en',
		Authorization: 'Bearer jwt-1',
		'x-device-id': 'device-1',
		'Content-Type': 'application/json',
	});
});

test('leaves out Authorization without a session and Content-Type without a body', async () => {
	const { api, headers } = setup(() => jsonResponse({ message: 'pong' }), { token: null });
	await api.request('GET', '/ping');
	assert.deepEqual(headers(), { 'Accept-Language': 'en', 'x-device-id': 'device-1' });
});

test('Idempotency-Key only for calls marked idempotent: given key, or a fresh uuid', async () => {
	const { api, headers } = setup(() => jsonResponse({}));
	await api.request('POST', '/v1/reports', { body: {}, idempotent: 'outbox-7' });
	await api.request('POST', '/v1/reports', { body: {}, idempotent: true });
	await api.request('POST', '/v1/reports', { body: {} });

	assert.equal(headers(0)['Idempotency-Key'], 'outbox-7');
	assert.match(
		headers(1)['Idempotency-Key']!,
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
	);
	assert.equal(headers(2)['Idempotency-Key'], undefined);
});

test('makes a v4 key without crypto.randomUUID (Hermes)', async (t) => {
	const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
	Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
	t.after(() => Object.defineProperty(globalThis, 'crypto', original));

	const { api, headers } = setup(() => jsonResponse({}));
	await api.request('POST', '/v1/payments/checkout', { body: {}, idempotent: true });
	assert.match(
		headers()['Idempotency-Key']!,
		/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
	);
});

test('204 resolves to undefined', async () => {
	const { api } = setup(() => new Response(null, { status: 204 }));
	assert.equal(await api.request('POST', '/v1/reports/Xy7pQ2mK/manage-link/resend'), undefined);
});

test('parses a C1 error body into ApiError with code, status, details and request id', async () => {
	const { api } = setup(() => jsonResponse(rateLimited, 429, { 'x-request-id': 'req-9' }));
	const error = await rejection(api.request('POST', '/v1/reports', { body: {} }));

	assert.ok(error instanceof ApiError);
	assert.equal(error.name, 'ApiError');
	assert.equal(error.code, 'RATE_LIMITED');
	assert.equal(error.status, 429);
	assert.equal(error.message, 'Too many reports');
	assert.deepEqual(error.details, { retry_after_s: 1800 });
	assert.equal(error.requestId, 'req-9');
});

test('keeps validation issues', async () => {
	const { api } = setup(() => jsonResponse(validation, 400));
	const error = (await rejection(api.request('POST', '/v1/reports', { body: {} }))) as ApiError;
	assert.equal(error.code, 'VALIDATION');
	assert.deepEqual(error.issues, [{ path: 'location.lat', message: 'Required' }]);
});

test('unknown codes and non-JSON bodies become INTERNAL with the real status', async () => {
	const unknown = setup(() => jsonResponse({ error: { code: 'NEW_THING', message: 'x' } }, 418));
	const unknownError = (await rejection(unknown.api.request('GET', '/v1/x'))) as ApiError;
	assert.equal(unknownError.code, 'INTERNAL');
	assert.equal(unknownError.status, 418);

	// Client-only and inherited names are not server codes.
	for (const code of ['NETWORK', 'toString', '__proto__']) {
		const { api } = setup(() => jsonResponse({ error: { code, message: 'x' } }, 400));
		assert.equal(((await rejection(api.request('GET', '/v1/x'))) as ApiError).code, 'INTERNAL');
	}

	const proxy = setup(() => new Response('<html>Bad Gateway</html>', { status: 502 }));
	const proxyError = (await rejection(proxy.api.request('GET', '/v1/x'))) as ApiError;
	assert.equal(proxyError.code, 'INTERNAL');
	assert.equal(proxyError.status, 502);
	assert.equal(proxyError.message, 'HTTP 502');
});

test('a failed fetch becomes a NETWORK client error', async () => {
	const cause = new TypeError('fetch failed');
	const { api } = setup(() => Promise.reject(cause));
	const error = (await rejection(api.request('GET', '/v1/reports'))) as ApiError;

	assert.ok(error instanceof ApiError);
	assert.equal(error.code, 'NETWORK');
	assert.equal(error.status, 0);
	assert.equal(error.cause, cause);
});

test('a body that fails to arrive is NETWORK too', async () => {
	const { api } = setup(() => {
		const res = new Response('{}');
		res.text = () => Promise.reject(new TypeError('terminated'));
		return res;
	});
	assert.equal(((await rejection(api.request('GET', '/v1/reports'))) as ApiError).code, 'NETWORK');
});

test('an aborted request rethrows the abort error untouched', async () => {
	const controller = new AbortController();
	controller.abort();
	const { api } = setup(() => Promise.reject(controller.signal.reason));
	const error = await rejection(api.request('GET', '/v1/reports', { signal: controller.signal }));
	assert.equal(error, controller.signal.reason);

	// An AbortError without our signal (a timeout signal inside fetch) is not a network failure either.
	const timeout = new DOMException('The operation was aborted', 'AbortError');
	const other = setup(() => Promise.reject(timeout));
	assert.equal(await rejection(other.api.request('GET', '/v1/reports')), timeout);
});

test('a 2xx that is not JSON is INTERNAL with status and request id', async () => {
	const { api } = setup(() => new Response('<html>', { status: 200, headers: { 'x-request-id': 'req-2' } }));
	const error = (await rejection(api.request('GET', '/v1/reports'))) as ApiError;
	assert.equal(error.code, 'INTERNAL');
	assert.equal(error.status, 200);
	assert.equal(error.requestId, 'req-2');
});

test('rejects a path without a leading slash, before any token is read or sent', async () => {
	const { api, calls } = setup(() => jsonResponse({}));
	await assert.rejects(api.request('GET', '.evil.example/steal'), /must start with "\/"/);
	assert.equal(calls.length, 0);
});

test('extra headers pass through; the client headers win', async () => {
	const { api, headers } = setup(() => jsonResponse({}));
	await api.request('POST', '/v1/reports', {
		body: {},
		headers: { 'Idempotency-Key': 'outbox-9', Authorization: 'Bearer forged' },
	});
	assert.equal(headers()['Idempotency-Key'], 'outbox-9');
	assert.equal(headers().Authorization, 'Bearer jwt-1');
});

test('undefined extra header values are not sent', async () => {
	const { api, headers } = setup(() => jsonResponse({}));
	await api.request('POST', '/v1/reports', { body: {}, headers: { 'Idempotency-Key': undefined } });
	assert.equal('Idempotency-Key' in headers(), false);
});
